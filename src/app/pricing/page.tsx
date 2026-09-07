import { PricingClient } from '@/components/pricing/PricingClient';
import { PRICING_FAQS } from '@/lib/data/pricingSummary';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createBreadcrumbSchema, createFAQPageSchema } from '@/lib/seo/jsonld';

export const metadata = constructMetadata({
  title: 'Pricing and plans',
  description: 'Compare Solo, Team, and Enterprise plans. See model token rates, included seats, and how usage billing works.',
  canonicalPath: '/pricing',
});

export default function PricingPage() {
  return <>
    <JsonLd data={{ '@context': 'https://schema.org', '@graph': [
      createFAQPageSchema(PRICING_FAQS),
      createBreadcrumbSchema([{ name: 'Home', url: '/models' }, { name: 'Pricing', url: '/pricing' }]),
    ] }} />
    <PricingClient />
  </>;
}
