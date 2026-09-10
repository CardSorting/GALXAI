/** Browser-only image studio contracts. Keep these independent of server internals. */
export const IMAGE_MODEL = { id: 'openai-gpt-image-latest', name: 'OpenAI Image Generation' } as const;
export const MAX_PROMPT = 32_000;
export const RATIOS = [
  { value: '1:1', label: 'Square', size: '1024x1024', width: 20, height: 20 },
  { value: '3:2', label: 'Landscape', size: '1536x1024', width: 26, height: 18 },
  { value: '9:16', label: 'Portrait', size: '1024x1792', width: 14, height: 25 },
  { value: '16:9', label: 'Wide', size: '1792x1024', width: 28, height: 16 },
  { value: '4:3', label: 'Classic', size: '1024x768', width: 24, height: 18 },
] as const;
export type Ratio = typeof RATIOS[number]['value'];
export interface StudioSettings { prompt: string; ratio: Ratio; quality: 'standard' | 'hd'; count: number }
export interface StudioImage {
  id: string; prompt: string; url: string; ratio: string; quality: 'standard' | 'hd';
  createdAt: string; favorite: boolean; saved: boolean;
}
export interface PendingGeneration { id: string; startedAt: number; settings: StudioSettings }
export const DEFAULT_SETTINGS: StudioSettings = { prompt: '', ratio: '1:1', quality: 'standard', count: 1 };
export const STARTERS = [
  { title: 'Somewhere unexpected', category: 'Cinematic landscape', image: '/images/studio/desert.webp', ratio: '3:2' as Ratio,
    alt: 'Terracotta dunes beside a blue desert lake',
    prompt: 'A cinematic photograph of terracotta dunes beside a still blue desert lake. A tiny traveler stands on a ridge. Wind-rippled sand, distant mountains, soft evening light, extraordinary natural detail.' },
  { title: 'Make the everyday extraordinary', category: 'Product photography', image: '/images/studio/glass.webp', ratio: '1:1' as Ratio,
    alt: 'Cobalt blue perfume bottle on sunlit travertine',
    prompt: 'A sculptural cobalt blue glass perfume bottle on a warm travertine plinth. Hard afternoon sunlight, crisp shadows, refracted blue light on stone. Editorial product photography. No label or text.' },
  { title: 'Build a little world', category: 'Paper illustration', image: '/images/studio/paper.webp', ratio: '1:1' as Ratio,
    alt: 'Paper miniature of a house on a floating garden island',
    prompt: 'A tiny cream house with a red roof on a floating island of lush foliage, a winding path, and one fluffy cloud against a dusty rose sky. Tactile layered paper illustration with dimensional shadows.' },
];

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export function readSettings(value: unknown): StudioSettings {
  const data = object(value);
  return {
    prompt: typeof data.prompt === 'string' ? data.prompt.slice(0, MAX_PROMPT) : '',
    ratio: RATIOS.some(r => r.value === data.ratio) ? data.ratio as Ratio : '1:1',
    quality: data.quality === 'hd' ? 'hd' : 'standard',
    count: Number.isInteger(data.count) && Number(data.count) >= 1 && Number(data.count) <= 4 ? Number(data.count) : 1,
  };
}
export function readPending(value: unknown): PendingGeneration | null {
  const data = object(value);
  if (typeof data.id !== 'string' || !/^[a-zA-Z0-9_-]{1,160}$/.test(data.id) ||
    typeof data.startedAt !== 'number' || !Number.isFinite(data.startedAt)) return null;
  return { id: data.id, startedAt: data.startedAt, settings: readSettings(data.settings) };
}
export function generationBody(settings: StudioSettings) {
  const clean = readSettings(settings);
  return { model: IMAGE_MODEL.id, prompt: clean.prompt.trim(), n: clean.count,
    size: RATIOS.find(r => r.value === clean.ratio)!.size, quality: clean.quality, response_format: 'url' };
}

/** Only same-origin artifact paths and encoded raster data are displayable. */
export function safeImageUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (/^\/v1\/images\/assets\/[A-Za-z0-9_.-]+$/.test(value)) return value;
  if (value.startsWith('https://') || value.startsWith('http://')) {
    try {
      const url = new URL(value);
      const origin = typeof window === 'undefined' ? 'https://galx.ai' : window.location.origin;
      if ((url.origin === origin || url.origin === 'https://galx.ai') && !url.username && !url.password && !url.search && !url.hash &&
        /^\/v1\/images\/assets\/[A-Za-z0-9_.-]+$/.test(url.pathname)) return url.pathname;
    } catch { return null; }
  }
  if (value.length <= 45_000_000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) return value;
  return null;
}
export function readLibrary(value: unknown): { images: StudioImage[]; cursor: string | null; total: number } {
  const data = object(value);
  if (data.success !== true || !Array.isArray(data.records)) throw new Error('Invalid library response');
  const images: StudioImage[] = [];
  for (const entry of data.records) {
    const row = object(entry), url = safeImageUrl(row.publicUrl);
    if (!url || row.status !== 'completed' || typeof row.id !== 'string' || !/^[A-Za-z0-9._:-]{1,160}$/.test(row.id)) continue;
    images.push({ id: row.id, url, prompt: typeof row.prompt === 'string' ? row.prompt.slice(0, MAX_PROMPT) : '',
      ratio: typeof row.aspectRatio === 'string' && /^\d{1,2}:\d{1,2}$/.test(row.aspectRatio) ? row.aspectRatio : '1:1',
      quality: row.quality === 'hd' ? 'hd' : 'standard', createdAt: typeof row.createdAt === 'string' && Number.isFinite(Date.parse(row.createdAt)) ? row.createdAt : '',
      favorite: row.isFavorite === true, saved: true });
  }
  return { images, cursor: typeof data.nextCursor === 'string' ? data.nextCursor : null,
    total: typeof data.total === 'number' && Number.isFinite(data.total) ? Math.max(0, data.total) : images.length };
}
export function readGeneration(value: unknown, settings: StudioSettings, id: string): StudioImage[] {
  const data = object(value);
  if (!Array.isArray(data.data) || !data.data.length || data.data.length > 4) throw new Error('Invalid image response');
  return data.data.map((entry, index) => {
    const row = object(entry);
    let url = safeImageUrl(row.url);
    if (!url && typeof row.b64_json === 'string') {
      const b64 = row.b64_json;
      const type = b64.startsWith('iVBOR') ? 'png' : b64.startsWith('/9j/') ? 'jpeg' : b64.startsWith('UklGR') ? 'webp' : null;
      if (type) url = safeImageUrl(`data:image/${type};base64,${b64}`);
    }
    if (!url) throw new Error('Invalid image artifact');
    return { id: `${id}-${index}`, url, prompt: settings.prompt, ratio: settings.ratio,
      quality: settings.quality, createdAt: new Date().toISOString(), favorite: false, saved: false };
  });
}
export function studioError(status: number): string {
  if (status === 401 || status === 403) return 'Your session has expired. Sign in again to continue.';
  if (status === 429) return 'Your request limit has been reached. Wait before trying again.';
  if (status === 400) return 'Check your prompt and settings, then try again.';
  if (status === 404) return 'This request is no longer available. Check your library for its images before generating again.';
  return 'We couldn’t confirm the result. Check your library before generating again.';
}
