import { NextRequest } from 'next/server';
import { billingReadRoute } from '@/lib/billing/readRoute';
import { depositAmount } from '@/lib/billing/payment';
import { readTopUpQuote } from '@/lib/billing/quote';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET(req: NextRequest) {
  return billingReadRoute(req, async (db, userId) => {
    const amount = depositAmount(req.nextUrl.searchParams.get('amount'));
    return readTopUpQuote(db, userId, amount);
  });
}
