import { parseSignupCreditOffer, type SignupCreditOffer } from './signup-offer';

export function createSignupOfferHandler(read: () => Promise<SignupCreditOffer>) {
  return async function GET() {
    const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
    try {
      const offer = parseSignupCreditOffer(await read());
      if (!offer) throw new Error('Invalid offer');
      return Response.json(offer, { headers });
    } catch {
      return Response.json({ error: { code: 'offer_unavailable', message: 'Signup offer is temporarily unavailable.' } }, { status: 503, headers });
    }
  };
}
