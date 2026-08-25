import type { Metadata } from 'next';
import { EnterpriseSolutionClient } from '@/components/solutions/EnterpriseSolutionClient';

export const metadata: Metadata = {
  title: 'Enterprise AI Compute Fleet Infrastructure (Unlimited Seats) | GALXAI',
  description: 'Enterprise AI Gateway infrastructure with unlimited pooled seats, SAML 2.0 Single Sign-On, SCIM sync, Net-30 invoicing, signed HIPAA BAA, and 99.99% SLA.',
  alternates: {
    canonical: 'https://galx.ai/solutions/enterprise',
  },
  openGraph: {
    title: 'Enterprise AI Compute Fleet Infrastructure | GALXAI',
    description: 'Sovereign high-volume AI routing, SAML SSO, Net-30 invoice terms, and dedicated VPC peering for enterprise fleets.',
    url: 'https://galx.ai/solutions/enterprise',
  },
};

export default function EnterpriseSolutionPage() {
  return <EnterpriseSolutionClient />;
}
