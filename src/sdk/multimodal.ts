/**
 * GALXAI Developer SDK: Multi-Modal Vision & File Ingestion Helpers
 * Absorbs URLs, base64 strings, Buffers, Uint8Arrays, Blobs, Streams, and file paths.
 * Implements the signature OpenAI `toFile()` uploadable standard.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ChatMessage } from '../core/contracts/GalxContracts';

export interface MultiModalImageInput {
  url?: string;
  buffer?: Buffer;
  base64?: string;
  data?: string;
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | string;
  source?: {
    type?: string;
    media_type?: string;
    data?: string;
  };
}

export type ForgivingImageSource =
  | string
  | Buffer
  | Uint8Array
  | ArrayBuffer
  | MultiModalImageInput
  | UploadableFile
  | { type: 'image_url'; image_url: { url: string } }
  | { type: 'image'; source: { type?: string; media_type?: string; data?: string } };

export type Uploadable =
  | string
  | Buffer
  | Uint8Array
  | ArrayBuffer
  | Blob
  | { buffer: Buffer; name?: string; type?: string };

export class UploadableFile {
  public readonly name: string;
  public readonly type: string;
  public readonly size: number;
  public readonly buffer: Buffer;

  constructor(buffer: Buffer, name = 'upload.bin', type = 'application/octet-stream') {
    this.buffer = buffer;
    this.name = name;
    this.type = type;
    this.size = buffer.length;
  }

  public toBase64(): string {
    return this.buffer.toString('base64');
  }

  public toDataUrl(): string {
    return `data:${this.type};base64,${this.toBase64()}`;
  }
}

/**
 * Universal file ingestion helper matching the OpenAI `toFile` standard.
 * Automatically resolves Buffers, Blobs, base64 strings, data URLs, and file paths.
 *
 * @example
 * ```ts
 * const file = await toFile(fs.readFileSync('diagram.png'), 'diagram.png');
 * const fileFromB64 = await toFile('data:image/png;base64,iVBORw0KGgo...', 'chart.png');
 * ```
 */
export async function toFile(
  input: Uploadable,
  filename?: string,
  options?: { type?: string }
): Promise<UploadableFile> {
  let resolvedName = filename || 'file.bin';
  let resolvedType = options?.type || 'application/octet-stream';
  let buffer: Buffer;

  if (typeof input === 'string') {
    if (input.startsWith('data:')) {
      const match = input.match(/^data:([^;]+);base64,(.*)$/);
      if (match) {
        resolvedType = options?.type || match[1];
        buffer = Buffer.from(match[2], 'base64');
      } else {
        buffer = Buffer.from(input, 'utf8');
      }
    } else if (input.length > 500 && /^[A-Za-z0-9+/=]+$/.test(input.replace(/\s+/g, ''))) {
      // Raw base64 string
      buffer = Buffer.from(input.replace(/\s+/g, ''), 'base64');
    } else {
      // Local filesystem path if exists
      try {
        if (fs.existsSync(input)) {
          buffer = fs.readFileSync(input);
          resolvedName = filename || path.basename(input);
          const ext = path.extname(input).toLowerCase();
          if (ext === '.png') resolvedType = 'image/png';
          else if (ext === '.jpg' || ext === '.jpeg') resolvedType = 'image/jpeg';
          else if (ext === '.webp') resolvedType = 'image/webp';
          else if (ext === '.gif') resolvedType = 'image/gif';
          else if (ext === '.mp3') resolvedType = 'audio/mp3';
          else if (ext === '.pdf') resolvedType = 'application/pdf';
          else if (ext === '.json') resolvedType = 'application/json';
        } else {
          buffer = Buffer.from(input, 'utf8');
        }
      } catch {
        buffer = Buffer.from(input, 'utf8');
      }
    }
  } else if (Buffer.isBuffer(input)) {
    buffer = input;
  } else if (input instanceof Uint8Array || input instanceof ArrayBuffer) {
    buffer = Buffer.from(input instanceof Uint8Array ? input : new Uint8Array(input));
  } else if (typeof (input as any).arrayBuffer === 'function') {
    // Blob / File API
    const ab = await (input as any).arrayBuffer();
    buffer = Buffer.from(ab);
    if ((input as any).name && !filename) {
      resolvedName = (input as any).name;
    }
    if ((input as any).type && !options?.type) {
      resolvedType = (input as any).type;
    }
  } else if ((input as any).buffer && Buffer.isBuffer((input as any).buffer)) {
    buffer = (input as any).buffer;
    if ((input as any).name) resolvedName = (input as any).name;
    if ((input as any).type) resolvedType = (input as any).type;
  } else {
    buffer = Buffer.from(String(input), 'utf8');
  }

  return new UploadableFile(buffer, resolvedName, resolvedType);
}

