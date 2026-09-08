/**
 * GALXAI: BroccoliDB OmniSearch & Natural Navigation Engine
 * High-performance in-memory semantic indexing for non-technical and power users alike.
 * Indexes routes, plain-English intent phrases, models, error solutions, actionable code dispatchers,
 * and frequency-weighted navigation history.
 * Backed by BroccoliDB L1 reactive tables with secondary indexing, fuzzy typo tolerance, and predictive prefetching.
 */

import { BroccoliDbTable } from '@/core/broccolidb/broccolidb-table';
import { FRONTEND_VISIBLE_MODELS } from '@/core/router/PublicModelCatalog';
import { COOKBOOK_RECIPES_DATA } from '@/lib/data/cookbooksData';
import { ERROR_TROUBLESHOOT_DATA } from '@/lib/data/errorsData';
import { COMPETITOR_ALTERNATIVES } from '@/lib/data/alternativesData';
import { SOLUTION_GUIDES } from '@/lib/data/solutionsData';
import { MIGRATION_GUIDES_DATA } from '@/lib/data/migrationData';
import { SECURITY_PATTERNS_DATA } from '@/lib/data/securityPatternsData';
import { GLOSSARY_TERMS } from '@/lib/data/glossaryData';
import { CAPABILITIES_DATA } from '@/lib/data/capabilitiesData';
import { SafeStorage } from './SafeStorage';


export interface CatalogItem {
  title: string;
  description: string;
  category: 'Navigation' | 'Models & Engines' | 'Documentation' | 'Actions & Tools' | 'Help & Diagnostics' | 'Recent';
  href: string;
  keywords: string[];
  intentPhrases: string[];
  shortcutKey?: string;
  iconName?: string;
  badge?: string;
  modelId?: string;
  pricePer1M?: number;
  actionType?: 'copy_curl' | 'copy_python' | 'copy_ts' | 'copy_key' | 'navigate';
  actionData?: string;
}

export interface OmniSearchItem extends CatalogItem, Record<string, unknown> {
  id: string;
}

export interface RecentNavItem extends Record<string, unknown> {
  id: string;
  title: string;
  href: string;
  category: string;
  timestamp: number;
  visitCount: number;
}

const STORAGE_RECENT_NAV_KEY = 'galx_recent_nav_v1';

/**
 * Calculates Levenshtein distance between two strings for fuzzy typo matching.
 */
export function calculateLevenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculates Soundex phonetic hash code for non-technical phonetic spelling absorption.
 */
export function calculateSoundex(s: string): string {
  if (!s) return '';
  let clean = s.toUpperCase().replace(/[^A-Z]/g, '');
  if (!clean) return '';

  // Phonetic normalization for English phonetic variants
  clean = clean
    .replace(/^PH/, 'F')
    .replace(/^KN/, 'N')
    .replace(/^GN/, 'N')
    .replace(/^WR/, 'R')
    .replace(/^K/, 'C');

  const mapping: Record<string, string> = {
    B: '1', F: '1', P: '1', V: '1',
    C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
    D: '3', T: '3',
    L: '4',
    M: '5', N: '5',
    R: '6',
  };

  const firstChar = clean[0];
  let res = firstChar;
  let prevCode = mapping[firstChar] || '';

  for (let i = 1; i < clean.length; i++) {
    const code = mapping[clean[i]] || '';
    if (code && code !== prevCode) {
      res += code;
      if (res.length === 4) break;
    }
    prevCode = code;
  }

  return (res + '0000').slice(0, 4);
}

const ACRONYM_MAP: Record<string, string> = {
  gpt: '/models',
  ide: '/docs/ide-setup',
  zdr: '/compliance',
  sla: '/status',
  faq: '/faq',
  sdk: '/docs',
  api: '/keys',
  key: '/keys',
  ui: '/playground',
  tax: '/billing/invoices',
  sub: '/queues',
  bpe: '/docs/prompt-caching',
  pci: '/compliance',
  vat: '/billing/invoices',
  usd: '/billing',
  llm: '/models',
};

