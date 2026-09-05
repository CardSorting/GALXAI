# 🛠️ Playbook 07: Universal Zero-Hesitation Developer Ergonomics & API Protocol Governance

> **Authoritative Operational Manual**: Zero-Friction Developer Experience, Multi-Mental-Model Ingestion, CLI Tooling, Protocol Fallbacks & Automated Regression Gates.  
> **Target Audience**: API Gateway Architects, Developer Relations Engineers, SREs, and Autonomous AI Agent Maintainers.

---

## 🏛️ 1. Core Operating Philosophy

> **"Our enemy is hesitation — ambiguity is our friend not our enemy, our enemy is developer friction and hesitation, ambiguity is required because they have their own mental model."**

Developers integrate AI APIs under time pressure, across diverse frameworks, languages, and IDEs. They have their own mental models shaped by the OpenAI SDK, Anthropic Messages API, Ollama CLI, Vercel AI SDK, LangChain, LlamaIndex, Midjourney, Cursor, or raw cURL.

Whenever an API returns a rigid `400 Bad Request`, `405 Method Not Allowed`, or `422 Unprocessable Entity` due to casing, unquoted keys, string vs array differences, or aspect ratio terminology, **it introduces friction and hesitation**. 

### Operating Mandates:
1. **Never Fail on Ambiguity**: Always resolve developer intent gracefully.
2. **Absorb All Conventions**: Support snake_case, camelCase, JSON, raw text strings, query parameters, multi-header auth, and array/single-item polymorphisms.
3. **Safe Default Fallbacks**: When parameters or model IDs are missing or unrecognized, default to flagship `gpt-5.6-sol`.
4. **Full Protocol Parity**: Support OpenAI, Anthropic, Ollama, and Vercel AI SDK simultaneously on the same gateway endpoints.
5. **Product-Boundary Discipline**: Absorb external client conventions at the gateway without turning the GALXAI web control plane into the client application. Hosted chat, personas, sharing, and image studios remain out of scope under ADR 0119.

---

## 🗺️ 2. Mental Model & Endpoint Ingestion Matrix

The following matrix documents how the gateway absorbs each ecosystem's mental model:

| Developer Ecosystem | Client Request Pattern | Gateway Endpoint | Ingestion & Normalization Mechanism |
| :--- | :--- | :--- | :--- |
| **OpenAI Python / Node** | `client.chat.completions.create(model="gpt-5.6-sol", messages=[...])` | `POST /v1/chat/completions` | Standard OpenAI schema; passes straight to router. |
| **Anthropic SDK / Claude Code** | `anthropic.messages.create(model="claude-3-7-sonnet", system="...", messages=[...])` | `POST /v1/messages` or `POST /v1/chat/completions` | Ingests root `system`, maps `claude-*` to `gpt-5.6-sol`, formats response in Anthropic content block schema. |
| **Ollama CLI / OpenWebUI** | `curl https://galx.ai/api/generate -d '{"model":"sol","prompt":"..."}'` | `POST /api/generate`, `POST /api/chat` | Extracts `prompt`/`input`/`text`, streams NDJSON chunks with `done: true` tail chunk. |
| **Vercel AI SDK** | `streamText({ model: galxai("gpt-5.6-sol"), messages })` | SDK Provider Shim / SSE | `toDataStreamResponse()` / `toTextStreamResponse()` stream adapters. |
| **LangChain / LlamaIndex** | `ChatGalxAI.invoke(input)` / `GalxLLM.complete(prompt)` | SDK Integration Shim | Polymorphic message normalization (`human`, `system`, `ai`, `string`, `object`). |
| **Compatibility GET / cURL Query** | `curl --get https://galx.ai/v1/chat/completions --data-urlencode prompt=Hello` | `GET /v1/chat/completions`, `GET /api/generate` | Synthesizes a completion payload for diagnostics and legacy clients; this does not imply a hosted browser chat. |
| **Raw Terminal cURL** | `curl -X POST https://galx.ai/v1/chat/completions -d "Explain gravity"` | `POST /v1/chat/completions` | Catches JSON parse failures and absorbs raw string payload directly as user message. |
| **Midjourney / Flux Images** | `POST /v1/images/generations -d '{"prompt":"...", "aspect_ratio":"16:9"}'` | `POST /v1/images/generations` | Normalizes `aspect_ratio: "16:9"` $\to$ `size: "1792x1024"`, maps `flux`/`midjourney` $\to$ `openai-gpt-image-2`. |
| **Zero-Install CLI** | `npx galxai "Explain quantum computing"` | Terminal Binary (`bin/galxai.mjs`) | Instant command execution with direct streaming to terminal stdout. |

