/**
 * GALXAI Developer SDK: Multi-Modal Vision & File Ingestion Helpers
 * Absorbs URLs, base64 strings, Buffers, Uint8Arrays, Blobs, and Anthropic/OpenAI image objects.
 */

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
  | { type: 'image_url'; image_url: { url: string } }
  | { type: 'image'; source: { type?: string; media_type?: string; data?: string } };

export class MultiModalHelper {
  /**
   * Encodes any image format into an OpenAI/GALXAI compatible image_url structure.
   */
  public static encodeImage(input: ForgivingImageSource): { type: 'image_url'; image_url: { url: string } } {
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
}
