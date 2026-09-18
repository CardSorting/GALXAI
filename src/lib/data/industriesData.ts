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
    badge: 'Healthcare Data Controls',
    title: 'Privacy-Focused AI Workflows for Healthcare, Clinical Trials & EHR Systems',
    headline: 'Privacy-Focused AI Workflows for Healthcare & Life Sciences',
    description:
      'Build clinical summarization, medical coding, and patient-support workflows with clear data-handling controls and structured outputs.',
    sectorName: 'Healthcare & Life Sciences',
    targetWorkloads: ['Clinical EHR Note Summarization', 'Medical Coding & ICD-10 Extraction', 'Patient Triage Chatbots'],
    regulatoryCompliance: ['HIPAA-aware workflows', 'Configurable retention controls', 'Structured clinical outputs'],
    recommendedModels: [
      { name: 'GALX Nova', modelId: 'galx-nova', role: 'Complex multi-page medical chart reasoning' },
      { name: 'GALX Nova-image', modelId: 'galx-nova-image', role: 'Medical imaging and visual synthesis' },
    ],
    architectureHighlights: [
      'Clinical summarization: Turn notes and records into consistent, reviewable summaries',
      'Structured extraction: Capture medications, measurements, and codes in predictable fields',
      'Human review support: Keep domain experts in control of sensitive decisions',
    ],
    codeExample: {
      language: 'python',
      title: 'Clinical Note Extraction',
      code: `import os
from openai import OpenAI

client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key=os.environ["GALXAI_API_KEY"]
)

# Process clinical notes with your application’s approved data controls
completion = client.chat.completions.create(
    model="galx-nova",
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
        q: 'Can healthcare teams evaluate GALXAI for regulated workflows?',
        a: 'Yes. Review the service terms, available data controls, access model, and any required agreements with your compliance and legal teams before production use.',
      },
    ],
  },
  {
    slug: 'financial-services-and-banking',
    badge: 'Financial Data Workflows',
    title: 'Reliable AI Workflows for Financial Services, Banking & Trading',
    headline: 'Reliable AI Workflows for Banking & Financial Services',
    description:
      'Support fraud review, KYC and AML analysis, and financial research with dependable responses and structured review workflows.',
    sectorName: 'Financial Services & Banking',
    targetWorkloads: ['Real-Time Fraud Detection', 'Automated KYC / AML Document Verification', 'Equity Research Analysis'],
    regulatoryCompliance: ['Privacy-aware processing', 'Audit-friendly outputs', 'Human approval workflows'],
    recommendedModels: [
      { name: 'GALX Nova', modelId: 'galx-nova', role: 'Deep financial report synthesis & balance sheet audits' },
      { name: 'GALX Nova-image', modelId: 'galx-nova-image', role: 'Financial chart rendering and visual analytics' },
    ],
    architectureHighlights: [
      'Fast analysis: Summarize filings, alerts, and market updates for timely review',
      'Structured decisions: Return consistent fields for downstream risk and compliance checks',
      'Traffic resilience: Keep customer workflows responsive as demand changes',
    ],
    codeExample: {
      language: 'python',
      title: 'Financial Balance Sheet Parsing',
      code: `import os
from pydantic import BaseModel
from openai import OpenAI

class FinancialMetrics(BaseModel):
    net_revenue_millions: float
    operating_margin_pct: float
    guidance_outlook: str

client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key=os.environ["GALXAI_API_KEY"]
)

# Structured extraction for automated financial modeling
completion = client.beta.chat.completions.parse(
    model="galx-nova",
    messages=[{"role": "user", "content": "Q3 2026 10-Q filing transcript text..."}],
    response_format=FinancialMetrics
)
print(completion.choices[0].message.parsed)`,
    },
    faqs: [
      {
        q: 'How does GALXAI handle market volatility traffic surges?',
        a: 'GALXAI is designed for bursty workloads and provides clear request outcomes so teams can build their own retry and review policies.',
      },
    ],
  },
  {
    slug: 'legal-and-contract-analysis',
    badge: 'Legal Review Workflows',
    title: 'AI Workflows for Legal Discovery & Contract Analysis',
    headline: 'Large-Document AI Review for Legal Teams',
    description:
      'Review long agreements, discovery material, and regulatory documents with focused extraction and clear human-review checkpoints.',
    sectorName: 'Legal & Contract Intelligence',
    targetWorkloads: ['Multi-Gigabyte Litigation Discovery', 'M&A Due Diligence & Contract Audits', 'Regulatory Compliance Mapping'],
    regulatoryCompliance: ['Confidentiality-aware workflows', 'Configurable retention controls', 'Reviewable outputs'],
    recommendedModels: [
      { name: 'GALX Nova', modelId: 'galx-nova', role: '1,000,000+ token whole-case litigation discovery' },
    ],
    architectureHighlights: [
      'Long-document review: Extract clauses, obligations, and exceptions from extensive source material',
      'Repeatable analysis: Reuse approved prompts and schemas across document sets',
      'Review checkpoints: Keep counsel responsible for conclusions and final action',
    ],
    codeExample: {
      language: 'python',
      title: 'Full-Contract Indemnity Extraction',
      code: `import os
