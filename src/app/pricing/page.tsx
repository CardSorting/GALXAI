import type { Metadata } from 'next';
import { PricingClient } from '@/components/pricing/PricingClient';
import { VOLUME_TIERS } from '@/lib/data/pricingData';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createBreadcrumbSchema, createFAQPageSchema } from '@/lib/seo/jsonld';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';

export const metadata: Metadata = constructMetadata({
  title: 'Transparent Wholesale AI Pricing & Volume Rebates',
  description: 'Direct wholesale rates on OpenAI GPT-5.6 Sol, Terra, Luna, and xAI Grok 4.5. 25% to 40% below direct list with 75% prompt caching and 0% gateway markup.',
  canonicalPath: '/pricing',
  keywords: [
    'Wholesale AI Pricing',
    'GPT-5.6 Pricing',
    'Grok 4.5 Pricing',
    'Prompt Caching Calculator',
    'Cheapest OpenAI API Gateway',
    'AI Token Discounts',
    'Zero Platform Fee AI Router',
  ],
});

export default function PricingPage() {
  const pricingFaqs = [
    {
      q: 'How does GALXAI deliver 25%–40% discounts on frontier AI models?',
      a: 'GALXAI pools compute demand across enterprise tiers, securing wholesale clearinghouse rates directly from underlying infrastructure providers and passing 100% of these savings with zero platform seat fees.',
    },
    {
      q: 'How does the 75% Prompt Caching Pass-Through rebate work?',
      a: 'Whenever an input prompt shares a common system prefix, tool definition, or context window >1,024 tokens, upstream caching rates apply. GALXAI returns 100% of this 75% rebate directly into your wallet.',
    },
    {
      q: 'Are there monthly minimum commitments or subscription lock-ins?',
      a: 'No. GALXAI is pure pay-as-you-go with automated volume tiers based on rolling 30-day usage. No contracts, minimum spend, or sales calls required.',
    },
  ];

  const priceSpecificationSchema = {
    '@context': 'https://schema.org',
    '@type': 'PriceSpecification',
    priceCurrency: 'USD',
    minPrice: '0.00',
    description: 'Wholesale AI Token rates with 25%–40% discounts and 75% prompt caching pass-through.',
  };

  const aggregateOfferSchema = {
    '@context': 'https://schema.org',
    '@type': 'AggregateOffer',
    priceCurrency: 'USD',
    lowPrice: '0.75',
    highPrice: '15.00',
    offerCount: VOLUME_TIERS.length.toString(),
    offers: VOLUME_TIERS.map((tier) => ({
      '@type': 'Offer',
      name: tier.name,
      description: tier.description,
      price: tier.monthlySpendMin.toFixed(2),
      priceCurrency: 'USD',
      url: `${SITE_CONFIG.url}/pricing`,
    })),
  };

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      priceSpecificationSchema,
      aggregateOfferSchema,
      createFAQPageSchema(pricingFaqs),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Pricing', url: '/pricing' },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <PricingClient />
    </>
  );
}
