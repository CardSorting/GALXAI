# ⚙️ Structured Outputs, Tool Calling & Agent Runtimes

GALXAI natively supports strict JSON Schema enforcement, parallel tool calling, and zero-boilerplate autonomous agent execution across reasoning flagships (`gpt-5.6-sol`, `gpt-5.6-terra`, `x-ai/grok-4.6`).

---

## ⚡ 1. Top-Level 1-Line Structured Extraction (`extract`)

Extract strongly-typed data from unstructured text in 1 line with zero schema boilerplate:

```typescript
import { extract } from '@galxai/sdk';

const invoice = await extract(
  "Invoice #INV-2026-904 for Acme Corp totaling $14,250.00 due on September 15th, 2026",
  {
    invoiceNumber: "string",
    client: "string",
    totalAmountUsd: "number",
    dueDate: "string"
  }
);

console.log(invoice.client);         // "Acme Corp"
console.log(invoice.totalAmountUsd); // 14250.00
```

---

## 🤖 2. Autonomous Multi-Step Tool Calling Agent (`galx.agent`)

The agent runtime automatically executes functions, parses parameters, appends assistant/tool messages, and continues until a final answer is produced:

```typescript
import { GalxAI, tool } from '@galxai/sdk';

const galx = new GalxAI();

const agent = galx.agent({
  model: 'gpt-5.6-sol',
  tools: {
    // 1. Raw TypeScript async function (auto-registered)
    getWeather: async ({ city }: { city: string }) => {
      return { city, temperatureC: 22, condition: "Sunny" };
    },
    
    // 2. Explicit tool definition helper
    calculateTax: tool(
      "calculateTax",
      "Calculates estimated sales tax for a given transaction",
      async ({ amount, state }: { amount: number; state: string }) => {
        const rate = state === "CA" ? 0.0825 : 0.06;
        return { estimatedTax: amount * rate };
      },
      {
        amount: { type: "number", description: "Subtotal amount in USD" },
        state: { type: "string", description: "2-letter US state code" }
      }
    )
  }
});

const result = await agent.run("What is the weather in San Francisco, and what is the sales tax on a $200 purchase in CA?");
console.log(result.text);
```

---

## 🔄 3. Multi-Mental-Model Tool Normalization

`galx.agent` automatically absorbs diverse tool definition formats:

```typescript
// A. Raw JavaScript object map
const toolsA = {
  fetchStock: async ({ ticker }) => ({ price: 150 })
};

// B. Standard OpenAI tool format
const toolsB = [
  {
    type: "function",
    function: {
      name: "fetchStock",
      description: "Gets stock price",
      parameters: { type: "object", properties: { ticker: { type: "string" } } }
    }
  }
];

// C. Anthropic Claude tool format
const toolsC = [
  {
    name: "fetchStock",
    description: "Gets stock price",
    input_schema: { type: "object", properties: { ticker: { type: "string" } } }
  }
];
```

---

## 🔒 4. Strict JSON Schema Adherence (`response_format`)

```python
from openai import OpenAI

client = OpenAI(base_url="https://galx.ai/v1", api_key="galx_live_...")

response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Extract customer details: Alice, 30, Denver"}],
    response_format={
        "type": "json_schema",
        "json_schema": {
            "name": "CustomerExtraction",
            "strict": True,
            "schema": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "age": {"type": "integer"},
                    "city": {"type": "string"}
                },
                "required": ["name", "age", "city"],
                "additionalProperties": False
            }
        }
    }
)

print(response.choices[0].message.content)
```

---

## 🥦 5. Adaptive Representation Selection for Tool Outputs (ADR 0066 & 0067)

Autonomous agents that query database catalogs, Kubernetes clusters, or repository files often blow out context windows with bloated JSON tool responses or contradictory corporate minutes.

With **`BroccoliCompactionFacade.selectRepresentation()`**, tool outputs are dynamically optimized before appending to the agent's turn history:
- **Small / Clean Tool Responses (<200 tokens)**: Automatically bypass compaction ($\text{ID}(C)$), preventing token dilation overhead.
- **Noisy Telemetry / Multi-Page Dumps**: Slashed up to $94.6\%$ with fail-closed provenance validation.

```typescript
import { GalxAI } from '@galxai/sdk';
import { BroccoliCompactionFacade } from '@/core/broccolidb';

const galx = new GalxAI();

const agent = galx.agent({
  model: 'gpt-5.6-sol',
  tools: {
    // 1. Tool that inspects codebase architecture and invariants
    inspectRepositoryArchitecture: async ({ path }: { path: string }) => {
      const rawFileText = await fetchRepositoryFile(path);
      
      // Adaptively selects representation: passes small files through verbatim,
      // prunes obsolete ADRs and RFC ceremonies on complex documentation
      const selection = BroccoliCompactionFacade.selectRepresentation({
        text: rawFileText,
        taskType: 'architecture_invariants',
      });

      return selection.selectedRepresentation;
    },

    // 2. Tool that returns massive Kubernetes watch event streams
    inspectClusterEvents: async ({ namespace }: { namespace: string }) => {
      const rawEvents = await fetchK8sEvents(namespace);
      
      // Compact raw K8s events by up to 94.6% before returning to the LLM
      const compacted = BroccoliCompactionFacade.compact({
        mode: 'k8s_watch_stream',
        events: rawEvents,
      });

      return compacted.compactedPrompt;
    }
  }
});

const report = await agent.run("Investigate pod crash loops in namespace 'production'");
console.log(report.text);
```


