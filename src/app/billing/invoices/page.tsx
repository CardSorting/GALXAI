import { BILLING_PATHS } from '@/lib/billing/navigation';
import { BillingClient } from '@/components/billing/BillingClient';
import { constructMetadata } from '@/lib/seo/metadata';
export const metadata = constructMetadata({ title: 'Invoices', description: 'View invoices for your account payments.', canonicalPath: BILLING_PATHS.invoices, noIndex: true });
export default function Page() { return <BillingClient page="invoices" />; }
