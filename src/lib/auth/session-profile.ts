/** Public identity presentation only; it never grants permissions. */
export interface SessionProfile { id: string; email?: string; name?: string; }
export function sessionProfile(value: { id: string; email?: unknown; name?: unknown }): SessionProfile {
  return { id: value.id, ...(typeof value.email === 'string' ? { email: value.email.slice(0, 254) } : {}), ...(typeof value.name === 'string' ? { name: value.name.slice(0, 160) } : {}) };
}
