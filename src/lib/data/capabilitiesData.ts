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
      'Process entire code repositories, full-length legal contracts, and historical financial filings in a single context window of 900K tokens on OpenAI GPT-5.6 Sol.',
    architecturalOverview:
      'GALXAI utilizes optimized Anycast memory buffers to stream multi-megabyte prompt contexts directly to origin model clusters without HTTP chunk drops or socket timeouts.',
    technicalHighlights: [
      '900,000 token active context window on OpenAI GPT-5.6 Sol (750K on Terra)',
      '300,000 token context window on GPT-5.6 Luna for rapid high-velocity tasks',
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
    base_url="https://galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# Ingest entire 900,000 token codebase in a single prompt
response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[
        {"role": "system", "content": "You are analyzing an enterprise monolith codebase."},
        {"role": "user", "content": f"{massive_codebase_string}\\n\\nIdentify memory leaks in the socket pool."}
    ]
)`,
    },
    faqs: [
      {
        q: 'Which models support massive context windows on GALXAI?',
        a: 'OpenAI GPT-5.6 Sol natively supports 900,000 tokens with full 75% prompt caching pass-through.',
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
    base_url="https://galx.ai/v1",
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
  baseURL: "https://galx.ai/v1",
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
    base_url="https://galx.ai/v1",
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
  -X POST https://galx.ai/v1/chat/completions \\
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
  {
    slug: 'predictive-rate-limit-shield',
    badge: 'P-AHT Token Governor',
    title: 'Predictive Adaptive Hydraulic Headroom (P-AHT) & 429 Rate Limit Shield',
    headline: 'Eliminate 429 Rate-Limit Stalls with Predictive Headroom Governance',
    description:
      'Continuous token governance balances capacity across distributed enterprise infrastructure, pre-emptively rerouting bursts before upstream rate limits trigger HTTP 429 errors.',
    architecturalOverview:
      'P-AHT monitors second-by-second token consumption rates across all origin endpoints. When any upstream route approaches 80% utilization, new bursts dynamically shift to warm secondary routes.',
    technicalHighlights: [
      'Zero HTTP 429 Rate Limit Exceeded stalls for high-concurrency multi-agent fleets',
      'High-throughput enterprise token capacity across OpenAI compute clusters',
      'Dynamic token bucket refills calculated in real-time with sub-millisecond precision',
      'Zero dropped TCP connections during peak load shifts',
    ],
    benchmarkMetric: {
      label: '429 Mitigation Rate',
      value: '100.0%',
      subtext: 'Zero dropped bursts at 10,000 RPM',
    },
    codeSnippet: {
      language: 'python',
      code: `from openai import OpenAI

client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# Burst 100+ concurrent requests with zero 429 stalls
response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Execute high-concurrency swarm task"}]
)`,
    },
    faqs: [
      {
        q: 'How does GALXAI prevent 429 errors from high-concurrency swarms?',
        a: 'GALXAI provisions enterprise headroom dynamically across distributed routing channels so individual tenant spikes never trigger upstream rate limits.',
      },
    ],
  },
  {
    slug: 'parallel-speculative-execution',
    badge: 'Speculative Draft Verification',
    title: 'Speculative Decoding & Multi-Candidate Verification for Sub-Second Code Generation',
    headline: 'Sub-Second Code Generation via Speculative Drafting & Verification',
    description:
      'Pair high-velocity draft models (GPT-5.6 Luna) with deep reasoning verifiers (GPT-5.6 Sol) to generate multi-line code completions in sub-second latency.',
    architecturalOverview:
      'Luna drafts token candidates at 142 tokens/sec while Sol validates the token sequence in a single forward verification pass, slashing end-to-end latency by up to 60%.',
    technicalHighlights: [
      'Up to 60% faster code generation compared to standard autoregressive decoding',
      'Preserves 100% of GPT-5.6 Sol reasoning fidelity and test-case passing rate',
      'Automatic speculative draft verification handled entirely on GALXAI edge proxies',
      'Wholesale token pricing applied to both draft and verification stages',
    ],
    benchmarkMetric: {
      label: 'Latency Reduction',
      value: '-58.4%',
      subtext: 'On complex Python AST synthesis',
    },
    codeSnippet: {
      language: 'python',
      code: `from openai import OpenAI

client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# Speculative decoding accelerated code synthesis
response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Implement zero-allocation BPE tokenizer in Rust"}]
)`,
    },
    faqs: [
      {
        q: 'Does speculative decoding alter the final model output quality?',
        a: 'No. The verification stage guarantees exact mathematical equivalence to standard autoregressive generation.',
      },
    ],
  },
  {
    slug: 'semantic-intent-routing',
    badge: 'Zero-Latency Model Router',
    title: 'Zero-Latency Semantic Intent Routing & Cost-Optimal Model Dispatch',
    headline: 'Automatic Semantic Routing to the Most Cost-Effective Frontier Model',
    description:
      'Analyze incoming query complexity in sub-5ms and dispatch automatically to GPT-5.6 Luna, Terra, or Sol to achieve the lowest cost per successful completion.',
    architecturalOverview:
      'Edge intent classifiers evaluate query token length, reasoning depth, and required tool definitions to select the optimal model tier before dispatch.',
    technicalHighlights: [
      'Sub-5ms edge intent classification with zero measurable latency overhead',
      'Slashes aggregate API token spend by up to 55% across mixed developer workloads',
      'Manual model override supported at any time via standard model request parameters',
      'Detailed telemetry logs breakdown model selection rationale per request',
    ],
    benchmarkMetric: {
      label: 'Aggregate Savings',
      value: '-55.2%',
      subtext: 'Across mixed production traffic',
    },
    codeSnippet: {
      language: 'python',
      code: `from openai import OpenAI

client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# Dispatch to automatic optimal frontier model tier
response = client.chat.completions.create(
    model="gpt-5.6-terra",  # Dispatches seamlessly based on task complexity
    messages=[{"role": "user", "content": "Extract customer sentiment from feedback log"}]
)`,
    },
    faqs: [
      {
        q: 'Can I force a specific model instead of using automatic routing?',
        a: 'Yes. Explicitly passing any model identifier (e.g. gpt-5.6-sol) routes directly to that model with 100% determinism.',
      },
    ],
  },
];

