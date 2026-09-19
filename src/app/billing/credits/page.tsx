import { BILLING_PATHS } from '@/lib/billing/navigation';
import { BillingClient } from '@/components/billing/BillingClient';
import { constructMetadata } from '@/lib/seo/metadata';
export const metadata = constructMetadata({ title: 'Account credit', description: 'Review existing account credit and activity. GALX Nova Developer Access is a separate subscription.', canonicalPath: BILLING_PATHS.credits, noIndex: true });
export default function Page() { return <BillingClient page="credits" />; }
