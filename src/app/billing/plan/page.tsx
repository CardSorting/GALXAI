import { BILLING_PATHS } from '@/lib/billing/navigation';
import { BillingClient } from '@/components/billing/BillingClient';
import { constructMetadata } from '@/lib/seo/metadata';
export const metadata = constructMetadata({ title: 'Your plan', description: 'Review Foundry, your Orbits, and subscription management.', canonicalPath: BILLING_PATHS.plan, noIndex: true });
export default function Page() { return <BillingClient page="plan" />; }
