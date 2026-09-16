import { BILLING_PATHS } from '@/lib/billing/navigation';
import { BillingClient } from '@/components/billing/BillingClient';
import { constructMetadata } from '@/lib/seo/metadata';
export const metadata = constructMetadata({ title: 'Transactions', description: 'Review credit added, usage, and balance adjustments.', canonicalPath: BILLING_PATHS.transactions, noIndex: true });
export default function Page() { return <BillingClient page="transactions" />; }
