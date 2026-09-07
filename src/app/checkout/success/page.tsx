import { redirect } from 'next/navigation';
export default async function CheckoutReturnPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  redirect(`/billing?checkout=returned${session_id ? `&session_id=${encodeURIComponent(session_id)}` : ''}`);
}
