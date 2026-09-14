import type { NextRequest } from 'next/server';
import { requireAccountIdentity } from '@/lib/auth/accountIdentity';
import { generationAccess } from '@/lib/billing/generation-access';
import { readFreeGenerationQuota } from '@/lib/billing/free-generation-quota';
import { readFreeAvailability } from '@/lib/billing/free-generation-gate';
import { generationQuotaRoute } from '@/lib/billing/generation-quota-route';
import { getPostgresPool } from '@/lib/db/postgres';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = generationQuotaRoute({
  authenticate: request => requireAccountIdentity(request as NextRequest),
  plan: owner => generationAccess(owner),
  quota: owner => { const pool=getPostgresPool(); if(!pool)throw new Error(); return readFreeGenerationQuota(pool,owner); },
  availability: owner => { const pool=getPostgresPool(); if(!pool)throw new Error(); return readFreeAvailability(pool,owner); },
});
