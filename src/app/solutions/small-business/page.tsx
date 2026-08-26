import type { Metadata } from 'next';
import { SmallBusinessClient } from '@/components/solutions/SmallBusinessClient';

export const metadata: Metadata = {
  title: 'Small Business & Squad AI Gateway Plans (5 Seats Included) | GALXAI',
  description: 'Consolidate OpenAI Codex and GPT-5.6 models under one shared team workspace with 5 seats included, $100 pooled compute credits, individual spend caps, and 25%-40% wholesale rates.',
  alternates: {
    canonical: 'https://galx.ai/solutions/small-business',
  },
  openGraph: {
    title: 'Small Business & Squad AI Gateway Plans | GALXAI',
    description: 'Shared wallets, per-seat spend caps, and 5 seats included for AI engineering teams and startups.',
    url: 'https://galx.ai/solutions/small-business',
  },
};

export default function SmallBusinessPage() {
  return <SmallBusinessClient />;
}
