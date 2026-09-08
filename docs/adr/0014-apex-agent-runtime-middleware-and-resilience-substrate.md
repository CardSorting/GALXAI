# ADR 0014: Apex Agent Runtime, Middleware & Resilience Substrate

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
**Accepted** (Implemented and Verified via 66-Suite Forensic Harness)

## Context
Production AI applications, autonomous multi-agent swarms, and enterprise API gateways face distinct operational challenges:
1. **Multi-Step Function Calling Loops**: Orchestrating agent tool calls required developers to write manual while loops, JSON argument parsers, error catchers, and message array appending logic.
2. **Observability, Live Budgeting & In-Memory Caching**: Enterprises need pluggable interceptor pipelines to trace requests, track running dollar expenditures against hard budgets, and deduplicate identical queries in-memory.
3. **Multi-Model Provider Brownouts**: When a primary LLM encounters 429 quota exhaustion or provider 500 errors, applications crash without automated multi-model fallback cascades or stream racing.
4. **Context Window Token Exhaustion**: Exceeding model context windows produces sudden 400 bad request errors without intelligent sliding window conversation history pruning.

## Decision
We engineered the **Phase 5 Apex Developer SDK & Autonomous Agent Runtime Substrate** within `@galxai/sdk`:

```mermaid
flowchart TD
    App[Developer Application / Agent Swarm] --> GalxClient[GalxAI Apex Client]
    
    subgraph Autonomous Agent Substrate
        GalxClient --> AgentRuntime[galx.agent Autonomous Multi-Step Tool Loop]
        AgentRuntime --> ToolRegistry[Type-Safe Tool Parameter Definitions]
        ToolRegistry --> ToolExecution[Automatic Function Execution & Output Loop]
    end
    
    subgraph Pluggable Middleware Architecture
        GalxClient --> Middleware[galx.use Interceptor Pipeline]
        Middleware --> CostPlugin[Real-Time Token & Dollar Budget Tracker]
        Middleware --> LRUPlugin[Client-Side LRU Response Cache]
    end
    
    subgraph Multi-Model Resilience Topologies
        GalxClient --> FallbackCascade[galx.chat.fallbackCascade Multi-Model Failover]
        GalxClient --> StreamRace[galx.chat.race Lowest TTFB Stream Race]
    end
    
    subgraph Context Optimizer
        GalxClient --> Tokens[galx.tokens BPE Estimator & Smart History Pruner]
    end
    
    ToolExecution --> Transport[GalxAIClientCore Zero-Dependency Transport]
    FallbackCascade --> Transport
    StreamRace --> Transport
    Transport --> Gateway[Universal Ingress Gateway /v1 & /api/queues]
```

---

### 1. Autonomous Agent Tool Calling Runtime (`galx.agent`)
Developers define local TypeScript functions with JSON parameter schemas. The runtime automatically:
1. Formats tools for OpenAI-compatible schemas (`type: 'function'`).
2. Sends the request and inspects `tool_calls`.
3. Executes local matching functions and catches exceptions.
4. Appends tool results (`role: 'developer' / 'tool'`) and re-prompts the model.
5. Recursively loops until final synthesis or `maxSteps` is reached.

```typescript
const agent = galx.agent({
  model: 'gpt-5.6-sol',
  systemPrompt: 'You are an autonomous research analyst.',
  tools: {
    getQuote: {
      description: 'Get stock quote',
      parameters: { ticker: { type: 'string', required: true } },
      execute: async ({ ticker }) => ({ price: 185.42 })
    }
  }
});

const result = await agent.run('What is Apple trading at?');
console.log(result.text); // Final synthesized response
console.log(result.toolCallsExecuted); // Full trace
```

---

### 2. Pluggable Middleware Pipeline (`galx.use`)
Provides lifecycle hooks for `onRequest`, `onResponse`, and `onError`:
- `createCostTrackerPlugin`: Tracks running token usage and enforces maximum dollar spending limits (`maxBudgetUsd`).
- `createLRUCachePlugin`: In-memory LRU cache with configurable entry ceilings and TTLs to eliminate duplicate network calls for identical queries.

---

### 3. Multi-Model Fallback Cascades & Stream Racing (`galx.chat.fallbackCascade` / `galx.chat.race`)
- **`fallbackCascade(models, params)`**: Attempts primary model (`gpt-5.6-sol`), if 429/5xx occurs, automatically cascades to secondary models (`x-ai/grok-4.5`, `gpt-5.6-luna`), returning `{ successfulModel, attemptsMade }`.
- **`race(models, params)`**: Concurrently initiates streaming to multiple models and returns the stream from the model with the fastest Time-To-First-Byte (TTFB).

---

### 4. Context Window & Token Pruning Optimizer (`galx.tokens`)
- `estimateTokens(text)`: Heuristic BPE token calculation.
- `estimateMessagesTokens(messages)`: Accurately computes tokens for text and vision tiles.
- `truncateToFit(messages, maxTokens, strategy)`: Intelligently preserves system instructions and recent conversation context while pruning older intermediate turns.

---

### 5. Interactive Streaming Terminal REPL (`npx galxai chat`)
Enables developers to interactively stream prompts from the CLI with live token velocity metrics (tokens/sec).

---

## Consequences
- **Positive**: Reduces autonomous agent setup code from 100+ lines of loop boilerplate to a single `galx.agent()` declaration.
- **Positive**: Zero-downtime multi-model failovers prevent customer-facing brownouts.
- **Positive**: Client-side LRU response caching reduces redundant API spend by up to 40%.
- **Positive**: Prevents context window overflows through deterministic history pruning.
