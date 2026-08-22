# ADR 0034: Autonomous Agent 1-Click Context & Zero-Friction Event Pipeline

## Status
`Accepted` — Implemented in `src/app/queues/page.tsx` and `src/sdk/client.ts`.

## Context
Developers utilizing autonomous coding agents (such as Claude Code, Cursor, Windsurf, Devin, AutoGPT, and CrewAI) constantly pass generated intelligence, code artifacts, and research outputs between platforms.

Traditional user interfaces force developers through multiple tedious steps:
1. Waiting for long background tasks to finish while monitoring logs.
2. Highlighting text or clicking through multiple menus to copy raw output.
3. Manually writing wrapper Markdown headers (`### Context...`) so an LLM agent understands the prompt, model used, and task metadata.
4. Manually reformatting outputs into runnable Python or TypeScript code for subagents.

To eliminate this operational friction, GALXAI introduces an **Autonomous Agent 1-Click Context & Auto-Copy Substrate**.

## Decision
We implement a zero-friction UI and SDK pipeline specifically architected for autonomous agent workflows:

### 1. Structured Autonomous Agent Context Format
Outputs exported for agents follow a standardized, zero-parsing Markdown specification:
```markdown
### [GALXAI Autonomous Agent Context]
Task ID: task_174025...
User Prompt: Architect a high-throughput queue substrate
Model: gpt-5.6-sol
Status: COMPLETED

=== RESULT OUTPUT ===
1. In-Memory Hot Cache Architecture...
====================
```

### 2. Direct 1-Click Multi-Format Export Chips (Zero Modals)
Directly accessible underneath every completed result:
- **`🤖 Agent Context`**: Copies the structured agent Markdown block in 1 click.
- **`🐍 Python`**: 1-click copies a runnable Python script (`from galxai import run`).
- **`⚡ TS`**: 1-click copies a runnable TypeScript snippet (`import { run } from 'galxai'`).
- **`🌐 cURL`**: 1-click copies a runnable cURL command with `POST /api/run`.
- **`📄 Text`**: 1-click copies clean plain-text.

### 3. Zero-Click Auto-Copy on Task Completion
- An **`⚡ Auto-Copy for Agent`** toggle in the canvas header.
- When enabled, the reactive polling listener detects when an active background task completes, automatically writes the structured agent context to the system clipboard, and triggers a confirmation toast notification. The developer does not need to click anything.

### 4. Programmatic SDK Agent Context Formatter (`toAgentContext`)
```typescript
import { GalxAI } from 'galxai';

const galx = new GalxAI();
const result = await galx.run('Audit security controls');

// Export structured agent context block
const ctx = galx.toAgentContext('Audit security controls', result, {
  model: 'gpt-5.6-sol',
  id: 'task_sec_99'
});
```

## Consequences

### Positive
- **Zero-Friction Agent Handoff**: Immediate paste-readiness into Claude Code, Cursor, Windsurf, or custom agent swarms.
- **Zero-Click Productivity**: With Auto-Copy ON, users can queue heavy background workflows, switch windows, and find the formatted agent context already waiting in their clipboard upon completion.
- **Consistent Telemetry & Traceability**: The standardized agent context block includes the exact task ID and model for full audit provenance.
