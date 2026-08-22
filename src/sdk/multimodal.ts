/**
 * GALXAI Developer SDK: Multi-Modal Vision & File Ingestion Helpers
 */

import type { ChatMessage } from '../core/contracts/GalxContracts';

export interface MultiModalImageInput {
  url?: string;
  buffer?: Buffer;
  base64?: string;
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
}

export class MultiModalHelper {
  /**
   * Encodes an image into an OpenAI/GALXAI compatible image_url structure.
   */
  public static encodeImage(input: string | Buffer | MultiModalImageInput): { type: 'image_url'; image_url: { url: string } } {
    if (typeof input === 'string') {
      if (input.startsWith('http://') || input.startsWith('https://') || input.startsWith('data:image/')) {
        return { type: 'image_url', image_url: { url: input } };
      }
      // Treat as base64
      return {
        type: 'image_url',
        image_url: { url: `data:image/jpeg;base64,${input}` }
      };
    }

    if (Buffer.isBuffer(input)) {
      const b64 = input.toString('base64');
      return {
        type: 'image_url',
        image_url: { url: `data:image/png;base64,${b64}` }
      };
    }

    if (input.url) {
      return { type: 'image_url', image_url: { url: input.url } };
    }

    if (input.buffer) {
      const mime = input.mimeType || 'image/png';
      const b64 = input.buffer.toString('base64');
      return {
        type: 'image_url',
        image_url: { url: `data:${mime};base64,${b64}` }
      };
    }

    if (input.base64) {
      const mime = input.mimeType || 'image/jpeg';
      const b64Clean = input.base64.replace(/^data:image\/\w+;base64,/, '');
      return {
        type: 'image_url',
        image_url: { url: `data:${mime};base64,${b64Clean}` }
      };
    }

    throw new Error('Invalid image input provided to encodeImage');
  }

  /**
   * Constructs a multi-modal user message containing text and one or more images.
   */
  public static createUserMessage(
    text: string,
    images: Array<string | Buffer | MultiModalImageInput> = []
  ): ChatMessage {
    const parts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      { type: 'text', text }
    ];

    for (const img of images) {
      parts.push(MultiModalHelper.encodeImage(img));
    }

    return {
      role: 'user',
      content: parts
    };
  }
}