---

## 📋 3. Standard Operating Procedures (SOPs)

### SOP 01: Adding a New Model Alias to the Catalog
When upstream providers release new models or common nicknames emerge in the developer community:
1. Open [`src/core/router/ModelCatalog.ts`](file:///Users/bozoegg/Desktop/GALXAI/src/core/router/ModelCatalog.ts).
2. Locate the `UNIVERSAL_SYNONYMS` table in `ModelCatalog.resolveModel()`.
3. Add the new aliases mapped to their target canonical ID (e.g. `'claude-3-7-sonnet': 'gpt-5.6-sol'`).
4. Add corresponding test cases in [`scripts/verify-zero-hesitation-ergonomics.ts`](file:///Users/bozoegg/Desktop/GALXAI/scripts/verify-zero-hesitation-ergonomics.ts).
5. Run verification suite: `npx tsx scripts/verify-zero-hesitation-ergonomics.ts`.

### SOP 02: Maintaining Cloudflare Edge Route Parity
Whenever a new HTTP route or ingestion behavior is added to Next.js App Router:
1. Open [`src/workers/cloudflare/GalxEdgeGateway.ts`](file:///Users/bozoegg/Desktop/GALXAI/src/workers/cloudflare/GalxEdgeGateway.ts).
2. Ensure path dispatching (`url.pathname`) and method allowances (`POST`, `GET`) match the App Router route behavior.
3. Test edge worker routing: `npm run worker:test`.

### SOP 03: Running the Zero-Hesitation Automated Verification Suite
Execute the comprehensive automated test suite before any release:
```bash
# 1. Run full 98-test zero-hesitation verification suite
npx tsx scripts/verify-zero-hesitation-ergonomics.ts

# 2. Run chat context hardening and tool turn-pair invariant suite
npx tsx scripts/test-chat-context-hardening.ts
```

---

## ⚡ 4. Developer CLI Diagnostic Reference (`npx galxai`)

The `npx galxai` CLI allows developers and operators to test the gateway in 0 milliseconds without writing code or building TypeScript:

```bash
# 1. Test live streaming completion
$ npx galxai "Explain token bucket rate limiting in 15 words"

# 2. Test target reasoning model via alias
$ npx galxai run "Audit distributed lock implementation" --model terra

# 3. List all active models and wholesale discount rates
$ npx galxai models

# 4. Test 0ms alias resolution
$ npx galxai resolve claude-3-7-sonnet

# 5. Measure character count, estimated BPE tokens, and dollar savings
$ npx galxai tokens "Quarterly financial report text..."

# 6. Test Anycast edge round-trip latency
$ npx galxai ping

# 7. Start interactive terminal chat REPL
$ npx galxai chat
```

---

## 🚨 5. Incident Triage & Anti-Friction Remediation

If developers report unexpected errors when connecting third-party tools:

| Symptom | Probable Cause | Diagnostic Command | Remediation Action |
| :--- | :--- | :--- | :--- |
| Client receives `401 Unauthorized` | Key has quotes or unexpected header format | `curl -H "x-api-key: 'key'" https://galx.ai/v1/models` | Verify `GalxAuthEngine.ts` quote stripping regex `replace(/^['"]+\|['"]+$/g, '')`. |
| Client receives `400 Bad Request` on image generation | Unhandled aspect ratio or parameter name | Inspect payload size and aspect_ratio | Verify `aspectRatioMap` in `src/app/v1/images/generations/route.ts`. |
| Client receives `400 orphaned_tool_message` | Client pruned assistant tool trigger | Inspect turn history | Verify `ensureAtomicTurnPairs` in `GalxRollingContextEngine.ts`. |
| New IDE/CLI client reports unrecognized model | Model name contains new version tag (e.g. `:preview`) | `node bin/galxai.mjs resolve <new-name>` | Add suffix pattern to `cleanAlias` in `ModelCatalog.ts`. |
| Compatibility GET query returns blank | Missing query parameter parser | `curl --get "https://galx.ai/v1/chat/completions" --data-urlencode "prompt=hi"` | Verify `GET` handler in `src/app/v1/chat/completions/route.ts`. |
