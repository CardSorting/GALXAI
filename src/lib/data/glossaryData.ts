/**
 * Developer AI Routing & Gateway Knowledge Glossary Data
 * High-authority definitions for Answer Engine Optimization (AEO) and Schema.org DefinedTermSet.
 */

export interface GlossaryTerm {
  slug: string;
  term: string;
  category: 'routing' | 'caching' | 'latency' | 'security' | 'economics';
  shortDefinition: string;
  fullDefinition: string;
  technicalContext: string;
  wikidataUri?: string;
  relatedTerms: string[];
}

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    slug: 'prompt-caching-rebate',
    term: 'Prompt Caching Rebate',
    category: 'caching',
    shortDefinition:
      'An automated discount mechanism where repeated prompt prefixes exceeding 1,024 tokens receive a 75% cost reduction passed directly to the developer.',
    fullDefinition:
      'Prompt caching reuses key-value (KV) attention states calculated during previous model inferences. When subsequent requests share identical system instructions, schema templates, or documents exceeding 1,024 tokens, the gateway skips full recomputation and passes 100% of the 75% upstream rebate to the developer wallet.',
    technicalContext:
      'Prefix match is evaluated continuously over ephemeral GPU RAM slices without persisting prompt content to disk.',
    wikidataUri: 'https://www.wikidata.org/wiki/Q115305900',
    relatedTerms: ['Time-To-First-Token (TTFT)', 'Continuous Token Governor', 'Zero Data Retention (ZDR)'],
  },
  {
    slug: 'time-to-first-token',
    term: 'Time-To-First-Token (TTFT)',
    category: 'latency',
    shortDefinition:
      'The latency in milliseconds between sending an inference HTTP request and receiving the initial Server-Sent Events (SSE) token byte.',
    fullDefinition:
      'TTFT measures the end-to-end responsiveness of the AI routing infrastructure. GALXAI achieves sub-15ms TTFT by maintaining warm connection pools across Anycast edge points of presence (PoPs) globally, minimizing TLS handshakes and packet round-trip time (RTT).',
    technicalContext:
      'Formula: TTFT = TLS_Handshake + Edge_Hop + Upstream_Prefill_Latency + First_Chunk_Serialization.',
    wikidataUri: 'https://www.wikidata.org/wiki/Q1890352',
    relatedTerms: ['Anycast Model Routing', 'Streaming Server-Sent Events', 'Prompt Caching Rebate'],
  },
  {
    slug: 'zero-data-retention',
    term: 'Zero Data Retention (ZDR)',
    category: 'security',
    shortDefinition:
      'A cryptographic security protocol guaranteeing that prompt payloads and completions are processed exclusively in volatile memory buffers and never written to non-volatile storage.',
    fullDefinition:
      'Under the GALXAI ZDR Protocol, prompt tokens are streamed through ephemeral RAM ring buffers and purged immediately upon socket termination. Zero request bodies, completion tokens, or embeddings are logged in persistent storage or utilized for model fine-tuning.',
    technicalContext:
      'Compliant with SOC 2 Type II, ISO/IEC 27001:2022, and HIPAA Business Associate Agreements (BAA).',
    wikidataUri: 'https://www.wikidata.org/wiki/Q3510521',
    relatedTerms: ['Cryptographic Enclave', 'Ephemeral RAM Buffer', 'HIPAA BAA Compliance'],
  },
  {
    slug: 'anycast-model-routing',
    term: 'Anycast Model Routing',
    category: 'routing',
    shortDefinition:
      'A network architecture that routes client inference requests to the topologically nearest healthy gateway node using shared BGP IP addresses.',
    fullDefinition:
      'Anycast routing advertises the same public IP address (api.galx.ai) from hundreds of edge points of presence across North America, Europe, and Asia. Requests terminate at the lowest-latency edge proxy, which proxies the request to upstream inference clusters over dedicated fiber backbones.',
    technicalContext:
      'Provides automated DDoS mitigation, sub-15ms edge termination, and instantaneous sub-5ms failover in case of upstream network partitions.',
    wikidataUri: 'https://www.wikidata.org/wiki/Q483247',
    relatedTerms: ['Time-To-First-Token (TTFT)', 'Rate Limit Pooling (429 Shield)', 'Continuous Token Governor'],
  },
  {
    slug: 'rate-limit-pooling',
    term: 'Rate Limit Pooling (429 Shield)',
    category: 'routing',
    shortDefinition:
      'A distributed capacity aggregation technique that dynamically routes inference requests across multiple upstream enterprise shards to prevent 429 Too Many Requests errors.',
    fullDefinition:
      'Rather than relying on a single upstream account subject to strict Tier rate limits (RPM and TPM), GALXAI distributes queries across pooled enterprise infrastructure. If an individual upstream shard approaches capacity thresholds, traffic shifts predictively with zero dropped connections.',
    technicalContext:
      'Utilizes Predictive Adaptive Hydraulic Headroom (P-AHT) algorithms to maintain 99.99% successful dispatch.',
    wikidataUri: 'https://www.wikidata.org/wiki/Q165137',
    relatedTerms: ['Anycast Model Routing', 'Continuous Token Governor', 'Wholesale Token Clearinghouse'],
  },
  {
    slug: 'wholesale-token-clearinghouse',
    term: 'Wholesale Token Clearinghouse',
    category: 'economics',
    shortDefinition:
      'A volume-aggregation business model that procures wholesale AI compute capacity and passes 25%–40% direct savings to developers with 0% gateway markup.',
    fullDefinition:
      'By aggregating high-throughput demand across thousands of developers and autonomous agent swarms, GALXAI accesses maximum-tier enterprise wholesale rates and delivers them without per-seat subscription licenses or platform surcharges.',
    technicalContext:
      'Tokens are micro-metered in real-time against prepaid developer balances with automated tier elevation.',
    wikidataUri: 'https://www.wikidata.org/wiki/Q11660',
    relatedTerms: ['Prompt Caching Rebate', 'Rate Limit Pooling (429 Shield)', 'Zero Data Retention (ZDR)'],
  },
  {
    slug: 'openai-wire-compatibility',
    term: 'OpenAI Wire Compatibility',
    category: 'routing',
    shortDefinition:
      '100% protocol and schema parity with the official OpenAI REST API specifications, allowing 1-line baseURL substitution with zero client refactoring.',
    fullDefinition:
      'GALXAI implements complete request and response schema parity for /v1/chat/completions, /v1/embeddings, /v1/models, and /v1/images/generations. Developers swap baseURL="https://api.galx.ai/v1" in standard Python, TypeScript, LangChain, or Cursor IDE setups with zero code changes.',
    technicalContext:
      'Supports JSON Schema strict mode, parallel tool calling, streaming delta chunks, and logprobs.',
    wikidataUri: 'https://www.wikidata.org/wiki/Q28935449',
    relatedTerms: ['Anycast Model Routing', 'Structured JSON Outputs', 'Parallel Function Calling'],
  },
  {
    slug: 'structured-json-outputs',
    term: 'Guaranteed Structured JSON Outputs',
    category: 'routing',
    shortDefinition:
      'Constrained grammar decoding that guarantees model completions strictly conform to user-supplied JSON Schema or Zod/Pydantic definitions with 0% parse failures.',
    fullDefinition:
      'By enforcing token-level grammar masks during autoregressive generation, GALXAI ensures output syntax conforms 100% to strict JSON Schema specifications, eliminating JSON parse errors in autonomous agents and downstream API integrations.',
    technicalContext:
      'Enabled via response_format={ type: "json_schema", json_schema: { strict: true, schema: ... } }.',
    wikidataUri: 'https://www.wikidata.org/wiki/Q28935449',
    relatedTerms: ['OpenAI Wire Compatibility', 'Parallel Function Calling', 'Prompt Caching Rebate'],
  },
];