from openai import OpenAI

client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key=os.environ["GALXAI_API_KEY"]
)

# Review a long agreement with a structured prompt
response = client.chat.completions.create(
    model="galx-nova",
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
        a: 'GALXAI supports confidentiality-aware workflows and configurable data controls. Teams should validate their retention, access, and privilege requirements before production use.',
      },
    ],
  },
  {
    slug: 'ecommerce-and-retail',
    badge: 'Commerce AI Workflows',
    title: 'AI Workflows for E-Commerce Recommendations, Search & Customer Care',
    headline: 'High-Throughput Visual AI & Recommendations for Retail',
    description:
      'Combine product discovery, visual merchandising, and customer support workflows with fast, practical responses.',
    sectorName: 'E-Commerce & Digital Retail',
    targetWorkloads: ['Visual Product Synthesis', 'Semantic Product Search & Ranking', '24/7 Omnichannel Customer Care'],
    regulatoryCompliance: ['Privacy-aware customer journeys', 'Consent-conscious personalization', 'Operational continuity planning'],
    recommendedModels: [
      { name: 'GALX Nova-image', modelId: 'galx-nova-image', role: 'On-demand high-definition product staging' },
      { name: 'GALX Nova', modelId: 'galx-nova', role: '145 tok/s live customer chat resolution' },
    ],
    architectureHighlights: [
      'Conversational shopping: Help customers compare products and find relevant options',
      'Visual merchandising: Create product concepts and campaign variations',
      'Scalable support: Extend service coverage across common customer questions',
    ],
    codeExample: {
      language: 'python',
      title: 'E-Commerce Product Recommendations Call',
      code: `import os
from openai import OpenAI

client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key=os.environ["GALXAI_API_KEY"]
)

# Fast streaming customer assistant
stream = client.chat.completions.create(
    model="galx-nova",
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
        a: 'GALXAI supports bursty commerce workloads. Your application should still define bounded retries, graceful degradation, and queueing for peak events.',
      },
    ],
  },
  {
    slug: 'defense-and-government',
    badge: 'Public-Sector Workflows',
    title: 'Controlled AI Workflows for Government & Public-Sector Teams',
    headline: 'Reviewable AI Workflows for Public-Sector Teams',
    description:
      'Support document review, policy research, and public-service operations with explicit access controls and human review.',
    sectorName: 'Defense & Government',
    targetWorkloads: ['Intelligence Document Triage', 'Tactical Field Support Agents', 'Public Agency Regulatory Summaries'],
    regulatoryCompliance: ['Access-controlled workflows', 'Policy-aware deployment review', 'Human approval checkpoints'],
    recommendedModels: [
      { name: 'GALX Nova', modelId: 'galx-nova', role: 'High-assurance geopolitical and tactical reasoning' },
    ],
    architectureHighlights: [
      'Document operations: Summarize policies, reports, and case material for staff review',
      'Controlled access: Align application permissions with agency responsibilities',
      'Traceable work: Preserve the application-level evidence your governance process requires',
    ],
    codeExample: {
      language: 'bash',
      title: 'Call the public API',
      code: `curl -sI https://galx.ai/v1/models \\
  -H "Authorization: Bearer \$GALXAI_API_KEY"`,
    },
    faqs: [
      {
        q: 'How should public-sector teams evaluate GALXAI?',
        a: 'Confirm the service configuration, contract terms, access controls, retention settings, and agency-specific requirements before sending regulated or mission-sensitive data.',
      },
    ],
  },
  {
    slug: 'cybersecurity-and-soc',
    badge: 'Security Operations Workflows',
    title: 'AI Gateway for Cybersecurity Operations, Threat Hunting & SIEM Triage',
    headline: 'Automated SOC Triage & Threat Intelligence Workflows',
    description:
      'Analyze security alerts, incident notes, and threat intelligence with structured triage workflows that keep responders in control.',
    sectorName: 'Cybersecurity & Threat Intelligence',
    targetWorkloads: ['Automated SIEM Alert Triaging', 'Vulnerability Exploitation Analysis', 'Zero-Day IOC Extraction'],
    regulatoryCompliance: ['Security-review workflows', 'Structured incident outputs', 'Configurable data controls'],
    recommendedModels: [
      { name: 'GALX Nova', modelId: 'galx-nova', role: 'Full network traffic capture & multi-gigabyte log analysis' },
    ],
    architectureHighlights: [
      'Alert triage: Group and summarize high-volume security findings',
      'Investigation support: Extract indicators, timelines, and next questions',
      'Action discipline: Keep response actions subject to your existing security approvals',
    ],
    codeExample: {
      language: 'python',
      title: 'Automated SIEM Alert Triaging Script',
      code: `import os
from openai import OpenAI

client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key=os.environ["GALXAI_API_KEY"]
)

# Analyze a security log with your approved data controls
response = client.chat.completions.create(
    model="galx-nova",
    messages=[
        {"role": "system", "content": "You are a Principal SOC Threat Hunter. Identify malicious lateral movement."},
        {"role": "user", "content": "Log dump: 2026-08-23T14:22:10Z auth.fail user=admin src=198.51.100.44..."}
    ]
)
print(response.choices[0].message.content)`,
    },
    faqs: [
      {
        q: 'Are sensitive customer network logs retained by GALXAI?',
        a: 'Use the retention and access settings available to your deployment, and validate them against your organization’s security policy before sending sensitive logs.',
      },
    ],
  },
  {
    slug: 'automotive-and-robotics',
    badge: 'Robotics & Spatial AI',
    title: 'AI Workflows for Autonomous Robotics & Spatial Systems',
    headline: 'Fast, Reviewable AI for Robotics & Spatial Systems',
    description:
      'Support perception, trajectory validation, and multimodal sensor analysis with application-level safeguards and clear outputs.',
    sectorName: 'Automotive & Autonomous Systems',
    targetWorkloads: ['Robot Fleet Teleoperation Assistance', 'Spatial Point-Cloud Analysis', 'Multimodal Vision Sensor Fusion'],
    regulatoryCompliance: ['Safety-review workflows', 'Content handling controls', 'Bounded failure planning'],
    recommendedModels: [
      { name: 'GALX Nova', modelId: 'galx-nova', role: 'Sub-12ms real-time control decision streaming' },
      { name: 'GALX Nova-image', modelId: 'galx-nova-image', role: 'Spatial camera frame synthesis and scene evaluation' },
    ],
    architectureHighlights: [
      'Perception support: Interpret camera frames, sensor summaries, and spatial observations',
      'Trajectory review: Compare proposed actions against operator-defined constraints',
      'Bounded operation: Design explicit fallbacks for delayed or unavailable responses',
    ],
    codeExample: {
      language: 'python',
      title: 'Robotics Spatial Trajectory Query',
      code: `import os
from openai import OpenAI

client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key=os.environ["GALXAI_API_KEY"]
)

