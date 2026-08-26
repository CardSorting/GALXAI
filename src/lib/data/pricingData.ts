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

export interface SeatTier {
  id: 'developer' | 'small-business' | 'enterprise';
  name: string;
  tagline: string;
  audience: string;
  basePriceUsd: number;
  billingPeriod: 'month';
  perSeatPriceUsd: number;
  includedSeats: number;
  maxSeats: number | 'Unlimited';
  includedMonthlyComputeCredits: number;
  badge?: string;
  isPopular?: boolean;
  highlightColor: string;
  features: {
    title: string;
    description: string;
    included: boolean;
  }[];
  ctaText: string;
  ctaHref: string;
}

export const SEAT_TIERS: SeatTier[] = [
  {
    id: 'developer',
    name: 'Solo Developer',
    tagline: 'Pay-as-you-go wholesale compute for individual engineers & founders.',
    audience: 'Solo creators, hackathons, open-source projects',
    basePriceUsd: 0,
    billingPeriod: 'month',
    perSeatPriceUsd: 0,
    includedSeats: 1,
    maxSeats: 1,
    includedMonthlyComputeCredits: 5,
    badge: '100% Free Seats',
    highlightColor: 'border-white/10 hover:border-white/20',
    features: [
      { title: '1 Personal Seat', description: 'Dedicated personal sandbox workspace', included: true },
      { title: 'Wholesale Token Rates', description: '25%–36% savings with 0% gateway markup', included: true },
      { title: '75% Prompt Caching Pass-Through', description: 'Automatic cache rebate on repeat context', included: true },
      { title: 'Sub-15ms Anycast Routing', description: 'Automated 429 failover to backup providers', included: true },
      { title: 'Shared Team Shard Vaults', description: 'Multi-tenant key encryption and squad sharing', included: false },
      { title: 'Role-Based Access Control (RBAC)', description: 'Owner, Admin, Developer, FinOps permissions', included: false },
      { title: 'SAML 2.0 Single Sign-On (SSO)', description: 'Okta, Google Workspace, Azure AD, SCIM', included: false },
      { title: 'Net-30 Invoicing & BAA / HIPAA', description: 'Consolidated invoice terms and signed agreements', included: false },
    ],
    ctaText: 'Start Building Free',
    ctaHref: '/keys/new',
  },
  {
    id: 'small-business',
    name: 'Small Business & Squads',
    tagline: 'Empower your AI engineering squad with shared wallets, seat caps, and pooled credits.',
    audience: 'Startups, agile engineering teams, agencies (2–25 members)',
    basePriceUsd: 75,
    billingPeriod: 'month',
    perSeatPriceUsd: 15,
    includedSeats: 5,
    maxSeats: 25,
    includedMonthlyComputeCredits: 100,
    badge: 'Most Popular for Teams',
    isPopular: true,
    highlightColor: 'border-amber-500/50 bg-amber-500/5 shadow-2xl shadow-amber-500/10',
    features: [
      { title: '5 Team Seats Included', description: 'Add extra seats for only $15/seat/month', included: true },
      { title: '$100 Monthly Compute Credits Included', description: 'Directly applied to your shared team wallet', included: true },
      { title: 'Role-Based Access Control (RBAC)', description: 'Owner, Admin, Developer, FinOps, Viewer roles', included: true },
      { title: 'Individual Seat Spend Caps', description: 'Hard safety caps per seat with auto-throttle protection', included: true },
      { title: 'Shared Shard Vaults & Keys', description: 'Secure zero-trust API credential governance', included: true },
      { title: 'GL Cost Center Codes', description: 'Track spend by squad, department, and project', included: true },
      { title: 'Priority 1-Hour SLA Triage', description: 'Direct Slack / Discord private team bridge', included: true },
      { title: 'SAML 2.0 Single Sign-On (SSO)', description: 'Okta, Google Workspace, Azure AD, SCIM', included: false },
    ],
    ctaText: 'Provision Team Workspace',
    ctaHref: '/billing/seats?tier=small-business',
  },
  {
    id: 'enterprise',
    name: 'Enterprise Fleet',
    tagline: 'Sovereign governance, unlimited pooled seats, SAML SSO, and custom invoice terms.',
    audience: 'Scale-ups, mid-market, regulated industries (25–10,000+ members)',
    basePriceUsd: 499,
    billingPeriod: 'month',
    perSeatPriceUsd: 10,
    includedSeats: 25,
    maxSeats: 'Unlimited',
    includedMonthlyComputeCredits: 600,
    badge: 'Sovereign Governance',
    highlightColor: 'border-cyan-500/40 bg-cyan-500/5 shadow-2xl shadow-cyan-500/10',
    features: [
      { title: '25 Base Seats Included (Scale to 10k+)', description: 'Unlimited pooled seats at volume discounts', included: true },
      { title: '$600 Monthly Compute Credits Included', description: 'High-volume wholesale liquidity pool', included: true },
      { title: 'SAML 2.0 SSO & SCIM Sync', description: 'Auto-provision and de-provision via Okta, Azure, Google', included: true },
      { title: 'Company Domain Capture (@acme.com)', description: 'Automatic team enrollment and SSO enforcement', included: true },
      { title: 'Consolidated Net-30 / ACH Invoicing', description: 'Custom PO codes, wire terms, and multi-entity billing', included: true },
      { title: 'Signed BAA (HIPAA) & DPA (GDPR/CCPA)', description: 'Zero data retention and SOC 2 Type II assurance', included: true },
      { title: 'Dedicated Private VPC Peering', description: 'Sub-millisecond direct connect and 99.99% uptime SLA', included: true },
      { title: '24/7 Dedicated Solutions Architect', description: 'Direct phone & priority incident response bridge', included: true },
    ],
    ctaText: 'Schedule Architecture Review',
    ctaHref: '/billing/enterprise',
  },
];

