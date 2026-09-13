import type { NextRequest } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { requireAccountIdentity } from './accountIdentity';
import { readSessionBody, requireSessionMutation, sessionFailure, sessionResponse } from './session-http';
import { sessionProfile } from './session-profile';
import type { ProviderAuthResult } from '@/core/contracts/GalxContracts';

export function providerConnectionDTO(result: ProviderAuthResult) {
  if (!result.success || !result.user) return { success: false, error: 'The connection could not be saved.' };
  return { success: true, user: { ...sessionProfile(result.user), token: result.user.token, expiresAtMs: result.user.expiresAtMs } };
}
/** Connection credentials belong to an already authenticated account; they never establish that account. */
export async function connectProvider(req: NextRequest) {
  try {
    requireSessionMutation(req);
    const account = await requireAccountIdentity(req), body = await readSessionBody(req);
    for (const field of ['apiKey', 'accessToken', 'refreshToken', 'idToken', 'accountId']) {
      if (body[field] !== undefined && (typeof body[field] !== 'string' || (body[field] as string).length > 16384)) return sessionResponse({ error: 'Check your connection details.' }, 400);
    }
    if (!body.apiKey && !body.accessToken) return sessionResponse({ error: 'Connection credentials are required.' }, 400);
    const result = await GalxAuthEngine.getInstance().authenticateProviderUser('openai', {
      apiKey: body.apiKey as string | undefined, accessToken: body.accessToken as string | undefined,
      refreshToken: body.refreshToken as string | undefined, idToken: body.idToken as string | undefined,
      accountId: body.accountId as string | undefined,
      expiresAtMs: typeof body.expiresAtMs === 'number' && Number.isFinite(body.expiresAtMs) ? body.expiresAtMs : undefined,
      userAgent: req.headers.get('user-agent')?.slice(0, 512),
    }, account);
    return sessionResponse(providerConnectionDTO(result), result.success ? 200 : 400);
  } catch (error) { return sessionFailure(error); }
}
