# 🧪 Stage 8 Playbook: Unframed Developer Observation & Behavioral Trial Protocol

> **Objective**: Observe what happens when technically competent engineers encounter GALXAI with **zero framing**, measuring spontaneous adoption, mental models, friction points, and emergent use cases.  
> **Core Tenet**: *"Hand GALX to 10 technically competent people and shut up. Their stubbornness is data."*

---

## 1. The Core Scientific Premise

We have spent significant effort studying what **GALX does to data**:
- We know it transforms high-redundancy representations into dense, task-relevant representations.
- We know it cuts prompt tokens by $61\% - 95\%$ under tested workloads without failing objective assertions.
- We know the exact provider receipts across `gpt-4o`, `gpt-4o-mini`, and `o3-mini`.

Now we must study what **humans do with GALX**.

### The Anti-Pitch Rule
When handing GALX to an engineer for this protocol:
- ❌ **DO NOT** pitch them: *"GALX is an evidence-gated representation transformation layer..."*
- ❌ **DO NOT** give them the benchmark target: *"It saves 85.93% on tokens."*
- ❌ **DO NOT** correct their mental model during the trial.
- ✅ **DO SAY**: *"Here is an API endpoint / CLI tool / SDK. Try running a workload through it."*

---

## 2. The 8 Behavioral Observation Vectors

Track these 8 high-signal behavioral vectors during the trial:

| Vector | What to Observe | Signal Type |
| :--- | :--- | :--- |
| **1. Ingress Choice** | *What data do they feed into it?* (Raw logs, git diffs, JSON time series, SQL schemas, conversational chat, or already-curated prompts?) | **Input Mental Model** |
| **2. Output Expectation** | *What do they expect to come out?* (A cheaper completion, a summarized string, an embedding, or a structured JSON object?) | **Value Hypothesis** |
| **3. Parameter Triage** | *What do they immediately try to tune or toggle?* (Model alias, temperature, mode flag, budget, or headers?) | **Control Preference** |
| **4. Point of Hesitation** | *Where do they pause or look confused?* (Auth format, parameter names, error messages, or response latency?) | **UX Friction Vector** |
| **5. Skepticism & Audit** | *What do they assume it did incorrectly?* (Hallucinated a number, dropped an edge case, or faked savings?) | **Trust Boundary** |
| **6. Spontaneous Connection** | *What existing engineering problem in their stack do they immediately connect it to?* (Event stream, agent memory, CI/CD, billing?) | **Product Wedge** |
| **7. Retention & Re-Use** | *Do they use it a second time without prompting?* (One-off curiosity vs. daily toolchain integration?) | **True Utility** |
| **8. Emergent Wrappers** | *What code or pipeline do they build around it?* (Custom middleware, bash scripts, agent tools, or cron jobs?) | **Architectural Moat** |

---

## 3. Trial Setup & Access Artifacts

Provide the engineer with one of three unframed drop-in entry points:

### Option A: The Zero-Install Terminal CLI
```bash
npx galxai run "Analyze this 5,000-line incident log" --model sol
```

### Option B: The 1-Line Drop-In Auto-Patcher
```typescript
import 'galxai/patch';
// Outgoing OpenAI client calls now route through the local gateway
```

### Option C: The Programmatic Compaction Facade
```typescript
import { BroccoliCompactionFacade } from '@/core/broccolidb';

const result = BroccoliCompactionFacade.compact({
  mode: 'domain',
  text: myRawData
});
```

---

## 4. Classifying Induced Mental Models

When engineers complete their trial, record the **Induced Mental Model** without arguing or correcting them:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                             INDUCED MENTAL MODEL TAXONOMY                              │
├───────────────────────────────┬────────────────────────────────────────────────────────┤
│ Induced Archetype             │ What the Engineer Concludes                           │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ "The Log Squeezer"            │ "This is a pre-filter for my Datadog / OTel stream."   │
│ "The Token Arbitrageur"       │ "This is a cheaper wholesale proxy for OpenAI."       │
│ "The Agent Buffer"            │ "This keeps my autonomous subagent context clean."     │
│ "The Document Pruner"         │ "This extracts key terms from massive PDF/contract DBs"│
│ "The Unnecessary Box"         │ "My context is already curated; I don't need this."    │
└───────────────────────────────┴────────────────────────────────────────────────────────┘
```

> **The Lesson**: If 8 out of 10 engineers conclude GALX is an *"Agent Context Buffer"*, then *that is what the market wants it to be*. Let their stubbornness dictate the roadmap.

---

## 5. Output Artifact: The Trial Debrief Record

For each observed trial, log the structured debrief in `docs/trials/` with:
1. `engineer_profile`: (e.g. Staff DevOps Engineer, AI Application Founder, Data Platform Lead)
2. `raw_workload_type`: (e.g. Kubernetes log dumps, PostgreSQL schema DDLs, SEC 10-K filings)
3. `spontaneous_feedback`: Exact verbatim quotes without editorial filter.
4. `observed_actions`: What code they wrote or executed.
5. `next_step`: Whether they requested API keys for ongoing staging deployment.

---

## 6. Execution Command

Run the trial simulation or local recording harness:

```bash
npx tsx scripts/dissect-payloads-and-causal-analysis.ts
```

Observe. Record. Do not argue. 🥦🔬
