/**
 * GALXAI: Zero-Egress Multimodal Asset Storage (Cloudflare R2 Adapter) + BroccoliDB Hot Table
 *
 * Directly uploads large visual synthesis (DALL-E / FLUX / Imagen), audio generations,
 * and user webapp builds to Cloudflare R2 (bucket: `galxai-assets`), storing compact
 * URI references in BroccoliDB & PostgreSQL.
 */

import { BroccoliDbTable } from '../../core/broccolidb/broccolidb-table';
import { BroccoliNaturalQueryParser } from '../../core/broccolidb/broccolidb-natural-query';
import type { DbAggregateQuery, DbAggregateResult } from '../../core/broccolidb/broccolidb.contracts';
import { GalxUnifiedR2StorageManager } from '../../core/storage/GalxUnifiedR2StorageManager';

export interface R2UploadResult {
  assetId: string;
  publicUrl: string;
  sizeBytes: number;
  contentType: string;
  sha256: string;
  bucket: string;
  key: string;
  uploadedAtMs: number;
}

export class GalxR2AssetAdapter {
  private static instance: GalxR2AssetAdapter;
  public readonly assetTable: BroccoliDbTable<R2UploadResult>;
  private readonly r2Manager: GalxUnifiedR2StorageManager;

  private constructor() {
    this.assetTable = new BroccoliDbTable<R2UploadResult>('r2_assets');
    this.assetTable.createIndex('contentType');
    this.assetTable.createSortedIndex('sizeBytes');
    this.assetTable.createSortedIndex('uploadedAtMs');
    this.r2Manager = GalxUnifiedR2StorageManager.getInstance();
  }

  static getInstance(): GalxR2AssetAdapter {
    if (!GalxR2AssetAdapter.instance) {
      GalxR2AssetAdapter.instance = new GalxR2AssetAdapter();
    }
    return GalxR2AssetAdapter.instance;
  }

  /**
   * Stores a multimodal image, audio buffer, or binary asset into Cloudflare R2 (`galxai-assets`).
   */
  async uploadAsset(params: {
    data: Buffer | Uint8Array | string;
    contentType: string;
    folder?: string;
    customKey?: string;
    metadata?: Record<string, string>;
  }): Promise<R2UploadResult> {
    const assetId = `asset_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const folder = params.folder || 'generations';
    const key = params.customKey || `${folder}/${assetId}.${params.contentType.split('/')[1] || 'bin'}`;

    const r2Result = await this.r2Manager.putObject({
      bucket: 'assets',
      key,
      data: params.data,
      contentType: params.contentType,
      metadata: params.metadata,
    });

    const result: R2UploadResult = {
      assetId,
      publicUrl: r2Result.publicUrl,
      sizeBytes: r2Result.sizeBytes,
      contentType: params.contentType,
      sha256: r2Result.sha256,
      bucket: r2Result.bucket,
      key,
      uploadedAtMs: Date.now(),
    };

    this.assetTable.put(assetId, result);
    return result;
  }

  /**
   * Retrieves asset metadata from the fast in-memory BroccoliDB index.
   */
  getAsset(assetId: string): R2UploadResult | null {
    return this.assetTable.get(assetId) || null;
  }

  /**
   * Retrieves raw asset data from Cloudflare R2.
   */
  async getAssetBuffer(key: string): Promise<Buffer> {
    const res = await this.r2Manager.getObject('assets', key);
    return res.data;
  }

  /**
   * Generates a presigned download URL for direct browser streaming.
   */
  getPresignedAssetUrl(key: string, expiresInSeconds = 3600): string {
    return this.r2Manager.getPresignedDownloadUrl('assets', key, expiresInSeconds);
  }

  public queryNatural(naturalQuery: string): R2UploadResult[] {
    const parsed = BroccoliNaturalQueryParser.parse(naturalQuery, 'r2_assets');
    return this.assetTable.query(parsed.queryOptions) as R2UploadResult[];
  }

  public aggregate(query: DbAggregateQuery): DbAggregateResult {
    return this.assetTable.aggregate(query);
  }
}

export const galxR2Assets = GalxR2AssetAdapter.getInstance();
