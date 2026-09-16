import { BILLING_PATHS } from '@/lib/billing/navigation';
import { BillingClient } from '@/components/billing/BillingClient';
import { constructMetadata } from '@/lib/seo/metadata';
export const metadata = constructMetadata({ title: 'Payment settings', description: 'Manage your saved payment methods securely.', canonicalPath: BILLING_PATHS.payments, noIndex: true });
export default function Page() { return <BillingClient page="payments" />; }