export interface RolePermission {
  role: 'owner' | 'admin' | 'developer' | 'billing' | 'viewer';
  title: string;
  badge: string;
  description: string;
  color: string;
  canCreateKeys: boolean;
  canManageMembers: boolean;
  canViewBilling: boolean;
  canTopUpWallet: boolean;
  canConfigureSSO: boolean;
  canViewAuditLogs: boolean;
  canManageVaultSecrets: boolean;
  canExecuteInference: boolean;
}

export const ROLE_PERMISSIONS: RolePermission[] = [
  {
    role: 'owner',
    title: 'Workspace Owner',
    badge: 'Full Sovereign Control',
    description: 'Primary legal and billing owner. Can delete workspace, reassign ownership, and govern all sub-accounts.',
    color: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
    canCreateKeys: true,
    canManageMembers: true,
    canViewBilling: true,
    canTopUpWallet: true,
    canConfigureSSO: true,
    canViewAuditLogs: true,
    canManageVaultSecrets: true,
    canExecuteInference: true,
  },
  {
    role: 'admin',
    title: 'Team Administrator',
    badge: 'Operational Admin',
    description: 'Manages team seats, invites colleagues, sets per-seat spend caps, and provisions API keys.',
    color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
    canCreateKeys: true,
    canManageMembers: true,
    canViewBilling: true,
    canTopUpWallet: true,
    canConfigureSSO: true,
    canViewAuditLogs: true,
    canManageVaultSecrets: true,
    canExecuteInference: true,
  },
  {
    role: 'developer',
    title: 'AI Developer / Engineer',
    badge: 'Active Inference',
    description: 'Creates personal and squad API keys within assigned spend caps, runs playground experiments, and views telemetry.',
    color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
    canCreateKeys: true,
    canManageMembers: false,
    canViewBilling: false,
    canTopUpWallet: false,
    canConfigureSSO: false,
    canViewAuditLogs: false,
    canManageVaultSecrets: false,
    canExecuteInference: true,
  },
  {
    role: 'billing',
    title: 'FinOps / Billing Manager',
    badge: 'Financial Governance',
    description: 'Views invoices, downloads GL cost center reports, tops up wallet, and configures auto-reload rules.',
    color: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
    canCreateKeys: false,
    canManageMembers: false,
    canViewBilling: true,
    canTopUpWallet: true,
    canConfigureSSO: false,
    canViewAuditLogs: true,
    canManageVaultSecrets: false,
    canExecuteInference: false,
  },
  {
    role: 'viewer',
    title: 'Read-Only Stakeholder',
    badge: 'Auditor & Observer',
    description: 'Can inspect dashboard metrics, benchmark tables, and model catalog without executing chargeable inference.',
    color: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/30',
    canCreateKeys: false,
    canManageMembers: false,
    canViewBilling: false,
    canTopUpWallet: false,
    canConfigureSSO: false,
    canViewAuditLogs: true,
    canManageVaultSecrets: false,
    canExecuteInference: false,
  },
];

export interface SeatBenchmarkComparison {
  competitor: string;
  perSeatCostMonthly: number;
  tokenMarkupPct: number;
  monthlyCostFor10SeatsAnd1kSpend: number;
  galxaiMonthlyCostForSame: number;
  monthlySavings: number;
  annualSavings: number;
  keyLimitation: string;
}

export const SEAT_BENCHMARKS: SeatBenchmarkComparison[] = [
  {
    competitor: 'OpenAI Team + Direct Retail',
    perSeatCostMonthly: 25.00,
    tokenMarkupPct: 0,
    monthlyCostFor10SeatsAnd1kSpend: 250 + 1000, // $1,250
    galxaiMonthlyCostForSame: 75 + (10 - 5) * 15 + 750, // $150 seats + $750 tokens (25% wholesale savings) = $900
    monthlySavings: 350,
    annualSavings: 4200,
    keyLimitation: 'Locked to single provider, zero prompt caching pass-through on external apps',
  },
  {
    competitor: 'Anthropic Team + Portkey Enterprise',
    perSeatCostMonthly: 30.00 + 19.00, // $49/seat
    tokenMarkupPct: 5,
    monthlyCostFor10SeatsAnd1kSpend: 490 + 1050, // $1,540
    galxaiMonthlyCostForSame: 150 + 750, // $900
    monthlySavings: 640,
    annualSavings: 7680,
    keyLimitation: 'Expensive double seat tax (Gateway + Provider) with complex multi-contract overhead',
  },
  {
    competitor: 'GitHub Copilot Business Fleet',
    perSeatCostMonthly: 19.00,
    tokenMarkupPct: 0,
    monthlyCostFor10SeatsAnd1kSpend: 190 + 1000, // $1,190
    galxaiMonthlyCostForSame: 150 + 750, // $900
    monthlySavings: 290,
    annualSavings: 3480,
    keyLimitation: 'Restricted IDE usage only; no general-purpose REST API or custom model routing',
  },
];

