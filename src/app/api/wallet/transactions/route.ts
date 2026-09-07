import { NextRequest } from 'next/server';
import { readBillingTransactions } from '@/lib/billing/account';
import { billingReadRoute } from '@/lib/billing/readRoute';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET(req: NextRequest) {
  return billingReadRoute(req, async (db, userId) => ({ success: true, ...await readBillingTransactions(db, userId, req.nextUrl.searchParams) }));
}
