/**
 * GALXAI Zero-Route React 19 / Next.js Server Actions
 * Execute AI generation directly from components with ZERO route files.
 */

'use server';

import { GalxAI } from './client';
import { serveImageRequest } from './server-image';
import type { ImageGenerateParams } from './resources/images';

const serverClient = new GalxAI();

/**
 * Server Action for Visual Generation.
 *
 * @example
 * ```tsx
 * 'use client';
 * import { generateImageAction } from 'galxai/actions';
 *
 * export function StudioButton() {
 *   const [result, setResult] = useState(null);
 *   return (
 *     <button onClick={async () => setResult(await generateImageAction('Cyberpunk city', { aspectRatio: '16:9' }))}>
 *       Generate
 *     </button>
 *   );
 * }
 * ```
 */
export async function generateImageAction(
  promptOrParams: string | ImageGenerateParams,
  options?: Omit<ImageGenerateParams, 'prompt'>
) {
  const params = typeof promptOrParams === 'string'
    ? { prompt: promptOrParams, ...options }
    : promptOrParams;

  const response = await serveImageRequest(serverClient, new Request('https://galx.ai/v1/images/generations', {
    method: 'POST', headers: { accept: 'application/json' },
    body: JSON.stringify({ ...params, response_format: 'url' }),
  }));
  const result = await response.json();
  return response.ok ? { success: true, data: result.data } : { success: false, error: result.error };
}

/**
 * Server Action for Chat Completions.
 */
export async function chatAction(
  promptOrMessages: string | Array<{ role: string; content: string }>,
  options: { model?: string; temperature?: number } = {}
) {
  try {
    const messages = typeof promptOrMessages === 'string'
      ? [{ role: 'user', content: promptOrMessages }]
      : promptOrMessages;

    const completion = await serverClient.chat.completions.create({
      model: options.model || 'galx-nova',
      messages: messages as any,
      temperature: options.temperature
    });

    return {
      success: true,
      text: completion.choices[0]?.message?.content || '',
      usage: completion.usage
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Chat action failed'
    };
  }
}

/**
 * Server Action to list active models and wholesale pricing.
 */
export async function listModelsAction() {
  try {
    const models = await serverClient.models.list();
    const list = Array.isArray(models) ? models : (models as any).data || [];
    return { success: true, data: list };
  } catch (err: any) {
    return {
      success: true,
      data: [
        { id: 'galx-nova', name: 'GALX Nova', description: 'Sustainable Intelligence Engine for reasoning and coding' },
        { id: 'galx-nova-image', name: 'GALX Nova-image', description: 'Visual synthesis engine for creative generation and diagrams' }
      ]
    };
  }
}
