import { BILLING_PATHS } from '@/lib/billing/navigation';
import { GALX_API_BASE_URL } from '@/sdk/base-url';

export const DOC_MODEL = 'gpt-5-6-luna-low';
export const DOC_IMAGE_MODEL = 'openai-gpt-image-latest';

export const DOC_NAV = [
  { href: '/docs', title: 'Quickstart', description: 'Curated developer foundation & first request.' },
  { href: '/docs/api-reference', title: 'API reference', description: 'Endpoints, schemas, and HTTP contracts.' },
  { href: '/docs/examples', title: 'Creative Playground', description: 'Multimodal pipelines, streaming, and JSON.' },
  { href: '/docs/sdks', title: 'SDKs & IDEs', description: 'Connect Python, TypeScript, Cursor, and Windsurf.' },
  { href: '/docs/error-handling', title: 'Troubleshooting', description: 'Error status codes, backoff, and diagnostics.' },
] as const;

export type DocId = 'quickstart' | 'api' | 'examples' | 'integrations' | 'troubleshooting';
export type DocCode = { label: string; source: string };
export type DocCallout = { type: 'tip' | 'note' | 'important'; title?: string; text: string };
export type DocSection = {
  id: string;
  title: string;
  badge?: string;
  body?: string[];
  steps?: string[];
  callout?: DocCallout;
  code?: DocCode[];
  responseCode?: DocCode;
  table?: { headings: string[]; rows: string[][] };
  links?: { href: string; label: string }[];
};
export type DocPage = {
  path: string;
  title: string;
  badge?: string;
  description: string;
  sections: DocSection[];
};

export const REQUEST_EXAMPLES: DocCode[] = [
  {
    label: 'cURL',
    source: `curl --fail-with-body ${GALX_API_BASE_URL}/chat/completions \\
  -H "Authorization: Bearer $GALXAI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"${DOC_MODEL}","messages":[{"role":"user","content":"Explain quantum superposition in one sentence."}]}'`,
  },
  {
    label: 'Python',
    source: `# Install: python -m pip install openai
import os
from openai import OpenAI

client = OpenAI(
    base_url="${GALX_API_BASE_URL}",
    api_key=os.environ["GALXAI_API_KEY"],
)
response = client.chat.completions.create(
    model="${DOC_MODEL}",
    messages=[{"role": "user", "content": "Explain quantum superposition in one sentence."}],
)
print(response.choices[0].message.content)`,
  },
  {
    label: 'TypeScript',
    source: `// Install: npm install openai
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${GALX_API_BASE_URL}",
  apiKey: process.env.GALXAI_API_KEY,
});
const response = await client.chat.completions.create({
  model: "${DOC_MODEL}",
  messages: [{ role: "user", content: "Explain quantum superposition in one sentence." }],
});
console.log(response.choices[0].message.content);`,
  },
  {
    label: 'Go',
    source: `// Install: go get github.com/sashabaranov/go-openai
package main

import (
	"context"
	"fmt"
	"os"
	openai "github.com/sashabaranov/go-openai"
)

func main() {
	config := openai.DefaultConfig(os.Getenv("GALXAI_API_KEY"))
	config.BaseURL = "${GALX_API_BASE_URL}"
	client := openai.NewClientWithConfig(config)
	resp, err := client.CreateChatCompletion(
		context.Background(),
		openai.ChatCompletionRequest{
			Model: "${DOC_MODEL}",
			Messages: []openai.ChatCompletionMessage{
				{Role: openai.ChatMessageRoleUser, Content: "Explain quantum superposition in one sentence."},
			},
		},
	)
	if err != nil { panic(err) }
	fmt.Println(resp.Choices[0].Message.Content)
}`,
  },
];

