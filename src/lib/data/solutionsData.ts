/**
 * Use-Case Solution Guides Dataset for Programmatic SEO (pSEO) and AEO
 */

export interface SolutionGuide {
  slug: string;
  name: string;
  badge: string;
  title: string;
  headline: string;
  description: string;
  targetWorkload: string;
  primaryModelId: string;
  fallbackModelId: string;
  estimatedSavingsPct: number;
  keyBenefits: {
    title: string;
    description: string;
  }[];
  codeSnippet: {
    language: 'Python' | 'TypeScript';
    code: string;
  };
  faqs: { q: string; a: string }[];
}

export const SOLUTION_GUIDES: SolutionGuide[] = [
  {
    slug: 'coding-agents',
    name: 'Autonomous Coding Agents & Cursor Fleets',
    badge: 'Coding & Agent SOTA',
    title: 'Best AI API Gateway for Autonomous Coding Agents & Cursor Fleets',
    headline: 'High-Throughput AI Gateway for Coding Agents',
    description:
      'Power autonomous coding agents, multi-file refactoring swarms, and Cursor/Windsurf IDE instances with 25%–40% wholesale rates and zero rate-limit stalls.',
    targetWorkload: 'Multi-turn code editing, automated test generation, repo-level refactoring.',
    primaryModelId: 'gpt-5.6-sol',
    fallbackModelId: 'gpt-5.6-luna',
    estimatedSavingsPct: 45,
    keyBenefits: [
      {
        title: '75% Prompt Cache Pass-Through',
        description: 'Codebase context and system prompt templates stay warm in RAM, cutting repeat context costs by 75%.',
      },
      {
        title: 'Zero Rate-Limit Stalls (429 Shield)',
        description: 'Burst traffic from multi-agent worker swarms is pooled across Anycast shards with automated failover.',
      },
      {
        title: 'Sub-15ms Anycast Latency',
        description: 'Instantaneous Time-To-First-Token keeps interactive IDE autocomplete loops snappy.',
      },
    ],
    codeSnippet: {
      language: 'Python',
      code: `from openai import OpenAI

# 1-Line Drop-in Gateway for Coding Agent Loops
client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[
        {"role": "system", "content": "You are a senior software architect with zero data retention."},
        {"role": "user", "content": "Refactor this concurrent Rust worker pool with atomic primitives."}
    ]
)
print(response.choices[0].message.content)`,
    },
    faqs: [
      {
        q: 'How does GALXAI handle large multi-file codebase contexts in coding agents?',
        a: 'GALXAI supports up to 1,000,000 token context windows on models like Grok 4.6 and 900,000 tokens on GPT-5.6 Sol, allowing entire repositories to be ingested in a single inference call.',
      },
      {
        q: 'Can I route between high-reasoning and fast autocomplete models dynamically?',
        a: 'Yes. You can use GPT-5.6 Sol for heavy architectural tasks and GPT-5.6 Luna for inline sub-second completions with the same API key and wallet.',
      },
    ],
  },
  {
    slug: 'rag-knowledge-bases',
    name: 'Document RAG & Vector Knowledge Bases',
    badge: '75% Caching Rebate',
    title: 'Wholesale AI Gateway for Enterprise Document RAG & Vector Search',
    headline: 'High-Volume Document RAG & Vector Synthesis',
    description:
      'Slash recurring context costs by up to 70% on document question-answering, PDF parsing, and enterprise vector search pipelines with automatic 75% prompt caching.',
    targetWorkload: 'Retrieval-Augmented Generation, legal document analysis, semantic customer search.',
    primaryModelId: 'x-ai/grok-4.6',
    fallbackModelId: 'gpt-5.6-terra',
    estimatedSavingsPct: 65,
    keyBenefits: [
      {
        title: 'Massive 1M Context Window',
        description: 'Ingest hundreds of PDF pages simultaneously on Grok 4.6 without chunk truncation.',
      },
      {
        title: 'Compound 75% Prompt Caching',
        description: 'Document chunks and prompt prefixes >1,024 tokens receive an instant 75% rebate.',
      },
      {
        title: 'Cryptographic Zero Data Retention',
        description: 'Indexed documents are processed in volatile RAM and never stored to disk or used for training.',
      },
    ],
    codeSnippet: {
      language: 'Python',
      code: `from openai import OpenAI

client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# 100K+ token document chunk automatically receives 75% prompt cache pass-through
response = client.chat.completions.create(
    model="x-ai/grok-4.6",
    messages=[
        {"role": "system", "content": "You are an enterprise research analyst. Reference document below:\\n" + large_pdf_text},
        {"role": "user", "content": "Extract all compliance liability clauses."}
    ]
)`,
    },
    faqs: [
      {
        q: 'Does GALXAI retain indexed document chunks?',
        a: 'Strictly zero retention. All request payloads stream through volatile memory ring buffers and are discarded upon socket completion.',
      },
    ],
  },
  {
    slug: 'customer-support-bots',
    name: 'Low-Latency High-Concurrency Support Bots',
    badge: 'Sub-15ms TTFT',
    title: 'Low-Latency AI Model Router for Customer Support Bots & Voice AI',
    headline: 'Low-Latency Gateway for Customer Support & Voice AI',
    description:
      'Deliver instant, human-like conversational responses with sub-15ms TTFT, continuous rate limit pooling, and 25%–40% wholesale token savings.',
    targetWorkload: 'Interactive chat widgets, AI phone assistants, conversational routing.',
    primaryModelId: 'gpt-5.6-luna',
    fallbackModelId: 'gpt-5.6-terra',
    estimatedSavingsPct: 50,
    keyBenefits: [
      {
        title: '140+ Tokens/Sec Velocity',
        description: 'GPT-5.6 Luna streams responses in under 12ms, ideal for real-time speech and chat.',
      },
      {
        title: 'Zero Dropped Connections',
        description: 'Automated Anycast load balancing absorbs sudden user concurrency spikes without 429 stalls.',
      },
      {
        title: 'Strict JSON Schema Validation',
        description: 'Guarantees structured tool calls for CRM lookup and ticket creation.',
      },
    ],
    codeSnippet: {
      language: 'TypeScript',
      code: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.galx.ai/v1",
  apiKey: process.env.GALXAI_API_KEY,
});

// Stream interactive customer response in <15ms TTFT
const stream = await client.chat.completions.create({
  model: "gpt-5.6-luna",
  stream: true,
  messages: [
    { role: "system", content: "You are a helpful customer concierge." },
    { role: "user", content: "Check my order status #9482." }
  ],
});`,
    },
    faqs: [
      {
        q: 'How does GALXAI guarantee sub-15ms TTFT?',
        a: 'GALXAI maintains hot TCP/TLS connections across 300+ global Anycast edge nodes, eliminating cold connection overhead.',
      },
    ],
  },
  {
    slug: 'financial-reasoning',
    name: 'Zero-Retention Quantitative & Legal Reasoning',
    badge: 'SOC 2 & HIPAA Enclave',
    title: 'Zero Data Retention AI Gateway for Quantitative & Legal Reasoning',
    headline: 'Cryptographic AI Router for Finance & Legal AI',
    description:
      'Execute high-stakes financial analysis, contract review, and quantitative modeling with SOTA reasoning engines and verified Zero Data Retention (ZDR).',
    targetWorkload: 'M&A contract review, risk modeling, automated algorithmic audits.',
    primaryModelId: 'gpt-5.6-sol',
    fallbackModelId: 'x-ai/grok-4.6',
    estimatedSavingsPct: 35,
    keyBenefits: [
      {
        title: 'SOC 2 Type II & HIPAA Attested',
        description: 'Verified ephemeral memory buffers with zero disk persistence or model training.',
      },
      {
        title: 'SOTA Formal Reasoning',
        description: 'GPT-5.6 Sol provides highest accuracy on complex logic and numerical constraints.',
      },
      {
        title: 'Audit-Ready Logging',
        description: 'Track token usage and financial cost metrics without logging sensitive prompt payloads.',
      },
    ],
    codeSnippet: {
      language: 'Python',
      code: `from openai import OpenAI

client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[
        {"role": "system", "content": "You are a financial quantitative risk analyst with ZDR security."},
        {"role": "user", "content": "Audit this portfolio VAR exposure model under 3-sigma volatility."}
    ]
)`,
    },
    faqs: [
      {
        q: 'Can enterprise legal and compliance teams verify the ZDR policy?',
        a: 'Yes. Enterprise teams can review our third-party SOC 2 Type II audit report and execute standard HIPAA Business Associate Agreements (BAA) directly in the dashboard.',
      },
    ],
  },
  {
    slug: 'high-throughput-batch',
    name: 'Off-Peak High-Throughput Token Ingestion',
    badge: '+10% Off-Peak Rebate',
    title: 'High-Throughput Batch Token Ingestion with Floating Rebates',
    headline: 'High-Throughput Batch Ingestion & Dynamic Rebates',
    description:
      'Process millions of asynchronous background tasks, data transformations, and embeddings with an extra 10% off-peak floating rebate and pooled throughput.',
    targetWorkload: 'Asynchronous catalog tagging, dataset synthetic generation, offline embedding pipelines.',
    primaryModelId: 'gpt-5.6-terra',
    fallbackModelId: 'gpt-5.6-luna',
    estimatedSavingsPct: 55,
    keyBenefits: [
      {
        title: 'Extra 10% Off-Peak Floating Rebate',
        description: 'Non-urgent background tasks routed during high-headroom windows receive compound discounts.',
      },
      {
        title: 'Asynchronous Queue Management',
        description: 'Submit jobs via /queues and poll results without holding open HTTP sockets.',
      },
      {
        title: 'Automatic Volume Scaling',
        description: 'Seamlessly transition through wholesale tiers with 0% platform markup fees.',
      },
    ],
    codeSnippet: {
      language: 'Python',
      code: `from openai import OpenAI

