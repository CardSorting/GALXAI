import type { Metadata } from 'next';
import { SeatPricingClient } from '@/components/pricing/SeatPricingClient';

export const metadata: Metadata = {
  title: 'Dual Seat & Compute ROI Savings Calculator | GALXAI',
  description: 'Simulate your engineering team&apos;s annual savings when switching from fragmented OpenAI/Anthropic seat subscriptions to GALXAI wholesale seats and compute.',
  alternates: {
    canonical: 'https://galx.ai/pricing/calculator',
  },
  openGraph: {
    title: 'Dual Seat & Compute ROI Savings Calculator | GALXAI',
    description: 'Calculate net annual savings on team seats and wholesale AI token spend.',
    url: 'https://galx.ai/pricing/calculator',
  },
};

export default function PricingCalculatorPage() {
  return <SeatPricingClient />;
}