export const RESPONSE_EXAMPLE: DocCode = {
  label: 'JSON Response',
  source: `{
  "id": "chatcmpl-galx-9d82e1",
  "object": "chat.completion",
  "created": 1758123000,
  "model": "${DOC_MODEL}",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Quantum superposition is the principle that a physical system can exist in multiple distinct states simultaneously until a measurement is performed."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 15,
    "completion_tokens": 28,
    "total_tokens": 43,
    "prompt_tokens_details": {
      "cached_tokens": 0
    }
  }
}`,
};

export const AGENT_SETUP = `# Set up GALXAI in this project

Integrate GALXAI into the existing application. Inspect its language, framework, and current AI client first. Reuse existing conventions and dependencies.

## Connection
- API base URL: ${GALX_API_BASE_URL}
- Authentication: Authorization: Bearer <GALXAI_API_KEY>
- Secret environment variable: GALXAI_API_KEY
- Curated Flagship Model: ${DOC_MODEL} (OpenAI GPT-5.6 Luna Low)
- Visual Synthesis Model: ${DOC_IMAGE_MODEL} (OpenAI Image Generation)
- Model catalog: GET ${GALX_API_BASE_URL}/models
- Chat endpoint: POST ${GALX_API_BASE_URL}/chat/completions
- Image endpoint: POST ${GALX_API_BASE_URL}/images/generations
- Create a key: https://galx.ai/keys

## Platform Strategy
1. Curated Frontier Intelligence: GALXAI exclusively serves GPT-5.6 Luna for text and reasoning, selected through private internal testing as having the highest performance per dollar so developers can build and explore without being constrained by quality, price, or exploration limits.
2. Generative Creative Playground: Multimodal pipelines combine GPT-5.6 Luna reasoning and orchestration with high-fidelity visual synthesis via ${DOC_IMAGE_MODEL}.
3. Sustainable Developer Compute: Sub-15ms Anycast edge relay with zero markup, transparent billing, and 90% prompt cache rebates.

## Implementation Steps
1. Keep GALXAI_API_KEY on the server. Never put it in browser code, NEXT_PUBLIC variables, logs, commits, or this conversation. If it is missing, ask the user to configure it in their environment or secret manager.
2. If the project already uses an OpenAI-compatible client, set its base URL and key explicitly. Python uses base_url; JavaScript uses baseURL. Do not append /v1 twice. Do not substitute api.galx.ai: it is a separate deployment.
3. Default to ${DOC_MODEL} for chat, reasoning, code generation, and agentic workflows. For visual synthesis, use ${DOC_IMAGE_MODEL}.
4. Add one server-side request with the payload below. Reuse the application's existing API handler or server action. Do not expose the secret to users.
5. Handle failed requests visibly. Do not retry 400, 401, 402, or 403 blindly. Bound retries for transient failures; honor Retry-After on 429. Do not silently switch models.
6. Validate the integration with the configured credential, using one small request when authorized. Never substitute simulated responses. If the credential is missing or the request fails, report that accurately.
7. Report changed files, required environment variables, how to run it, and the verification result. Do not add unrelated features.

## Minimal request
${REQUEST_EXAMPLES[0].source}

A successful non-streaming response is an OpenAI-compatible JSON object. Read choices[0].message.content. With stream: true, consume SSE deltas and stop at [DONE]. Do not retry after displaying partial output unless the application explicitly supports resumption.

## References
- Quickstart: https://galx.ai/docs
- API reference: https://galx.ai/docs/api-reference
- Creative Playground & Examples: https://galx.ai/docs/examples
- Integrations: https://galx.ai/docs/sdks
- Troubleshooting: https://galx.ai/docs/error-handling
`;

