import { NextRequest } from 'next/server';
import { billingReadRoute } from '@/lib/billing/readRoute';
import { BillingError } from '@/lib/billing/account';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET(req: NextRequest) {
  return billingReadRoute(req, async (db, userId) => {
    const id = req.nextUrl.searchParams.get('session_id');
    if (!id || id.length > 255 || id.startsWith('cs_mock_')) throw new BillingError('Invalid checkout session.');
    const { rows } = await db.query(`SELECT session_id, status, payment_status, amount_usd FROM galx_stripe_checkout_sessions WHERE session_id = $1 AND user_id = $2`, [id, userId]);
    const session = rows[0];
    if (!session) throw new BillingError('Checkout session not found.', 404);
    return { success: true, session: { sessionId: session.session_id, status: session.status, paymentStatus: session.payment_status,
      verified: session.payment_status === 'paid', amountTotalUsd: Number(session.amount_usd) } };
  });
}