export interface FeatureComparisonRow {
  category: string;
  feature: string;
  description: string;
  developer: string | boolean;
  smallBusiness: string | boolean;
  enterprise: string | boolean;
}

export const PLAN_COMPARISONS: FeatureComparisonRow[] = [
  {
    category: 'Seats & Team Governance',
    feature: 'Included Seats',
    description: 'Number of active team members included in the base plan',
    developer: '1 Seat',
    smallBusiness: '5 Seats Included (+$15/extra)',
    enterprise: '25 Seats Included (Scale to 10k+)',
  },
  {
    category: 'Seats & Team Governance',
    feature: 'Pooled Monthly Compute Credits',
    description: 'Free token compute credits included each month',
    developer: '$5 / mo',
    smallBusiness: '$100 / mo',
    enterprise: '$600 / mo',
  },
  {
    category: 'Seats & Team Governance',
    feature: 'Role-Based Access Control (RBAC)',
    description: 'Owner, Admin, Developer, FinOps, and Read-Only roles',
    developer: false,
    smallBusiness: '5 Standard Roles',
    enterprise: 'Custom Granular Permissions',
  },
  {
    category: 'Seats & Team Governance',
    feature: 'Per-Seat Monthly Spend Caps',
    description: 'Hard budget caps to prevent individual employee overruns',
    developer: false,
    smallBusiness: true,
    enterprise: true,
  },
  {
    category: 'Seats & Team Governance',
    feature: 'GL Cost Centers & Squad Tags',
    description: 'Multi-department GL accounting and CSV exports',
    developer: false,
    smallBusiness: true,
    enterprise: true,
  },
  {
    category: 'Security & Access',
    feature: 'SAML 2.0 Single Sign-On (SSO)',
    description: 'Okta, Google Workspace, Microsoft Entra / Azure AD',
    developer: false,
    smallBusiness: false,
    enterprise: true,
  },
  {
    category: 'Security & Access',
    feature: 'SCIM Automated Directory Sync',
    description: 'Automated user provisioning and instant offboarding',
    developer: false,
    smallBusiness: false,
    enterprise: true,
  },
  {
    category: 'Security & Access',
    feature: 'Corporate Domain Capture',
    description: 'Auto-enroll all employees with @company.com email',
    developer: false,
    smallBusiness: false,
    enterprise: true,
  },
  {
    category: 'Security & Access',
    feature: 'Zero Data Retention (ZDR)',
    description: 'Prompt payload data is never logged or stored to disk',
    developer: true,
    smallBusiness: true,
    enterprise: true,
  },
  {
    category: 'API Gateway & Compute',
    feature: 'Wholesale Token Discount',
    description: 'Direct discount off OpenAI retail prices',
    developer: '25%–36%',
    smallBusiness: '30%–41%',
    enterprise: '40%–51%',
  },
  {
    category: 'API Gateway & Compute',
    feature: '75% Prompt Caching Pass-Through',
    description: '100% of provider cache rebates returned to your wallet',
    developer: true,
    smallBusiness: true,
    enterprise: true,
  },
  {
    category: 'API Gateway & Compute',
    feature: 'Concurrent Stream Concurrency',
    description: 'Simultaneous streaming requests without 429 throttling',
    developer: '20 Streams',
    smallBusiness: '50 Streams',
    enterprise: 'Unlimited Concurrency',
  },
  {
    category: 'Billing & Compliance',
    feature: 'Payment Terms & Invoicing',
    description: 'Supported billing payment methods',
    developer: 'Credit Card / Crypto Top-Up',
    smallBusiness: 'Card Autopay / Shared Balance',
    enterprise: 'Net-30 / Net-60 Invoicing (Wire/ACH)',
  },
  {
    category: 'Billing & Compliance',
    feature: 'HIPAA BAA & GDPR DPA',
    description: 'Signed legal agreements for regulated data handling',
    developer: false,
    smallBusiness: 'Standard DPA',
    enterprise: 'Signed BAA & Custom DPA',
  },
  {
    category: 'Support & SLA',
    feature: 'Support Channel & Response SLA',
    description: 'Guaranteed support response speed',
    developer: 'Community Slack / GitHub',
    smallBusiness: 'Priority 1-Hour SLA',
    enterprise: '24/7 Dedicated Bridge & 99.99% SLA',
  },
];