const BASE_CATALOG_ITEMS: CatalogItem[] = [
  // 1. Navigation & Core Pages
  {
    title: 'Home & Gateway Overview',
    description: 'Wholesale AI compute gateway, live pool liquidity, and featured model routers.',
    category: 'Navigation',
    href: '/',
    shortcutKey: 'G H',
    keywords: ['home', 'landing', 'main', 'start', 'index', 'dashboard', 'rates', 'overview'],
    intentPhrases: ['go home', 'main page', 'gateway overview', 'what is galxai', 'start here', 'home screen'],
  },
  {
    title: 'Supported Models & Pricing Catalog',
    description: 'Explore wholesale rates across GPT-5.6 Sol, Terra, and Luna.',
    category: 'Models & Engines',
    href: '/models',
    shortcutKey: 'G M',
    keywords: ['models', 'pricing', 'catalog', 'gpt', 'openai', 'sol', 'terra', 'luna', 'tokens', 'cost', 'cheap', 'rates'],
    intentPhrases: ['cheapest model', 'browse models', 'compare pricing', 'discount rates', 'which model is best', 'lowest cost', 'model list'],
  },
  {
    title: 'Wholesale Pricing & Calculator',
    description: 'Calculate 25%–40% wholesale savings and compare prompt caching discounts.',
    category: 'Navigation',
    href: '/pricing',
    keywords: ['pricing', 'cost', 'rates', 'wholesale', 'savings', 'calculator', 'cheap', 'budget', 'roi'],
    intentPhrases: ['how much does it cost', 'pricing calculator', 'wholesale rates', 'check prices', 'estimate token cost'],
  },
  {
    title: 'Universal Model Comparison Matrix',
    description: 'Side-by-side benchmark of pricing, context windows, benchmark scores, and caching discounts.',
    category: 'Models & Engines',
    href: '/models/compare',
    shortcutKey: 'G C',
    keywords: ['compare', 'matrix', 'versus', 'benchmarks', 'speed', 'arena', 'diff', 'side by side'],
    intentPhrases: ['compare gpt models', 'model benchmark', 'cost comparison table', 'difference between models', 'which model is faster'],
  },
  {
    title: 'Developer Gateway API Keys',
    description: 'Create, revoke, and manage zero-markup cryptographic API keys with instant rate limiting.',
    category: 'Actions & Tools',
    href: '/keys',
    shortcutKey: 'G K',
    keywords: ['keys', 'api key', 'create key', 'bearer', 'token', 'secret', 'credentials', 'access', 'auth'],
    intentPhrases: ['create api key', 'get new key', 'how do i connect cursor', 'api credentials', 'view my keys', 'manage tokens'],
  },

  {
    title: 'Developer Wallet & Wholesale Billing',
    description: 'Top up compute balance, configure auto-reload, view transparent invoices, and export CSVs.',
    category: 'Navigation',
    href: '/billing',
    shortcutKey: 'G B',
    keywords: ['billing', 'wallet', 'deposit', 'funds', 'receipt', 'invoice', 'credit card', 'stripe', 'crypto', 'balance', 'pay', 'usdt', 'btc', 'solana'],
    intentPhrases: ['add funds', 'how do i pay', 'top up wallet', 'where is my invoice', 'billing receipt', 'check balance', 'deposit money', 'add credit card', 'can i pay with crypto', 'usdt deposit', 'bitcoin payment', 'solana compute', 'minimum deposit', 'how to check remaining balance'],
  },
  {
    title: 'Business Tax Invoices & Receipts',
    description: 'Download corporate PDF invoices, tax breakdowns, and automated accounting receipts.',
    category: 'Documentation',
    href: '/billing/invoices',
    keywords: ['invoice', 'receipt', 'tax', 'pdf', 'bills', 'accounting', 'vat', 'expenses'],
    intentPhrases: ['where is my invoice', 'download tax receipt', 'billing invoice pdf', 'accounting receipt', 'corporate invoice', 'vat invoice'],
  },
  {
    title: 'Live System Status & Operational Health',
    description: 'Real-time multi-region health checks, p50/p90/p99 edge latency probes, and circuit states.',
    category: 'Help & Diagnostics',
    href: '/status',
    shortcutKey: 'G S',
    keywords: ['status', 'uptime', 'health', 'ping', 'latency', 'incident', 'down', 'slow', 'offline', 'operational', 'history'],
    intentPhrases: ['is the api down', 'check latency', 'service health', 'system operational status', 'why is it slow', 'is galxai working', 'historical uptime'],
  },
  {
    title: 'Asynchronous Requests & Queue Governor',
    description: 'Inspect execution leases, priority fair-share queues, and batch agent pipelines.',
    category: 'Navigation',
    href: '/queues',
    shortcutKey: 'G Q',
    keywords: ['queues', 'async', 'batch', 'background', 'priority', 'rate limit', 'buffer', 'tasks', 'jobs', 'results'],
    intentPhrases: ['view request queue', 'batch processing', 'off-peak yield', 'async background tasks', 'check task status', 'queued requests'],
  },
  {
    title: 'Interactive API Sandbox & Playground',
    description: 'Test chat completions, image synthesis, and prompt caching with live token telemetry.',
    category: 'Actions & Tools',
    href: '/playground',
    shortcutKey: 'G P',
    keywords: ['playground', 'sandbox', 'test', 'try', 'chat', 'curl', 'code snippets', 'demo', 'experiment'],
    intentPhrases: ['test prompts', 'try models live', 'copy python snippet', 'sandbox test', 'run prompt test', 'interactive chat', 'live api tester'],
  },

  // 2. Action Dispatchers (Raycast / Linear Style)
  {
    title: 'Quick Action: Copy cURL Request Snippet',
    description: 'Instant drop-in bash cURL completion snippet with OpenAI compatibility.',
    category: 'Actions & Tools',
    href: '/playground',
    badge: 'Quick Action',
    keywords: ['curl', 'bash', 'terminal', 'copy curl', 'snippet', 'cli', 'request'],
    intentPhrases: ['copy curl', 'curl snippet', 'how to curl galxai', 'terminal command', 'curl request'],
    actionType: 'copy_curl',
    actionData: `curl https://galx.ai/v1/chat/completions \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer $GALX_API_KEY" \\\n  -d '{"model": "gpt-5.6-sol", "messages": [{"role": "user", "content": "Hello GALXAI"}]}'`
  },
  {
    title: 'Quick Action: Copy Python SDK Snippet',
    description: '1-line drop-in OpenAI Python SDK client code configured to galx.ai/v1.',
    category: 'Actions & Tools',
    href: '/docs',
    badge: 'Quick Action',
    keywords: ['python', 'pip', 'openai python', 'copy python', 'sdk', 'code'],
    intentPhrases: ['copy python', 'python code snippet', 'how to use python sdk', 'python client'],
    actionType: 'copy_python',
    actionData: `from openai import OpenAI\n\nclient = OpenAI(base_url="https://galx.ai/v1", api_key="galx_live_your_key")\nresponse = client.chat.completions.create(model="gpt-5.6-sol", messages=[{"role": "user", "content": "Hello"}])\nprint(response.choices[0].message.content)`
  },
  {
    title: 'Quick Action: Copy TypeScript / Node SDK Snippet',
    description: '1-line drop-in OpenAI Node.js SDK client code with type safety.',
    category: 'Actions & Tools',
    href: '/docs',
    badge: 'Quick Action',
    keywords: ['typescript', 'javascript', 'node', 'npm', 'copy typescript', 'sdk'],
    intentPhrases: ['copy typescript', 'nodejs code snippet', 'typescript client', 'javascript sdk'],
    actionType: 'copy_ts',
    actionData: `import OpenAI from "openai";\n\nconst client = new OpenAI({ baseURL: "https://galx.ai/v1", apiKey: process.env.GALX_API_KEY });\nconst res = await client.chat.completions.create({ model: "gpt-5.6-sol", messages: [{ role: "user", content: "Hello" }] });\nconsole.log(res.choices[0].message.content);`
  },

  // 3. Documentation Hub & Deep Dives
  {
    title: 'Documentation & Developer Guides',
    description: 'Comprehensive guides for SDKs, structured outputs, prompt caching, and multi-agent loops.',
    category: 'Documentation',
    href: '/docs',
    shortcutKey: 'G D',
    keywords: ['docs', 'documentation', 'learn', 'guide', 'tutorial', 'manual', 'help', 'instructions', 'sdk', 'endpoint', 'base url'],
    intentPhrases: ['how to use api', 'integration guides', 'documentation home', 'sdk cheatsheet', 'getting started docs', 'what is the base url', 'api endpoint'],
  },
  {
    title: 'Plain English Guide (Zero Jargon)',
    description: 'Simple explanation of tokens, API keys, wholesale discounts, and setup for non-technical users.',
    category: 'Documentation',
    href: '/docs/simple',
    badge: 'Beginner Friendly',
    keywords: ['simple', 'plain english', 'beginner', 'non-technical', 'explained', 'easy', 'no code', 'tutorial'],
    intentPhrases: ['explain tokens like im five', 'what is an api key', 'simple guide for beginners', 'no code explanation', 'how does this work', 'is there a free tier'],
  },
  {
    title: '1-Click Zero-Code Migration Guide',
    description: 'Switch from OpenAI, OpenRouter, LiteLLM, or Bedrock by changing only your baseUrl and key.',
    category: 'Documentation',
    href: '/docs/migration',
    keywords: ['migration', 'switch', 'drop-in', 'openai replacement', 'openrouter alternative', 'litellm', 'langchain'],
    intentPhrases: ['how to migrate from openai', 'switch from openrouter', 'drop-in replacement', 'replace openrouter', 'change base url'],
  },
  {
    title: 'Cursor, Windsurf & IDE Setup',
    description: 'Configure your favorite AI editor with sub-15ms Time-To-First-Token in under 60 seconds.',
    category: 'Documentation',
    href: '/docs/ide-setup',
    keywords: ['cursor', 'windsurf', 'continue', 'vscode', 'ide', 'editor', 'setup', 'copilot'],
    intentPhrases: ['configure cursor ide', 'use galxai in windsurf', 'ide api settings', 'vscode setup', 'continue dev setup', 'windsurf base url', 'cursor api base url'],
  },
  {
    title: '75% Automated Prompt Caching Guide',
    description: 'Learn how prefix matching over 1,024 tokens automatically saves 75% on repetitive system prompts.',
    category: 'Documentation',
    href: '/docs/prompt-caching',
    badge: '75% Discount',
    keywords: ['caching', 'prompt caching', 'rebate', 'discount', 'system prompt', 'long context', 'savings'],
    intentPhrases: ['how does prompt caching work', 'save money on system prompts', '75% discount', 'cache prefix discount'],
  },
  {
    title: 'Guaranteed JSON Structured Outputs',
    description: 'Constrained decoding grammar enforcing 100% adherence to complex Zod / JSON schemas.',
    category: 'Documentation',
    href: '/docs/structured-outputs',
    keywords: ['structured outputs', 'json', 'zod', 'schema', 'pydantic', 'typesafe', 'parsing'],
    intentPhrases: ['guaranteed json', 'how to return json', 'type safe response', 'zod schema parsing', 'structured output'],
  },
  {
    title: 'AI Multi-Agent Swarms Architecture',
    description: 'High-concurrency streaming infrastructure engineered for autonomous agent fleets.',
    category: 'Documentation',
    href: '/docs/agents',
    keywords: ['agents', 'swarms', 'multi-agent', 'concurrency', 'autonomous', 'crewai', 'autogen', 'langchain', 'llamaindex'],
    intentPhrases: ['how to run agent swarms', 'multi agent fleet', 'high concurrency agents', 'crewai integration', 'how to setup langchain', 'llamaindex agent', 'autogen agents'],
  },
  {
    title: 'Error Codes & Exponential Backoff Guide',
    description: 'Troubleshoot HTTP 429, 502, 503, and understand the 4-state circuit breaker failover.',
    category: 'Help & Diagnostics',
    href: '/docs/error-handling',
    keywords: ['errors', 'troubleshoot', '429', '502', '503', '504', 'timeout', 'retry', 'circuit breaker', 'failover'],
    intentPhrases: ['why am i getting 429 rate limit', 'fix api connection error', 'how to handle errors', 'rate limit exceeded', 'server error 502', 'i got rate limited 429 what should i do'],
  },

  // 4. Security, Grants & Growth
  {
    title: 'SOC2 Type II, HIPAA & Zero Retention (ZDR)',
    description: 'Cryptographic proof of ephemeral memory zeroization, SOC2 compliance, and HIPAA BAA safeguards.',
    category: 'Help & Diagnostics',
    href: '/compliance',
    badge: 'SOC2 & HIPAA',
    keywords: ['compliance', 'soc2', 'hipaa', 'gdpr', 'zdr', 'zero data retention', 'privacy', 'security', 'dpa', 'encryption'],
    intentPhrases: ['do you log prompts', 'is my data safe', 'hipaa compliance', 'zero retention proof', 'soc2 report', 'security policy'],
  },
  {
    title: 'Scale & Builder Acceleration Grants',
    description: 'Claim up to $2,500 in matching compute credits for production workloads and startups.',
    category: 'Actions & Tools',
    href: '/grants',
    badge: 'Up to $2,500 Match',
    keywords: ['grants', 'credits', 'free money', 'startup', 'subsidy', 'funding', 'accelerator', 'match'],
    intentPhrases: ['apply for grants', 'free compute credits', 'startup discount', 'accelerator grant', 'credit matching'],
  },
  {
    title: 'Frequently Asked Questions (FAQ)',
    description: 'Transparent answers on zero data retention, latency SLA, uptime guarantees, and crypto payments.',
    category: 'Help & Diagnostics',
    href: '/faq',
    shortcutKey: 'G F',
    keywords: ['faq', 'questions', 'support', 'help', 'privacy', 'data retention', 'compliance', 'security', 'refund', 'cancel'],
    intentPhrases: ['do you log prompts', 'is my data safe', 'where are servers located', 'faq answers', 'how to contact support', 'how do refunds work', 'how to cancel', 'refund policy'],
  },
];

