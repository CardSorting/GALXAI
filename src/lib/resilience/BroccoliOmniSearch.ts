/**
 * GALXAI: BroccoliDB OmniSearch & Natural Navigation Engine
 * High-performance in-memory semantic indexing for non-technical and power users alike.
 * Indexes routes, plain-English intent phrases, models, error solutions, and recent navigation history.
 */

import { BroccoliDbTable } from '@/core/broccolidb/broccolidb-table';
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
}

const STORAGE_RECENT_NAV_KEY = 'galx_recent_nav_v1';

const DEFAULT_CATALOG_ITEMS: CatalogItem[] = [
  // 1. Navigation & Core Pages
  {
    title: 'Home & Gateway Overview',
    description: 'Wholesale AI compute gateway, live pool liquidity, and featured model routers.',
    category: 'Navigation',
    href: '/',
    shortcutKey: 'G H',
    keywords: ['home', 'landing', 'main', 'start', 'index', 'dashboard', 'rates'],
    intentPhrases: ['go home', 'main page', 'gateway overview', 'what is galxai'],
  },
  {
    title: 'Supported Models & Pricing Catalog',
    description: 'Explore wholesale rates across GPT-5.6 Sol/Terra/Luna and xAI Grok 4.5.',
    category: 'Models & Engines',
    href: '/models',
    shortcutKey: 'G M',
    keywords: ['models', 'pricing', 'catalog', 'gpt', 'grok', 'claude', 'deepseek', 'tokens', 'cost', 'cheap'],
    intentPhrases: ['cheapest model', 'browse models', 'compare pricing', 'discount rates', 'which model is best'],
  },
  {
    title: 'Universal Model Comparison Matrix',
    description: 'Side-by-side benchmark of pricing, context windows, benchmark scores, and caching discounts.',
    category: 'Models & Engines',
    href: '/models/compare',
    shortcutKey: 'G C',
    keywords: ['compare', 'matrix', 'versus', 'benchmarks', 'speed', 'arena', 'diff'],
    intentPhrases: ['compare gpt with grok', 'model benchmark', 'cost comparison table'],
  },
  {
    title: 'Developer Gateway Bearer Keys',
    description: 'Mint, revoke, and manage zero-markup cryptographic API keys with instant rate limiting.',
    category: 'Actions & Tools',
    href: '/keys',
    shortcutKey: 'G K',
    keywords: ['keys', 'api key', 'mint key', 'bearer', 'token', 'secret', 'credentials', 'access'],
    intentPhrases: ['create api key', 'get new key', 'how do i connect cursor', 'api credentials'],
  },
  {
    title: 'Mint New Instant API Key',
    description: '1-click API key minting with $5 complimentary starter compute balance.',
    category: 'Actions & Tools',
    href: '/keys/new',
    keywords: ['new key', 'free credits', 'starter grant', 'sign up', 'claim $5'],
    intentPhrases: ['claim free credits', 'make a new key', 'generate bearer token'],
  },
  {
    title: 'Developer Wallet & Wholesale Billing',
    description: 'Top up compute balance, configure auto-reload, view transparent invoices, and export CSVs.',
    category: 'Navigation',
    href: '/billing',
    shortcutKey: 'G B',
    keywords: ['billing', 'wallet', 'deposit', 'funds', 'receipt', 'invoice', 'credit card', 'stripe', 'crypto', 'balance'],
    intentPhrases: ['add funds', 'how do i pay', 'top up wallet', 'where is my invoice', 'billing receipt', 'check balance'],
  },
  {
    title: 'Live System Status & 99.99% SLA Uptime',
    description: 'Real-time multi-region health checks, p50/p90/p99 edge latency probes, and circuit states.',
    category: 'Help & Diagnostics',
    href: '/status',
    shortcutKey: 'G S',
    keywords: ['status', 'uptime', 'sla', 'health', 'ping', 'latency', 'incident', 'down', 'slow', 'offline'],
    intentPhrases: ['is the api down', 'check latency', 'service health', 'system operational status'],
  },
  {
    title: 'Asynchronous Requests & Queue Governor',
    description: 'Inspect execution leases, priority fair-share queues, and batch agent pipelines.',
    category: 'Navigation',
    href: '/queues',
    shortcutKey: 'G Q',
    keywords: ['queues', 'async', 'batch', 'background', 'priority', 'rate limit', 'buffer'],
    intentPhrases: ['view request queue', 'batch processing', 'off-peak yield'],
  },
  {
    title: 'Interactive API Sandbox & Playground',
    description: 'Test chat completions, image synthesis, and prompt caching with live token telemetry.',
    category: 'Actions & Tools',
    href: '/playground',
    shortcutKey: 'G P',
    keywords: ['playground', 'sandbox', 'test', 'try', 'chat', 'curl', 'code snippets', 'demo'],
    intentPhrases: ['test prompts', 'try models live', 'copy python snippet', 'sandbox test'],
  },

  // 2. Documentation Hub & Deep Dives
  {
    title: 'Documentation & Developer Guides',
    description: 'Comprehensive guides for SDKs, structured outputs, prompt caching, and multi-agent loops.',
    category: 'Documentation',
    href: '/docs',
    shortcutKey: 'G D',
    keywords: ['docs', 'documentation', 'learn', 'guide', 'tutorial', 'manual', 'help', 'instructions'],
    intentPhrases: ['how to use api', 'integration guides', 'documentation home'],
  },
  {
    title: 'Plain English Guide (Zero Jargon)',
    description: 'Simple explanation of tokens, API keys, wholesale discounts, and setup for non-technical users.',
    category: 'Documentation',
    href: '/docs/simple',
    badge: 'Beginner Friendly',
    keywords: ['simple', 'plain english', 'beginner', 'non-technical', 'explained', 'easy', 'no code'],
    intentPhrases: ['explain tokens like im five', 'what is an api key', 'simple guide for beginners'],
  },
  {
    title: '1-Click Zero-Code Migration Guide',
    description: 'Switch from OpenAI, OpenRouter, LiteLLM, or Bedrock by changing only your baseUrl and key.',
    category: 'Documentation',
    href: '/docs/migration',
    keywords: ['migration', 'switch', 'drop-in', 'openai replacement', 'openrouter alternative', 'litellm', 'langchain'],
    intentPhrases: ['how to migrate from openai', 'switch from openrouter', 'drop-in replacement'],
  },
  {
    title: 'Cursor, Windsurf & IDE Setup',
    description: 'Configure your favorite AI editor with sub-15ms Time-To-First-Token in under 60 seconds.',
    category: 'Documentation',
    href: '/docs/ide-setup',
    keywords: ['cursor', 'windsurf', 'continue', 'vscode', 'ide', 'editor', 'setup', 'copilot'],
    intentPhrases: ['configure cursor ide', 'use galxai in windsurf', 'ide api settings'],
  },
  {
    title: '75% Automated Prompt Caching Guide',
    description: 'Learn how prefix matching over 1,024 tokens automatically saves 75% on repetitive system prompts.',
    category: 'Documentation',
    href: '/docs/prompt-caching',
    keywords: ['caching', 'prompt caching', 'rebate', 'discount', 'system prompt', 'long context', 'savings'],
    intentPhrases: ['how does prompt caching work', 'save money on system prompts', '75% discount'],
  },
  {
    title: 'Guaranteed JSON Structured Outputs',
    description: 'Constrained decoding grammar enforcing 100% adherence to complex Zod / JSON schemas.',
    category: 'Documentation',
    href: '/docs/structured-outputs',
    keywords: ['structured outputs', 'json', 'zod', 'schema', 'pydantic', 'typesafe', 'parsing'],
    intentPhrases: ['guaranteed json', 'how to return json', 'type safe response'],
  },
  {
    title: 'AI Multi-Agent Swarms Architecture',
    description: 'High-concurrency streaming infrastructure engineered for autonomous agent fleets.',
    category: 'Documentation',
    href: '/docs/agents',
    keywords: ['agents', 'swarms', 'multi-agent', 'concurrency', 'autonomous', 'crewai', 'autogen'],
    intentPhrases: ['how to run agent swarms', 'multi agent fleet', 'high concurrency agents'],
  },
  {
    title: 'Error Codes & Exponential Backoff Guide',
    description: 'Troubleshoot HTTP 429, 502, 503, and understand the 4-state circuit breaker failover.',
    category: 'Help & Diagnostics',
    href: '/docs/error-handling',
    keywords: ['errors', 'troubleshoot', '429', '502', '503', '504', 'timeout', 'retry', 'circuit breaker', 'failover'],
    intentPhrases: ['why am i getting 429 rate limit', 'fix api connection error', 'how to handle errors'],
  },

  // 3. Grants & Growth
  {
    title: 'Scale & Builder Acceleration Grants',
    description: 'Claim up to $2,500 in matching compute credits for production workloads and startups.',
    category: 'Actions & Tools',
    href: '/grants',
    badge: 'Up to $2,500 Match',
    keywords: ['grants', 'credits', 'free money', 'startup', 'subsidy', 'funding', 'accelerator'],
    intentPhrases: ['apply for grants', 'free compute credits', 'startup discount'],
  },
  {
    title: 'Frequently Asked Questions (FAQ)',
    description: 'Transparent answers on zero data retention, latency SLA, uptime guarantees, and crypto payments.',
    category: 'Help & Diagnostics',
    href: '/faq',
    shortcutKey: 'G F',
    keywords: ['faq', 'questions', 'support', 'help', 'privacy', 'data retention', 'compliance', 'security'],
    intentPhrases: ['do you log prompts', 'is my data safe', 'where are servers located', 'faq answers'],
  },
];