export const DOC_PAGES: Record<DocId, DocPage> = {
  quickstart: {
    path: '/docs',
    title: 'Developer Quickstart',
    badge: 'Frontier Developer Foundation',
    description: 'Connect your applications to GALXAI in under two minutes. One API key, one standard base URL, and immediate access to curated GPT-5.6 Luna intelligence.',
    sections: [
      {
        id: 'credentials',
        title: '1. Create an API key',
        badge: 'Authentication',
        body: [
          'Generate an API key in your dashboard. Keys are secret tokens displayed once upon generation. Keep your key secure on the server side—never commit it to git or expose it in client-side bundles.',
        ],
        links: [{ href: '/keys', label: 'Create API key in Dashboard' }],
        callout: {
          type: 'tip',
          title: 'Zero-Egress Security',
          text: 'GALXAI operates with Zero Data Retention (ZDR). Your prompts and generations are never used for model training or retained to disk.',
        },
        code: [
          {
            label: 'Terminal',
            source: `# Set your secret key in your local or server environment
export GALXAI_API_KEY="galx_live_..."
export OPENAI_BASE_URL="${GALX_API_BASE_URL}"`,
          },
        ],
      },
      {
        id: 'request',
        title: '2. Send your first request',
        badge: 'Universal Wire Protocol',
        body: [
          'GALXAI is 100% wire-compatible with standard OpenAI SDKs and HTTP clients. Point your client to https://galx.ai/v1 and dispatch your query.',
        ],
        code: REQUEST_EXAMPLES,
        responseCode: RESPONSE_EXAMPLE,
      },
      {
        id: 'response',
        title: '3. Inspect the response & usage',
        badge: 'Clean JSON DTO',
        body: [
          'Responses follow the standard chat completion schema. Assistant text resides at `choices[0].message.content`. Inspect token counts in `usage` to verify automated prompt caching rebates.',
        ],
        callout: {
          type: 'note',
          title: 'Prompt Caching Pass-Through',
          text: 'Requests with 1,024+ repeated prefix tokens automatically qualify for prompt caching rebates, reducing input costs by up to 90%.',
        },
        links: [
          { href: '/docs/error-handling', label: 'Inspect error codes & troubleshooting' },
          { href: '/keys/activity', label: 'View real-time usage telemetry' },
        ],
      },
      {
        id: 'models',
        title: 'Curated Intelligence: Why GPT-5.6 Luna',
        badge: 'Optimal $/Perf',
        body: [
          `GALXAI exclusively serves ${DOC_MODEL} as our flagship reasoning engine. Through extensive private internal testing, GPT-5.6 Luna demonstrated the single highest performance-per-dollar ratio of any frontier model.`,
          'By curating our engine rather than offering an unvetted marketplace of dozens of overlapping checkpoints, developers can explore, test, and deploy production pipelines with maximum reliability, zero confusion, and no artificial quality constraints.',
        ],
        code: [
          {
            label: 'Query Catalog',
            source: `curl --fail-with-body ${GALX_API_BASE_URL}/models \\
  -H "Authorization: Bearer $GALXAI_API_KEY"`,
          },
        ],
        links: [{ href: '/models', label: 'Browse curated model benchmarks' }],
      },
      {
        id: 'agent-setup',
        title: 'Configure Coding Agents (Cursor, Claude, Windsurf)',
        badge: 'Agent Ergonomics',
        body: [
          'Hand this setup brief directly to your coding assistant (Cursor, Windsurf, Claude Code, GitHub Copilot). It contains standard base URLs, target model IDs, and implementation constraints with zero secret leakage.',
        ],
        links: [{ href: '/docs/agent-setup', label: 'View plain-text agent brief' }],
      },
    ],
  },

  api: {
    path: '/docs/api-reference',
    title: 'API Reference',
    badge: 'OpenAI Wire-Compatible',
    description: 'Comprehensive HTTP specifications for GALXAI endpoints. All requests communicate over HTTPS with JSON or Server-Sent Events (SSE).',
    sections: [
      {
        id: 'authentication',
        title: 'Authentication & Base URL',
        badge: 'Bearer Token',
        body: [
          'Authenticate every HTTP request with your secret API key via the standard HTTP Authorization header. Base URL paths are anchored at https://galx.ai/v1.',
        ],
        callout: {
          type: 'important',
          title: 'Never expose keys in client code',
          text: 'Never use NEXT_PUBLIC_ variables or client-side fetch for GALXAI API keys. Keep all inference calls inside server actions, API routes, or backend microservices.',
        },
        code: [{ label: 'Header', source: 'Authorization: Bearer <GALXAI_API_KEY>' }],
      },
      {
        id: 'endpoints',
        title: 'Supported Endpoints',
        badge: 'Core Surface',
        table: {
          headings: ['Method', 'Path', 'Description', 'Model Engine'],
          rows: [
            ['GET', '/v1/models', 'Enumerate verified model IDs and context limits', 'All'],
            ['POST', '/v1/chat/completions', 'Text reasoning, structured outputs, streaming & tools', DOC_MODEL],
            ['POST', '/v1/messages', 'Messages-compatible reasoning requests', DOC_MODEL],
            ['POST', '/v1/images/generations', 'Visual synthesis & creative asset generation', DOC_IMAGE_MODEL],
            ['POST', '/v1/embeddings', 'Experimental deterministic vectors (see limitations)', 'Deterministic Local'],
          ],
        },
      },
      {
        id: 'chat',
        title: 'Chat Completions Contract',
        badge: `POST /v1/chat/completions`,
        body: [
          'Dispatch conversations to GPT-5.6 Luna. Supports multi-turn dialogue, system prompts, JSON schema enforcement, and tool calling with up to 1,050,000 tokens of context.',
        ],
        table: {
          headings: ['Parameter', 'Type', 'Default', 'Description'],
          rows: [
            ['model', 'string', 'required', `Exact model ID: "${DOC_MODEL}".`],
            ['messages', 'array', 'required', 'Array of message objects with "role" (system, user, assistant, tool) and "content".'],
            ['stream', 'boolean', 'false', 'When true, yields Server-Sent Events (text/event-stream) terminating with [DONE].'],
            ['max_tokens', 'integer', '4096', 'Maximum number of tokens to generate in the completion (up to 128,000).'],
            ['temperature', 'number', '1.0', 'Sampling temperature between 0.0 and 2.0. Higher values yield more creative outputs.'],
            ['response_format', 'object', 'null', 'Set { "type": "json_object" } for structured JSON output.'],
            ['tools', 'array', 'null', 'List of available tool/function specifications the model may invoke.'],
          ],
        },
        code: [
          {
            label: 'Request Payload',
            source: JSON.stringify(
              {
                model: DOC_MODEL,
                messages: [
                  { role: 'system', content: 'You are an expert fullstack architect.' },
                  { role: 'user', content: 'Design a resilient rate-limiter in Redis.' },
                ],
                temperature: 0.2,
                stream: false,
              },
              null,
              2,
            ),
          },
        ],
      },
      {
        id: 'response',
        title: 'Response Structures & DTOs',
        badge: 'DTO Schema',
        body: [
          'Successful responses return HTTP 200 with an OpenAI-compatible JSON payload. Generated text resides at `choices[0].message.content`. If tool calls are triggered, inspect `choices[0].message.tool_calls`.',
          'Errors return standard RFC-7807 error envelopes with HTTP 4xx/5xx status codes.',
        ],
        code: [
          {
            label: 'Success (HTTP 200)',
            source: RESPONSE_EXAMPLE.source,
          },
          {
            label: 'Error (HTTP 429)',
            source: `{
  "error": {
    "message": "Rate limit exceeded for tier: 20 concurrent streams. Please back off.",
    "type": "rate_limit_exceeded",
    "code": 429
  }
}`,
          },
        ],
        links: [
          { href: '/docs/examples#tools', label: 'See Function Calling & Tool Handling' },
          { href: '/docs/error-handling', label: 'Inspect Error Handling Guide' },
        ],
      },
      {
        id: 'embeddings',
        title: 'Embeddings Route Note',
        badge: 'Technical Notice',
        body: [
          'The current `/v1/embeddings` route produces deterministic local hash vectors for structural fingerprinting, not semantic dense embeddings. For semantic search and RAG retrieval pipelines, use dedicated embedding services.',
        ],
      },
    ],
  },

  examples: {
    path: '/docs/examples',
    title: 'Creative Playground & Patterns',
    badge: 'Multimodal Execution',
    description: 'Explore the generative creative playground: streaming responses, structured JSON schema extraction, autonomous tools, and multimodal visual pipelines chaining GPT-5.6 Luna with image generation.',
    sections: [
      {
        id: 'streaming',
        title: 'High-Velocity Streaming (SSE)',
        badge: 'Sub-15ms TTFT',
        body: [
          'Stream tokens in real time via Server-Sent Events. Process deltas as they arrive for low perceived latency in user-facing chat interfaces.',
        ],
        code: [
          {
            label: 'Node.js Streaming',
            source: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${GALX_API_BASE_URL}",
  apiKey: process.env.GALXAI_API_KEY,
});

const stream = await client.chat.completions.create({
  model: "${DOC_MODEL}",
  messages: [{ role: "user", content: "Write a high-performance HTTP router in Rust." }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? "");
}`,
          },
        ],
      },
      {
        id: 'structured-outputs',
        title: 'Structured Outputs (JSON Schema)',
        badge: 'Deterministic DTO',
        body: [
          'Constrain GPT-5.6 Luna to return strictly valid JSON. Ideal for extracting entities, generating database records, or orchestrating downstream services.',
        ],
        code: [
          {
            label: 'JSON Object Mode',
            source: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${GALX_API_BASE_URL}",
  apiKey: process.env.GALXAI_API_KEY,
});

const response = await client.chat.completions.create({
  model: "${DOC_MODEL}",
  messages: [
    { role: "system", content: "Extract sentiment and keywords. Return JSON." },
    { role: "user", content: "The latency dropped from 250ms to 12ms! Incredible platform." }
  ],
  response_format: { type: "json_object" },
});

const data = JSON.parse(response.choices[0].message.content ?? "{}");
console.log(data);`,
          },
        ],
      },
      {
        id: 'tools',
        title: 'Autonomous Tool & Function Calling',
        badge: 'Agentic Actions',
        body: [
          'Declare functions for GPT-5.6 Luna to execute. The model inspects parameters, generates structured arguments, and waits for your application to return the execution results.',
        ],
        steps: [
          'Define functions in the `tools` array with JSON Schema descriptions.',
          'Execute the model request and inspect `message.tool_calls`.',
          'Execute the local tool function with the parsed arguments.',
          'Append the assistant tool call message and a tool message with the execution result.',
          'Send the updated conversation history back to the model for the final synthesized answer.',
        ],
        code: [
          {
            label: 'Function Definition',
            source: `const tools = [
  {
    type: "function",
    function: {
      name: "fetch_stock_price",
      description: "Get real-time stock ticker price",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string", description: "Stock symbol, e.g. NVDA" },
        },
        required: ["symbol"],
      },
    },
  },
];`,
          },
        ],
      },
      {
        id: 'images',
        title: 'Creative Visual Synthesis',
        badge: 'Multimodal Creative Playground',
        body: [
          `Generate high-fidelity imagery using ${DOC_IMAGE_MODEL}. By default, GALXAI returns clean binary image artifacts (PNG/JPEG/WebP) or structured JSON containing binary URLs.`,
          'Combine GPT-5.6 Luna with image generation: use Luna to expand artistic prompts with rich lighting and camera direction, then feed the refined prompt into visual synthesis.',
        ],
        code: [
          {
            label: 'cURL Image Generation',
            source: `curl --fail-with-body ${GALX_API_BASE_URL}/images/generations \\
  -H "Authorization: Bearer $GALXAI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"${DOC_IMAGE_MODEL}","prompt":"Hyper-detailed architectural rendering of an eco-friendly solar observatory, golden hour, cinematic lighting","n":1}'`,
          },
          {
            label: 'Python Multimodal Pipeline',
            source: `# 1. Refine creative prompt with GPT-5.6 Luna
refined = client.chat.completions.create(
    model="${DOC_MODEL}",
    messages=[{"role": "user", "content": "Expand into a vivid image prompt: Cyberpunk greenhouse"}]
).choices[0].message.content

# 2. Synthesize visual artifact
image_resp = client.images.generate(
    model="${DOC_IMAGE_MODEL}",
    prompt=refined,
    n=1,
)
print("Image artifact URL:", image_resp.data[0].url)`,
          },
        ],
        links: [{ href: '/models', label: 'View image model pricing and capabilities' }],
      },
      {
        id: 'prompt-caching',
        title: 'Large Contexts & 90% Prompt Caching',
        badge: '1,050,000 Context Window',
        body: [
          'GPT-5.6 Luna supports up to 1,050,000 tokens of input context. When passing shared system instructions, codebase indexes, or documentation libraries, prefix stability activates automated prompt caching.',
          'Cached tokens are served at $0.02 / 1M tokens (a 90% discount compared to standard input rates), eliminating cost barriers for complex multi-turn developer workflows.',
        ],
        callout: {
          type: 'tip',
          title: 'Prefix Optimization Rule',
          text: 'Always place invariant context (system rules, schema definitions, long reference files) at the beginning of your message array. Put dynamic, changing user questions at the end.',
        },
      },
      {
        id: 'agents',
        title: 'Multi-Turn Agent Session Isolation',
        badge: 'Autonomous Sessions',
        body: [
          'Maintain separate message histories for independent agent tasks. Keep tool results scoped strictly to their originating conversation thread to prevent cross-tenant contamination.',
        ],
        links: [{ href: '/docs#agent-setup', label: 'Copy setup brief for your coding agent' }],
      },
    ],
  },

  integrations: {
    path: '/docs/sdks',
    title: 'SDKs & IDE Integrations',
    badge: 'Zero Configuration',
    description: 'Integrate GALXAI into your existing stack in minutes. Use official OpenAI libraries or plug directly into modern AI development environments like Cursor, Claude Code, and Windsurf.',
    sections: [
      {
        id: 'python',
        title: 'Python Ecosystem',
        badge: 'Official OpenAI SDK',
        body: [
          'Use the official openai Python library. Specify base_url="https://galx.ai/v1" and supply your GALXAI_API_KEY.',
        ],
        code: [REQUEST_EXAMPLES[1]],
      },
      {
        id: 'typescript',
        title: 'JavaScript, TypeScript & Next.js',
        badge: 'Edge Compatible',
        body: [
          'Compatible with Node.js, Next.js Server Components / Server Actions, Bun, Cloudflare Workers, and Deno.',
        ],
        code: [REQUEST_EXAMPLES[2]],
      },
      {
        id: 'http',
        title: 'Direct HTTP & Additional Languages',
        badge: 'Universal Wire Protocol',
        body: [
          'Any standard HTTP client in Go, Rust, Ruby, PHP, Java, or C# can communicate with GALXAI over HTTPS.',
        ],
        code: [REQUEST_EXAMPLES[3], REQUEST_EXAMPLES[0]],
        links: [{ href: '/docs/api-reference', label: 'Browse Full Endpoint Specification' }],
      },
      {
        id: 'ide',
        title: 'Cursor, Windsurf & Claude Code Configuration',
        badge: 'Developer IDEs',
        body: [
          'Configure your AI code editor to route through GALXAI for high-speed frontier reasoning and lower token costs.',
        ],
        table: {
          headings: ['Setting Field', 'Value to Enter', 'Notes'],
          rows: [
            ['OpenAI Base URL', GALX_API_BASE_URL, 'Do not add trailing slash or duplicate /v1'],
            ['API Key', '$GALXAI_API_KEY', 'Use your generated secret key'],
            ['Model Name / ID', DOC_MODEL, 'OpenAI GPT-5.6 Luna Low'],
            ['Context Window', '1,050,000 tokens', 'Full long-context support'],
          ],
        },
        links: [{ href: '/docs/agent-setup', label: 'Get the one-click agent setup prompt' }],
      },
      {
        id: 'migration',
        title: '1-Line Migration from Direct OpenAI API',
        badge: 'Zero Refactoring',
        body: [
          'No code changes required. Keep your existing OpenAI client imports and method calls intact. Simply update your environment variables to route requests through GALXAI Anycast edge relays.',
        ],
        steps: [
          'Keep your existing OpenAI Python or TypeScript SDK code.',
          'Set OPENAI_BASE_URL="https://galx.ai/v1" in your environment.',
          'Replace your API key with your GALXAI API key.',
          'Switch your model parameter to gpt-5-6-luna-low.',
        ],
        links: [{ href: '/models', label: 'Review Curated Model Catalog' }],
      },
      {
        id: 'galxai-sdk',
        title: 'Native GALXAI Client SDK',
        badge: 'Native TypeScript SDK',
        body: [
          'The native galxai npm package provides zero-dependency typed wrappers with automated retry backoff, prompt caching tracking, and Anycast health failover.',
        ],
        code: [
          {
            label: 'TypeScript',
            source: `import { GalxAI } from "galxai";

const client = new GalxAI({
  apiKey: process.env.GALXAI_API_KEY,
});

const response = await client.chat.completions.create({
  model: "${DOC_MODEL}",
  messages: [{ role: "user", content: "Hello from native SDK" }],
});
console.log(response.choices[0].message.content);`,
          },
        ],
      },
    ],
  },

  troubleshooting: {
    path: '/docs/error-handling',
    title: 'Operations & Error Handling',
    badge: 'Production Resilience',
    description: 'Diagnostic guidelines, HTTP status code specifications, rate limit mitigation, and secure credential handling for production workloads.',
    sections: [
      {
        id: 'errors',
        title: 'HTTP Status Code Reference',
        badge: 'Status Classification',
        table: {
          headings: ['HTTP Status', 'Category', 'Root Cause', 'Recommended Remediation'],
          rows: [
            ['400 Bad Request', 'Client Error', 'Malformed JSON, missing required fields, or unsupported parameters.', 'Validate request payload against the API reference schema.'],
            ['401 Unauthorized', 'Authentication', 'Invalid, revoked, or missing Bearer API key.', 'Verify GALXAI_API_KEY is loaded in process.env and matches dashboard.'],
            ['402 Payment Required', 'Billing', 'Zero credit balance or exhausted account wallet.', 'Add credits or configure auto-reload in Billing Settings.'],
            ['403 Forbidden', 'Access Control', 'Key lacks permission or Developer Preview access required.', 'Check key scopes in dashboard or request developer preview access.'],
            ['404 Not Found', 'Routing', 'Endpoint path does not exist. (e.g. /v1/v1/chat).', 'Ensure base URL is https://galx.ai/v1 and path is /chat/completions.'],
            ['429 Rate Limit', 'Concurrency / Quota', 'Exceeded concurrent stream limit or requests-per-minute.', 'Honor Retry-After header and implement exponential jitter backoff.'],
            ['500 / 502 / 503', 'Server / Gateway', 'Transient edge network failure or upstream provider timeout.', 'Retry with exponential backoff. Check https://galx.ai/status.'],
          ],
        },
        links: [
          { href: '/keys', label: 'Manage & Rotate API Keys' },
          { href: BILLING_PATHS.credits, label: 'Manage Account Balance' },
          { href: '/status', label: 'Live Service Status' },
        ],
      },
      {
        id: 'retries',
        title: 'Retry Strategies & Exponential Backoff',
        badge: 'High Availability',
        body: [
          'Transient network failures (429, 502, 503) should be retried using truncated exponential backoff with full jitter.',
          'Never automatically retry 400, 401, 402, or 403 errors—these require client-side fixes. For interrupted streaming responses, notify the user or restart the generation cleanly rather than silently appending partial tokens.',
        ],
        code: [
          {
            label: 'Backoff Formula (ms)',
            source: `// Jittered Exponential Backoff
function calculateBackoff(attempt: number, baseMs = 500, maxMs = 10000): number {
  const exponential = Math.min(maxMs, baseMs * Math.pow(2, attempt));
  return Math.random() * exponential; // Full jitter
}`,
          },
        ],
      },
      {
        id: 'security',
        title: 'Zero Data Retention & Secret Hygiene',
        badge: 'Security Posture',
        body: [
          'GALXAI enforces strict Zero Data Retention (ZDR). Your prompt text and generated completions are processed in volatile memory and never persisted to disk or used for training.',
        ],
        steps: [
          'Store API keys exclusively in server-side secret managers (AWS Secrets Manager, Vault, Cloudflare Secrets, Vercel Env).',
          'Never prefix API keys with NEXT_PUBLIC_ or VITE_ in frontend frameworks.',
          'If a key is accidentally committed to a repository, immediately revoke it in the dashboard and provision a fresh key.',
        ],
        links: [{ href: '/keys', label: 'Rotate API Keys' }],
      },
      {
        id: 'routing',
        title: 'Anycast Edge Architecture',
        badge: 'Sub-15ms Latency',
        body: [
          'All API traffic routes through global Anycast edge relays. The gateway performs sub-millisecond protocol sanitization and token bucket balancing to ensure high-concurrency stability without sudden throttling.',
        ],
      },
      {
        id: 'diagnostics',
        title: 'Production Diagnostics & Telemetry',
        badge: 'Observability',
        body: [
          'When logging errors for support or debugging, record the timestamp, HTTP status, model ID, and request ID if provided in headers. Never log raw Authorization headers or user confidential prompt data.',
          'Inspect the API Usage dashboard for real-time latency distributions, token throughput, and prompt cache hit ratios.',
        ],
        links: [
          { href: '/keys/activity', label: 'View Real-Time API Usage Telemetry' },
          { href: '/docs/api-reference', label: 'Review API Reference' },
        ],
      },
    ],
  },
};

