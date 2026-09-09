export interface DesktopLoginState {
  state: 'idle' | 'starting' | 'waiting' | 'saved' | 'failed' | 'cancelled' | 'expired' | 'unavailable';
  userCode?: string; verificationUri?: string; expiresAt?: number;
}
/** Guest-controlled metadata is never forwarded; the verification origin is fixed. */
export function desktopLoginState(value: unknown, now = Date.now()): DesktopLoginState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { state: 'idle' };
  const v = value as Record<string, unknown>;
  if (!['starting', 'waiting', 'saved', 'failed', 'cancelled', 'expired'].includes(String(v.state))) return { state: 'unavailable' };
  if (!Number.isSafeInteger(v.updatedAt) || (v.updatedAt as number) > now + 60000) return { state: 'unavailable' };
  if (['starting', 'waiting'].includes(String(v.state))) {
    if (!Number.isSafeInteger(v.expiresAt) || (v.expiresAt as number) > now + 960000) return { state: 'unavailable' };
    if ((v.expiresAt as number) <= now) return { state: 'expired' };
    if (v.state === 'waiting') {
      if (typeof v.userCode !== 'string' || !/^[A-Z0-9]{4}-[A-Z0-9]{4,5}$/.test(v.userCode)) return { state: 'unavailable' };
      return { state: 'waiting', userCode: v.userCode, verificationUri: 'https://auth.openai.com/codex/device', expiresAt: v.expiresAt as number };
    }
  }
  return { state: v.state as DesktopLoginState['state'] };
}
