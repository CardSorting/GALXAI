/** Browser-only image studio contracts. Keep these independent of server internals. */
export const IMAGE_MODEL = { id: 'galx-nova-image', name: 'GALX Nova-image' } as const;
export const MAX_PROMPT = 32_000;
export const LIBRARY_PAGE_SIZE = 36;
export const RECENT_IMAGE_LIMIT = 120;
const RECENT_TEXT_BUDGET = 16 * 1024 * 1024;
export const RATIOS = [
  { value: '1:1', label: 'Square', size: '1024x1024', width: 20, height: 20, useCase: 'Social · Avatar' },
  { value: '3:2', label: 'Landscape', size: '1536x1024', width: 26, height: 18, useCase: 'Photography' },
  { value: '9:16', label: 'Portrait', size: '1024x1792', width: 14, height: 25, useCase: 'Stories · Reels' },
  { value: '16:9', label: 'Wide', size: '1792x1024', width: 28, height: 16, useCase: 'Desktop · Banner' },
  { value: '4:3', label: 'Classic', size: '1024x768', width: 24, height: 18, useCase: 'Standard Photo' },
] as const;
export type Ratio = typeof RATIOS[number]['value'];
export interface StudioSettings { prompt: string; ratio: Ratio; quality: 'standard' | 'hd'; count: number }
export interface StudioImage {
  id: string; prompt: string; url: string; ratio: string; quality: 'standard' | 'hd';
  createdAt: string; favorite: boolean; saved: boolean;
  thumbnailUrl?: string; detailsLoaded?: boolean;
}
export const MAX_ACTIVE_GENERATIONS = 4;
export interface PendingGeneration { id: string; startedAt: number; settings: StudioSettings; paused?: true }
export const DEFAULT_SETTINGS: StudioSettings = { prompt: '', ratio: '1:1', quality: 'standard', count: 1 };

export interface StylePreset {
  id: string;
  name: string;
  tag: string;
}

export const STYLE_PRESETS: StylePreset[] = [
  { id: 'photoreal', name: 'Photorealistic', tag: 'photorealistic, highly detailed 8k photography' },
  { id: 'cinematic', name: 'Cinematic', tag: 'cinematic lighting, dramatic atmosphere, 35mm film look' },
  { id: 'digital_art', name: 'Digital Art', tag: 'vibrant digital art, concept illustration, detailed rendering' },
  { id: 'anime', name: 'Anime', tag: 'anime aesthetic, expressive studio key visual, crisp cel shaded' },
  { id: '3d_render', name: '3D Render', tag: '3D octane render, raytraced reflections, Unreal Engine 5' },
  { id: 'vintage', name: 'Vintage Film', tag: 'vintage analog film photography, authentic grain, 1970s tones' },
  { id: 'cyberpunk', name: 'Cyberpunk', tag: 'cyberpunk aesthetic, vibrant neon reflections, night rain' },
  { id: 'minimalist', name: 'Minimalist', tag: 'minimalist composition, clean geometric form, quiet negative space' },
];

export interface StarterTemplate {
  id: string;
  title: string;
  category: string;
  prompt: string;
  ratio: Ratio;
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'architecture',
    title: 'Alpine Glass Pavilion',
    category: 'Architecture',
    prompt: 'A sleek modern glass pavilion nestled on the tranquil shore of an alpine mountain lake at dusk, warm interior glow, misty water surface, cinematic lighting',
    ratio: '16:9',
  },
  {
    id: 'wildlife',
    title: 'Himalayan Snow Leopard',
    category: 'Wildlife',
    prompt: 'A majestic snow leopard resting gracefully atop a frosted Himalayan mountain cliff, golden morning sunrise backlight, ultra-sharp fur detail, ethereal peaks',
    ratio: '3:2',
  },
  {
    id: 'futuristic',
    title: 'Neon Tokyo Concept Vehicle',
    category: 'Concept Design',
    prompt: 'An aerodynamic concept electric sports car parked in a neon-lit Tokyo street after rain, reflections of magenta and cyan signage, sleek matte finish, 8k',
    ratio: '16:9',
  },
];

export const INSPIRATION_PROMPTS = [
  'A luminous botanical glasshouse floating in a tranquil twilight forest, fireflies casting emerald light, ultra-detailed foliage',
  'An editorial high-fashion portrait with sculpted botanical headwear, dramatic chiaroscuro studio lighting, textured linen backdrop',
  'A cozy retro coffee roastery in Kyoto with warm morning sunlight slanting through wooden blinds, copper espresso machine, rising steam',
  'A peaceful futuristic floating garden overlooking the ocean at sunset, curving white bridges, calm reflecting pools, pastel clouds',
  'An ancient enchanted sandstone library carved into canyon walls with towering book stacks and floating brass lanterns, cinematic',
];

