import { redirect } from 'next/navigation';

export default function BillingSeatsRedirect() {
  redirect('/teams/seats');
}
