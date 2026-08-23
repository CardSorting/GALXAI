/**
 * Programmatic Error Code Troubleshooting Dataset for pSEO and AEO
 */

export interface ErrorTroubleshootItem {
  code: string;
  httpStatus: number;
  errorType: string;
  badge: string;
  title: string;
  headline: string;
  description: string;
  rootCause: string;
  sampleErrorPayload: string;
  permanentFix: string;
  codeSnippet: {
    language: 'Python' | 'TypeScript';
    code: string;
  };
  faqs: { q: string; a: string }[];
}

export const ERROR_TROUBLESHOOT_DATA: ErrorTroubleshootItem[] = [
  {
    code: '429-too-many-requests',
    httpStatus: 429,
    errorType: 'rate_limit_exceeded',
    badge: '429 Shield Resolution',
    title: 'How to Fix OpenAI 429 Too Many Requests (Rate Limit Exceeded) Error',
    headline: 'Fix OpenAI 429 Too Many Requests in 30 Seconds',
    description:
      'Eliminate 429 Rate Limit Exceeded and TPM/RPM quota errors by routing inference through the GALXAI 429 Shield with enterprise multi-shard capacity pooling.',
    rootCause:
      'Direct provider accounts enforce strict Tier limits on Requests Per Minute (RPM) and Tokens Per Minute (TPM). Sudden concurrency bursts from multi-agent swarms or user traffic exhaust these quotas instantly.',
    sampleErrorPayload: `{
  "error": {
    "message": "You exceeded your current quota, please check your plan and billing details.",
    "type": "insufficient_quota",
    "param": null,
    "code": "rate_limit_exceeded"
  }
}`,
    permanentFix:
      'GALXAI pools traffic dynamically across distributed enterprise accounts. When an individual shard approaches capacity, requests shift seamlessly to warm backup shards with 0 dropped sockets.',
    codeSnippet: {
      language: 'Python',
      code: `from openai import OpenAI

# Solve 429 Rate Limits Instantly: Swap Base URL to GALXAI 429 Shield
client = OpenAI(
    base_url="https://api.galx.ai/v1",  # Pooled enterprise capacity
    api_key="galx_live_your_gateway_key"
)

# Burst 100+ concurrent agent requests with zero 429 stalls
response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Execute high-concurrency batch"}]
)`,
    },
    faqs: [
      {
        q: 'Why do direct provider 429 errors happen even with prepaid credits?',
        a: 'Direct API tiers enforce strict RPM (requests per minute) caps regardless of your balance. GALXAI aggregates capacity across enterprise pools to bypass per-key tier bottlenecks.',
      },
      {
        q: 'Does GALXAI charge extra for 429 rate limit pooling?',
        a: 'No. Rate limit pooling is a built-in 0% markup feature of the GALXAI gateway.',
      },
    ],
  },
  {
    code: '504-gateway-timeout',
    httpStatus: 504,
    errorType: 'timeout_error',
    badge: 'Anycast Timeout Shield',
    title: 'How to Fix 504 Gateway Timeout on OpenAI & LLM Streaming Requests',
    headline: 'Fix 504 Gateway Timeout on Streaming LLM Requests',
    description:
      'Prevent 504 Gateway Timeout errors during long-running reasoning and code generation tasks using GALXAI Anycast edge proxies and warm socket pools.',
    rootCause:
      'Reverse proxies (like Cloudflare or AWS ALB) terminate HTTP connections if upstream inference takes >30 seconds before sending the first token chunk.',
    sampleErrorPayload: `{
  "error": {
    "message": "504 Gateway Time-out: Upstream reasoning cluster did not respond within timeout window.",
    "type": "timeout_error",
    "code": "gateway_timeout"
  }
}`,
    permanentFix:
      'GALXAI Anycast edge proxies maintain persistent TCP keep-alive pings and stream the initial SSE byte in <14ms TTFT, preventing intermediate proxy socket closure.',
    codeSnippet: {
      language: 'TypeScript',
      code: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.galx.ai/v1",
  apiKey: process.env.GALXAI_API_KEY,
  timeout: 60000, // 60s client timeout
});

// Stream with sub-15ms TTFT to prevent 504 timeouts
const stream = await client.chat.completions.create({
  model: "gpt-5.6-sol",
  stream: true,
  messages: [{ role: "user", content: "Deep architectural reasoning prompt" }],
});`,
    },
    faqs: [
      {
        q: 'How does streaming prevent 504 Gateway Timeout errors?',
        a: 'Streaming sends Server-Sent Events (SSE) immediately. Once the initial byte arrives (<14ms on GALXAI), intermediate edge proxies reset their idle timeout counters.',
      },
    ],
  },
  {
    code: 'context-length-exceeded',
    httpStatus: 400,
    errorType: 'invalid_request_error',
    badge: '1M Context Expansion',
    title: 'How to Fix Maximum Context Length Exceeded in OpenAI & LangChain',
    headline: 'Fix Maximum Context Length Exceeded Errors in 1 Line',
    description:
      'Upgrade from restrictive 128K context boundaries to 1,000,000 (1M) token context windows with Grok 4.6 and 900K on GPT-5.6 Sol on GALXAI.',
    rootCause:
      'Sending prompts, conversation histories, or RAG documents that exceed the model’s hard token capacity limit.',
    sampleErrorPayload: `{
  "error": {
    "message": "This model's maximum context length is 128000 tokens. However, your messages resulted in 142850 tokens.",
    "type": "invalid_request_error",
    "param": "messages",
    "code": "context_length_exceeded"
  }
}`,
    permanentFix:
      'Switch to GALXAI x-ai/grok-4.6 (1,000,000 token context) or gpt-5.6-sol (900,000 token context) with automatic 75% prompt caching on large prefixes.',
    codeSnippet: {
      language: 'Python',
      code: `from openai import OpenAI

client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# Route massive 500K+ token document without context length errors
response = client.chat.completions.create(
    model="x-ai/grok-4.6",  # 1,000,000 Token Context Window
    messages=[{"role": "user", "content": huge_repository_context}]
)`,
    },
    faqs: [
      {
        q: 'What is the largest context window available on GALXAI?',
        a: 'xAI Grok 4.6 features a 1,000,000 token context window, and OpenAI GPT-5.6 Sol supports 900,000 tokens.',
      },
    ],
  },
  {
    code: 'json-parse-failed',
    httpStatus: 422,
    errorType: 'structured_output_error',
    badge: 'Strict Grammar Masking',
    title: 'How to Fix JSON Parse & Malformed Output Errors in LLM Function Calling',
    headline: 'Eliminate Malformed JSON Output Errors with 100% Strict Grammars',
    description:
      'Guarantee 0% JSON parse failures in autonomous agent workflows using token-level constrained grammar masks on the GALXAI Gateway.',
    rootCause:
      'Unconstrained autoregressive generation produces unclosed quotes, trailing commas, or invalid JSON syntax during high-temperature completions.',
    sampleErrorPayload: `{
  "error": {
    "message": "SyntaxError: Unexpected token } in JSON at position 492",
    "type": "json_parse_error",
    "code": "malformed_completion"
  }
}`,
    permanentFix:
      'GALXAI enforces strict token-level grammar decoding (response_format={ type: "json_schema", json_schema: { strict: true } }), guaranteeing 100% valid JSON conforming to your Zod or Pydantic schema.',
    codeSnippet: {
      language: 'Python',
      code: `from openai import OpenAI

client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

response = client.chat.completions.create(
    model="gpt-5.6-sol",
    response_format={
        "type": "json_schema",
        "json_schema": {
            "name": "structured_order",
            "strict": True,
            "schema": {
                "type": "object",
                "properties": {
                    "order_id": {"type": "string"},
                    "total_usd": {"type": "number"}
                },
                "required": ["order_id", "total_usd"],
                "additionalProperties": False
            }
        }
    },
    messages=[{"role": "user", "content": "Extract order #8492 for $129.50"}]
)`,
    },
    faqs: [
      {
        q: 'Does GALXAI charge extra for strict JSON schema enforcement?',
        a: 'No. Strict grammar masking is applied at the decoding layer with zero latency penalty and zero extra cost.',
      },
    ],
  },
  {
    code: '401-invalid-api-key',
    httpStatus: 401,
    errorType: 'authentication_error',
    badge: 'Instant Key Minting',
    title: 'How to Fix OpenAI 401 Invalid API Key (Unauthorized) Error',
    headline: 'Fix 401 Invalid API Key & Authentication Errors in 10 Seconds',
    description:
      'Generate a free, instantly active live developer API key with $5 in compute credits and zero credit card requirements on GALXAI.',
    rootCause:
      'Expired, revoked, or malformed API keys, or forgetting to pass the "Bearer " authorization prefix.',
    sampleErrorPayload: `{
  "error": {
    "message": "Incorrect API key provided: sk-proj-... You can find your API key at https://platform.openai.com/account/api-keys.",
    "type": "invalid_request_error",
    "param": null,
    "code": "invalid_api_key"
  }
}`,
    permanentFix:
      'Mint a fresh GALXAI API key ("galx_live_...") with instant $5 free credit activation from /keys.',
    codeSnippet: {
      language: 'Python',
      code: `from openai import OpenAI

# Fresh Instant GALXAI Key (Active in <10 seconds)
client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_new_key"
)

