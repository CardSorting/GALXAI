export interface VolumeTier {
  id: string;
  name: string;
  monthlySpendMin: number;
  monthlySpendLabel: string;
  extraDiscountPct: number;
  badge: string;
  description: string;
  features: string[];
}

export const VOLUME_TIERS: VolumeTier[] = [
  {
    id: 'starter',
    name: 'Starter Developer',
    monthlySpendMin: 0,
    monthlySpendLabel: '$0 - $250 / mo',
    extraDiscountPct: 0,
    badge: 'Standard',
    description: 'Instant access for individual developers, side projects, and early-stage prototyping.',
    features: [
      '25%–36% wholesale discounts',
      '75% prompt caching pass-through',
      'Community Slack & Discord support',
      '20 max concurrent streams',
    ],
  },
  {
    id: 'scale',
    name: 'Scale & Growth',
    monthlySpendMin: 250,
    monthlySpendLabel: '$250 - $1,500 / mo',
    extraDiscountPct: 5,
    badge: '+5% Extra Rebate',
    description: 'Automated volume discounts for growing AI products, SaaS platforms, and agent fleets.',
    features: [
      '30%–41% cumulative discount',
      '75% prompt caching pass-through',
      '50 max concurrent streams',
      'Priority low-latency routing',
    ],
  },
  {
    id: 'production',
    name: 'Production Fleet',
    monthlySpendMin: 1500,
    monthlySpendLabel: '$1,500 - $5,000 / mo',
    extraDiscountPct: 10,
    badge: '+10% Extra Rebate',
    description: 'High-velocity production workloads requiring sub-millisecond failover and maximum throughput.',
    features: [
      '35%–46% cumulative discount',
      '80% prompt caching pass-through',
      '150 max concurrent streams',
      '15-minute SLA on ticket triage',
    ],
  },
  {
    id: 'enterprise',
    name: 'Custom Enterprise',
    monthlySpendMin: 5000,
    monthlySpendLabel: '$5,000+ / mo',
    extraDiscountPct: 15,
    badge: '+15% Extra Rebate',
    description: 'Custom enterprise volume agreements, dedicated routing tiers, and flexible invoice terms.',
    features: [
      '40%–51% maximum discount',
      '85% prompt caching pass-through',
      'Unlimited concurrent streams',
      'Dedicated private VPC peering & SLA',
    ],
  },
];
