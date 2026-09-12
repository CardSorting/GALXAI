import type { NextRequest } from 'next/server';
import { requireAccountIdentity } from '@/lib/auth/accountIdentity';
import { sitesContentRoute } from '@/lib/billing/sites-content-route';
import { sitesContentConfiguration } from '@/lib/sites/content-configuration';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

const handle = sitesContentRoute({
  authenticate: request => requireAccountIdentity(request as NextRequest),
  configuration: sitesContentConfiguration,
});
export const GET = handle;
export const POST = handle;
