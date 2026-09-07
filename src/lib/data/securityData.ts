/**
 * Enterprise Security & Regulatory Governance Dataset for Programmatic SEO (pSEO) and AEO
 */

export interface SecuritySpecificationItem {
  slug: string;
  badge: string;
  title: string;
  headline: string;
  description: string;
  regulatoryBody: string;
  auditFrequency: string;
  enforcementMechanism: string;
  complianceGuarantees: string[];
  systemVerificationSnippet: {
    language: string;
    title: string;
    code: string;
  };
  faqs: { q: string; a: string }[];
}

export const SECURITY_SPECIFICATIONS_DATA: SecuritySpecificationItem[] = [
  {
    slug: 'pci-dss',
    badge: 'PCI DSS Level 1',
    title: 'PCI DSS Level 1 Tokenized Billing & Financial Isolation Compliance — GALXAI',
    headline: 'PCI DSS Level 1 Financial Inference & Isolation Substrate',
    description:
      'Architectural specifications for tokenized credit balances, cardholder data environment (CDE) isolation, and automated cryptographic billing ledgers.',
    regulatoryBody: 'Payment Card Industry Security Standards Council (PCI SSC)',
    auditFrequency: 'Annual Attestation of Compliance (AoC) by Qualified Security Assessor (QSA)',
    enforcementMechanism: 'Zero Plaintext Storage + Stripe Vault Tokenization + Volatile RAM Enclaves',
    complianceGuarantees: [
      'Zero Cardholder Data Storage: GALXAI servers never touch or persist raw PAN, CVV, or payment credentials',
      'Encrypted Financial Ledgers: Real-time token consumption tracked via append-only SHA-256 accounting logs',
      'Isolated VPC Subnets: Inference gateway traffic physically segregated from billing reconciliation nodes',
      'SOC 1 & SOC 2 Continuous Auditing: Automated quarterly vulnerability and configuration reviews',
    ],
    systemVerificationSnippet: {
      language: 'python',
      title: 'Verify Tokenized Balance Receipt',
      code: `import requests

headers = {"Authorization": f"Bearer {GALXAI_API_KEY}"}
resp = requests.get("https://galx.ai/billing/invoices/latest", headers=headers)
print("PCI-Isolated Invoice Hash:", resp.json().get("audit_hash"))`,
    },
    faqs: [
      {
        q: 'Can our regulated fintech application use GALXAI for credit card document parsing?',
        a: 'Yes. When combined with our Zero Data Retention (ZDR) Enclave, document text containing sensitive numerical sequences is processed in volatile RAM with zero disk writes.',
      },
    ],
  },
  {
    slug: 'eu-ai-act',
    badge: 'EU AI Act Compliant',
    title: 'EU AI Act Transparency & Model Governance Compliance — GALXAI',
    headline: 'EU Artificial Intelligence Act (EU AI Act) Compliance Framework',
    description:
      'Full compliance with European Union AI Act transparency requirements, model risk categorization, and copyright training compliance standards.',
    regulatoryBody: 'European Commission & European Artificial Intelligence Board (EAIB)',
    auditFrequency: 'Continuous Automated Telemetry Logging & Annual Conformity Assessment',
    enforcementMechanism: 'Model Card Attestation + System Prompt Traceability + Watermark Telemetry',
    complianceGuarantees: [
      'Prohibited AI Practice Filters: Enforced boundary safeguards preventing biometric categorization and behavioral manipulation',
      'High-Risk AI System Telemetry: Deterministic parameter logging for auditing automated decision pipelines',
      'Model Transparency Documentation: Detailed model cards specifying architecture, training cutoffs, and licensing',
      'Cryptographic Output Provenance: Tamper-evident headers verifying generation timestamps and gateway identity',
    ],
    systemVerificationSnippet: {
      language: 'python',
      title: 'EU AI Act Compliance Headers Verification',
      code: `import requests

resp = requests.post("https://galx.ai/v1/chat/completions", headers={
    "Authorization": f"Bearer {GALXAI_API_KEY}",
    "Content-Type": "application/json"
}, json={"model": "gpt-5.6-sol", "messages": [{"role": "user", "content": "Risk assessment"}]})

print("EU Compliance Attestation:", resp.headers.get("x-galxai-eu-act-compliance"))`,
    },
    faqs: [
      {
        q: 'How does GALXAI help our organization satisfy Article 50 transparency obligations?',
        a: 'GALXAI provides cryptographic response provenance headers and detailed model cards that enable immediate compliance with EU AI Act disclosure rules.',
      },
    ],
  },
  {
    slug: 'fedramp-readiness',
    badge: 'FedRAMP High Ready',
    title: 'FedRAMP High Readiness & Federal GovCloud Security Substrate — GALXAI',
    headline: 'FedRAMP High Security & Federal GovCloud Inference Proxy',
    description:
      'Federal Risk and Authorization Management Program (FedRAMP) High baseline alignment, FIPS 140-3 cryptography, and US sovereign routing.',
    regulatoryBody: 'General Services Administration (GSA) & Joint Authorization Board (JAB)',
    auditFrequency: 'Continuous 24/7 SIEM Auditing & Monthly POA&M Reporting',
    enforcementMechanism: 'FIPS 140-3 Validated Crypto + US Citizen Operator Isolation',
    complianceGuarantees: [
      'FIPS 140-3 Hardware Encryption: All TLS and internal mesh communication encrypted with NIST-approved ciphers',
      'US Sovereign Anycast Routing: Guaranteed routing exclusively within Continental US (CONUS) data centers',
      'Role-Based Granular Key Scoping: Strict NIST 800-53 Access Control (AC) and Least Privilege enforcement',
      'Continuous Threat Monitoring: Real-time automated IDS/IPS inspection and anomalous token flood detection',
    ],
    systemVerificationSnippet: {
      language: 'bash',
      title: 'Verify CONUS Routing Region',
      code: `curl -sI https://galx.ai/v1/models \\
  -H "Authorization: Bearer \$GALXAI_API_KEY" | grep "x-galxai-region"`,
    },
    faqs: [
      {
        q: 'Can federal agencies and defense contractors deploy GALXAI?',
        a: 'Yes. GALXAI provides dedicated enterprise contracts with guaranteed CONUS routing and FIPS 140-3 cryptographic enclaves.',
      },
    ],
  },
  {
    slug: 'ccpa-cpra',
    badge: 'CCPA / CPRA Compliant',
    title: 'California Consumer Privacy Act (CCPA / CPRA) Compliance — GALXAI',
    headline: 'California Privacy Rights Act (CPRA) Data Protection Architecture',
    description:
      'Enforced consumer data privacy rights, automated zero-sale guarantees, and instant cryptographic data deletion protocols.',
    regulatoryBody: 'California Privacy Protection Agency (CPPA)',
    auditFrequency: 'Annual Privacy Impact Assessment (PIA) & Internal Legal Review',
    enforcementMechanism: 'Zero Data Retention Policy + Do Not Sell Guarantee + RAM Erasure',
    complianceGuarantees: [
      'Zero Sale of Personal Data: Binding contractual guarantee that inference payloads are never monetized or sold',
      'Automated Right to Deletion: Payloads in volatile RAM dissolve immediately upon TCP connection termination',
      'No Cross-Context Behavioral Advertising: Inference inputs are strictly quarantined from ad-tech networks',
      'Consumer Privacy Addendum (CPA): Instant self-serve privacy addendum signing in developer portal',
    ],
    systemVerificationSnippet: {
      language: 'python',
      title: 'Verify CPRA Zero-Sale Status',
      code: `import requests

resp = requests.get("https://galx.ai/compliance/cpra-statement")
print("Do Not Sell Policy Status:", resp.json().get("policy_status"))`,
    },
    faqs: [
      {
        q: 'Does sending customer PII to GALXAI constitute a "sale" under CPRA?',
        a: 'No. GALXAI acts exclusively as a Service Provider / Processor under California law, bound by strict non-disclosure terms.',
      },
    ],
  },
  {
    slug: 'penetration-testing',
    badge: 'CREST Standard Pentest',
    title: 'Independent Penetration Testing & Vulnerability Assessment Reports — GALXAI',
    headline: 'Independent Third-Party Penetration Testing & Vulnerability Reports',
    description:
      'Comprehensive red-team assessments, dynamic application security testing (DAST), and prompt injection resistance audits.',
    regulatoryBody: 'CREST & OSCP Aligned Security Methodologies',
    auditFrequency: 'Bi-Annual Grey-Box & Black-Box Red Team Engagements',
    enforcementMechanism: 'Automated Daily Static Analysis + Bug Bounty Vulnerability Program',
    complianceGuarantees: [
      'OWASP Top 10 for LLMs Protection: Mitigations against prompt injection, model denial of service, and supply chain poisoning',
      'Active-Active WAF & DDoS Shield: Automated mitigation of Layer 7 volumetric attacks exceeding 10M req/sec',
      'Zero High / Critical Vulnerabilities: Enforced 48-hour SLA for patching any discovered zero-day vulnerabilities',
      'Tamper-Evident Vulnerability Disclosures: RFC 9116 security.txt compliance and transparent bug bounty rewards',
    ],
    systemVerificationSnippet: {
      language: 'bash',
      title: 'Inspect RFC 9116 Security Policy',
      code: `curl -s https://galx.ai/.well-known/security.txt`,
    },
    faqs: [
      {
        q: 'Can enterprise customers review full unredacted penetration test reports?',
        a: 'Yes. Unredacted penetration test executive summaries and remediation letters are available under mutual NDA via the enterprise portal.',
      },
    ],
  },
  {
    slug: 'zero-storage-training-privacy',
    badge: 'Zero-Storage Distillation',
    title: 'API Zero Data Retention & Consumer Chat Training Privacy Specification — GALXAI',
    headline: 'Zero-Storage Model Improvement & API Data Isolation Architecture',
    description:
      'Architectural specifications ensuring 100% private developer API endpoints, client-level opt-out model training controls, and in-flight zero-storage PII de-identification.',
    regulatoryBody: 'Global Privacy Standards, FTC AI Guidelines & EU AI Act Art. 50',
    auditFrequency: 'Continuous Telemetry Verification & Automated Redaction Auditing',
    enforcementMechanism: 'Strict API Routing Isolation + In-Flight Volatile PII Redactor + Ephemeral RAM Buffers',
    complianceGuarantees: [
      'Developer API Isolation: Direct API routes (/v1/chat/completions) with API keys are strictly 100% private with Zero Data Retention (ZDR)',
      'Consumer Chat Opt-Out: Web chat users have instant self-serve controls to opt out of "Improve the model for everyone"',
      'Zero Session Storage Overhead: Continuous learning signals are distilled in volatile RAM without storing multi-turn chat sessions in databases',
      'In-Flight PII Redaction: Automated scrubbing of PHI, PII, API tokens, passwords, and secrets before training stream ingestion',
    ],
    systemVerificationSnippet: {
      language: 'bash',
      title: 'Verify API Private Zero-Retention Policy Header',
      code: `curl -I https://galx.ai/v1/chat/completions \\
  -H "Authorization: Bearer $GALXAI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"gpt-5.6-sol","messages":[{"role":"user","content":"Ping"}]}' | grep -i "x-galx-data-policy"`,
    },
    faqs: [
      {
        q: 'Is developer API data ever used to train GALXAI foundation models?',
        a: 'Never. Developer API endpoints operate under binding Zero Data Retention (ZDR) guarantees and bypass all model training distillation pipelines.',
      },
      {
        q: 'How does GALXAI protect consumer chat privacy while improving models?',
        a: 'All consumer chat turns pass through real-time in-memory PII redactors that strip personal identifiers and secrets before ephemeral token extraction, and users can opt out at any time.',
      },
    ],
  },
];
