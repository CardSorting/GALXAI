/**
 * Developer Interactive Cookbooks Dataset for pSEO and AEO
 */

export interface CookbookRecipeItem {
  slug: string;
  category: string;
  badge: string;
  title: string;
  headline: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  timeToComplete: string;
  prerequisites: string[];
  primaryLanguage: 'TypeScript' | 'Python';
  codeSnippet: string;
  steps: {
    name: string;
    description: string;
  }[];
  faqs: { q: string; a: string }[];
}

export const COOKBOOK_RECIPES_DATA: CookbookRecipeItem[] = [
  {
    slug: 'streaming-sse-nextjs',
    category: 'Streaming & Web',
    badge: 'Sub-15ms SSE',
    title: 'Streaming Server-Sent Events with Next.js App Router & OpenAI SDK',
    headline: 'Stream LLM Server-Sent Events in Next.js App Router',
    description:
      'Learn how to implement ultra-low latency token streaming in Next.js 15 App Router using standard OpenAI SDK and Server-Sent Events on GALXAI.',
    difficulty: 'Intermediate',
    timeToComplete: 'PT5M',
    prerequisites: ['Next.js 14/15 App Router', 'openai package (npm i openai)'],
    primaryLanguage: 'TypeScript',
    codeSnippet: `import OpenAI from "openai";

export const runtime = "edge";

const client = new OpenAI({
  baseURL: "https://galx.ai/v1",
  apiKey: process.env.GALXAI_API_KEY,
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const stream = await client.chat.completions.create({
    model: "galx-nova",
    stream: true,
    messages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) {
          controller.enqueue(encoder.encode(text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}`,
    steps: [
      {
        name: 'Create Route Handler',
        description: 'Create app/api/chat/route.ts in your Next.js project directory.',
      },
      {
        name: 'Instantiate OpenAI Client with GALXAI Base URL',
        description: 'Provide baseURL="https://galx.ai/v1" and set runtime="edge".',
      },
      {
        name: 'Stream Response Chunks',
        description: 'Iterate over stream chunks and enqueue into a ReadableStream response.',
      },
    ],
    faqs: [
      {
        q: 'Why use Edge runtime for LLM streaming?',
        a: 'Edge runtime executes closer to users, cutting TLS round-trip times and delivering sub-15ms Time-To-First-Token.',
      },
    ],
  },
  {
    slug: 'structured-json-zod',
    category: 'Structured Outputs',
    badge: '100% Grammar Guarantee',
    title: 'Strict Structured JSON Outputs with Zod & Pydantic on GALXAI',
    headline: 'Guaranteed Structured JSON Outputs with Zod & Pydantic',
    description:
      'Enforce token-level constrained grammar masks to guarantee 0% JSON parse failures in autonomous agent workflows.',
    difficulty: 'Beginner',
    timeToComplete: 'PT3M',
    prerequisites: ['Python 3.10+ / TypeScript', 'zod or pydantic'],
    primaryLanguage: 'Python',
    codeSnippet: `from pydantic import BaseModel, Field
from openai import OpenAI

class CustomerExtraction(BaseModel):
    name: str = Field(description="Full customer name")
    email: str = Field(description="Validated email address")
    interest_tier: str = Field(description="Enterprise or Startup")
    estimated_arr_usd: float = Field(description="Projected annual contract value")

client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# Enforces 100% strict JSON schema grammar decoding
response = client.beta.chat.completions.parse(
    model="galx-nova",
    messages=[
        {"role": "system", "content": "Extract customer data with zero schema drift."},
        {"role": "user", "content": "Alex Mercer from Acme Corp wants an Enterprise contract for $50,000/yr. Reach him at alex@acme.com."}
    ],
    response_format=CustomerExtraction,
)

data = response.choices[0].message.parsed
print(f"Extracted: {data.name} ({data.email}) - \${data.estimated_arr_usd}/yr")`,
    steps: [
      {
        name: 'Define Pydantic Schema',
        description: 'Declare strongly-typed output models with field descriptions.',
      },
      {
        name: 'Call client.beta.chat.completions.parse',
        description: 'Pass your model as response_format for strict token masking.',
      },
      {
        name: 'Access Validated Object',
        description: 'Access the parsed Pydantic object directly with zero JSON.parse calls.',
      },
    ],
    faqs: [
      {
        q: 'How does GALXAI guarantee 0% JSON parse failures?',
        a: 'GALXAI masks invalid tokens at generation time, preventing the model from outputting illegal JSON syntax.',
      },
    ],
  },
  {
    slug: 'parallel-function-calling',
    category: 'Agent Tool Calling',
    badge: 'Multi-Tool Execution',
    title: 'Parallel Tool & Function Calling in Python & TypeScript',
    headline: 'Execute Parallel Multi-Tool Function Calls with GALX Nova',
    description:
      'Orchestrate autonomous agent tool calls in parallel with zero sequential blocking and wholesale token pricing.',
    difficulty: 'Intermediate',
    timeToComplete: 'PT5M',
    prerequisites: ['Python 3.10+', 'openai package'],
    primaryLanguage: 'Python',
    codeSnippet: `from openai import OpenAI
import json

tools = [
    {
        "type": "function",
        "function": {
            "name": "get_stock_price",
            "description": "Fetch real-time stock price",
            "parameters": {
                "type": "object",
                "properties": {"ticker": {"type": "string"}},
                "required": ["ticker"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_company_news",
            "description": "Fetch latest financial news headline",
            "parameters": {
                "type": "object",
                "properties": {"ticker": {"type": "string"}},
                "required": ["ticker"]
            }
        }
    }
]

client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# GALX Nova triggers both functions in parallel in a single turn
response = client.chat.completions.create(
    model="galx-nova",
    messages=[{"role": "user", "content": "What is the stock price and latest news for NVDA and MSFT?"}],
    tools=tools,
    tool_choice="auto"
)

for tool_call in response.choices[0].message.tool_calls:
    print(f"Parallel Call: {tool_call.function.name}({tool_call.function.arguments})")`,
    steps: [
      {
        name: 'Declare Tool Schemas',
        description: 'Define available functions and parameter types.',
      },
      {
        name: 'Pass tools Parameter',
        description: 'Provide tools array to chat.completions.create.',
      },
      {
        name: 'Execute Parallel Calls',
        description: 'Inspect tool_calls array and dispatch execution concurrently.',
      },
    ],
    faqs: [
      {
        q: 'Does parallel function calling save latency?',
        a: 'Yes. Generating multiple tool invocations in a single response turn cuts multi-turn agent latency by up to 60%.',
      },
    ],
  },
  {
    slug: 'multi-agent-crewai-autogen',
    category: 'Agent Swarms',
    badge: '429 Rate Limit Shield',
    title: 'Orchestrating Multi-Agent Swarms with CrewAI & 429 Shield',
    headline: 'Deploy Multi-Agent Swarms with Enterprise 429 Shield',
    description:
      'Run high-concurrency CrewAI and AutoGen agent fleets with pooled enterprise capacity and 75% prompt caching on shared agent instructions.',
    difficulty: 'Advanced',
    timeToComplete: 'PT8M',
    prerequisites: ['pip install crewai langchain-openai'],
    primaryLanguage: 'Python',
    codeSnippet: `from crewai import Agent, Crew, Task, Process
from langchain_openai import ChatOpenAI

# Shared Gateway LLM with 429 Shield Pooling
llm = ChatOpenAI(
    model="galx-nova",
    openai_api_base="https://galx.ai/v1",
    openai_api_key="galx_live_your_gateway_key"
)

planner = Agent(
    role="Principal Systems Architect",
    goal="Plan robust distributed cloud topologies",
    backstory="Expert in high-availability and fault tolerance.",
    llm=llm
)

reviewer = Agent(
    role="Lead Security Auditor",
    goal="Identify security and compliance vulnerabilities",
    backstory="Specialist in SOC 2, HIPAA, and Zero Data Retention.",
    llm=llm
)

# Crew executes with pooled throughput and zero 429 stalls
crew = Crew(
    agents=[planner, reviewer],
    tasks=[
        Task(description="Architect distributed edge routing layer", expected_output="Architecture spec", agent=planner),
        Task(description="Audit zero-data-retention buffers", expected_output="Audit report", agent=reviewer)
    ],
    process=Process.sequential
)

result = crew.kickoff()
print(result)`,
    steps: [
      {
        name: 'Install CrewAI & LangChain',
        description: 'Install dependencies in virtual environment.',
      },
      {
        name: 'Initialize Gateway LLM',
        description: 'Point ChatOpenAI to "https://galx.ai/v1".',
      },
      {
        name: 'Launch Concurrent Swarm',
        description: 'Execute agent loops with 75% caching on system backstories.',
      },
    ],
    faqs: [
      {
        q: 'Why do multi-agent frameworks benefit from prompt caching?',
        a: 'Each agent repeatedly receives large conversation transcripts. Cached prefixes (>1,024 tokens) receive a 75% compound discount on every turn.',
      },
    ],
  },
  {
    slug: 'rag-prefix-caching',
    category: 'RAG Architecture',
    badge: '75% Context Rebate',
    title: '75% Prompt Caching Architecture for Large Document RAG',
    headline: 'Build High-Volume Document RAG with 75% Caching Rebates',
    description:
      'Structure your document retrieval prompts to ensure 100% prefix cache hits on large PDF chunks and system instructions.',
    difficulty: 'Intermediate',
    timeToComplete: 'PT5M',
    prerequisites: ['Python 3.10+', 'openai package'],
    primaryLanguage: 'Python',
    codeSnippet: `from openai import OpenAI

client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# Static document context (>1,024 tokens) placed at the BEGINNING of prompt for 100% cache hit
large_document_context = load_annual_report_markdown()  # ~25,000 tokens

def query_knowledge_base(user_question: str):
    response = client.chat.completions.create(
        model="galx-nova",  # 1M+ Context Window
        messages=[
            {
                "role": "system",
                "content": f"You are an enterprise research assistant. Reference the verified document corpus below:\\n\\n{large_document_context}"
            },
            {
                "role": "user",
                "content": user_question  # Dynamic query appended at the END
            }
        ]
    )
    return response.choices[0].message.content

# Subsequent queries cost 75% less on the 25,000 token prefix
print(query_knowledge_base("What was Q4 revenue growth?"))
print(query_knowledge_base("Summarize ESG initiatives."))`,
    steps: [
      {
        name: 'Place Static Context First',
        description: 'Keep document chunks and system prompts at the beginning of the message list.',
      },
      {
        name: 'Append Dynamic User Query Last',
        description: 'Ensure dynamic user questions appear at the end to preserve identical prefix matching.',
      },
      {
        name: 'Claim 75% Automated Rebate',
        description: 'GALXAI matches cached RAM slices and deducts 75% from your token bill automatically.',
      },
    ],
    faqs: [
      {
        q: 'Why must static context be placed before user questions?',
        a: 'KV prompt caching evaluates prefixes from left to right. Keeping the leading tokens static maximizes cache hit rates across user queries.',
      },
    ],
  },
  {
    slug: 'image-generation-galx-nova-image',
    category: 'Visual Synthesis',
    badge: 'GALX Nova-image',
    title: 'Generating Images with GALX Nova-image',
    headline: 'Generate Images with GALX Nova-image on GALXAI',
    description:
      'Create photorealistic images with readable typography, UI mockups, and marketing assets at wholesale rates.',
    difficulty: 'Beginner',
    timeToComplete: 'PT2M',
    prerequisites: ['Python 3.10+', 'openai package'],
    primaryLanguage: 'Python',
    codeSnippet: `from openai import OpenAI

client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# Generate image with crisp typography and complex composition
response = client.images.generate(
    model="galx-nova-image",
    prompt="Sleek glassmorphism developer dashboard with glowing neon telemetry graph and title 'GALXAI EDGE READY'",
    size="1024x1024",
    quality="hd"
)

image_url = response.data[0].url
print(f"Generated Asset: {image_url}")`,
    steps: [
      {
        name: 'Call client.images.generate',
        description: 'Specify model="galx-nova-image" with your visual prompt.',
      },
      {
        name: 'Receive HD Asset URL',
        description: 'Access the generated high-resolution CDN asset URL instantly.',
      },
    ],
    faqs: [
      {
        q: 'What is the cost per image for OpenAI Image Generation on GALXAI?',
        a: 'OpenAI Image Generation costs $0.032/image (20% wholesale discount vs $0.040 direct list price).',
      },
    ],
  },
  {
    slug: 'dynamic-model-fallback-circuit-breaker',
    category: 'Reliability & Resilience',
    badge: 'Zero-Downtime Circuit Breaker',
    title: 'Implementing Client-Side Circuit Breakers with Automated Model Fallback',
    headline: 'Client-Side AI Circuit Breaker & Resilient Model Fallbacks',
    description:
      'Build zero-downtime AI pipelines that automatically handle retry loops and circuit breakers with GALX Nova during upstream network anomalies.',
    difficulty: 'Intermediate',
    timeToComplete: 'PT5M',
    prerequisites: ['TypeScript / Node.js 18+', 'openai SDK'],
    primaryLanguage: 'TypeScript',
    codeSnippet: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://galx.ai/v1",
  apiKey: process.env.GALXAI_API_KEY,
});

