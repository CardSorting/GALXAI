/**
 * Curated Integration Guides Data for Programmatic SEO (pSEO) and AEO
 */

export interface IntegrationGuide {
  slug: string;
  name: string;
  category: 'ide' | 'framework' | 'agents' | 'rag';
  badge: string;
  title: string;
  headline: string;
  description: string;
  timeToSetup: string;
  envSnippet: string;
  configSnippet: {
    filename: string;
    language: string;
    code: string;
  };
  codeExample: {
    language: 'Python' | 'TypeScript' | 'Bash';
    code: string;
  };
  steps: {
    name: string;
    description: string;
  }[];
  faqs: { q: string; a: string }[];
}

export const INTEGRATION_GUIDES: IntegrationGuide[] = [
  {
    slug: 'cursor',
    name: 'Cursor IDE',
    category: 'ide',
    badge: '30-Second IDE Setup',
    title: 'How to Connect Cursor IDE to GALXAI — 25%–40% Wholesale Savings',
    headline: 'Connect Cursor IDE to GALXAI in 30 Seconds',
    description:
      'Configure Cursor to route completions and agent edits through the GALXAI Universal Gateway for 25%–40% wholesale savings, 75% prompt caching, and zero rate-limit stalls.',
    timeToSetup: 'PT30S',
    envSnippet: `OPENAI_API_BASE=https://api.galx.ai/v1
OPENAI_API_KEY=galx_live_your_gateway_key`,
    configSnippet: {
      filename: 'settings.json (Cursor Settings > Models)',
      language: 'json',
      code: `{
  "cursor.openaiBaseUrl": "https://api.galx.ai/v1",
  "cursor.openaiApiKey": "galx_live_your_gateway_key",
  "cursor.customModels": [
    "gpt-5.6-sol",
    "gpt-5.6-terra",
    "gpt-5.6-luna",
    "x-ai/grok-4.5"
  ]
}`,
    },
    codeExample: {
      language: 'Bash',
      code: `# Test Cursor Connection in Terminal
curl https://api.galx.ai/v1/chat/completions \\
  -H "Authorization: Bearer galx_live_your_gateway_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-5.6-sol",
    "messages": [{"role": "user", "content": "Cursor connection verified"}]
  }'`,
    },
    steps: [
      {
        name: 'Open Cursor Settings',
        description: 'Press Cmd + Shift + J (or Ctrl + Shift + J) to open Cursor Settings and navigate to "Models".',
      },
      {
        name: 'Configure OpenAI API Key & Base URL',
        description: 'Toggle "Override OpenAI Base URL" to ON and enter "https://api.galx.ai/v1". Paste your GALXAI live key ("galx_live_...").',
      },
      {
        name: 'Add Model Names',
        description: 'Add "gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", and "x-ai/grok-4.5" to the active model list.',
      },
    ],
    faqs: [
      {
        q: 'Does Cursor Composer work with GALXAI?',
        a: 'Yes, 100%. Cursor Composer, Agent mode, and inline autocompletions all function seamlessly because GALXAI is fully OpenAI wire-compatible.',
      },
      {
        q: 'How does prompt caching benefit Cursor users?',
        a: 'Cursor sends large codebase context windows on every edit. Prompts over 1,024 tokens automatically receive a 75% compound rebate, slashing monthly Cursor API bills by up to 60%.',
      },
    ],
  },
  {
    slug: 'windsurf',
    name: 'Windsurf (Codeium)',
    category: 'ide',
    badge: 'Codeium IDE Drop-in',
    title: 'How to Connect Windsurf IDE to GALXAI Universal AI Gateway',
    headline: 'Connect Windsurf IDE to GALXAI in 30 Seconds',
    description:
      'Set up Windsurf cascade flows and inline suggestions with wholesale AI token rates and automated failover across GPT-5.6 and Grok 4.5.',
    timeToSetup: 'PT30S',
    envSnippet: `WINDSURF_API_BASE=https://api.galx.ai/v1
WINDSURF_API_KEY=galx_live_your_gateway_key`,
    configSnippet: {
      filename: 'windsurf_config.json',
      language: 'json',
      code: `{
  "custom_providers": [
    {
      "name": "GALXAI Wholesale Gateway",
      "base_url": "https://api.galx.ai/v1",
      "api_key": "galx_live_your_gateway_key",
      "models": ["gpt-5.6-sol", "gpt-5.6-terra", "x-ai/grok-4.5"]
    }
  ]
}`,
    },
    codeExample: {
      language: 'Bash',
      code: `# Verify Windsurf Gateway Endpoint
curl https://api.galx.ai/v1/models \\
  -H "Authorization: Bearer galx_live_your_gateway_key"`,
    },
    steps: [
      {
        name: 'Navigate to Windsurf Settings',
        description: 'Open Windsurf Preferences and select the "Cascade / Models" configuration tab.',
      },
      {
        name: 'Set Custom Endpoint',
        description: 'Set the Endpoint URL to "https://api.galx.ai/v1" and input your live GALXAI key.',
      },
      {
        name: 'Select Default Model',
        description: 'Select "gpt-5.6-sol" for maximum reasoning or "gpt-5.6-luna" for sub-second autocomplete velocity.',
      },
    ],
    faqs: [
      {
        q: 'Does Windsurf Cascade support streaming SSE from GALXAI?',
        a: 'Yes, GALXAI streams Server-Sent Events (SSE) in sub-14ms TTFT, matching native origin streaming speed.',
      },
    ],
  },
  {
    slug: 'vercel-ai-sdk',
    name: 'Vercel AI SDK',
    category: 'framework',
    badge: 'Next.js App Router Native',
    title: 'Vercel AI SDK Integration Guide — Wholesale Rates with @ai-sdk/openai',
    headline: 'Connect Vercel AI SDK (@ai-sdk/openai) to GALXAI',
    description:
      'Seamlessly route generateText and streamText in Next.js App Router through GALXAI using @ai-sdk/openai with 25%–40% wholesale discounts.',
    timeToSetup: 'PT45S',
    envSnippet: `OPENAI_BASE_URL="https://api.galx.ai/v1"
OPENAI_API_KEY="galx_live_your_gateway_key"`,
    configSnippet: {
      filename: 'src/lib/ai.ts',
      language: 'typescript',
      code: `import { createOpenAI } from '@ai-sdk/openai';

export const galxai = createOpenAI({
  baseURL: 'https://api.galx.ai/v1',
  apiKey: process.env.OPENAI_API_KEY,
});

export const defaultModel = galxai('gpt-5.6-sol');`,
    },
    codeExample: {
      language: 'TypeScript',
      code: `import { streamText } from 'ai';
import { galxai } from '@/lib/ai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: galxai('gpt-5.6-sol'),
    messages,
  });

  return result.toDataStreamResponse();
}`,
    },
    steps: [
      {
        name: 'Install Dependencies',
        description: 'Ensure "ai" and "@ai-sdk/openai" packages are installed in your Next.js application.',
      },
      {
        name: 'Instantiate createOpenAI Client',
        description: 'Provide baseURL="https://api.galx.ai/v1" and your GALXAI API key to createOpenAI.',
      },
      {
        name: 'Execute streamText / generateObject',
        description: 'Invoke standard Vercel AI SDK methods with gpt-5.6-sol, gpt-5.6-terra, or x-ai/grok-4.5.',
      },
    ],
    faqs: [
      {
        q: 'Does generateObject with Zod schemas work with GALXAI?',
        a: 'Yes, GALXAI enforces 100% strict structured JSON decoding with Zod and JSON Schema.',
      },
    ],
  },
  {
    slug: 'langchain',
    name: 'LangChain & LangGraph',
    category: 'framework',
    badge: 'Agent Orchestration',
    title: 'LangChain & LangGraph OpenAI Client Integration Guide',
    headline: 'Connect LangChain & LangGraph to GALXAI Gateway',
    description:
      'Route ChatOpenAI and LangGraph multi-agent workflows through GALXAI with wholesale pricing and parallel tool calling support.',
    timeToSetup: 'PT45S',
    envSnippet: `OPENAI_API_BASE=https://api.galx.ai/v1
OPENAI_API_KEY=galx_live_your_gateway_key`,
    configSnippet: {
      filename: 'agent.py',
      language: 'python',
      code: `from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model="gpt-5.6-sol",
    openai_api_base="https://api.galx.ai/v1",
    openai_api_key="galx_live_your_gateway_key",
    temperature=0.2
)

response = llm.invoke("What are the advantages of prompt caching in agent loops?")
print(response.content)`,
    },
    codeExample: {
      language: 'Python',
      code: `from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an autonomous engineering agent with zero data retention."),
    ("user", "{input}")
])

llm = ChatOpenAI(
    model="gpt-5.6-sol",
    openai_api_base="https://api.galx.ai/v1",
    openai_api_key="galx_live_your_gateway_key"
)

chain = prompt | llm
result = chain.invoke({"input": "Optimize this SQL query"})`,
    },
    steps: [
      {
        name: 'Install langchain-openai',
        description: 'Run "pip install langchain-openai" in your Python virtual environment.',
      },
      {
        name: 'Set openai_api_base Parameter',
        description: 'Pass openai_api_base="https://api.galx.ai/v1" and your GALXAI live API key to ChatOpenAI.',
      },
      {
        name: 'Run Multi-Agent Graph',
        description: 'Execute stateful multi-agent graphs with automatic 75% prompt caching on shared system templates.',
      },
    ],
    faqs: [
      {
        q: 'How does LangGraph state benefit from GALXAI prompt caching?',
        a: 'LangGraph repeatedly passes conversation state and tool schemas. GALXAI automatically caches these prefixes (>1024 tokens) for a 75% token discount on all subsequent graph cycles.',
      },
    ],
  },
  {
    slug: 'llamaindex',
    name: 'LlamaIndex',
    category: 'rag',
    badge: 'RAG Pipeline SOTA',
    title: 'LlamaIndex RAG Pipeline Integration Guide with GALXAI Gateway',
    headline: 'Connect LlamaIndex to GALXAI for Wholesale RAG',
    description:
      'Power high-volume RAG pipelines, vector querying, and document synthesis with GALXAI wholesale rates and zero data retention.',
    timeToSetup: 'PT45S',
    envSnippet: `OPENAI_API_BASE=https://api.galx.ai/v1
OPENAI_API_KEY=galx_live_your_gateway_key`,
    configSnippet: {
      filename: 'rag_pipeline.py',
      language: 'python',
      code: `from llama_index.llms.openai import OpenAI
from llama_index.core import Settings

Settings.llm = OpenAI(
    model="gpt-5.6-sol",
    api_base="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# RAG queries automatically benefit from 75% prompt caching on document chunks`,
    },
    codeExample: {
      language: 'Python',
      code: `from llama_index.core import VectorStoreIndex, SimpleDirectoryReader
from llama_index.llms.openai import OpenAI
from llama_index.core import Settings

Settings.llm = OpenAI(
    model="gpt-5.6-sol",
    api_base="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

documents = SimpleDirectoryReader("data").load_data()
index = VectorStoreIndex.from_documents(documents)
query_engine = index.as_query_engine()
response = query_engine.query("Summarize the quarterly financial report")`,
    },
    steps: [
      {
        name: 'Install llama-index-llms-openai',
        description: 'Run "pip install llama-index-llms-openai" in your environment.',
      },
      {
        name: 'Configure Settings.llm',
        description: 'Set api_base="https://api.galx.ai/v1" and supply your live developer key.',
      },
      {
        name: 'Execute Vector Queries',
        description: 'Synthesize document chunks with wholesale pricing and sub-15ms Anycast TTFT.',
      },
    ],
    faqs: [
      {
        q: 'Does GALXAI store or train on indexed document chunks?',
        a: 'No. GALXAI guarantees Cryptographic Zero Data Retention (ZDR). Document context is processed in volatile RAM and immediately discarded upon socket termination.',
      },
    ],
  },
  {
    slug: 'crewai',
    name: 'CrewAI & AutoGen',
    category: 'agents',
    badge: 'Multi-Agent Swarms',
    title: 'CrewAI Multi-Agent Swarm Integration Guide with 429 Shield',
    headline: 'Connect CrewAI Multi-Agent Swarms to GALXAI',
    description:
      'Deploy autonomous multi-agent swarms with high concurrency, pooled 429 rate limit protection, and 75% prompt caching on agent system prompts.',
    timeToSetup: 'PT45S',
    envSnippet: `OPENAI_API_BASE=https://api.galx.ai/v1
OPENAI_API_KEY=galx_live_your_gateway_key`,
    configSnippet: {
      filename: 'crew.py',
      language: 'python',
      code: `from crewai import Agent, Crew, Task, Process
from langchain_openai import ChatOpenAI

gateway_llm = ChatOpenAI(
    model="gpt-5.6-sol",
    openai_api_base="https://api.galx.ai/v1",
    openai_api_key="galx_live_your_gateway_key"
)

researcher = Agent(
    role="Principal AI Researcher",
    goal="Extract actionable insights from codebases",
    backstory="You are an expert systems engineer.",
    llm=gateway_llm
)`,
    },
    codeExample: {
      language: 'Python',
      code: `from crewai import Crew, Process

# Assemble Crew with pooled 429 shield protection
crew = Crew(
    agents=[researcher],
    tasks=[task1],
    process=Process.sequential,
    verbose=True
)

result = crew.kickoff()
print(result)`,
    },
    steps: [
      {
        name: 'Install CrewAI',
        description: 'Run "pip install crewai langchain-openai" in your project environment.',
      },
      {
        name: 'Define Gateway LLM Instance',
        description: 'Instantiate ChatOpenAI pointing to "https://api.galx.ai/v1" with your GALXAI key.',
      },
      {
        name: 'Execute Swarm Loops',
        description: 'Run multi-agent collaboration with zero 429 rate-limit stalls and 75% prompt caching savings.',
      },
    ],
    faqs: [
      {
        q: 'Why is GALXAI ideal for multi-agent swarms?',
        a: 'Multi-agent swarms generate heavy concurrent bursts that trigger 429 rate limit stalls on direct provider tiers. GALXAI pools enterprise capacity across Anycast shards, ensuring zero dropped agent loops.',
      },
    ],
  },
];
