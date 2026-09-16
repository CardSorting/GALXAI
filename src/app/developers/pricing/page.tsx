import type { Metadata } from 'next';
import { DeveloperPricingClient } from '@/components/developers/DeveloperPricingClient';
import { constructMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = constructMetadata({
  title: 'Developer Tier & Compute Pricing — Images and Frontier OpenAI Models',
  description: 'Instant Developer Tier unlock for $10 USD. Pay-as-you-go API access for image generation and frontier OpenAI models with up to 100% compute match bonus.',
  canonicalPath: '/developers/pricing',
  keywords: [
    'Developer Tier Pricing',
    'OpenAI Model API Pricing',
    'GPT-5.6 Sol Token Rates',
    'Image Generation API Pricing',
    'Prepaid AI Compute Credits',
    'Prompt Caching Discounts',
    'Wholesale AI Inference',
    'OpenAI Compatible API Gateway',
  ],
});

export default function DeveloperPricingPage() {
  return <DeveloperPricingClient />;
}
