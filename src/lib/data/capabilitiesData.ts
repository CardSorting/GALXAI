/**
 * AI Gateway Capabilities Dataset for Programmatic SEO (pSEO) and AEO
 */

export interface CapabilityItem {
  slug: string;
  badge: string;
  title: string;
  headline: string;
  description: string;
  architecturalOverview: string;
  technicalHighlights: string[];
  benchmarkMetric: {
    label: string;
    value: string;
    subtext: string;
  };
  codeSnippet: {
    language: string;
    code: string;
  };
  faqs: { q: string; a: string }[];
}

export const CAPABILITIES_DATA: CapabilityItem[] = [
  {
    slug: '1m-context-window',
    badge: '1,000,000 Tokens',
    title: '1,000,000 Token Context Window — Full Codebase & Document Ingestion',
    headline: 'Ingest Massive 1M Token Contexts with Sub-15ms Anycast Routing',
    description:
      'Process entire code repositories, full-length legal contracts, and historical financial filings in a single context window on xAI Grok 4.6 and 900K on OpenAI GPT-5.6 Sol.',
    architecturalOverview:
      'GALXAI utilizes optimized Anycast memory sharding to stream multi-megabyte prompt contexts directly to origin model clusters without HTTP chunk drops or socket timeouts.',
    technicalHighlights: [
      '1,000,000 token active context window on xAI Grok 4.6 (500K on Grok 4.5)',
      '900,000 token active context window on OpenAI GPT-5.6 Sol (750K on Terra)',
      'Automatic 75% prompt caching rebate on repeated document prefix tokens',
      'Zero chunk drops with streaming SSE HTTP/2 keep-alive protocols',
    ],
    benchmarkMetric: {
      label: 'Context Capacity',
      value: '1,000,000',
      subtext: 'Tokens (~750,000 English Words)',
    },
    codeSnippet: {
      language: 'python',
      code: `from openai import OpenAI

client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# Ingest entire 1,000,000 token codebase in a single prompt
response = client.chat.completions.create(
    model="x-ai/grok-4.6",
    messages=[
        {"role": "system", "content": "You are analyzing an enterprise monolith codebase."},
        {"role": "user", "content": f"{massive_codebase_string}\\n\\nIdentify memory leaks in the socket pool."}
    ]
)`,
    },
    faqs: [
      {
        q: 'Which models support 1M context windows on GALXAI?',
        a: 'xAI Grok 4.6 natively supports 1,000,000 tokens, while OpenAI GPT-5.6 Sol supports 900,000 tokens.',
      },
      {
        q: 'How does prompt caching apply to large context windows?',
        a: 'When prompt prefixes exceed 1,024 tokens and match cached RAM slices, GALXAI automatically discounts those tokens by 75%.',
      },
    ],
  },
  {
    slug: 'zero-data-retention',
    badge: 'SOC 2 & HIPAA Ready',
    title: 'Cryptographic Zero Data Retention (ZDR) Enclave — GALXAI Security',
    headline: 'Enterprise Zero Data Retention with Volatile RAM-Only Buffers',
    description:
      'Guarantee that proprietary prompts, customer PII, and financial records never persist to non-volatile disk or train upstream AI foundation models.',
    architecturalOverview:
      'All inference payloads are processed strictly within volatile memory enclaves and purged immediately upon socket termination with cryptographic hash verification.',
    technicalHighlights: [
      'Strict Zero Data Retention: payloads never touch persistent storage or disk logs',
      'Zero model training: strict upstream enterprise agreements prevent model learning',
      'SOC 2 Type II attestation, ISO 27001 compliance, and HIPAA BAAs available',
      'HKDF-SHA256 & AES-256-GCM hardware cipher encryption in transit and memory',
    ],
    benchmarkMetric: {
      label: 'Disk Retention Time',
      value: '0 ms',
      subtext: 'Payloads Expire on Stream End',
    },
    codeSnippet: {
      language: 'python',
      code: `from openai import OpenAI

# Zero-Retention Gateway Client
client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# Secure healthcare / banking inference with zero persistence
response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Analyze confidential clinical trial data"}],
    extra_headers={"X-Security-Policy": "Strict-ZDR"}
)`,
    },
    faqs: [
      {
        q: 'Does GALXAI log customer prompts for debugging?',
        a: 'No. GALXAI operates an ephemeral, volatile-memory-only proxy with zero payload persistence. Only anonymized telemetry metadata (token counts and latency) is retained.',
      },
    ],
  },
  {
    slug: 'prompt-caching',
    badge: '75% Automatic Rebate',
    title: '75% KV Prompt Caching Architecture & Wholesale Token Rebates',
    headline: 'Cut LLM Prefill Costs by 75% with Automated KV Prompt Caching',
    description:
      'Reuse Key-Value (KV) attention memory slices across consecutive requests to eliminate 55% of TTFT latency and receive an instant 75% token price reduction.',
    architecturalOverview:
      'When prompt prefixes exceed 1,024 tokens and match cached memory slices, GALXAI bypasses matrix recomputation, passing 100% of the cost savings directly to your compute wallet.',
    technicalHighlights: [
      'Automatic activation on prompt prefixes exceeding 1,024 tokens',
      'Up to 55% reduction in Time-To-First-Token (TTFT down to 6.4ms)',
      '100% mathematical token output equivalence to fresh non-cached calls',
      'Zero custom SDK methods required (works seamlessly with standard OpenAI API)',
    ],
    benchmarkMetric: {
      label: 'Cached Token Discount',
      value: '75%',
      subtext: 'Passed 100% to Your Wallet',
    },
    codeSnippet: {
      language: 'typescript',
      code: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.galx.ai/v1",
  apiKey: process.env.GALXAI_API_KEY,
});

// Prompt prefix (>1,024 tokens) automatically receives 75% discount
const response = await client.chat.completions.create({
  model: "gpt-5.6-sol",
  messages: [
    { role: "system", content: largeSystemInstructionsAndSchemas },
    { role: "user", content: "Query requiring cached context" }
  ],
});`,
    },
    faqs: [
      {
        q: 'Do I need to manually configure cache keys?',
        a: 'No. KV prompt caching matches prefixes automatically using deterministic hashing of leading message tokens.',
      },
    ],
  },
  {
    slug: 'constrained-decoding',
    badge: '0% Parse Failures',
    title: '100% Guaranteed JSON Schema & Constrained Grammar Masking',
    headline: 'Eliminate JSON Parse Failures with Token-Level Grammar Masks',
    description:
      'Enforce mathematically rigorous Context-Free Grammar (CFG) masks at each token generation step to guarantee 100% valid JSON conforming to your Zod or Pydantic schemas.',
    architecturalOverview:
      'At each inference step, GALXAI prunes illegal token logits from the sampling distribution, preventing the LLM from emitting syntax that violates the JSON Schema.',
    technicalHighlights: [
      'Guarantees 100% valid JSON outputs conforming to strict JSON Schema specs',
      'Eliminates downstream JSON.parse crashes in automated agent worker loops',
      'Supports complex nested objects, typed arrays, enums, and required fields',
      'Direct compatibility with client.beta.chat.completions.parse',
    ],
    benchmarkMetric: {
      label: 'Schema Adherence',
      value: '100%',
      subtext: 'Mathematical Grammar Masking',
    },
    codeSnippet: {
      language: 'python',
      code: `from pydantic import BaseModel
from openai import OpenAI

class FinancialAuditSchema(BaseModel):
    account_id: str
    risk_score: float
    is_compliant: bool

client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# 100% guaranteed schema adherence
completion = client.beta.chat.completions.parse(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Audit account ACC-8921"}],
    response_format=FinancialAuditSchema
)`,
    },
    faqs: [
      {
        q: 'Does constrained decoding increase latency?',
        a: 'No. Grammar state transitions execute in sub-millisecond CPU enclaves during token generation.',
      },
    ],
  },
  {
    slug: 'anycast-routing',
    badge: 'Sub-15ms TTFT',
    title: 'Sub-15ms Global Anycast AI Proxy & Multi-PoP Failover Topology',
    headline: 'Global Anycast BGP Routing for High-Availability AI Inference',
    description:
      'Route client requests to the nearest edge Point-of-Presence (PoP) across 300+ global data centers with automatic sub-second failover around regional provider outages.',
    architecturalOverview:
      'BGP Anycast routing terminates TLS handshakes at the edge, optimizing TCP congestion windows and piping token streams over dedicated high-speed fiber backbones.',
    technicalHighlights: [
      'Sub-15ms average edge Time-To-First-Token across North America, Europe, and APAC',
      'Automatic multi-cluster failover mitigating 503 Overloaded errors',
      'HTTP/2 multiplexed SSE streams with keep-alive heartbeat probes',
      '99.99% enterprise uptime SLA with cryptographic telemetry verification',
    ],
    benchmarkMetric: {
      label: 'Average Edge TTFT',
      value: '11.8 ms',
      subtext: 'Measured on GPT-5.6 Luna',
    },
    codeSnippet: {
      language: 'bash',
      code: `# Verify sub-15ms edge TLS termination from anywhere in the world
curl -w "TTFB: %{time_starttransfer}s | Total: %{time_total}s\\n" \\
  -X POST https://api.galx.ai/v1/chat/completions \\
  -H "Authorization: Bearer \$GALXAI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "gpt-5.6-luna", "messages": [{"role": "user", "content": "ping"}]}'`,
    },
    faqs: [
      {
        q: 'How does Anycast improve streaming performance?',
        a: 'Terminating TLS at the closest edge PoP reduces round-trip times (RTT) for initial chunk handshakes, dramatically improving UI responsiveness.',
      },
    ],
  },
];
