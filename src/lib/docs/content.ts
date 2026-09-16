import { BILLING_PATHS } from '@/lib/billing/navigation';
import { GALX_API_BASE_URL } from '@/sdk/base-url';

export const DOC_MODEL = 'gpt-5.6-sol';
export const DOC_NAV = [
  { href: '/docs', title: 'Quickstart', description: 'Make your first request.' },
  { href: '/docs/api-reference', title: 'API reference', description: 'Endpoints and request fields.' },
  { href: '/docs/examples', title: 'Examples', description: 'Streaming, JSON, tools, and images.' },
  { href: '/docs/sdks', title: 'Integrations', description: 'Connect an existing app or IDE.' },
  { href: '/docs/error-handling', title: 'Troubleshooting', description: 'Fix a request and handle failures.' },
] as const;
export type DocId = 'quickstart' | 'api' | 'examples' | 'integrations' | 'troubleshooting';
export type DocCode = { label: string; source: string };
export type DocSection = {
  id: string; title: string; body?: string[]; steps?: string[]; code?: DocCode[];
  table?: { headings: string[]; rows: string[][] };
  links?: { href: string; label: string }[];
};
export type DocPage = { path: string; title: string; description: string; sections: DocSection[] };

export const REQUEST_EXAMPLES: DocCode[] = [
  { label: 'cURL', source: `curl --fail-with-body ${GALX_API_BASE_URL}/chat/completions \\
  -H "Authorization: Bearer $GALXAI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"${DOC_MODEL}","messages":[{"role":"user","content":"Say hello in one sentence."}]}'` },
  { label: 'Python', source: `# Install: python -m pip install openai
import os
from openai import OpenAI

client = OpenAI(
    base_url="${GALX_API_BASE_URL}",
    api_key=os.environ["GALXAI_API_KEY"],
)
response = client.chat.completions.create(
    model="${DOC_MODEL}",
    messages=[{"role": "user", "content": "Say hello in one sentence."}],
)
print(response.choices[0].message.content)` },
  { label: 'Node.js', source: `// Install: npm install openai
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${GALX_API_BASE_URL}",
  apiKey: process.env.GALXAI_API_KEY,
});
const response = await client.chat.completions.create({
  model: "${DOC_MODEL}",
  messages: [{ role: "user", content: "Say hello in one sentence." }],
});
console.log(response.choices[0].message.content);` },
];

export const AGENT_SETUP = `# Set up GALXAI in this project

Integrate GALXAI into the existing application. Inspect its language, framework, and current AI client first. Reuse existing conventions and dependencies.

## Connection
- API base URL: ${GALX_API_BASE_URL}
- Authentication: Authorization: Bearer <GALXAI_API_KEY>
- Secret environment variable: GALXAI_API_KEY
- Example chat model: ${DOC_MODEL}
- Model catalog: GET ${GALX_API_BASE_URL}/models
- Chat endpoint: POST ${GALX_API_BASE_URL}/chat/completions
- Create a key: https://galx.ai/keys

## Implementation
1. Keep GALXAI_API_KEY on the server. Never put it in browser code, NEXT_PUBLIC variables, logs, commits, or this conversation. If it is missing, ask the user to configure it in their environment or secret manager.
2. If the project already uses an OpenAI-compatible client, set its base URL and key explicitly. Python uses base_url; JavaScript uses baseURL. Do not append /v1 twice. Do not substitute api.galx.ai: it is a separate deployment.
3. Keep the application's existing model configuration. If it has no model configured, start with ${DOC_MODEL}; check the model catalog for supported IDs and capabilities.
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
- Examples: https://galx.ai/docs/examples
- Integrations: https://galx.ai/docs/sdks
- Troubleshooting: https://galx.ai/docs/error-handling
`;