export class MultiModalHelper {
  /**
   * Encodes any image format into an OpenAI/GALXAI compatible image_url structure.
   */
  public static encodeImage(input: ForgivingImageSource): { type: 'image_url'; image_url: { url: string } } {
    if (input instanceof UploadableFile) {
      return { type: 'image_url', image_url: { url: input.toDataUrl() } };
    }

    if (typeof input === 'string') {
      if (input.startsWith('http://') || input.startsWith('https://') || input.startsWith('data:image/')) {
        return { type: 'image_url', image_url: { url: input } };
      }
      // Clean raw base64 string
      const cleanB64 = input.replace(/\s+/g, '');
      return {
        type: 'image_url',
        image_url: { url: `data:image/jpeg;base64,${cleanB64}` }
      };
    }

    if (Buffer.isBuffer(input)) {
      const b64 = input.toString('base64');
      return {
        type: 'image_url',
        image_url: { url: `data:image/png;base64,${b64}` }
      };
    }

    if (input instanceof Uint8Array || input instanceof ArrayBuffer) {
      const u8 = input instanceof Uint8Array ? input : new Uint8Array(input);
      const b64 = Buffer.from(u8).toString('base64');
      return {
        type: 'image_url',
        image_url: { url: `data:image/png;base64,${b64}` }
      };
    }

    // OpenAI existing image_url format
    if ((input as any).image_url?.url) {
      return { type: 'image_url', image_url: { url: (input as any).image_url.url } };
    }

    // Direct url field
    if ((input as any).url) {
      return { type: 'image_url', image_url: { url: (input as any).url } };
    }

    // Anthropic image format
    if ((input as any).source?.data) {
      const mediaType = (input as any).source.media_type || 'image/png';
      return {
        type: 'image_url',
        image_url: { url: `data:${mediaType};base64,${(input as any).source.data}` }
      };
    }

    // Base64 field
    const b64Field = (input as any).base64 || (input as any).data;
    if (b64Field) {
      const mime = (input as any).mimeType || 'image/jpeg';
      const b64Clean = b64Field.replace(/^data:image\/\w+;base64,/, '');
      return {
        type: 'image_url',
        image_url: { url: `data:${mime};base64,${b64Clean}` }
      };
    }

    // Buffer field
    if ((input as any).buffer) {
      const mime = (input as any).mimeType || 'image/png';
      const b64 = (input as any).buffer.toString('base64');
      return {
        type: 'image_url',
        image_url: { url: `data:${mime};base64,${b64}` }
      };
    }

    return {
      type: 'image_url',
      image_url: { url: 'data:image/png;base64,' }
    };
  }

  /**
   * Constructs a multi-modal user message containing text and one or more images.
   * Absorbs a single image or an array of images.
   */
  public static createUserMessage(
    text: string,
    imageOrImages: ForgivingImageSource | ForgivingImageSource[] = []
  ): ChatMessage {
    const parts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      { type: 'text', text }
    ];

    const imageArray = Array.isArray(imageOrImages) ? imageOrImages : [imageOrImages];

    for (const img of imageArray) {
      if (img) {
        parts.push(MultiModalHelper.encodeImage(img));
      }
    }

    return {
      role: 'user',
      content: parts
    };
  }

  /**
   * High-level alias for constructing multi-modal vision prompts.
   */
  public static createVisionMessage(
    prompt: string,
    images: ForgivingImageSource | ForgivingImageSource[]
  ): ChatMessage {
    return MultiModalHelper.createUserMessage(prompt, images);
  }
}
