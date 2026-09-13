/**
 * GALXAI: Zero-Egress Multimodal Asset Storage (Cloudflare R2 Adapter) + BroccoliDB Hot Table
 *
 * Directly uploads large visual synthesis (DALL-E / FLUX / Imagen), audio generations,
 * and user webapp builds to Cloudflare R2 (bucket: `galxai-assets`), storing compact
 * URI references in BroccoliDB & PostgreSQL.
 *
 * Enhanced with:
 * - User and Session Partitioned R2 namespaces (`users/{userId}/sessions/{sessionId}/images/{imageId}.png`)
 * - Lightweight LQIP (Low-Quality Image Placeholder) generation for zero-layout-shift UI
 * - O(1) Session Visual Summary Manifests (`manifest.json`)
 * - Atomic cascade session purge via S3 batch deletion
 */

import * as crypto from 'node:crypto';
import { BroccoliDbTable } from '../../core/broccolidb/broccolidb-table';
import { BroccoliNaturalQueryParser } from '../../core/broccolidb/broccolidb-natural-query';
import { BroccoliImageLibraryBuffer } from '../../core/broccolidb/BroccoliImageLibraryBuffer';
import type { DbAggregateQuery, DbAggregateResult } from '../../core/broccolidb/broccolidb.contracts';
import { GalxUnifiedR2StorageManager, buildUserSessionImagePath } from '../../core/storage/GalxUnifiedR2StorageManager';

export interface R2UploadResult {
  assetId: string;
  publicUrl: string;
  sizeBytes: number;
  contentType: string;
  sha256: string;
  bucket: string;
  key: string;
  uploadedAtMs: number;
  userId?: string;
  sessionId?: string;
}

export interface UserSessionImageParams {
  userId: string;
  sessionId?: string;
  imageId?: string;
  data: Buffer | Uint8Array | string; // Buffer, Uint8Array, base64 string, data URL, or remote http(s) URL
  contentType?: string;
  prompt?: string;
  revisedPrompt?: string;
  model?: string;
  size?: string;
  quality?: string;
  metadata?: Record<string, string>;
  /** Coalesce manifest writes when the caller uploads several images in one generation. */
  deferManifestUpdate?: boolean;
}

export interface UserSessionImageResult extends R2UploadResult {
  userId: string;
  sessionId: string;
  prompt?: string;
  revisedPrompt?: string;
  model?: string;
  size?: string;
  quality?: string;
  lqipDataUri?: string;
}

export interface SessionImageManifest {
  sessionId: string;
  userId: string;
  totalImages: number;
  totalBytes: number;
  createdAtMs: number;
  updatedAtMs: number;
  images: Array<{
    assetId: string;
    key: string;
    url: string;
    prompt?: string;
    model?: string;
    size?: string;
    sizeBytes: number;
    createdAtMs: number;
  }>;
}

export class GalxR2AssetAdapter {
  private static instance: GalxR2AssetAdapter;
  public readonly assetTable: BroccoliDbTable<UserSessionImageResult>;
  private readonly r2Manager: GalxUnifiedR2StorageManager;