client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# Batch processing with automatic volume discounts
for batch_chunk in dataset_chunks:
    resp = client.chat.completions.create(
        model="gpt-5.6-terra",
        messages=[{"role": "user", "content": batch_chunk}]
    )`,
    },
    faqs: [
      {
        q: 'How do I activate the 10% off-peak rebate?',
        a: 'Off-peak rebates apply automatically when dispatching during designated global compute headroom windows.',
      },
    ],
  },
  {
    slug: 'visual-synthesis',
    name: 'Enterprise Visual Studio & Image Generation',
    badge: 'GPT-Image-2 & DALL-E 3',
    title: 'Enterprise Visual Synthesis API with GPT-Image-2 & DALL-E 3',
    headline: 'Enterprise Image Generation API with Wholesale Rates',
    description:
      'Generate ultra-high-definition marketing graphics, UI mockups, and stylized illustrations at 20%–25% below direct list prices using standard OpenAI /v1/images endpoints.',
    targetWorkload: 'Marketing creative generation, photorealistic product rendering, typography generation.',
    primaryModelId: 'openai-gpt-image-2',
    fallbackModelId: 'openai-dalle-3',
    estimatedSavingsPct: 25,
    keyBenefits: [
      {
        title: 'Photorealistic Text & Typography',
        description: 'GPT-Image-2 renders sharp, accurate embedded text and brand typography.',
      },
      {
        title: '1-Line OpenAI Images Parity',
        description: 'Standard /v1/images/generations request schema with zero custom SDK wrappers.',
      },
      {
        title: 'Instant Wholesale Pricing',
        description: 'Pay $0.032/image for GPT-Image-2 (List $0.040) with zero monthly seat surcharges.',
      },
    ],
    codeSnippet: {
      language: 'Python',
      code: `from openai import OpenAI

client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

response = client.images.generate(
    model="openai-gpt-image-2",
    prompt="Futuristic holographic control panel with crisp glowing text 'GALXAI CORE ONLINE'",
    size="1024x1024",
    quality="hd"
)
print(response.data[0].url)`,
    },
    faqs: [
      {
        q: 'Does GALXAI support DALL-E 3 alongside GPT-Image-2?',
        a: 'Yes, both OpenAI DALL-E 3 and GPT-Image-2 are available with instant wholesale discounts.',
      },
    ],
  },
];
