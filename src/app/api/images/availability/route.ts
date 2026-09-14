import type { NextRequest } from 'next/server';
import { requireAccountIdentity } from '@/lib/auth/accountIdentity';
import { sessionFailure, sessionResponse } from '@/lib/auth/session-http';
import { readImageAvailability } from '@/lib/images/availability';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAccountIdentity(request);
    return sessionResponse({ status: await readImageAvailability() });
  } catch (error) { return sessionFailure(error); }
}
