import type { Metadata } from 'next';
import { ComplianceDetailClient, type ComplianceDocDetail } from '@/components/compliance/ComplianceDetailClient';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTechArticleSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

const COMPLIANCE_MAP: Record<string, ComplianceDocDetail> = {
  soc2: {
    id: 'soc2',
    title: 'SOC 2 Type II Security Audit Attestation',
    category: 'Security & Availability',
    badge: 'Certified Clean Opinion',
    lastUpdated: 'August 2026',
    version: 'v2026.2',
    auditor: 'Schellman & Company, LLC (Independent CPA)',
    summary: 'This SOC 2 Type II report confirms that GALXAI has implemented and maintained robust technical and organizational security controls over confidentiality, availability, and processing integrity.',
    sections: [
      {
        heading: '1. Scope of Audit & System Description',
        content: 'The evaluation covered all components of the GALXAI Universal API Gateway, including the P-AHT sub-15ms router, dynamic rate limiter, tenant isolation vaults, and micro-billing ledger.',
      },
      {
        heading: '2. Cryptographic Zero-Retention Verification',
        content: 'Auditors verified that inference prompts and streamed responses are routed ephemerally in RAM and are permanently discarded immediately upon HTTP stream termination.',
      },
      {
        heading: '3. Multi-Tenant Key Vault Isolation',
        content: 'API keys and shard authentication credentials utilize AES-256-GCM authenticated encryption with tenant-specific Additional Authenticated Data (AAD) preventing cross-tenant transplantation.',
      },
      {
        heading: '4. Auditor Opinion & Clean Attestation',
        content: 'The independent examination concluded with an unqualified (clean) opinion with zero reported security or confidentiality deviations.',
      },
    ],
  },
  hipaa_baa: {
    id: 'hipaa_baa',
    title: 'HIPAA Business Associate Agreement (BAA)',
    category: 'Healthcare & PHI Protection',
    badge: 'Execute-Ready Legal Standard',
    lastUpdated: 'July 2026',
    version: 'v4.0',
    auditor: 'GALXAI Legal & Privacy Counsel',
    summary: 'Standard Business Associate Agreement governing the transmission of Protected Health Information (PHI) through the GALXAI high-throughput API gateway.',
    sections: [
      {
        heading: '1. Permitted Uses & Disclosures',
        content: 'GALXAI acts strictly as a Conduit / Business Associate solely to perform real-time model routing and token arbitration as requested by the Covered Entity.',
      },
      {
        heading: '2. Zero Persistent PHI Storage',
        content: 'No PHI, patient identifiers, clinical notes, or medical completion outputs are stored, logged, cached, or utilized for model training.',
      },
      {
        heading: '3. Technical Safeguards & Breach Notification',
        content: 'All transmission channels enforce TLS 1.3 encryption. GALXAI maintains 24/7 automated intrusion detection and commits to immediate breach notification pursuant to 45 CFR § 164.410.',
      },
    ],
  },
  dpa_gdpr: {
    id: 'dpa_gdpr',
    title: 'Data Processing Addendum (DPA) & Standard Contractual Clauses',
    category: 'International Data Privacy',
    badge: 'GDPR / CCPA / UK-GDPR Compliant',
    lastUpdated: 'August 2026',
    version: 'v3.2',
    auditor: 'European Data Protection Advisory Board Standards',
    summary: 'Standard Contractual Clauses (SCCs Module 2 - Controller to Processor) ensuring complete data sovereignty and international transfer compliance.',
    sections: [
      {
        heading: '1. Processing Instructions & Data Subject Rights',
        content: 'GALXAI processes personal data solely on documented instructions from the customer controller and provides full support for Data Subject Access Requests (DSARs).',
      },
      {
        heading: '2. Sub-Processor Governance',
        content: 'Upstream frontier compute providers (OpenAI, xAI) are bound by equivalent zero-retention enterprise commitments. Customers receive 30 days prior notice for any sub-processor updates.',
      },
      {
        heading: '3. International Data Transfers (SCCs)',
        content: 'Incorporates EU Commission Decision 2021/914 Standard Contractual Clauses with robust supplementary transfer impact assessments (TIAs).',
      },
    ],
  },
  iso27001: {
    id: 'iso27001',
    title: 'ISO/IEC 27001:2022 Information Security Certification',
    category: 'Information Security Management',
    badge: 'ANAB Accredited Certificate',
    lastUpdated: 'June 2026',
    version: '2022 Revision',
    auditor: 'BSI Group Global Registrars',
    summary: 'Formal certification demonstrating that GALXAI operates an Information Security Management System (ISMS) compliant with ISO/IEC 27001:2022.',
    sections: [
      {
        heading: '1. ISMS Scope & Infrastructure Boundary',
        content: 'Covers the design, development, operation, and maintenance of the cloud-native model routing gateway, key management vaults, and financial billing engines.',
      },
      {
        heading: '2. Annex A Control Implementation',
        content: '93 individual security controls implemented across Organizational, People, Physical, and Technological domains.',
      },
    ],
  },
  zdr_protocol: {
    id: 'zdr_protocol',
    title: 'Zero Data Retention (ZDR) Technical Verification Protocol',
    category: 'Architecture & Cryptography',
    badge: 'Provable Ephemeral Transit',
    lastUpdated: 'August 2026',
    version: 'v5.0',
    auditor: 'GALXAI Systems Architecture Group',
    summary: 'Technical whitepaper and runtime verification methodology proving zero persistent storage of prompt payloads or model inference streams.',
    sections: [
      {
        heading: '1. Ephemeral Pipe Architecture',
        content: 'Completions and embeddings flow through streaming chunk buffers in volatile process memory with zero disk writes or database persistence.',
      },
      {
        heading: '2. Memory Zeroization on Stream Close',
        content: 'Internal node buffers undergo immediate cryptographic memory zeroization upon HTTP response close (crypto.randomFillSync buffer purge).',
      },
    ],
  },
};

export async function generateStaticParams() {
  return Object.keys(COMPLIANCE_MAP).map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const doc = COMPLIANCE_MAP[id] || COMPLIANCE_MAP.soc2;

  return constructMetadata({
    title: `${doc.title} — Enterprise Compliance`,
    description: doc.summary,
    canonicalPath: `/compliance/${doc.id}`,
    keywords: [
      doc.title,
      doc.category,
      'GALXAI Compliance',
      'AI Enterprise Legal Agreement',
    ],
  });
}

export default async function SingleComplianceDocPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doc = COMPLIANCE_MAP[id] || COMPLIANCE_MAP.soc2;

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createTechArticleSchema({
        headline: doc.title,
        description: doc.summary,
        path: `/compliance/${doc.id}`,
      }),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Compliance', url: '/compliance' },
        { name: doc.title, url: `/compliance/${doc.id}` },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <ComplianceDetailClient doc={doc} />
    </>
  );
}