export const DOC_PAGES: Record<DocId, DocPage> = {
  quickstart: {
    path: '/docs', title: 'Make your first request', description: 'One key, one base URL, one request. Or copy the setup brief and let your coding agent do it.',
    sections: [
      { id: 'credentials', title: '1. Create a key', body: ['Create an API key. The full secret is shown once. Set it in your terminal before running the examples, or in your app’s server environment.'],
        links: [{ href: '/keys', label: 'Create API key' }],
        code: [{ label: 'Terminal', source: `# Replace the placeholder locally.
export GALXAI_API_KEY='your_key_here'
export OPENAI_BASE_URL='${GALX_API_BASE_URL}'` }],
      },
      { id: 'request', title: '2. Send a request', body: ['Load GALXAI_API_KEY into the process running this example. Choose the client you already use.'], code: REQUEST_EXAMPLES },
      { id: 'response', title: '3. Read the response', body: ['Read choices[0].message.content from a successful response. Usage appears under usage. A failed request returns an HTTP error; start with the troubleshooting table.'],
        links: [{ href: '/docs/error-handling', label: 'Fix a failed request' }, { href: '/keys/activity', label: 'View recorded usage' }] },
      { id: 'models', title: 'Choose a model', body: [`The examples use ${DOC_MODEL}. Copy an exact model ID from the catalog; available capabilities vary by model.`],
        code: [{ label: 'Model catalog', source: `curl --fail-with-body ${GALX_API_BASE_URL}/models \\
  -H "Authorization: Bearer $GALXAI_API_KEY"` }], links: [{ href: '/models', label: 'Browse models' }] },
      { id: 'agent-setup', title: 'Hand it to your agent', body: ['Copy for agent includes the connection settings, implementation steps, a request example, and verification instructions. It contains no account secrets.'], links: [{ href: '/docs/agent-setup', label: 'Read the plain-text setup brief' }] },
    ],
  },
  api: {
    path: '/docs/api-reference', title: 'API reference', description: 'Use the application API at https://galx.ai/v1. Send JSON with your GALXAI key.',
    sections: [
      { id: 'authentication', title: 'Authentication', body: ['Keep the key on the server. Use the same base URL in your SDK configuration; endpoint paths below already include /v1.'], code: [{ label: 'Header', source: 'Authorization: Bearer <GALXAI_API_KEY>' }] },
      { id: 'endpoints', title: 'Endpoints', table: { headings: ['Method', 'Path', 'Purpose'], rows: [
        ['GET', '/v1/models', 'List model IDs and capabilities.'],
        ['POST', '/v1/chat/completions', 'Chat completions; JSON or SSE.'],
        ['POST', '/v1/messages', 'Messages-compatible requests.'],
        ['POST', '/v1/images/generations', 'Generate an image.'],
        ['POST', '/v1/embeddings', 'Experimental deterministic vectors; see limitations below.'],
      ] } },
      { id: 'chat', title: 'Chat request', table: { headings: ['Field', 'Use'], rows: [
        ['model', 'An exact model ID.'], ['messages', 'An array of role/content messages.'], ['stream', 'Set true for SSE; omit for a JSON response.'],
        ['max_tokens', 'Optional output-token limit.'], ['tools', 'Optional function definitions for tool-capable models.'], ['response_format', 'Optional response format supported by the model.'],
      ] }, code: [{ label: 'JSON', source: JSON.stringify({ model: DOC_MODEL, messages: [{ role: 'user', content: 'Hello' }], stream: false }, null, 2) }] },
      { id: 'response', title: 'Response', body: ['Non-streaming chat text is in choices[0].message.content. Tool requests are in choices[0].message.tool_calls. Inspect the HTTP status and error.message when a request fails.'], links: [{ href: '/docs/examples#tools', label: 'Handle tool calls' }, { href: '/docs/error-handling', label: 'HTTP error reference' }] },
      { id: 'embeddings', title: 'Embeddings limitation', body: ['The current application embeddings route produces deterministic local vectors, not provider-generated semantic embeddings. Do not use it as a substitute for semantic retrieval embeddings.'] },
    ],
  },
  examples: {
    path: '/docs/examples', title: 'Common patterns', description: 'Small additions to a working client. Start with the quickstart if you do not have one yet.',
    sections: [
      { id: 'streaming', title: 'Stream text', body: ['Using the Node.js client from the quickstart, set stream to true and read each text delta. Cancel upstream work when your user disconnects.'], code: [{ label: 'Node.js', source: `const stream = await client.chat.completions.create({
  model: "${DOC_MODEL}",
  messages: [{ role: "user", content: "Explain HTTP in two sentences." }],
  stream: true,
});
for await (const event of stream) {
  process.stdout.write(event.choices[0]?.delta?.content ?? "");
}` }] },
      { id: 'structured-outputs', title: 'Request JSON', body: ['Use a model that supports the requested response format. Parse and validate the result against your application schema before using it.'], code: [{ label: 'Node.js', source: `const response = await client.chat.completions.create({
  model: "${DOC_MODEL}",
  messages: [{ role: "user", content: 'Return JSON with a "summary" string for: HTTP transfers data.' }],
  response_format: { type: "json_object" },
});
const result = JSON.parse(response.choices[0].message.content ?? "{}");
if (typeof result.summary !== "string") throw new Error("Invalid summary");` }] },
      { id: 'tools', title: 'Use tools', body: ['Send function definitions to a tool-capable model. A tool call is a request for your application to execute a function, not proof that it ran.'], code: [{ label: 'Request fields', source: `tools: [{
  type: "function",
  function: {
    name: "get_weather",
    description: "Get weather for a city",
    parameters: {
      type: "object",
      properties: { city: { type: "string" } },
      required: ["city"],
    },
  },
}]` }], steps: ['Read message.tool_calls and validate the function name and JSON arguments.', 'Run only functions your application permits.', 'Append the assistant tool-call message, then a tool message with the matching tool_call_id and string content.', 'Send the updated messages to get the final answer.'] },
      { id: 'images', title: 'Generate an image', body: ['Generate an image with OpenAI Image Generation using the openai-gpt-image-latest model ID. Describe the subject, composition, and style in your prompt. The default response is a binary PNG, JPEG, or WebP image. Set output_format to select a format. JSON clients must request response_format: b64_json or url, or send Accept: application/json. JSON contains created and data only. Download links expire after one hour; URL results can also be data URLs. Images are static and dimensions may vary.'], code: [{ label: 'cURL', source: `curl --fail-with-body ${GALX_API_BASE_URL}/images/generations \\
  -H "Authorization: Bearer $GALXAI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"openai-gpt-image-latest","prompt":"A blue ceramic cup on a table","n":1}'` }], links: [{ href: '/models', label: 'Image models' }] },
      { id: 'prompt-caching', title: 'Keep reusable context stable', body: ['Put shared instructions before changing user input. Reuse the exact prefix when possible. Cache behavior and reported usage depend on the model and provider; do not assume every repeated request is cached.'] },
      { id: 'agents', title: 'Keep agent sessions separate', body: ['Keep each user or agent’s message history separate. Pass only the history for that conversation. If using explicit session identifiers, do not reuse them across users.'], links: [{ href: '/docs#agent-setup', label: 'Copy setup for your coding agent' }] },
    ],
  },
  integrations: {
    path: '/docs/sdks', title: 'Connect your existing tools', description: 'Reuse your current client. Change the base URL, credential, and model configuration.',
    sections: [
      { id: 'python', title: 'Python', code: [REQUEST_EXAMPLES[1]] },
      { id: 'typescript', title: 'JavaScript and TypeScript', code: [REQUEST_EXAMPLES[2]] },
      { id: 'http', title: 'Other languages', body: ['Any HTTPS client can use the JSON API. Start with the cURL request and map its URL, headers, and body to your language.'], code: [REQUEST_EXAMPLES[0]], links: [{ href: '/docs/api-reference', label: 'Request fields and endpoints' }] },
      { id: 'ide', title: 'IDEs and agent frameworks', body: ['Use an OpenAI-compatible custom provider if your tool supports one. Setting names differ by tool; configure these three values.'], table: { headings: ['Setting', 'Value'], rows: [['Base URL', GALX_API_BASE_URL], ['API key', 'Your GALXAI key'], ['Model', DOC_MODEL]] }, links: [{ href: '/docs/agent-setup', label: 'Get the agent setup brief' }] },
      { id: 'migration', title: 'Move an existing integration', steps: ['Keep the existing OpenAI-compatible client.', 'Replace the base URL and API key in server configuration.', 'Replace provider-specific model aliases with an ID from the GALXAI catalog.', 'Run a small request, then test any streaming, tool, or JSON-output features your app uses.'], links: [{ href: '/models', label: 'Check model IDs' }] },
      { id: 'galxai-sdk', title: 'Using the GALXAI SDK', body: ['The GALXAI SDK defaults to https://galx.ai/v1. An explicit baseURL option or GALXAI_BASE_URL environment variable overrides it. Keep the credential in GALXAI_API_KEY.'], code: [{ label: 'TypeScript', source: `import { GalxAI } from "galxai";

const client = new GalxAI({ apiKey: process.env.GALXAI_API_KEY });
const response = await client.chat.completions.create({
  model: "${DOC_MODEL}",
  messages: [{ role: "user", content: "Hello" }],
});` }] },
    ],
  },
  troubleshooting: {
    path: '/docs/error-handling', title: 'Fix a failed request', description: 'Check the HTTP status and error message first. Keep secrets out of logs and support messages.',
    sections: [
      { id: 'errors', title: 'HTTP errors', table: { headings: ['Status', 'Next step'], rows: [
        ['400', 'Check the model ID, request fields, and supported features.'], ['401', 'Check that the server loaded the full, active API key.'],
        ['402', 'Check the account balance and billing requirements.'], ['403', 'Check permissions, key scopes, and account access.'],
        ['404', 'Use https://galx.ai/v1 and a documented endpoint. Avoid /v1/v1.'], ['429', 'Honor Retry-After, lower concurrency, and use bounded retries.'],
        ['5xx', 'Check service status. Retry transient failures with backoff; report persistent failures.'],
      ] }, links: [{ href: '/keys', label: 'Manage keys' }, { href: BILLING_PATHS.credits, label: 'Review credit' }, { href: '/status', label: 'Service status' }] },
      { id: 'retries', title: 'Retry deliberately', body: ['Bound the number of attempts and add jitter to delays. Do not retry authentication or validation errors without fixing their cause. A timeout does not prove that the provider did no work.', 'After displaying part of a streamed response, do not restart it silently. Tell the user it was interrupted or use an explicit recovery flow.'] },
      { id: 'security', title: 'Keep credentials on the server', steps: ['Load the key from an environment variable or secret manager.', 'Do not expose it through public frontend variables or client-side requests.', 'If a key leaks, revoke it and update the affected application with a new one.'], links: [{ href: '/keys', label: 'Create or revoke a key' }] },
      { id: 'routing', title: 'Use the application API', body: ['Use https://galx.ai/v1 as the API base URL for customer requests.'] },
      { id: 'diagnostics', title: 'Collect useful diagnostics', body: ['Record the endpoint, model, HTTP status, timestamp, and request ID if returned. Include a minimal redacted request body. Never include authorization headers or personal conversation content.', 'Key activity shows saved usage charges. Failed or unbilled requests may not appear there.'], links: [{ href: '/keys/activity', label: 'Recorded usage' }, { href: '/docs/api-reference', label: 'Check the request format' }] },
    ],
  },
};

export function docMarkdown(page: DocPage) {
  return `# ${page.title}\n\n${page.description}\n\nSource: https://galx.ai${page.path}\n\n` + page.sections.map(section => [
    `## ${section.title}`, ...(section.body || []),
    ...(section.steps || []).map((step, i) => `${i + 1}. ${step}`),
    ...(section.code || []).map(code => `### ${code.label}\n\n\`\`\`\n${code.source}\n\`\`\``),
    ...(section.table ? [`| ${section.table.headings.join(' | ')} |\n| ${section.table.headings.map(() => '---').join(' | ')} |\n${section.table.rows.map(row => `| ${row.join(' | ')} |`).join('\n')}`] : []),
    ...(section.links || []).map(link => `[${link.label}](https://galx.ai${link.href})`),
  ].join('\n\n')).join('\n\n');
}