class BroccoliOmniSearchImpl {
  private static instance: BroccoliOmniSearchImpl | null = null;
  private searchTable: BroccoliDbTable<OmniSearchItem>;
  private recentTable: BroccoliDbTable<RecentNavItem>;
  private prefetchedRoutes = new Set<string>();

  private constructor() {
    this.searchTable = new BroccoliDbTable<OmniSearchItem>('galx_omnisearch_catalog');
    this.searchTable.createIndex('category');
    this.searchTable.createIndex('href');
    this.searchTable.createIndex('modelId');

    this.recentTable = new BroccoliDbTable<RecentNavItem>('galx_recent_nav_history');
    this.recentTable.createSortedIndex('timestamp');
    this.recentTable.createSortedIndex('visitCount');

    this.seedCatalog();
    if (typeof window !== 'undefined') {
      this.hydrateRecentNav();
    }
  }

  public static getInstance(): BroccoliOmniSearchImpl {
    if (!BroccoliOmniSearchImpl.instance) {
      BroccoliOmniSearchImpl.instance = new BroccoliOmniSearchImpl();
    }
    return BroccoliOmniSearchImpl.instance;
  }

  private seedCatalog(): void {
    // 1. Seed base platform catalog
    BASE_CATALOG_ITEMS.forEach((item, index) => {
      const id = `item_${index}_${item.href.replace(/[^a-zA-Z0-9]/g, '_')}`;
      this.searchTable.put(id, {
        id,
        ...item,
      });
    });

    // 2. Dynamically index frontend visible models from FRONTEND_VISIBLE_MODELS
    FRONTEND_VISIBLE_MODELS.forEach((model) => {
      const modelId = `model_${model.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const item: CatalogItem = {
        title: `${model.name} (${model.id})`,
        description: `${model.description} • $${model.inputPricePer1M.toFixed(2)}/1M input • ${model.contextWindowTokens / 1000}K ctx • -${model.discountPercentage}% Wholesale`,
        category: 'Models & Engines',
        href: `/models/${model.id.replace('/', '-')}`,
        modelId: model.id,
        pricePer1M: model.inputPricePer1M,
        badge: `-${model.discountPercentage}% OFF`,
        keywords: [
          model.id,
          model.name.toLowerCase(),
          model.provider,
          'model',
          'engine',
          'ai',
          'openai',
          'gpt',
          'sota'
        ],
        intentPhrases: [
          `use ${model.name.toLowerCase()}`,
          `run ${model.id}`,
          `pricing for ${model.name.toLowerCase()}`,
          `${model.id} specs`,
        ],
      };

      this.searchTable.put(modelId, {
        id: modelId,
        ...item,
      });
    });

    // 3. Dynamically index Interactive Developer Tools
    const interactiveTools: CatalogItem[] = [
      {
        title: 'Enterprise LLM ROI & Token Budget Calculator',
        description: 'Interactive financial modeling tool for enterprise AI inference costs, DAU scale forecasting, and compound 75% prompt caching savings.',
        category: 'Actions & Tools',
        href: '/tools/roi-calculator',
        badge: 'Interactive Tool',
        keywords: ['roi', 'calculator', 'token budget', 'savings', 'forecast', 'finance', 'caching rebate'],
        intentPhrases: ['calculate roi', 'llm token budget calculator', 'estimate enterprise cost', 'prompt cache math'],
      },
      {
        title: 'AI Token Streaming & Speed Benchmark Simulator',
        description: 'Interactive real-time Server-Sent Events (SSE) token generation velocity and Time-To-First-Token (TTFT) benchmark simulator across OpenAI Codex GPT-5.6.',
        category: 'Actions & Tools',
        href: '/tools/stream-benchmark',
        badge: 'Interactive Tool',
        keywords: ['stream', 'benchmark', 'speed', 'ttft', 'tokens per second', 'sse', 'velocity'],
        intentPhrases: ['test streaming speed', 'benchmark ttft', 'token velocity simulator', 'sse tester'],
      },
      {
        title: '1,000,000 Token Context Window Capacity Visualizer',
        description: 'Interactive 1,000,000 token context window simulator and prompt caching calculator for OpenAI Codex GPT-5.6.',
        category: 'Actions & Tools',
        href: '/tools/context-window-visualizer',
        badge: 'Interactive Tool',
        keywords: ['context window', '1m tokens', 'visualizer', 'capacity', 'ast lines', 'caching visualizer'],
        intentPhrases: ['visualize 1m context', 'context window visualizer', 'how many tokens in document'],
      },
      {
        title: 'OpenAI Token Counter & BPE Tokenizer Studio',
        description: 'Interactive Byte-Pair Encoding (BPE) subword visualizer and token counter for o200k_base and cl100k_base vocabularies.',
        category: 'Actions & Tools',
        href: '/tools/token-counter',
        badge: 'Interactive Tool',
        keywords: ['token counter', 'bpe', 'tokenizer', 'o200k', 'cl100k', 'subwords', 'count tokens'],
        intentPhrases: ['count my tokens', 'tokenizer studio', 'bpe token counter', 'how many tokens is this text'],
      },
      {
        title: 'Anycast Latency & Time-To-First-Token (TTFT) Estimator',
        description: 'Interactive streaming latency and TTFT simulator across Anycast Edge vs Single-Origin routing.',
        category: 'Actions & Tools',
        href: '/tools/latency-estimator',
        badge: 'Interactive Tool',
        keywords: ['latency', 'ttft', 'estimator', 'anycast', 'edge', 'tls handshake', 'ping'],
        intentPhrases: ['estimate latency', 'ttft simulator', 'how fast is anycast routing'],
      },
      {
        title: 'Prompt Compressor & System Instruction Optimizer',
        description: 'Lexical redundancy reduction engine preserving instruction semantics and reducing token spend.',
        category: 'Actions & Tools',
        href: '/tools/prompt-compressor',
        badge: 'Interactive Tool',
        keywords: ['compress prompt', 'optimizer', 'reduce tokens', 'prompt compressor', 'system prompt'],
        intentPhrases: ['compress my prompt', 'reduce token usage in system prompt', 'optimize prompt length'],
      },
      {
        title: 'Compound Prompt Caching Rebate Calculator',
        description: 'Calculate exact compound savings from 75% cached prefix pass-through across repetitive agent prompts.',
        category: 'Actions & Tools',
        href: '/tools/prompt-caching-calculator',
        badge: 'Interactive Tool',
        keywords: ['prompt caching calculator', 'rebate calculator', '75% discount', 'cache savings'],
        intentPhrases: ['calculate prompt caching savings', 'cache rebate calculator'],
      },
      {
        title: 'Wholesale Model Cost Comparator',
        description: 'Side-by-side pricing matrix comparing GALXAI wholesale rates against direct OpenAI and competitor pricing.',
        category: 'Actions & Tools',
        href: '/tools/model-cost-comparator',
        badge: 'Interactive Tool',
        keywords: ['cost comparator', 'compare prices', 'wholesale comparator', 'cheapest llm'],
        intentPhrases: ['compare model costs', 'who has cheapest gpt 5', 'model cost comparator'],
      },
    ];

    interactiveTools.forEach((tool, idx) => {
      const id = `tool_${idx}_${tool.href.replace(/[^a-zA-Z0-9]/g, '_')}`;
      this.searchTable.put(id, { id, ...tool });
    });

    // 4. Dynamically index Cookbooks
    COOKBOOK_RECIPES_DATA.forEach((c) => {
      const id = `cookbook_${c.slug}`;
      this.searchTable.put(id, {
        id,
        title: c.title,
        description: c.description,
        category: 'Documentation',
        href: `/cookbook/${c.slug}`,
        badge: `${c.difficulty.toUpperCase()} • ${(c.primaryLanguage || 'TypeScript').toUpperCase()}`,
        keywords: ['cookbook', 'recipe', 'code', (c.primaryLanguage || 'typescript').toLowerCase(), c.category.toLowerCase(), c.difficulty.toLowerCase()],
        intentPhrases: [`how to ${c.title.toLowerCase()}`, `code for ${c.title.toLowerCase()}`, c.slug],
      });
    });

    // 5. Dynamically index Error Runbooks
    ERROR_TROUBLESHOOT_DATA.forEach((e) => {
      const id = `error_${e.code}`;
      this.searchTable.put(id, {
        id,
        title: `Fix HTTP ${e.httpStatus} (${e.code})`,
        description: e.description,
        category: 'Help & Diagnostics',
        href: `/docs/errors/${e.code}`,
        badge: `HTTP ${e.httpStatus}`,
        keywords: ['error', 'fix', `${e.httpStatus}`, e.code, 'troubleshoot', 'failover'],
        intentPhrases: [`fix ${e.code}`, `how to resolve http ${e.httpStatus}`, `error ${e.code} troubleshooting`],
      });
    });

    // 6. Dynamically index Competitor Alternatives
    COMPETITOR_ALTERNATIVES.forEach((a) => {
      const id = `alt_${a.slug}`;
      this.searchTable.put(id, {
        id,
        title: a.headline,
        description: a.description,
        category: 'Documentation',
        href: `/alternatives/${a.slug}`,
        badge: 'Alternative',
        keywords: ['alternative', 'vs', a.competitorName.toLowerCase(), 'switch', 'compare'],
        intentPhrases: [`switch from ${a.competitorName.toLowerCase()}`, `${a.competitorName.toLowerCase()} alternative`, `compare with ${a.competitorName.toLowerCase()}`],
      });
    });

    // 7. Dynamically index Solutions
    SOLUTION_GUIDES.forEach((s) => {
      const id = `sol_${s.slug}`;
      this.searchTable.put(id, {
        id,
        title: s.headline,
        description: s.description,
        category: 'Documentation',
        href: `/solutions/${s.slug}`,
        badge: s.badge || 'Solution',
        keywords: ['solution', s.name.toLowerCase(), s.slug, 'workload', s.targetWorkload.toLowerCase()],
        intentPhrases: [`solution for ${s.name.toLowerCase()}`, s.headline.toLowerCase()],
      });
    });

    // 8. Dynamically index Security Patterns
    SECURITY_PATTERNS_DATA.forEach((p) => {
      const id = `sec_${p.slug}`;
      this.searchTable.put(id, {
        id,
        title: p.headline,
        description: p.description,
        category: 'Help & Diagnostics',
        href: `/security/patterns/${p.slug}`,
        badge: p.badge || 'Security',
        keywords: ['security', 'owasp', (p.owaspLlmMapping || '').toLowerCase(), p.slug, 'red team', 'defense'],
        intentPhrases: [`mitigate ${(p.owaspLlmMapping || '').toLowerCase()}`, `how to defend against ${p.headline.toLowerCase()}`],
      });
    });

    // 9. Dynamically index Glossary Terms
    GLOSSARY_TERMS.forEach((g) => {
      const id = `glossary_${g.slug}`;
      this.searchTable.put(id, {
        id,
        title: `${g.term} — AI Glossary`,
        description: g.shortDefinition,
        category: 'Documentation',
        href: `/glossary/${g.slug}`,
        badge: 'Glossary',
        keywords: ['glossary', 'definition', 'term', g.term.toLowerCase(), g.category],
        intentPhrases: [`what is ${g.term.toLowerCase()}`, `define ${g.term.toLowerCase()}`],
      });
    });
  }

  private hydrateRecentNav(): void {
    try {
      const raw = SafeStorage.getItem(STORAGE_RECENT_NAV_KEY);
      if (!raw) return;
      const recents: RecentNavItem[] = JSON.parse(raw);
      for (const r of recents) {
        if (r && r.href) {
          this.recentTable.put(r.href, {
            ...r,
            visitCount: r.visitCount || 1,
          });
        }
      }
    } catch {}
  }

  private persistRecentNav(): void {
    try {
      const all = this.recentTable.query({
        sortBy: 'timestamp',
        sortOrder: 'desc',
        limit: 15,
      });
      SafeStorage.setItem(STORAGE_RECENT_NAV_KEY, JSON.stringify(all));
    } catch {}
  }

  public recordVisit(title: string, href: string, category: string = 'Navigation'): void {
    const existing = this.recentTable.get(href);
    const item: RecentNavItem = {
      id: href,
      title,
      href,
      category,
      timestamp: Date.now(),
      visitCount: (existing?.visitCount || 0) + 1,
    };
    this.recentTable.put(href, item);
    this.persistRecentNav();
  }

  public getRecentVisits(limit = 4): readonly RecentNavItem[] {
    return this.recentTable.query({
      sortBy: 'timestamp',
      sortOrder: 'desc',
      limit,
    });
  }

  /**
   * Clears recent navigation history in BroccoliDB and SafeStorage.
   */
  public clearRecentVisits(): void {
    const all = this.recentTable.getAll();
    for (const r of all) {
      this.recentTable.delete(r.id);
    }
    SafeStorage.removeItem(STORAGE_RECENT_NAV_KEY);
  }

  /**
   * Generates inline auto-completion suggestions for input hint and Tab-key completion.
   */
  public getAutocompleteSuggestion(query: string): string | null {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return null;

    const allItems = this.searchTable.getAll();
    for (const item of allItems) {
      const titleLower = item.title.toLowerCase();
      if (titleLower.startsWith(q)) {
        return item.title;
      }
      for (const phrase of item.intentPhrases || []) {
        if (phrase.toLowerCase().startsWith(q)) {
          return phrase;
        }
      }
      for (const kw of item.keywords || []) {
        if (kw.toLowerCase().startsWith(q)) {
          return kw;
        }
      }
    }
    return null;
  }

  /**
   * Predictive Route Prefetch Trigger (prevents duplicate prefetch storms).
   */
  public prefetchRoute(href: string): void {
    if (this.prefetchedRoutes.has(href)) return;
    this.prefetchedRoutes.add(href);

    if (typeof window !== 'undefined' && (window as any).__next) {
      try {
        const nextRouter = (window as any).__next?.router;
        if (nextRouter && typeof nextRouter.prefetch === 'function') {
          nextRouter.prefetch(href);
        }
      } catch {}
    }
  }

  /**
   * Deterministic Natural Query Fuzzy Search:
   * Features Levenshtein typo absorption, token inclusion, category prefix filtering,
   * frequency weighting, and intent phrase semantic similarity with zero network roundtrips (<0.05ms).
   */
  public search(query: string, limit = 8): OmniSearchItem[] {
    let rawQ = query.trim().toLowerCase();
    if (!rawQ) {
      return [...this.searchTable.query({ limit })];
    }

    // 1. Resolve Category Prefix Filters (Raycast / VSCode style)
    let categoryFilter: string | null = null;
    if (rawQ.startsWith('>') || rawQ.startsWith('action:')) {
      categoryFilter = 'Actions & Tools';
      rawQ = rawQ.replace(/^(\>|action:)\s*/i, '');
    } else if (rawQ.startsWith('@') || rawQ.startsWith('model:')) {
      categoryFilter = 'Models & Engines';
      rawQ = rawQ.replace(/^(\@|model:)\s*/i, '');
    } else if (rawQ.startsWith('#') || rawQ.startsWith('doc:') || rawQ.startsWith('guide:')) {
      categoryFilter = 'Documentation';
      rawQ = rawQ.replace(/^(\#|doc:|guide:)\s*/i, '');
    } else if (rawQ.startsWith('$') || rawQ.startsWith('billing:') || rawQ.startsWith('pricing:')) {
      categoryFilter = 'Navigation';
      rawQ = rawQ.replace(/^(\$|billing:|pricing:)\s*/i, '');
    } else if (rawQ.startsWith('?') || rawQ.startsWith('help:')) {
      categoryFilter = 'Help & Diagnostics';
      rawQ = rawQ.replace(/^(\?|help:)\s*/i, '');
    }

    const q = rawQ.trim();
    if (!q && categoryFilter) {
      return [...this.searchTable.query({ where: { category: categoryFilter }, limit })];
    }

    const words = q.split(/\s+/).filter(Boolean);
    const allItems = categoryFilter
      ? this.searchTable.query({ where: { category: categoryFilter } })
      : this.searchTable.getAll();

    const scored = allItems.map((item: OmniSearchItem) => {
      let score = 0;
      const titleLower = item.title.toLowerCase();
      const descLower = item.description.toLowerCase();
      const hrefLower = item.href.toLowerCase();

      // 0. Acronym Match (e.g. "gpt", "ide", "zdr", "sla", "faq", "sdk", "api", "tax", "sub")
      if (ACRONYM_MAP[q] && (hrefLower === ACRONYM_MAP[q] || hrefLower.startsWith(ACRONYM_MAP[q]))) {
        score += 190;
      }

      // 1. Exact & Prefix Title Match
      if (titleLower === q) score += 120;
      else if (titleLower.startsWith(q)) score += 60;
      else if (titleLower.includes(q)) score += 35;

      // 2. Direct URL Route Match
      if (hrefLower === q || hrefLower === `/${q}`) score += 90;
      else if (hrefLower.includes(q)) score += 25;

      // 3. Intent Phrases Matching
      for (const phrase of item.intentPhrases || []) {
        const pLower = phrase.toLowerCase();
        if (pLower === q) score += 250;
        else if (pLower.startsWith(q) || q.startsWith(pLower)) score += 180;
        else if (pLower.includes(q) || q.includes(pLower)) score += 140;
        else {
          const matchCount = words.filter((w) => pLower.includes(w)).length;
          if (matchCount > 0) score += matchCount * 30;
          if (matchCount === words.length) score += 60; // all search query words present in intent
        }

        // Fuzzy typo match on intent phrases for non-technical users
        if (q.length >= 4) {
          const dist = calculateLevenshteinDistance(q, pLower.slice(0, q.length));
          if (dist === 1) score += 50;
          else if (dist === 2) score += 25;
        }
      }

      // 4. Keyword & Typo Tolerance Matching
      for (const kw of item.keywords || []) {
        const kwLower = kw.toLowerCase();
        if (kwLower === q) score += 50;
        else if (kwLower.startsWith(q)) score += 25;
        else if (kwLower.includes(q)) score += 15;
        else if (words.some((w) => kwLower.includes(w))) score += 12;

        // Levenshtein typo tolerance on keywords (e.g. "modles" -> "models", "bililng" -> "billing")
        if (q.length >= 4 && kwLower.length >= 4) {
          const dist = calculateLevenshteinDistance(q, kwLower);
          if (dist === 1) score += 40;
          else if (dist === 2 && q.length >= 6) score += 20;
        }

        // Soundex Phonetic matching for non-technical users
        if (q.length >= 3 && kwLower.length >= 3) {
          if (calculateSoundex(q) === calculateSoundex(kwLower)) {
            score += 35;
          }
        }
      }

      // 5. Description Matching
      if (descLower.includes(q)) score += 15;
      else {
        const descMatchCount = words.filter((w) => descLower.includes(w)).length;
        score += descMatchCount * 5;
      }

      // 6. Frequency Recency Boost (from user navigation history)
      const recent = this.recentTable.get(item.href);
      if (recent && recent.visitCount > 0) {
        score += Math.min(25, recent.visitCount * 3);
      }

      return { item, score };
    });

    return scored
      .filter((s: { item: OmniSearchItem; score: number }) => s.score > 0)
      .sort((a: { item: OmniSearchItem; score: number }, b: { item: OmniSearchItem; score: number }) => b.score - a.score)
      .slice(0, limit)
      .map((s: { item: OmniSearchItem; score: number }) => s.item);
  }
}

export const BroccoliOmniSearch = BroccoliOmniSearchImpl.getInstance();