# Sub-second trajectory safety validation
response = client.chat.completions.create(
    model="galx-nova",
    messages=[
        {"role": "system", "content": "You are a robotics collision avoidance validator."},
        {"role": "user", "content": "LiDAR vector: obstacle at (x=2.4m, y=0.8m, z=0.1m), speed=1.2m/s"}
    ]
)`,
    },
    faqs: [
      {
        q: 'How should robotics teams use GALXAI in safety-sensitive systems?',
        a: 'Treat model output as advisory, keep safety-critical control local to the system, and define deterministic fallbacks for uncertain, delayed, or unavailable responses.',
      },
    ],
  },
  {
    slug: 'education-and-edtech',
    badge: 'Classroom Concurrency',
    title: 'High-Concurrency AI Gateway for EdTech & Personalized Learning',
    headline: 'High-Throughput AI Gateway for EdTech & Adaptive Tutoring',
    description:
      'Support personalized tutoring, essay feedback, and STEM practice with age-aware workflows, structured feedback, and educator oversight.',
    sectorName: 'Education & EdTech',
    targetWorkloads: ['1-on-1 Personalized Socratic Tutoring', 'Automated Code & Math Homework Feedback', 'Curriculum Synthesis'],
    regulatoryCompliance: ['Student privacy review', 'Age-appropriate workflows', 'Educator oversight'],
    recommendedModels: [
      { name: 'GALX Nova', modelId: 'galx-nova', role: 'Balanced reasoning for complex STEM homework evaluation and conversational tutoring' },
    ],
    architectureHighlights: [
      'Personalized tutoring: Guide learners with questions, hints, and explanations',
      'Rubric-aware feedback: Apply instructor-provided criteria consistently',
      'Responsible learning: Keep educators in the loop for grading and sensitive decisions',
    ],
    codeExample: {
      language: 'python',
      title: 'Socratic Tutor Response Generation',
      code: `import os
from openai import OpenAI

client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key=os.environ["GALXAI_API_KEY"]
)

# Socratic feedback with educator-defined guidance
stream = client.chat.completions.create(
    model="galx-nova",
    messages=[
        {"role": "system", "content": "You are a Socratic math tutor. Guide the student with questions rather than answers."},
        {"role": "user", "content": "Why does x^2 + 5x + 6 factor into (x+2)(x+3)?"}
    ],
    stream=True
)`,
    },
    faqs: [
      {
        q: 'Can GALXAI handle morning classroom login spikes without 429 errors?',
        a: 'GALXAI can support high-concurrency education workflows. Applications should add bounded retries, queueing, and a clear fallback experience for peak periods.',
      },
    ],
  },
];
