import { redirect } from 'next/navigation';

export default function BillingTeamsRedirect() {
  redirect('/teams/cost-centers');
}
