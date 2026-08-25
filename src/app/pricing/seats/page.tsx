import type { Metadata } from 'next';
import { SeatPricingClient } from '@/components/pricing/SeatPricingClient';

export const metadata: Metadata = {
  title: 'Small Business & Enterprise Seat Plans | GALXAI Pricing',
  description: 'Explore team seat tiers with included monthly compute credits, shared wallets, per-member spend caps, and 25%-40% wholesale model pricing.',
  alternates: {
    canonical: 'https://galx.ai/pricing/seats',
  },
  openGraph: {
    title: 'Small Business & Enterprise Seat Plans | GALXAI',
    description: 'Unified AI engineering seats with pooled compute credits and wholesale rates.',
    url: 'https://galx.ai/pricing/seats',
  },
};

export default function SeatPricingPage() {
  return <SeatPricingClient />;
}
