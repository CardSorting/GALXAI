# Automatic agent tools and turns

<!-- docs-scope: current-guide -->

Private implementation and operator reference. This is the GALX SDK and relay contract, not a setting for the Codex application editing this repository. [Central account authority](relay-account-management.md), [fixed-pool routing](../ROUTING_ALGORITHMS.md) and [current delivery evidence](../../post-mortem/CURRENT_STATE.md) retain their own authority.

## What runs automatically

Register executable function callbacks with `galx.agent({ tools })`, then call `run`, consume `stream`, or use the corresponding agent session method. Each registered callback is authorized for automatic execution for that run. The SDK supplies that instruction on every run without accumulating duplicate instruction messages in session history. It executes model-requested registered functions and submits their real outputs to the next model step without an Allow/Accept interaction.

The active relay protocol is Responses over WebSocket, not Codex app-server. The existing unused SDK adapter's `approvalPolicy: never` does not configure that relay. The previous gap was transport support: tool definitions were omitted, Standard rejected all tool fields, tool result messages were unsupported, argument deltas appeared as text, and public stream aggregation discarded structured calls. These paths now retain function definitions and correlated calls/results.

Both Premium and Standard support **client-owned function calling as text inference**. Callbacks execute in the application running the SDK; neither relay executes the supplied function, shell command, URL or filesystem operation. Standard continues to reject Sites, images and provider-hosted tools. Premium images keep their dedicated artifact path. No pool obtains peer credentials, capacity or host authority.

## Example

Using an already configured SDK client:

```ts
const agent = galx.agent({
  model: 'your-available-model',
  maxSteps: 20,
  parallelToolExecution: false,
  tools: {
    lookupOrder: {
      description: 'Read an order from this application',
      parameters: {
        type: 'object',
        properties: { orderId: { type: 'string' } },
        required: ['orderId'],
      },
      execute: async ({ orderId }) => readOwnedOrder(orderId),
    },
  },
});

const controller = new AbortController();
const result = await agent.run('Find my order and summarize its status', {
  signal: controller.signal,
});
```

`readOwnedOrder` belongs to the calling application and must enforce its verified owner's access. Registration authorizes a callback; model-generated arguments do not grant additional account access. `parallelToolExecution` defaults to true; false executes each returned batch in order. Both `run` and `stream` honor it. A stream must be consumed for its generator to advance.

## Wire contract

| Item | Contract |
| --- | --- |
| Definitions | Up to 64 `type: function` entries with unique names, object parameter schemas, optional description and strictness; bounded to 262,144 serialized characters and the enclosing HTTP byte limit |
| Choice | `auto` by default when functions exist; `none`, `required`, or one declared function; no undeclared function selection |
| Parameter strictness | Defaults to false to preserve Chat-style optional parameters; an explicit function `strict` boolean is forwarded |
| History | Assistant calls and `role: tool` outputs preserve matching call IDs; unresolved, duplicate or orphan pairs fail before new engine work |
| Output | At most 32 complete calls, names of 1–64 characters, call IDs of 1–128 characters, each argument string at most 262,144 characters, aggregate calls at most 524,288 serialized characters |
| Completion | Only complete function calls from a successful terminal model response are delivered; declared names/choice are checked and unknown output/approval types fail closed |
| SSE | A terminal structured `delta.tool_calls` event with `finish_reason: tool_calls`; partial argument events are activity only and never text or callback input |
| JSON | The same complete `message.tool_calls` and finish reason survive the shared relay aggregator |
| Replay | Original job/account/tenant/epoch only; replaying a retained stream can redeliver call data, never execute a callback on the relay |
| Unsupported | Provider-hosted/MCP/app-server approval protocols, legacy `functions` aliases, and function calls under the durable Sites receipt contract |

Unknown nested provider fields are removed from delivered calls. Tool arguments and outputs are application data and retain their content. Approval request IDs, credential metadata and provider objects are not forwarded as callable work.

Every model continuation uses a distinct step identity under its original logical agent turn. It must pass the selected pool's normal admission, quota and account checks. Standard retains one ongoing model job per account, fair rotation and paced recovery. There is no automatic peer fallback or replay after uncertainty; a busy or failed inference can end the agent run with its existing error.

## Errors, cancellation and limits

- A missing callback fails configuration before inference; it never returns invented success.
- Both execution modes parse JSON object arguments and run a supplied schema's `safeParse` validator. Malformed or schema-invalid arguments return a tool error to the model for correction without calling the callback. Plain JSON Schema is sent to the model; application callbacks retain responsibility for validating it locally when no executable validator is supplied.
- Unknown function names return a tool error and cannot invoke an arbitrary application property. Invalid/repeated call IDs reject the entire batch before any callback in it begins. Prior history and earlier steps count toward duplicate detection.
- Callback failures and unserializable results become bounded-shape tool errors; successful `undefined` results become JSON null. Tools are not retried automatically. A new call ID is a new model-requested action, so callbacks performing side effects still need their own domain idempotency.
- `signal` stops model requests and future callback starts. An already-running callback owns cancellation of its underlying work. Stopping a stream is not a guarantee that previously started parallel callbacks were cancelled.
- `maxSteps` remains a positive integer, default 10. It bounds model steps, not permissions, and includes the final answer step. Increase it deliberately for a longer task. Automatic continuation does not remove central budgets, timeouts or application access checks.

The SDK does not fabricate responses to missing-information questions. It cannot change approval rules inside a caller-provided callback or an external application. Provider sign-in, MFA, central registration, account Enable and serving activation retain their explicit workflows.

## Research, verification and rollout

[OpenAI function calling](https://developers.openai.com/api/docs/guides/function-calling) separates model-produced calls from application execution and subsequent tool outputs. That is the implemented pattern. [Codex app-server](https://learn.chatgpt.com/docs/app-server) uses a different thread/turn approval protocol; setting its approval policy is not a substitute for implementing Responses tool continuation.

Run `npm run test:agent:tools` and `npm run test:relay:services`. The latter includes real local SDK → relay → synthetic provider → callback → continuation chains in both pools over JSON and SSE. Additional shared-engine, transport, usage, public-boundary and authorization regressions plus the production build verify adjacent contracts. These checks make no real provider calls.

Install both reviewed runtime image pins using the [service runbook](../runbooks/relay-pool-services.md), preserving state volumes, pool identities and central ownership waits. Central and monitor images do not need this runtime change. The SDK source must also be rebuilt/distributed in its caller; replacing a relay container alone does not update an external installed SDK. No published SDK release or public application cutover is implied by local installation.

Qualify real function calling separately with a manually registered free/paid account and a harmless caller-owned callback. If either provider rejects a function schema, retain the failed request identity and inspect that account's response privately. Do not borrow the other pool or convert the callback into a hosted image/tool request. Rollback restores the preceding own-pool runtime image and corresponding caller compatibility; retained unknown work remains unknown.