class BroccoliOmniSearchImpl {
  private static instance: BroccoliOmniSearchImpl | null = null;
  private searchTable: BroccoliDbTable<OmniSearchItem>;
  private recentTable: BroccoliDbTable<RecentNavItem>;

  private constructor() {
    this.searchTable = new BroccoliDbTable<OmniSearchItem>('galx_omnisearch_catalog');
    this.searchTable.createIndex('category');
    this.searchTable.createIndex('href');

    this.recentTable = new BroccoliDbTable<RecentNavItem>('galx_recent_nav_history');
    this.recentTable.createSortedIndex('timestamp');

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
    DEFAULT_CATALOG_ITEMS.forEach((item, index) => {
      const id = `item_${index}_${item.href.replace(/[^a-zA-Z0-9]/g, '_')}`;
      this.searchTable.put(id, {
        id,
        ...item,
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
          this.recentTable.put(r.href, r);
        }
      }
    } catch {}
  }

  private persistRecentNav(): void {
    try {
      const all = this.recentTable.query({
        sortBy: 'timestamp',
        sortOrder: 'desc',
        limit: 10,
      });
      SafeStorage.setItem(STORAGE_RECENT_NAV_KEY, JSON.stringify(all));
    } catch {}
  }

  public recordVisit(title: string, href: string, category: string = 'Navigation'): void {
    const item: RecentNavItem = {
      id: href,
      title,
      href,
      category,
      timestamp: Date.now(),
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
   * Deterministic Natural Query Fuzzy Search:
   * Scores items based on exact title match, keyword inclusion, intent phrase similarity, and description matching.
   */
  public search(query: string, limit = 8): OmniSearchItem[] {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Return default top recommended items
      return [...this.searchTable.query({ limit })];
    }

    const words = q.split(/\s+/).filter(Boolean);
    const allItems = this.searchTable.getAll();

    const scored = allItems.map((item: OmniSearchItem) => {
      let score = 0;
      const titleLower = item.title.toLowerCase();
      const descLower = item.description.toLowerCase();

      // Exact title match gets highest score
      if (titleLower === q) score += 100;
      else if (titleLower.startsWith(q)) score += 50;
      else if (titleLower.includes(q)) score += 30;

      // Intent phrases matching (e.g. "how do i buy credits" matching "how do i pay")
      for (const phrase of item.intentPhrases || []) {
        const pLower = phrase.toLowerCase();
        if (pLower === q) score += 80;
        else if (pLower.includes(q) || q.includes(pLower)) score += 40;
        else {
          const matchCount = words.filter((w) => pLower.includes(w)).length;
          if (matchCount > 0) score += matchCount * 15;
        }
      }

      // Keyword matching
      for (const kw of item.keywords || []) {
        const kwLower = kw.toLowerCase();
        if (kwLower === q) score += 40;
        else if (kwLower.includes(q)) score += 20;
        else if (words.some((w) => kwLower.includes(w))) score += 10;
      }

      // Description matching
      if (descLower.includes(q)) score += 10;
      else {
        const descMatchCount = words.filter((w) => descLower.includes(w)).length;
        score += descMatchCount * 4;
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
