/**
 * GALXAI Natural Language Intent Engine (NL2API)
 * Automatically infers task type, aspect ratio, model tier, and options from natural developer inputs.
 */

import { GalxAI } from './client';

export interface IntentExecutionOptions {
  client?: GalxAI;
  schema?: Record<string, any>;
  background?: boolean;
  priority?: number;
  model?: string;
  seed?: number;
}

export interface InferredIntent {
  type: 'image' | 'chat' | 'structured' | 'code';
  prompt: string;
  model: string;
  aspectRatio?: string;
  quality?: 'standard' | 'hd';
  negativePrompt?: string;
}

/**
 * Parses freeform natural language developer input into structured execution parameters.
 */
export function inferIntent(input: string): InferredIntent {
  const lower = input.toLowerCase();

  // 1. Image Generation Intent Detection
  const isImage =
    lower.startsWith('image:') ||
    lower.startsWith('photo:') ||
    lower.startsWith('draw:') ||
    lower.startsWith('paint:') ||
    lower.startsWith('generate image') ||
    lower.startsWith('create image') ||
    lower.startsWith('render') ||
    lower.includes('photo of') ||
    lower.includes('painting of') ||
    lower.includes('illustration of') ||
    lower.includes('wallpaper') ||
    lower.includes('cinematic photo') ||
    lower.includes('portrait of') ||
    lower.includes('logo for');

  if (isImage) {
    let cleanPrompt = input
      .replace(/^(image:|photo:|draw:|paint:|generate image|create image|render)\s*/i, '')
      .trim();

    let aspectRatio = '1:1';
    if (lower.includes('16:9') || lower.includes('wide') || lower.includes('landscape') || lower.includes('cinematic') || lower.includes('desktop wallpaper') || lower.includes('banner')) {
      aspectRatio = '16:9';
    } else if (lower.includes('9:16') || lower.includes('tall') || lower.includes('vertical') || lower.includes('phone wallpaper') || lower.includes('story') || lower.includes('tiktok') || lower.includes('portrait')) {
      aspectRatio = '9:16';
    } else if (lower.includes('4:3')) {
      aspectRatio = '4:3';
    } else if (lower.includes('3:2')) {
      aspectRatio = '3:2';
    } else if (lower.includes('21:9') || lower.includes('ultrawide')) {
      aspectRatio = '21:9';
    } else if (lower.includes('4:5') || lower.includes('instagram')) {
      aspectRatio = '4:5';
    }

    const isHD = lower.includes('4k') || lower.includes('8k') || lower.includes('hd') || lower.includes('masterpiece') || lower.includes('ultra realistic');

    return {
      type: 'image',
      prompt: cleanPrompt,
      model: 'openai-gpt-image-latest',
      aspectRatio,
      quality: isHD ? 'hd' : 'standard'
    };
  }

  // 2. Code Generation Intent Detection
  const isCode = lower.startsWith('code:') || lower.includes('write a function') || lower.includes('refactor') || lower.includes('typescript') || lower.includes('python script');
  if (isCode) {
    return {
      type: 'code',
      prompt: input,
      model: 'gpt-5.6-luna'
    };
  }

  // 3. General Reasoning & Chat
  return {
    type: 'chat',
    prompt: input,
    model: 'gpt-5.6-sol'
  };
}

/**
 * Universal polymorphic execution helper.
 *
 * @example
 * ```ts
 * // Generates wide cinematic image automatically:
 * const img = await executeIntent('cinematic photo of neo tokyo in rain');
 *
 * // Generates code automatically:
 * const code = await executeIntent('write a typescript debounce function');
 * ```
 */
export async function executeIntent(input: string, options: IntentExecutionOptions = {}): Promise<any> {
  const client = options.client || new GalxAI();

  if (options.schema) {
    return client.extract(input, options.schema, { model: options.model });
  }

  const intent = inferIntent(input);

  if (intent.type === 'image') {
    return client.images.generate({
      prompt: intent.prompt,
      model: options.model || intent.model,
      aspectRatio: intent.aspectRatio,
      quality: intent.quality,
      seed: options.seed
    });
  }

  return client.run(intent.prompt, {
    model: options.model || intent.model,
    background: options.background,
    priority: options.priority
  });
}