# Test instant key validity
models = client.models.list()
print("Connected successfully! Models:", [m.id for m in models.data])`,
    },
    faqs: [
      {
        q: 'How long does a new GALXAI API key take to propagate?',
        a: 'GALXAI API keys propagate globally across all Anycast edge nodes in under 200 milliseconds.',
      },
    ],
  },
  {
    code: 'overloaded-error',
    httpStatus: 503,
    errorType: 'server_error',
    badge: 'Multi-Cluster Failover',
    title: 'How to Fix 503 Service Unavailable (The engine is currently overloaded)',
    headline: 'Fix 503 Overloaded Engine Errors with Automated Shard Failover',
    description:
      'Shield your production apps from upstream outages with GALXAI multi-region failover and Predictive Adaptive Hydraulic Headroom (P-AHT).',
    rootCause:
      'Upstream provider data centers experience GPU capacity exhaustion or cluster outages during peak global hours.',
    sampleErrorPayload: `{
  "error": {
    "message": "The engine is currently overloaded, please try again later.",
    "type": "server_error",
    "param": null,
    "code": "engine_overloaded"
  }
}`,
    permanentFix:
      'GALXAI actively probes upstream cluster health. If an origin region signals >85% capacity or returns 503, requests automatically failover to secondary enterprise clusters in <5ms.',
    codeSnippet: {
      language: 'Python',
      code: `from openai import OpenAI

# Automated Multi-Cluster Failover Protection
client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# GALXAI automatically absorbs upstream 503s with sub-5ms failover
response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Mission-critical production completion"}]
)`,
    },
    faqs: [
      {
        q: 'What is GALXAI’s uptime SLA for enterprise users?',
        a: 'GALXAI provides a 99.99% uptime guarantee with multi-cloud active-active redundancy across AWS, GCP, and CoreWeave infrastructure.',
      },
    ],
  },
];