export type GenerationPhaseKey = 'queued' | 'synthesizing' | 'refining' | 'finalizing';

export interface GenerationPhaseInfo {
  key: GenerationPhaseKey;
  stepNumber: number;
  label: string;
  shortLabel: string;
  description: string;
}

export const GENERATION_PHASES: Record<GenerationPhaseKey, GenerationPhaseInfo> = {
  queued: {
    key: 'queued',
    stepNumber: 1,
    label: 'Preparing request',
    shortLabel: 'Setup',
    description: 'Scheduling request and preparing image pipeline…',
  },
  synthesizing: {
    key: 'synthesizing',
    stepNumber: 2,
    label: 'Composing artwork',
    shortLabel: 'Composing',
    description: 'Synthesizing scene layout, composition, and forms…',
  },
  refining: {
    key: 'refining',
    stepNumber: 3,
    label: 'Refining details',
    shortLabel: 'Detailing',
    description: 'Refining lighting, textures, color balance, and clarity…',
  },
  finalizing: {
    key: 'finalizing',
    stepNumber: 4,
    label: 'Finalizing asset',
    shortLabel: 'Finalizing',
    description: 'Encoding high-resolution image and preparing preview…',
  },
};

/** Calculate realistic baseline duration in seconds based on request parameters. */
export function estimateGenerationSeconds(settings: StudioSettings): number {
  const base = settings.quality === 'hd' ? 22 : 14;
  const ratioExtra = ['16:9', '9:16', '3:2'].includes(settings.ratio) ? 2 : 0;
  const countExtra = (settings.count - 1) * 3;
  return base + ratioExtra + countExtra;
}

/** Compute dynamic progress percentage, remaining seconds, and active phase. */
export function calculateGenerationProgress(elapsedSeconds: number, estimatedTotal: number, serverStatus?: string): {
  percent: number;
  remainingSeconds: number;
  phase: GenerationPhaseInfo;
  statusText: string;
} {
  const isQueued = serverStatus === 'queued';
  const remainingSeconds = Math.max(0, estimatedTotal - elapsedSeconds);

  let phaseKey: GenerationPhaseKey = 'queued';
  if (isQueued || elapsedSeconds < 3) {
    phaseKey = 'queued';
  } else if (elapsedSeconds < Math.round(estimatedTotal * 0.55)) {
    phaseKey = 'synthesizing';
  } else if (elapsedSeconds < Math.round(estimatedTotal * 0.88)) {
    phaseKey = 'refining';
  } else {
    phaseKey = 'finalizing';
  }

  let percent: number;
  if (isQueued && elapsedSeconds < 4) {
    percent = Math.min(18, 5 + elapsedSeconds * 3);
  } else if (elapsedSeconds <= estimatedTotal) {
    const ratio = elapsedSeconds / Math.max(1, estimatedTotal);
    percent = Math.round(15 + (1 - (1 - ratio) ** 1.6) * 77);
  } else {
    const overTime = elapsedSeconds - estimatedTotal;
    const extra = (1 - Math.exp(-overTime / 12)) * 5;
    percent = Math.min(97, Math.round(92 + extra));
  }

  const phase = GENERATION_PHASES[phaseKey];
  let statusText = phase.description;
  if (elapsedSeconds > estimatedTotal) {
    statusText = 'Taking a few extra seconds to polish details… almost ready!';
  }

  return {
    percent,
    remainingSeconds,
    phase,
    statusText,
  };
}

