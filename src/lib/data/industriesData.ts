/**
 * Vertical Industries Dataset for Programmatic SEO (pSEO) and AEO
 */

export interface IndustryItem {
  slug: string;
  badge: string;
  title: string;
  headline: string;
  description: string;
  sectorName: string;
  targetWorkloads: string[];
  regulatoryCompliance: string[];
  recommendedModels: {
    name: string;
    modelId: string;
    role: string;
  }[];
  architectureHighlights: string[];
  codeExample: {
    language: string;
    title: string;
    code: string;
  };
  faqs: { q: string; a: string }[];
}

export const INDUSTRIES_DATA: IndustryItem[] = [
  {
    slug: 'healthcare-and-lifesciences',
    badge: 'HIPAA & BAA Certified',
    title: 'HIPAA-Compliant AI Gateway for Healthcare, Clinical Trials & EHR Systems',
    headline: 'HIPAA-Compliant AI Gateway for Healthcare & Life Sciences',
    description:
      'Zero Data Retention (ZDR) proxy infrastructure, signed Business Associate Agreements (BAA), and high-throughput EHR clinical summarization.',
    sectorName: 'Healthcare & Life Sciences',
    targetWorkloads: ['Clinical EHR Note Summarization', 'Medical Coding & ICD-10 Extraction', 'Patient Triage Chatbots'],
    regulatoryCompliance: ['HIPAA / HITECH Act', 'Signed BAA Agreements', 'Cryptographic Zero Data Retention (ZDR)'],
    recommendedModels: [
      { name: 'OpenAI GPT-5.6 Sol', modelId: 'gpt-5.6-sol', role: 'Complex multi-page medical chart reasoning' },
      { name: 'OpenAI GPT-5.6 Luna', modelId: 'gpt-5.6-luna', role: 'Real-time patient voice transcription & triage' },
    ],
    architectureHighlights: [
      'Volatile Memory Processing: Protected Health Information (PHI) is purged immediately upon stream completion',
      'End-to-End TLS 1.3 Encryption: Complete cryptographic isolation in compliance with HIPAA Security Rules',
      'Strict JSON Schema Enforcement: 100% valid medical diagnosis and ICD-10 record parsing',
    ],
    codeExample: {
      language: 'python',
      title: 'HIPAA-Compliant Clinical Note Extraction',
      code: `from openai import OpenAI

client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# Process clinical notes in volatile memory with zero persistent logging
completion = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[
        {"role": "system", "content": "You are a clinical NLP assistant. Extract vital signs and medications."},
        {"role": "user", "content": "Patient presents with BP 120/80, prescribed Metformin 500mg daily."}
    ],
    temperature=0.1
)
print(completion.choices[0].message.content)`,
    },
    faqs: [
      {
        q: 'Does GALXAI execute Business Associate Agreements (BAAs)?',
        a: 'Yes. Enterprise healthcare customers can execute standardized BAAs directly through our enterprise compliance portal.',
      },
    ],
  },
  {
    slug: 'financial-services-and-banking',
    badge: 'PCI DSS & SOC 2 Type II',
    title: 'Low-Latency AI Proxy for Financial Services, Banking & Algorithmic Trading',
    headline: 'High-Availability AI Inference for Banking & Financial Services',
    description:
      'Sub-15ms Anycast routing, PCI DSS Level 1 financial isolation, and high-throughput KYC and anti-money laundering (AML) reasoning.',
    sectorName: 'Financial Services & Banking',
    targetWorkloads: ['Real-Time Fraud Detection', 'Automated KYC / AML Document Verification', 'Equity Research Analysis'],
    regulatoryCompliance: ['PCI DSS Level 1', 'SOC 1 / SOC 2 Type II', 'GLBA Financial Privacy'],
    recommendedModels: [
      { name: 'OpenAI GPT-5.6 Sol', modelId: 'gpt-5.6-sol', role: 'Deep financial report synthesis & balance sheet audits' },
      { name: 'OpenAI GPT-5.6 Luna', modelId: 'gpt-5.6-luna', role: 'Sub-15ms market event stream parsing' },
    ],
    architectureHighlights: [
      'Sub-15ms Anycast Edge Dispatch: High-velocity market news summarization before next tick',
      'Append-Only Financial Ledgers: Cryptographically audited token billing receipts with tamper-evidence',
      '429 Rate Limit Shield: Guaranteed capacity pooling during high-volatility market opening bells',
    ],
    codeExample: {
      language: 'python',
      title: 'Financial Balance Sheet Parsing',
      code: `from pydantic import BaseModel
from openai import OpenAI

class FinancialMetrics(BaseModel):
    net_revenue_millions: float
    operating_margin_pct: float
    guidance_outlook: str

client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# 100% strict JSON extraction for automated financial modeling
completion = client.beta.chat.completions.parse(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Q3 2026 10-Q filing transcript text..."}],
    response_format=FinancialMetrics
)
print(completion.choices[0].message.parsed)`,
    },
    faqs: [
      {
        q: 'How does GALXAI handle market volatility traffic surges?',
        a: 'GALXAI pools wholesale enterprise quotas across multiple cloud clusters, preventing 429 rate limit stalls during breaking financial news.',
      },
    ],
  },
  {
    slug: 'legal-and-contract-analysis',
    badge: '1M Context & Zero Retention',
    title: 'Zero Data Retention AI Gateway for Legal Discovery & Contract Analysis',
    headline: '1M Token Context & Zero Retention for Legal Discovery',
    description:
      'Massive 1,000,000 token context window on Grok 4.6 and Sol for whole-docket indexing with strict confidentiality guarantees.',
    sectorName: 'Legal & Contract Intelligence',
    targetWorkloads: ['Multi-Gigabyte Litigation Discovery', 'M&A Due Diligence & Contract Audits', 'Regulatory Compliance Mapping'],
    regulatoryCompliance: ['Attorney-Client Privilege Protection', 'Cryptographic Zero Retention', 'ISO 27001 Certified'],
    recommendedModels: [
      { name: 'xAI Grok 4.6 (1M)', modelId: 'x-ai/grok-4.6', role: '1,000,000 token whole-case litigation discovery' },
      { name: 'OpenAI GPT-5.6 Sol', modelId: 'gpt-5.6-sol', role: 'Complex indemnity and liability cross-referencing' },
    ],
    architectureHighlights: [
      '1M Token Ingestion: Analyze 500-page master service agreements in a single prompt without chunking loss',
      '75% Prompt Caching Rebate: Drastically lowers the cost of repeated multi-document cross-examinations',
      'Zero Model Training: Enforced upstream legal contracts guaranteeing client briefs are never used in training',
    ],
    codeExample: {
      language: 'python',
      title: 'Full-Contract Indemnity Extraction',
      code: `from openai import OpenAI

client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# 1M Token context enables single-pass contract review
response = client.chat.completions.create(
    model="x-ai/grok-4.6",
    messages=[
        {"role": "system", "content": "You are a senior partner examining contract liabilities."},
        {"role": "user", "content": "Review the full 200-page agreement and list all non-standard warranties."}
    ]
)
print(response.choices[0].message.content)`,
    },
    faqs: [
      {
        q: 'Does GALXAI protect Attorney-Client privilege?',
        a: 'Yes. Payloads exist solely in volatile RAM enclaves and are purged upon stream closure, preventing discovery exposure.',
      },
    ],
  },
  {
    slug: 'ecommerce-and-retail',
    badge: 'Sub-15ms & 145 Tok/s',
    title: 'Sub-15ms AI Proxy for E-Commerce Recommendations, Search & Customer Care',
    headline: 'High-Throughput Visual AI & Recommendations for Retail',
    description:
      'Sub-15ms edge dispatch, photorealistic GPT-Image-2 studio synthesis, and 145 tok/sec streaming customer support bots.',
    sectorName: 'E-Commerce & Digital Retail',
    targetWorkloads: ['Visual Product Synthesis', 'Semantic Product Search & Ranking', '24/7 Omnichannel Customer Care'],
    regulatoryCompliance: ['PCI DSS Level 1', 'GDPR / CCPA Data Rights', '99.99% Uptime SLA'],
    recommendedModels: [
      { name: 'OpenAI GPT-Image-2', modelId: 'openai-gpt-image-2', role: 'On-demand high-definition product staging' },
      { name: 'OpenAI GPT-5.6 Luna', modelId: 'gpt-5.6-luna', role: '145 tok/s live customer chat resolution' },
    ],
    architectureHighlights: [
      'Sub-15ms TTFT for Conversational Commerce: Instant responses keep cart abandonment rates near zero',
      'High-Speed Image Generation: Pre-warmed visual inference clusters render marketing assets in <500ms',
      'Wholesale Tier Pricing: $0.75/1M token pricing allows retail bots to run cost-effectively at massive scale',
    ],
    codeExample: {
      language: 'python',
      title: 'E-Commerce Product Recommendations Call',
      code: `from openai import OpenAI

client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# Fast streaming customer assistant
stream = client.chat.completions.create(
    model="gpt-5.6-luna",
    messages=[
        {"role": "system", "content": "You are an e-commerce personal shopper."},
        {"role": "user", "content": "Find me outdoor waterproof hiking boots under $150."}
    ],
    stream=True
)

for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="", flush=True)`,
    },
    faqs: [
      {
        q: 'Can GALXAI handle Black Friday / Cyber Monday traffic surges?',
        a: 'Yes. GALXAI provides active-active capacity pooling with zero rate limit stalls during peak holiday flash sales.',
      },
    ],
  },
  {
    slug: 'defense-and-government',
    badge: 'FedRAMP High & US CONUS',
    title: 'Sovereign AI Gateway for Defense, National Security & Public Sector',
    headline: 'US Sovereign Anycast Routing & FedRAMP Ready AI Substrate',
    description:
      'Guaranteed Continental US (CONUS) data residency, FIPS 140-3 cryptography, and strict US citizen operator isolation.',
    sectorName: 'Defense & Government',
    targetWorkloads: ['Intelligence Document Triage', 'Tactical Field Support Agents', 'Public Agency Regulatory Summaries'],
    regulatoryCompliance: ['FedRAMP High Ready', 'FIPS 140-3 Validated', 'ITAR Data Segregation'],
    recommendedModels: [
      { name: 'OpenAI GPT-5.6 Sol', modelId: 'gpt-5.6-sol', role: 'High-assurance geopolitical and tactical reasoning' },
      { name: 'xAI Grok 4.6', modelId: 'x-ai/grok-4.6', role: '1M token comprehensive intelligence brief synthesis' },
    ],
    architectureHighlights: [
      'CONUS-Only Anycast Nodes: Zero international packet transit or foreign edge proxy hops',
      'FIPS 140-3 Hardware Cryptography: End-to-end hardware-authenticated ciphers across all internal links',
      'Tamper-Evident SIEM Audit Logs: Continuous compliance telemetry integrated with enterprise security centers',
    ],
    codeExample: {
      language: 'bash',
      title: 'Verify Sovereign CONUS Header',
      code: `curl -sI https://api.galx.ai/v1/models \\
  -H "Authorization: Bearer \$GALXAI_API_KEY" | grep "x-galxai-jurisdiction: US-CONUS"`,
    },
    faqs: [
      {
        q: 'Is traffic guaranteed to stay within the United States?',
        a: 'Yes. Dedicated sovereign contracts enforce BGP Anycast routes restricted exclusively to certified CONUS data centers.',
      },
    ],
  },
];
