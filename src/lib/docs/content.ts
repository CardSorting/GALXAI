import { BILLING_PATHS } from '@/lib/billing/navigation';
import { GALX_API_BASE_URL } from '@/sdk/base-url';

export const DOC_MODEL = 'galx-nova';
export const DOC_IMAGE_MODEL = '<assigned-image-capability>';

export const DOC_NAV = [
  { href: '/docs', title: 'Quickstart', description: 'First request with GALX Nova.' },
  { href: '/docs/api-reference', title: 'API reference', description: 'Endpoints, schemas, and HTTP contracts.' },
  { href: '/docs/examples', title: 'Developer examples', description: 'Documented patterns for streaming, JSON, tools, and images.' },
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

export const AGENT_SETUP = `# Build with GALX Nova

Use the supported GALX API from the server side of the existing application. Inspect the application’s language, framework, and current AI client first. Reuse existing conventions and dependencies.

## Connection
- API base URL: ${GALX_API_BASE_URL}
- Authentication: Authorization: Bearer <GALXAI_API_KEY>
- Secret environment variable: GALXAI_API_KEY
- Supported reasoning capability identifier: ${DOC_MODEL}
- Supported image capability identifier: assigned directly for your integration
- Chat endpoint: POST ${GALX_API_BASE_URL}/chat/completions
- Image endpoint: POST ${GALX_API_BASE_URL}/images/generations
- Credentials are provisioned directly for explicitly authorized integrations.

## Service boundary
GALX Nova is GALX’s managed intelligence layer for reasoning and generation. Use the supported capability identifiers documented for your request; Nova names the service and does not claim that GALX trained a foundation model.

## Implementation Steps
1. Keep GALXAI_API_KEY on the server. Never put it in browser code, public environment variables, logs, commits, or client-visible errors.
2. If the project already uses an OpenAI-compatible client, set its base URL and key explicitly. Python uses base_url; JavaScript uses baseURL.
3. Use the documented capability identifier for the route you are calling. Do not infer additional capabilities from the Image Studio.
4. Reuse the application’s existing server handler or server action. Do not expose the secret to users.
5. Handle failed requests visibly. Bound retries for transient failures and honor Retry-After when returned. Do not silently change the requested capability.
6. Confirm that your integration has explicit authorization and assigned operating terms before attempting API inference. The browser Image Studio remains a separate consumer path.

## Minimal request
${REQUEST_EXAMPLES[0].source}

A successful non-streaming response is a JSON object described by the API reference. With stream: true, consume SSE deltas and stop at [DONE]. Do not retry after displaying partial output unless the application explicitly supports resumption.

## References
- Quickstart: https://galx.ai/docs
- API reference: https://galx.ai/docs/api-reference
- Developer examples: https://galx.ai/docs/examples
- Integrations: https://galx.ai/docs/sdks
- Troubleshooting: https://galx.ai/docs/error-handling
`;

export const DOC_PAGES: Record<DocId, DocPage> = {
  quickstart: {
    path: '/docs',
    title: 'Developer Quickstart',
    badge: 'GALX Nova capabilities',
    description: 'GALX Nova powers supported GALX experiences and selected private integrations. General-purpose API access is not a public self-service product.',
    sections: [
      {
        id: 'credentials',
        title: '1. Confirm private access credentials',
        badge: 'Authentication',
        body: [
          'Credentials are provisioned only for explicitly authorized private integrations. If GALX has assigned your cohort access, keep its secret credentials server-side—never commit them to git or expose them in client-side bundles.',
        ],
        links: [{ href: '/developers', label: 'Review the private access boundary' }],
        callout: {
          type: 'tip',
          title: 'Keep credentials server-side',
          text: 'Keep API keys on the server, avoid public environment variables, and do not place prompts or responses in logs unless your own data policy allows it.',
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
        badge: 'Supported API request',
        body: [
          'GALX Nova provides managed reasoning and generation capabilities through the supported API for explicitly authorized integrations. Confirm the current endpoint and assigned access terms before integrating; the browser Image Studio remains separate.',
        ],
        code: REQUEST_EXAMPLES,
        responseCode: RESPONSE_EXAMPLE,
      },
      {
        id: 'response',
        title: '3. Inspect the response & usage',
        badge: 'Documented JSON',
        body: [
          'Responses follow the documented chat completion schema. Read the fields described in the API reference and handle errors explicitly.',
        ],
        callout: {
          type: 'note',
          title: 'Use the documented contract',
          text: 'Capability support, response fields, and assigned operating terms can change. Treat the current API reference and authorization terms as the source of truth.',
        },
        links: [
          { href: '/docs/error-handling', label: 'Inspect error codes & troubleshooting' },
          { href: '/developers', label: 'Review private access guidance' },
        ],
      },
      {
        id: 'models',
        title: 'Supported capabilities',
        badge: 'Service boundary',
        body: [
          'Use the documented capability identifier for the route you are calling. GALX Nova names the managed service; it is not a claim that GALX trained a foundation model.',
          'The Developer API exposes supported capabilities. The Image Studio and API may not expose identical capabilities, so check the current documentation before publishing a feature-specific promise.',
        ],
        code: [
          {
            label: 'Query Catalog',
            source: `curl --fail-with-body ${GALX_API_BASE_URL}/models \\
  -H "Authorization: Bearer $GALXAI_API_KEY"`,
          },
        ],
        links: [{ href: '/developers', label: 'Review the private access boundary' }],
      },
      {
        id: 'agent-setup',
        title: 'Configure Coding Agents (Cursor, Claude, Windsurf)',
        badge: 'Agent Ergonomics',
        body: [
          'Hand this setup brief directly to your coding assistant (Cursor, Windsurf, Claude Code, GitHub Copilot). It contains documented base URLs, supported capability identifiers, and implementation constraints without asking you to paste a secret into the brief.',
        ],
        links: [{ href: '/docs/agent-setup', label: 'View plain-text agent brief' }],
      },
    ],
  },

  api: {
    path: '/docs/api-reference',
    title: 'API Reference',
    badge: 'Supported API contracts',
    description: 'Use the supported GALX API to send JSON requests and, where documented, receive Server-Sent Events (SSE).',
    sections: [
      {
        id: 'authentication',
        title: 'Authentication & Base URL',
        badge: 'Bearer Token',
        body: [
          'Authenticate every HTTP request with your secret API key via the documented Authorization header. Use the current base URL and path shown in the access documentation.',
        ],
        callout: {
          type: 'important',
          title: 'Never expose keys in client code',
          text: 'Keep API keys in server-side code and do not place them in browser bundles, public environment variables, logs, or client-visible errors.',
        },
        code: [{ label: 'Header', source: 'Authorization: Bearer <GALXAI_API_KEY>' }],
      },
      {
        id: 'usage-boundary',
        title: 'Access and usage boundary',
        badge: 'Private integrations',
        body: [
          'General-purpose developer access is not self-service. GALX may authorize a bounded private integration with directly assigned terms. Metering remains in place for allocation controls, operating decisions, and capacity planning. The consumer Image Studio path remains separate under its existing GALX Pro/account contract.',
        ],
        links: [{ href: '/developers', label: 'Review private access guidance' }],
      },
      {
        id: 'endpoints',
        title: 'Supported Endpoints',
        badge: 'Core Surface',
        table: {
          headings: ['Method', 'Path', 'Description', 'Capability identifier'],
          rows: [
            ['GET', '/v1/models', 'Review identifiers currently supported for your access', 'Documented identifiers'],
            ['POST', '/v1/chat/completions', 'Text reasoning, structured outputs, streaming & tools', DOC_MODEL],
            ['POST', '/v1/messages', 'Messages-compatible reasoning requests', DOC_MODEL],
            ['POST', '/v1/images/generations', 'Visual synthesis & creative asset generation; usage contract required', DOC_IMAGE_MODEL],
            ['POST', '/v1/embeddings', 'Embedding requests, when enabled for your access', 'Documented identifier'],
          ],
        },
      },
      {
        id: 'chat',
        title: 'Chat Completions Contract',
        badge: `POST /v1/chat/completions`,
        body: [
          'Dispatch conversations to GALX Nova using the supported request fields. Confirm optional features and applicable limits in the current API reference before shipping.',
        ],
        table: {
          headings: ['Parameter', 'Type', 'Default', 'Description'],
          rows: [
            ['model', 'string', 'required', `Exact model ID: "${DOC_MODEL}".`],
            ['messages', 'array', 'required', 'Array of message objects with "role" (system, user, assistant, tool) and "content".'],
            ['stream', 'boolean', 'false', 'When true, yields Server-Sent Events (text/event-stream) terminating with [DONE].'],
            ['max_tokens', 'integer', 'documented', 'Maximum output length allowed by the current contract.'],
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
    "message": "Request rate limit reached. Follow the response guidance and try again later.",
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
          'Embedding support is capability- and access-dependent. Confirm the current response contract before using it for search or retrieval.',
        ],
      },
    ],
  },

  examples: {
    path: '/docs/examples',
    title: 'Developer examples',
    badge: 'Supported patterns',
    description: 'Explore documented patterns for streaming responses, structured JSON, tool calls, and image generation with GALX Nova.',
    sections: [
      {
        id: 'streaming',
        title: 'Streaming with SSE',
        badge: 'Documented pattern',
        body: [
          'Where streaming is supported, process Server-Sent Events as deltas arrive and stop when the documented completion marker is received.',
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
  messages: [{ role: "user", content: "Write an HTTP router in Rust." }],
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
        badge: 'Structured JSON',
        body: [
          'Request structured JSON where the capability supports it, then validate the response in your application before passing it to downstream services.',
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
    { role: "user", content: "Summarize the customer feedback into sentiment and keywords." }
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
        badge: 'Tool calls',
        body: [
          'Declare functions for Nova to call on behalf of your application. Your application validates and executes each tool, then returns the documented result.',
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
        badge: 'Image generation',
        body: [
          'Use the image capability identifier assigned to your authorized integration. The browser Image Studio uses its separate GALX Pro/account contract; private integration terms are assigned directly when access is authorized.',
          'You can combine reasoning and image generation when both capabilities are documented for your access. Do not infer commercial terms from capability documentation.',
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
            source: `# 1. Refine creative prompt with GALX Nova
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
        links: [{ href: '/developers', label: 'Review the private access boundary' }],
      },
      {
        id: 'prompt-caching',
        title: 'Prompt construction',
        badge: 'Practical guidance',
        body: [
          'Keep stable instructions and relevant context together, then put the current task where your application can update it. Follow the documented limits and usage terms for your access.',
        ],
        callout: {
          type: 'tip',
          title: 'Keep context intentional',
          text: 'Send only the context the task needs. Do not assume a capability, limit, or price term that is not in the current documentation.',
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
    title: 'SDKs and IDE integrations',
    badge: 'Build with Nova',
    description: 'Connect an existing server-side client to the supported GALX API using the documented base URL, key handling, and capability identifiers.',
    sections: [
      {
        id: 'python',
        title: 'Python Ecosystem',
        badge: 'OpenAI-compatible client',
        body: [
          'Use the openai Python library with the documented base URL and supply your GALXAI_API_KEY on the server.',
        ],
        code: [REQUEST_EXAMPLES[1]],
      },
      {
        id: 'typescript',
        title: 'JavaScript, TypeScript & Next.js',
        badge: 'Server-side TypeScript',
        body: [
          'Use a server-side JavaScript or TypeScript client in the environment supported by your application.',
        ],
        code: [REQUEST_EXAMPLES[2]],
      },
      {
        id: 'http',
        title: 'Direct HTTP & Additional Languages',
        badge: 'HTTP integration',
        body: [
          'An HTTP client in Go, Rust, Ruby, PHP, Java, or C# can call the documented API over HTTPS.',
        ],
        code: [REQUEST_EXAMPLES[3], REQUEST_EXAMPLES[0]],
        links: [{ href: '/docs/api-reference', label: 'Browse Full Endpoint Specification' }],
      },
      {
        id: 'ide',
        title: 'Cursor, Windsurf & Claude Code Configuration',
        badge: 'Developer IDEs',
        body: [
          'Configure your coding environment with the documented API base URL, secret key, and supported capability identifier.',
        ],
        table: {
          headings: ['Setting Field', 'Value to Enter', 'Notes'],
          rows: [
            ['OpenAI Base URL', GALX_API_BASE_URL, 'Do not add trailing slash or duplicate /v1'],
            ['API Key', '$GALXAI_API_KEY', 'Use the secret credential assigned to your integration'],
            ['Model Name / ID', DOC_MODEL, 'GALX Nova'],
            ['Capability support', 'See current API reference', 'Do not infer unsupported features'],
          ],
        },
        links: [{ href: '/docs/agent-setup', label: 'Get the one-click agent setup prompt' }],
      },
      {
        id: 'migration',
        title: 'Connect an existing OpenAI-style client',
        badge: 'Review before shipping',
        body: [
          'An existing OpenAI-style client may be reusable, but verify the documented request and response contract before shipping. Keep the API key on the server.',
        ],
        steps: [
          'Keep your existing OpenAI Python or TypeScript SDK code.',
          'Set OPENAI_BASE_URL="https://galx.ai/v1" in your environment.',
          'Replace your API key with your GALXAI API key.',
          'Use the supported capability identifier documented for your route.',
        ],
        links: [{ href: '/developers', label: 'Review private access guidance' }],
      },
      {
        id: 'client-example',
        title: 'Server-side client example',
        badge: 'TypeScript',
        body: [
          'Use a server-side client that matches your application. Keep retry behavior bounded and follow the current API contract.',
        ],
        code: [
          {
            label: 'TypeScript',
            source: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${GALX_API_BASE_URL}",
  apiKey: process.env.GALXAI_API_KEY,
});

const response = await client.chat.completions.create({
  model: "${DOC_MODEL}",
  messages: [{ role: "user", content: "Hello from a server-side client" }],
});
console.log(response.choices[0].message.content);`,
          },
        ],
      },
    ],
  },

  troubleshooting: {
    path: '/docs/error-handling',
    title: 'API errors and recovery',
    badge: 'Integration guidance',
    description: 'Handle documented API errors, retry transient failures carefully, and keep credentials out of client-visible surfaces.',
    sections: [
      {
        id: 'errors',
        title: 'HTTP Status Code Reference',
        badge: 'Status Classification',
        table: {
          headings: ['HTTP Status', 'Category', 'Root Cause', 'Recommended Remediation'],
          rows: [
            ['400 Bad Request', 'Client Error', 'Malformed JSON, missing required fields, or unsupported parameters.', 'Validate request payload against the API reference schema.'],
            ['401 Unauthorized', 'Authentication', 'The API key is invalid, revoked, or missing.', 'Check the server-side credential assigned to your authorized integration.'],
            ['402 Payment Required', 'Access terms', 'The request is not covered by the account’s current access terms.', 'Review the current access and usage terms.'],
            ['403 Forbidden', 'Access control', 'The account or key is not permitted to use the requested capability.', 'Check the documented access requirements.'],
            ['404 Not Found', 'Request path', 'The requested endpoint is not available at that path.', 'Check the current API reference and base URL.'],
            ['429 Rate Limit', 'Service limit', 'The request was limited temporarily.', 'Honor Retry-After when returned and use bounded backoff.'],
            ['402 Payment Required', 'Access terms', 'The request is not covered by the integration’s assigned access terms.', 'Review the terms assigned to your authorized integration; do not retry until the term changes.'],
            ['503 Service Unavailable', 'Service dependency', 'A temporary service dependency or delivery condition prevented completion.', 'Retry only when the operation is safe and the service status permits it.'],
            ['500 / 502', 'Service error', 'A transient service error occurred.', 'Retry carefully when the operation is safe to repeat.'],
          ],
        },
        links: [
          { href: '/developers', label: 'Review private credential guidance' },
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
        title: 'Secret hygiene',
        badge: 'Security guidance',
        body: [
          'Keep API keys in a server-side secret manager and apply your own data-handling policy to prompts, responses, and generated artifacts. Do not assume a retention or training policy that is not stated in the current terms.',
        ],
        steps: [
          'Store API keys exclusively in server-side secret managers (AWS Secrets Manager, Vault, Cloudflare Secrets, Vercel Env).',
          'Never prefix API keys with NEXT_PUBLIC_ or VITE_ in frontend frameworks.',
          'If a key is accidentally committed to a repository, immediately revoke it in the dashboard and provision a fresh key.',
        ],
        links: [{ href: '/developers', label: 'Review private access guidance' }],
      },
      {
        id: 'diagnostics',
        title: 'What to include when asking for help',
        badge: 'Support',
        body: [
          'Include the time, status code, endpoint, and request ID if the response provides one. Never share Authorization headers, API keys, or private prompt and response data.',
          'Operational diagnostics are handled through authorized support channels; ordinary API responses should contain only the documented public contract.',
        ],
        links: [
          { href: '/developers', label: 'Review private access guidance' },
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
