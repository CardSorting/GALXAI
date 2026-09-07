/** Known pre-dispatch rejection: a later retry cannot replay accepted image work. */
export class ImageCapacityError extends Error {
  readonly code = 'image_capacity_unavailable';
  readonly status = 503;
  readonly retryAfterSeconds: number;
  constructor(retryAtMs?: number, nowMs = Date.now()) {
    const seconds = Number.isFinite(retryAtMs) ? Math.max(1, Math.ceil((retryAtMs! - nowMs) / 1000)) : 5;
    super(`Image generation is temporarily busy. Try again in ${seconds} second${seconds === 1 ? '' : 's'}.`);
    this.name = 'ImageCapacityError';
    this.retryAfterSeconds = seconds;
  }
}
