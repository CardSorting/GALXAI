import { BILLING_PATHS } from '@/lib/billing/navigation';
import { BillingClient } from '@/components/billing/BillingClient';
import { constructMetadata } from '@/lib/seo/metadata';
export const metadata = constructMetadata({ title: 'Billing overview', description: 'Your GALX Pro plan and existing account credit, with links to transactions, invoices, and payment settings.', canonicalPath: BILLING_PATHS.overview, noIndex: true });
export default function BillingPage() {
  return <BillingClient />;
}