/** Keep completion order without duplicating a receipt observed more than once. */
export function appendCreations(current: StudioImage[], completed: StudioImage[], pinnedId?: string | null): StudioImage[] {
  const seen = new Set(current.map(image => image.id));
  const combined = [...current, ...completed.filter(image => {
    if (seen.has(image.id)) return false;
    seen.add(image.id);
    return true;
  })];
  const pinned = combined.find(image => image.id === pinnedId);
  let bytes = pinned ? creationWeight(pinned) : 0;
  const keep = new Set<string>(pinned ? [pinned.id] : []);
  for (let index = combined.length - 1; index >= 0; index--) {
    const image = combined[index];
    if (keep.has(image.id)) continue;
    const weight = creationWeight(image);
    // Always keep the newest result, even for a legacy inline image larger than the budget.
    if (index !== combined.length - 1 && (keep.size >= RECENT_IMAGE_LIMIT || bytes + weight > RECENT_TEXT_BUDGET)) continue;
    keep.add(image.id); bytes += weight;
  }
  return combined.filter(image => keep.has(image.id));
}
function creationWeight(image: StudioImage): number { return 2 * (image.prompt.length + image.url.length + (image.thumbnailUrl?.length || 0) + 160); }

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
  return { id: data.id, startedAt: data.startedAt, settings: readSettings(data.settings), ...(data.paused === true ? { paused: true as const } : {}) };
}
export function readPendingGenerations(value: unknown): PendingGeneration[] {
  const entries = Array.isArray(value) ? value : [value];
  const unique = new Map<string, PendingGeneration>();
  for (const entry of entries.slice(0, MAX_ACTIVE_GENERATIONS)) {
    const task = readPending(entry);
    if (task) unique.set(task.id, task);
  }
  return [...unique.values()];
}

export function generationStatusFailure(status: number, value: unknown): 'not-started' | 'unconfirmed' | 'retry' | 'auth' {
  const code = object(object(value).error).code;
  if (status === 503 && code === 'generation_not_started') return 'not-started';
  if (status === 502 && code === 'generation_failed') return 'unconfirmed';
  if (status === 401 || status === 403) return 'auth';
  if (status === 404 || status === 409 || status === 400) return 'unconfirmed';
  return 'retry';
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
export function readLibrary(value: unknown): { images: StudioImage[]; cursor: string | null; previousCursor: string | null; total: number | null } {
  const data = object(value);
  if (data.success !== true || !Array.isArray(data.records) || data.records.length > LIBRARY_PAGE_SIZE) throw new Error('Invalid library response');
  const images: StudioImage[] = [];
  for (const entry of data.records) {
    const row = object(entry), url = safeImageUrl(row.publicUrl);
    if (!url || row.status !== 'completed' || typeof row.id !== 'string' || !/^[A-Za-z0-9._:-]{1,160}$/.test(row.id)) continue;
    images.push({ id: row.id, url, prompt: typeof row.prompt === 'string' ? row.prompt.slice(0, MAX_PROMPT) : typeof row.promptPreview === 'string' ? row.promptPreview.slice(0, 300) : '',
      thumbnailUrl: thumbnailUrl(url), detailsLoaded: typeof row.prompt === 'string',
      ratio: typeof row.aspectRatio === 'string' && /^\d{1,2}:\d{1,2}$/.test(row.aspectRatio) ? row.aspectRatio : '1:1',
      quality: row.quality === 'hd' ? 'hd' : 'standard', createdAt: typeof row.createdAt === 'string' && Number.isFinite(Date.parse(row.createdAt)) ? row.createdAt : '',
      favorite: row.isFavorite === true, saved: true });
  }
  return { images, cursor: typeof data.nextCursor === 'string' ? data.nextCursor : null,
    previousCursor: typeof data.previousCursor === 'string' ? data.previousCursor : null,
    total: typeof data.total === 'number' && Number.isFinite(data.total) ? Math.max(0, data.total) : null };
}
export function thumbnailUrl(url: string): string | undefined { return url.startsWith('/v1/images/assets/') ? `${url}/thumbnail` : undefined; }
export function readImageDetail(value: unknown, id: string): StudioImage {
  const data = object(value), record = object(data.record);
  const image = readLibrary({ success: data.success, records: [record] }).images[0];
  if (!image || image.id !== id || !image.detailsLoaded) throw new Error('Invalid image details');
  return image;
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
    return { id: `${id}-${index}`, url, thumbnailUrl: thumbnailUrl(url), detailsLoaded: true, prompt: settings.prompt, ratio: settings.ratio,
      quality: settings.quality, createdAt: new Date().toISOString(), favorite: false, saved: false };
  });
}
export function studioError(status: number): string {
  if (status === 402) return 'Your free image generation quota is used up. Upgrade to Pro to keep creating.';
  if (status === 403) return 'This action isn’t available for your account.';
  if (status === 401) return 'Your session has expired. Sign in again to continue.';
  if (status === 429) return 'Your request limit has been reached. Wait before trying again.';
  if (status === 400) return 'Check your prompt and settings, then try again.';
  if (status === 404) return 'This request is no longer available. Check your library for its images before generating again.';
  return 'We couldn’t confirm the result. Check your library before generating again.';
}
