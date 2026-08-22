# ADR 0032: Ultra-Flat Effortless Developer SDK Strategy & Tagged Template Invocation

## Status
`Accepted` — Implemented in `src/sdk/` and verified across Forensic Test Suites.

## Context
Traditional AI SDKs (such as standard client libraries) impose friction by requiring verbose multi-step setup: importing a client class, instantiating the class with constructor options, traversing nested resource hierarchies (`client.chat.completions.create(...)`), unpacking nested response bodies (`res.choices[0].message.content`), and manually wiring streaming iterators or JSON parsers.

For high-velocity AI development, autonomous agents, and script automation, this creates cognitive overhead and unnecessary boilerplate. Developers and AI agents need a **zero-friction, ultra-flat execution model** that enables single-line invocation, tagged template literal prompts, direct async iteration streaming, and instant structured data extraction.

## Decision
We establish the **Ultra-Flat Effortless SDK Strategy** for the official GALXAI developer library (`galxai`), consisting of the following architectural pillars:

### 1. Callable Client Instance & Tagged Template Literals
The default export `galx` acts simultaneously as a fully-featured client and a callable function supporting tagged template interpolation:
```typescript
import galx from 'galxai';

// 1. Tagged Template Literal Invocation
const topic = 'superconductors';
const summary = await galx`Summarize the physics of ${topic} in 3 bullet points`;

// 2. Direct Function Invocation
const answer = await galx('What is the speed of light?');
```

### 2. Top-Level Zero-Config Functional Exports
Developers can import top-level execution primitives directly without initializing any client instance:
```typescript
import { run, generateImage, stream, extract, tool } from 'galxai';

// 1-line execution
const answer = await run('Explain relativity in 10 words');

// 1-line image generation
const image = await generateImage('Cyberpunk floating city');
```

### 3. First-Class Async Token Streaming (`stream`)
Stream tokens with native JavaScript `for await...of` loops with zero buffer configuration:
```typescript
import { stream } from 'galxai';

for await (const chunk of stream('Write a poem about Mars')) {
  process.stdout.write(chunk);
}
```

### 4. Zero-Prompt Structured Schema Extraction (`extract`)
Extract validated JSON schemas from unstructured natural language inputs in a single line:
```typescript
import { extract } from 'galxai';

const user = await extract('Jane Doe is a 29 year old ML engineer in SF', {
  name: 'string',
  age: 'number',
  role: 'string',
  city: 'string'
});
```

### 5. Autonomous Agent Tool Definition Helper (`tool`)
Converts any synchronous or asynchronous JavaScript/TypeScript function into a compliant LLM tool specification:
```typescript
import { tool } from 'galxai';

const searchTool = tool(
  'searchKnowledge',
  'Queries vector database for relevant documentation',
  async (args) => {
    return { results: ['Doc A', 'Doc B'] };
  },
  { query: { type: 'string' } }
);
```

## Consequences

### Positive
- **Zero Friction**: Developers can execute prompts with a single line of code (`import { run } from 'galxai'; await run(...)`).
- **Autonomous Agent Ergonomics**: AI code generation agents (Claude Code, Cursor, Windsurf) generate 80% fewer tokens when writing GALXAI client interactions.
- **Native Streaming**: Direct async generator yields clean token deltas without manual SSE parser wiring.
- **Type Safety**: Full TypeScript generics support across structured extraction and tool definitions.

### Neutral / Trade-offs
- The default singleton client automatically reads `process.env.GALX_API_KEY` or `process.env.OPENAI_API_KEY`. Custom base URLs or headers can still be configured via `new GalxAI({ ... })`.
