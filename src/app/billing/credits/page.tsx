import { BILLING_PATHS } from '@/lib/billing/navigation';
import { BillingClient } from '@/components/billing/BillingClient';
import { constructMetadata } from '@/lib/seo/metadata';
export const metadata = constructMetadata({ title: 'Credits', description: 'Add prepaid credit for API and image usage.', canonicalPath: BILLING_PATHS.credits, noIndex: true });
export default function Page() { return <BillingClient page="credits" />; }
