import type { NextRequest } from 'next/server';
import { sessionResponse } from './session-http';
import { sessionProfile } from './session-profile';
import type { ProviderAuthResult } from '@/core/contracts/GalxContracts';

const closedProviderPaths = new Set([
  '/api/auth/openai', '/api/auth/ingest', '/api/ingest',
  '/api/auth/oauth/url', '/api/auth/oauth/callback', '/api/auth/oauth/par', '/api/auth/oauth/refresh',
]);
export function isClosedProviderPath(pathname: string): boolean {
  return closedProviderPaths.has(pathname);
}

export function providerConnectionDTO(result: ProviderAuthResult) {
  if (!result.success || !result.user) return { success: false, error: 'The connection could not be saved.' };
  return { success: true, user: { ...sessionProfile(result.user), token: result.user.token, expiresAtMs: result.user.expiresAtMs } };
}
/** External provider ingestion is permanently closed. Never parse credential input. */
export async function connectProvider(_req: NextRequest) {
  return sessionResponse({ error: 'Provider connections are unavailable.' }, 410);
}