  private constructor() {
    this.assetTable = new BroccoliDbTable<UserSessionImageResult>('r2_assets');
    this.assetTable.createIndex('contentType');
    this.assetTable.createIndex('userId');
    this.assetTable.createIndex('sessionId');
    this.assetTable.createCompositeIndex(['userId', 'sessionId']);
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
   * Generates a lightweight SVG Data-URI Low Quality Image Placeholder (LQIP).
   */
  private generateLqipPlaceholder(dimensions?: string, prompt?: string): string {
    let width = 1024;
    let height = 1024;
    if (dimensions && dimensions.includes('x')) {
      const parts = dimensions.split('x').map(p => parseInt(p, 10));
      if (!isNaN(parts[0]) && !isNaN(parts[1])) {
        width = parts[0];
        height = parts[1];
      }
    }
    const hash = crypto.createHash('md5').update(prompt || 'galxai').digest('hex');
    const color1 = `#${hash.slice(0, 6)}`;
    const color2 = `#${hash.slice(6, 12)}`;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
      `<defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">` +
      `<stop offset="0%" stop-color="${color1}" stop-opacity="0.3"/>` +
      `<stop offset="100%" stop-color="${color2}" stop-opacity="0.6"/>` +
      `</linearGradient></defs>` +
      `<rect width="${width}" height="${height}" fill="url(#g)"/>` +
      `</svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  /**
   * Derives normalized aspect ratio string from dimensions (e.g. "1792x1024" -> "16:9").
   */
  private extractAspectRatio(dimensions?: string): string {
    if (!dimensions || !dimensions.includes('x')) return '1:1';
    const [w, h] = dimensions.split('x').map(n => parseInt(n, 10));
    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return '1:1';
    if ((w === 1792 && h === 1024) || (w === 1920 && h === 1080) || (w === 1280 && h === 720)) return '16:9';
    if ((w === 1024 && h === 1792) || (w === 1080 && h === 1920) || (w === 720 && h === 1280)) return '9:16';
    if (w === h) return '1:1';
    if ((w === 1200 && h === 800) || (w === 1500 && h === 1000)) return '3:2';
    if ((w === 800 && h === 1200) || (w === 1000 && h === 1500)) return '2:3';
    if ((w === 1024 && h === 768) || (w === 800 && h === 600)) return '4:3';
    if ((w === 768 && h === 1024) || (w === 600 && h === 800)) return '3:4';
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(w, h);
    return `${w / divisor}:${h / divisor}`;
  }

  /**
   * Resolves raw payload into Buffer and content-type.
   */
  private async resolveDataPayload(data: Buffer | Uint8Array | string, fallbackContentType = 'image/png'): Promise<{ buffer: Buffer; contentType: string }> {
    if (Buffer.isBuffer(data)) {
      return { buffer: data, contentType: fallbackContentType };
    }
    if (data instanceof Uint8Array) {
      return { buffer: Buffer.from(data), contentType: fallbackContentType };
    }
    if (typeof data === 'string') {
      // Remote HTTP/HTTPS URL
      if (data.startsWith('http://') || data.startsWith('https://')) {
        const resp = await fetch(data, { signal: AbortSignal.timeout(15000) });
        if (!resp.ok) {
          throw new Error(`Failed to fetch image from remote URL (${resp.status}): ${data}`);
        }
        const ab = await resp.arrayBuffer();
        const detectedType = resp.headers.get('content-type') || fallbackContentType;
        return { buffer: Buffer.from(ab), contentType: detectedType };
      }
      // Data URI: data:image/png;base64,...
      if (data.startsWith('data:')) {
        const matches = data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches[2]) {
          return {
            buffer: Buffer.from(matches[2], 'base64'),
            contentType: matches[1] || fallbackContentType
          };
        }
      }
      // Pure base64 string
      return {
        buffer: Buffer.from(data, 'base64'),
        contentType: fallbackContentType
      };
    }
    throw new Error('Unsupported image data payload format');
  }

  /**
   * Stores a visual synthesis generation partitioned by user and session into Cloudflare R2 (`galxai-assets`).
   * Path: users/{userId}/sessions/{sessionId}/images/{imageId}.png
   */
  async uploadUserSessionImage(params: UserSessionImageParams): Promise<UserSessionImageResult> {
    const { buffer, contentType } = await this.resolveDataPayload(params.data, params.contentType || 'image/png');
    const ext = contentType.includes('webp') ? 'webp' : contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';
    const userId = params.userId.trim();
    if (!userId || userId === 'anonymous' || userId === 'anonymous_user') {
      throw new Error('Authenticated userId is required for user image library persistence');
    }
    const sessionId = (params.sessionId || 'default').trim();
    const imageId = params.imageId || `img_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const key = buildUserSessionImagePath({
      userId,
      sessionId,
      imageId,
      extension: ext
    });

    const r2Result = await this.r2Manager.putObject({
      bucket: 'images',
      key,
      data: buffer,
      contentType,
      // Object headers are observable; operational metadata stays in the private catalog.
      cacheControl: 'private, no-store'
    });

    const lqip = this.generateLqipPlaceholder(params.size, params.prompt);

    const result: UserSessionImageResult = {
      assetId: imageId,
      userId,
      sessionId,
      publicUrl: r2Result.publicUrl,
      sizeBytes: r2Result.sizeBytes,
      contentType,
      sha256: r2Result.sha256,
      bucket: r2Result.bucket,
      key,
      uploadedAtMs: Date.now(),
      prompt: params.prompt,
      revisedPrompt: params.revisedPrompt,
      model: params.model,
      size: params.size,
      quality: params.quality,
      lqipDataUri: lqip
    };

    this.assetTable.put(imageId, result);

    // Enqueue into BroccoliImageLibraryBuffer for micro-batched persistence to PostgreSQL & R2 master catalog
    try {
      const libraryBuffer = BroccoliImageLibraryBuffer.getInstance();
      const aspectRatio = this.extractAspectRatio(params.size);
      libraryBuffer.enqueueRecord({
        id: imageId,
        userId,
        sessionId,
        status: 'completed',
        prompt: params.prompt || 'Visual synthesis',
        revisedPrompt: params.revisedPrompt || null,
        model: params.model || 'openai-gpt-image-latest',
        aspectRatio,
        dimensions: params.size || '1024x1024',
        quality: params.quality || 'standard',
        publicUrl: r2Result.publicUrl,
        r2Key: key,
        contentType,
        sizeBytes: r2Result.sizeBytes,
        sha256: r2Result.sha256,
        lqip,
        seed: params.metadata?.seed || null,
        latencyMs: params.metadata?.latency_ms ? parseInt(params.metadata.latency_ms, 10) : 0,
        costUsd: params.metadata?.cost_usd ? parseFloat(params.metadata.cost_usd) : 0,
        isFavorite: false,
        tags: params.metadata?.tags ? params.metadata.tags.split(',') : [],
        metadata: params.metadata || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (bufErr: any) {
      console.warn(`[GalxR2AssetAdapter] BroccoliImageLibraryBuffer enqueue warning: ${bufErr.message}`);
    }

    // Synchronously update session manifest in R2 so caller can immediately inspect it
    if (!params.deferManifestUpdate) {
      try {
        await this.updateSessionManifestBatch(userId, sessionId, [result]);
      } catch (manifestErr: any) {
        console.warn(`[GalxR2AssetAdapter] Session manifest update non-fatal error: ${manifestErr.message}`);
      }
    }

    return result;
  }

  /**
   * Legacy uploadAsset adapter mapping for backward compatibility.
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

    const { buffer, contentType } = await this.resolveDataPayload(params.data, params.contentType);

    const r2Result = await this.r2Manager.putObject({
      bucket: 'assets',
      key,
      data: buffer,
      contentType,
      metadata: params.metadata,
      cacheControl: 'public, max-age=31536000, immutable'
    });

    const result: UserSessionImageResult = {
      assetId,
      userId: 'legacy_anonymous',
      sessionId: 'default',
      publicUrl: r2Result.publicUrl,
      sizeBytes: r2Result.sizeBytes,
      contentType,
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
  getAsset(assetId: string): UserSessionImageResult | null {
    return this.assetTable.get(assetId) || null;
  }

  /**
   * Lists all images generated in a specific user session.
   */
  async listSessionImages(userId: string, sessionId: string): Promise<UserSessionImageResult[]> {
    const cleanUserId = userId.trim();
    const cleanSessionId = sessionId.trim();

    // Query in-memory BroccoliDB index
    const records = this.assetTable.getAll().filter(
      (a) => a.userId === cleanUserId && a.sessionId === cleanSessionId
    );
    if (records.length > 0) {
      return records.sort((a, b) => b.uploadedAtMs - a.uploadedAtMs);
    }

    // Fall back to querying R2 prefix
    const prefix = `users/${cleanUserId.replace(/[^a-zA-Z0-9_-]/g, '_')}/sessions/${cleanSessionId.replace(/[^a-zA-Z0-9_-]/g, '_')}/images/`;
    const listed = await this.r2Manager.listObjects({ bucket: 'images', prefix, maxKeys: 100 });
    const { publicDomain, bucketName } = this.r2Manager.resolveBucket('images');

    return listed.objects.map((obj) => ({
      assetId: obj.key.split('/').pop()?.replace(/\.[^.]+$/, '') || obj.key,
      userId: cleanUserId,
      sessionId: cleanSessionId,
      publicUrl: `${publicDomain}/${obj.key}`,
      sizeBytes: obj.sizeBytes,
      contentType: obj.key.endsWith('.webp') ? 'image/webp' : 'image/png',
      sha256: obj.etag.replace(/"/g, ''),
      bucket: bucketName,
      key: obj.key,
      uploadedAtMs: new Date(obj.lastModified).getTime()
    }));
  }

  /**
   * Lists all images belonging to a user across sessions.
   */
  async listUserImages(userId: string, options?: { limit?: number; continuationToken?: string }): Promise<{ images: UserSessionImageResult[]; nextContinuationToken?: string }> {
    const cleanUserId = userId.trim();
    const limit = options?.limit || 50;

    const inMemory = this.assetTable.getAll()
      .filter((a) => a.userId === cleanUserId)
      .sort((a, b) => b.uploadedAtMs - a.uploadedAtMs)
      .slice(0, limit);

    if (inMemory.length > 0) {
      return { images: inMemory };
    }

    const prefix = `users/${cleanUserId.replace(/[^a-zA-Z0-9_-]/g, '_')}/`;
    const listed = await this.r2Manager.listObjects({
      bucket: 'images',
      prefix,
      maxKeys: limit,
      continuationToken: options?.continuationToken
    });
    const { publicDomain, bucketName } = this.r2Manager.resolveBucket('images');

    const mapped = listed.objects
      .filter(o => !o.key.endsWith('manifest.json'))
      .map((obj) => ({
        assetId: obj.key.split('/').pop()?.replace(/\.[^.]+$/, '') || obj.key,
        userId: cleanUserId,
        sessionId: obj.key.split('/')[3] || 'default',
        publicUrl: `${publicDomain}/${obj.key}`,
        sizeBytes: obj.sizeBytes,
        contentType: obj.key.endsWith('.webp') ? 'image/webp' : 'image/png',
        sha256: obj.etag.replace(/"/g, ''),
        bucket: bucketName,
        key: obj.key,
        uploadedAtMs: new Date(obj.lastModified).getTime()
      }));

    return {
      images: mapped,
      nextContinuationToken: listed.nextContinuationToken
    };
  }

  /**
   * Cascade deletes all image assets and metadata for a user session from R2 and BroccoliDB.
   */
  async deleteSessionImages(userId: string, sessionId: string): Promise<{ deletedCount: number }> {
    const cleanUserId = userId.trim();
    const cleanSessionId = sessionId.trim();
    const prefix = `users/${cleanUserId.replace(/[^a-zA-Z0-9_-]/g, '_')}/sessions/${cleanSessionId.replace(/[^a-zA-Z0-9_-]/g, '_')}/`;

    const res = await this.r2Manager.deletePrefix('images', prefix);

    // Evict from in-memory BroccoliDB index
    const records = this.assetTable.getAll().filter(
      (a) => a.userId === cleanUserId && a.sessionId === cleanSessionId
    );
    for (const r of records) {
      this.assetTable.delete(r.assetId);
    }

    return { deletedCount: res.deleted.length };
  }

  /**
   * Reads the session visual manifest from R2.
   */
  async getSessionManifest(userId: string, sessionId: string): Promise<SessionImageManifest | null> {
    const key = `users/${userId.replace(/[^a-zA-Z0-9_-]/g, '_')}/sessions/${sessionId.replace(/[^a-zA-Z0-9_-]/g, '_')}/manifest.json`;
    try {
      const obj = await this.r2Manager.getObject('images', key);
      return JSON.parse(obj.data.toString('utf-8')) as SessionImageManifest;
    } catch {
      return null;
    }
  }

  /**
   * Appends or updates the session visual manifest in R2.
   */
  async updateSessionManifestBatch(userId: string, sessionId: string, newImages: UserSessionImageResult[]): Promise<void> {
    if (newImages.length === 0) return;
    const manifestKey = `users/${userId.replace(/[^a-zA-Z0-9_-]/g, '_')}/sessions/${sessionId.replace(/[^a-zA-Z0-9_-]/g, '_')}/manifest.json`;
    let manifest: SessionImageManifest;

    try {
      const existing = await this.r2Manager.getObject('images', manifestKey);
      manifest = JSON.parse(existing.data.toString('utf-8'));
    } catch {
      manifest = {
        sessionId,
        userId,
        totalImages: 0,
        totalBytes: 0,
        createdAtMs: Date.now(),
        updatedAtMs: Date.now(),
        images: []
      };
    }

    const existingIds = new Set(manifest.images.map((image) => image.assetId));
    const uniqueNewImages = newImages.filter((image) => !existingIds.has(image.assetId));
    manifest.totalImages += uniqueNewImages.length;
    manifest.totalBytes += uniqueNewImages.reduce((total, image) => total + image.sizeBytes, 0);
    manifest.updatedAtMs = Date.now();
    manifest.images.unshift(...uniqueNewImages.map((image) => ({
      assetId: image.assetId,
      key: image.key,
      url: image.publicUrl,
      prompt: image.prompt,
      model: image.model,
      size: image.size,
      sizeBytes: image.sizeBytes,
      createdAtMs: image.uploadedAtMs
    })));

    // Keep manifest bounded to latest 100 images per session
    if (manifest.images.length > 100) {
      manifest.images = manifest.images.slice(0, 100);
    }

    await this.r2Manager.putObject({
      bucket: 'images',
      key: manifestKey,
      data: Buffer.from(JSON.stringify(manifest), 'utf-8'),
      contentType: 'application/json',
      cacheControl: 'no-cache'
    });
  }

  /**
   * Retrieves raw asset data from Cloudflare R2.
   */
  async getAssetBuffer(key: string): Promise<Buffer> {
    const res = await this.r2Manager.getObject('images', key);
    return res.data;
  }

  /**
   * Generates a presigned download URL for direct browser streaming.
   */
  getPresignedAssetUrl(key: string, expiresInSeconds = 3600): string {
    return this.r2Manager.getPresignedDownloadUrl('images', key, expiresInSeconds);
  }

  /** Drains the coalesced image metadata batch at the request boundary. */
  async flushImageLibraryBuffer(): Promise<number> {
    return BroccoliImageLibraryBuffer.getInstance().flushSync();
  }

  public queryNatural(naturalQuery: string): UserSessionImageResult[] {
    const parsed = BroccoliNaturalQueryParser.parse(naturalQuery, 'r2_assets');
    return this.assetTable.query(parsed.queryOptions) as UserSessionImageResult[];
  }

  public aggregate(query: DbAggregateQuery): DbAggregateResult {
    return this.assetTable.aggregate(query);
  }
}

export const galxR2Assets = GalxR2AssetAdapter.getInstance();