export function docMarkdown(page: DocPage) {
  return (
    `# ${page.title}\n\n${page.description}\n\nSource: https://galx.ai${page.path}\n\n` +
    page.sections
      .map((section) =>
        [
          `## ${section.title}`,
          ...(section.badge ? [`*Category: ${section.badge}*`] : []),
          ...(section.callout ? [`> **${section.callout.type.toUpperCase()}: ${section.callout.title || ''}**\n> ${section.callout.text}`] : []),
          ...(section.body || []),
          ...(section.steps || []).map((step, i) => `${i + 1}. ${step}`),
          ...(section.code || []).map((code) => `### ${code.label}\n\n\`\`\`\n${code.source}\n\`\`\``),
          ...(section.responseCode ? [`### ${section.responseCode.label}\n\n\`\`\`json\n${section.responseCode.source}\n\`\`\``] : []),
          ...(section.table
            ? [
                `| ${section.table.headings.join(' | ')} |\n| ${section.table.headings.map(() => '---').join(' | ')} |\n${section.table.rows.map((row) => `| ${row.join(' | ')} |`).join('\n')}`,
              ]
            : []),
          ...(section.links || []).map((link) => `[${link.label}](https://galx.ai${link.href})`),
        ].join('\n\n'),
      )
      .join('\n\n')
  );
}
