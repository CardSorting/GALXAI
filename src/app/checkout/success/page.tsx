import { redirect } from 'next/navigation';
export default function CheckoutReturnPage() { redirect('/billing?checkout=returned'); }
