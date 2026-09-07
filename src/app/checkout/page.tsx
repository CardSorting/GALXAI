import { redirect } from 'next/navigation';
import { depositAmount } from '@/lib/billing/payment';
export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ plan?: string; amount?: string }> }) {
  const params = await searchParams;
  if (params.plan) redirect('/pricing#plans');
  let amount: number | undefined;
  try { amount = depositAmount(params.amount); } catch { /* Show the standard amount selector. */ }
  redirect(`/keys/top-up${amount ? `?amount=${amount}` : ''}`);
}