async function executeResilientInference(prompt: string): Promise<string> {
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: "galx-nova",
        messages: [{ role: "user", content: prompt }],
        timeout: 5000, // 5s circuit timeout
      });
      return response.choices[0].message.content || "";
    } catch (err) {
      console.warn(\`Attempt \${attempt} degraded, retrying with backoff...\`, err);
      if (attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, attempt * 1000));
    }
  }
  throw new Error("All retry attempts exhausted.");
}

const result = await executeResilientInference("Summarize mission-critical system state");
console.log(result);`,
    steps: [
      {
        name: 'Define Hierarchical Tier Stack',
        description: 'Order models by capability (Sol -> Terra -> Luna).',
      },
      {
        name: 'Set Strict Timeout Bounds',
        description: 'Enforce 5000ms circuit timeouts to catch hanging connections quickly.',
      },
      {
        name: 'Gracefully Degrade',
        description: 'Seamlessly shift downstream traffic without failing user requests.',
      },
    ],
    faqs: [
      {
        q: 'Does GALXAI charge retry fees on failed attempts?',
        a: 'No. GALXAI only bills for successfully completed token transactions.',
      },
    ],
  },
  {
    slug: 'semantic-cache-redis',
    category: 'Latency & Cost Optimization',
    badge: 'Sub-5ms Semantic Cache',
    title: 'Building a High-Speed Semantic AI Cache with Redis and Embeddings',
    headline: 'Sub-5ms Semantic Vector Caching with Redis & GALXAI Embeddings',
    description:
      'Slash LLM costs by up to 80% by caching semantically similar user prompts in local Redis vector stores before dispatching to frontier models.',
    difficulty: 'Advanced',
    timeToComplete: 'PT7M',
    prerequisites: ['Python 3.10+', 'redis', 'openai'],
    primaryLanguage: 'Python',
    codeSnippet: `from openai import OpenAI
import numpy as np

client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

def get_query_embedding(text: str) -> list[float]:
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding

def ask_with_cache(user_prompt: str):
    # 1. Generate query embedding
    vec = get_query_embedding(user_prompt)
    
    # 2. Check local semantic cache (cosine similarity > 0.95)
    # If cache miss, dispatch to GALXAI wholesale model
    completion = client.chat.completions.create(
        model="galx-nova",
        messages=[{"role": "user", "content": user_prompt}]
    )
    return completion.choices[0].message.content

print(ask_with_cache("How do I configure distributed edge proxy endpoints?"))`,
    steps: [
      {
        name: 'Compute Low-Cost Vector Embedding',
        description: 'Generate vector representations with text-embedding-3-small on GALXAI.',
      },
      {
        name: 'Query Local Vector Cache',
        description: 'Evaluate similarity threshold; return cached completion if match is >95%.',
      },
      {
        name: 'Dispatch Miss to GALXAI Wholesale',
        description: 'Route cache misses to GALX Nova with wholesale savings.',
      },
    ],
    faqs: [
      {
        q: 'How does semantic caching combine with GALXAI prompt caching?',
        a: 'Semantic caching eliminates calls for near-identical queries, while GALXAI server-side prefix caching discounts 75% on new queries sharing system prompts.',
      },
    ],
  },
  {
    slug: 'zero-proxy-react-primitives',
    category: 'Frontend & UI',
    badge: 'Zero-Proxy Velocity',
    title: 'Building Production AI Features with Zero-Proxy React Primitives',
    headline: 'Ship Image, Reasoning & Voice AI in React Without Backend Proxies',
    description:
      'Learn how to use GALXAI declarative React components (<GalxImage />, <GalxReasoningStream />, <GalxAudio />) with zero backend fetch boilerplate and server-only API key security.',
    difficulty: 'Beginner',
    timeToComplete: 'PT3M',
    prerequisites: ['Next.js 14/15 or React 18/19', 'galxai package'],
    primaryLanguage: 'TypeScript',
    codeSnippet: `import { GalxImage, GalxReasoningStream, GalxAudio } from 'galxai/ui';

export default function AIStudioPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* 1. Declarative Reasoning Stream */}
      <GalxReasoningStream
        prompt="Explain the difference between SOTA reasoning and high-velocity tiers"
        model="galx-nova"
        autoStart
      />

      {/* 2. Zero-Proxy Visual Synthesis */}
      <GalxImage
        prompt="Cyberpunk neon command center"
        aspectRatio="16:9"
      />

      {/* 3. Declarative Voice Playback */}
      <GalxAudio
        text="GALXAI compresses time-to-first-dollar by eliminating custom backend proxies."
        voice="alloy"
      />
    </div>
  );
}`,
    steps: [
      {
        name: 'Add GALXAI_API_KEY to .env.local',
        description: 'Store your gateway key on the server. Client components never expose plaintext credentials.',
      },
      {
        name: 'Import Declarative Primitives',
        description: 'Import <GalxImage />, <GalxReasoningStream />, or <GalxAudio />.',
      },
      {
        name: 'Render Components in JSX',
        description: 'Components handle streaming, loading spinners, aspect ratios, and error boundaries automatically.',
      },
    ],
    faqs: [
      {
        q: 'Are client-side API keys exposed to users in the browser?',
        a: 'No. GALXAI UI primitives execute via secure Next.js Server Actions or server-side session handlers, preventing client-side key leakage.',
      },
      {
        q: 'Do I need to write custom Express or Next.js route handlers?',
        a: 'No. The components manage streaming socket connections and response state internally.',
      },
    ],
  },
  {
    slug: 'autonomous-spend-governance-tier-cascading',
    category: 'Enterprise & FinOps',
    badge: 'Spend Governance',
    title: 'Automating Spend Governance & Tier Cascading with OpenAI SDK',
    headline: 'Stop Unnecessary AI Spend with 1-Line Gateway Governance',
    description:
      'Implement real-time spend governance, prefix cache preservation, and automated model tier cascading using standard OpenAI SDK and GALXAI Gateway.',
    difficulty: 'Intermediate',
    timeToComplete: 'PT5M',
    prerequisites: ['Node.js or Python', 'OpenAI SDK'],
    primaryLanguage: 'TypeScript',
    codeSnippet: `import OpenAI from "openai";

// 1-Line Drop-in Gateway Interception
const openai = new OpenAI({
  baseURL: "https://gateway.galx.ai/v1",
  apiKey: process.env.GALXAI_API_KEY,
});

async function runClassificationTask(ticketText: string) {
  // High-efficiency classification query:
  // GALX Nova optimizes token throughput and latency with prefix cache preservation.
  const response = await openai.chat.completions.create({
    model: "galx-nova",
    messages: [
      {
        role: "system",
        content: "You are an automated support ticket classifier. Output only: billing, technical, or account.",
      },
      { role: "user", content: ticketText },
    ],
  });

  return response.choices[0].message.content;
}

runClassificationTask("My credit card was charged twice on invoice #9201")
  .then(console.log);`,
    steps: [
      {
        name: 'Point baseURL to GALXAI Gateway',
        description: 'Set baseURL to https://gateway.galx.ai/v1 in your existing OpenAI client initialization.',
      },
      {
        name: 'Execute Normal Inference Calls',
        description: 'Make standard chat.completions calls. GALX automatically optimizes performance and cache preservation.',
      },
      {
        name: 'Inspect Telemetry in /audit',
        description: 'View real-time spend attribution, avoided waste, and prefix cache hit rates on your live dashboard.',
      },
    ],
    faqs: [
      {
        q: 'Does Tier Cascading alter output accuracy on complex reasoning tasks?',
        a: 'No. GalX only routes tasks where unexpired statistical evaluation evidence (Δ ≥ -0.010) proves parity, keeping complex reasoning on flagship tiers.',
      },
    ],
  },
];

