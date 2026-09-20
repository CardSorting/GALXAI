import { BILLING_PATHS } from '../billing/navigation';
import { BroccoliDbTable } from '@/core/broccolidb/broccolidb-table';
import { SafeStorage } from './SafeStorage';

/**
 * The command palette is a public navigation surface. Keep its catalog limited
 * to current GALX destinations and customer-safe descriptions. Product and
 * operational catalogs belong behind their respective server-side boundaries.
 */

export interface CatalogItem {
  title: string;
  description: string;
  category: 'Navigation' | 'Developer' | 'Documentation' | 'Actions & Tools' | 'Help & Diagnostics' | 'Finance' | 'Support' | 'Recent';
  href: string;
  keywords: string[];
  intentPhrases: string[];
  shortcutKey?: string;
  badge?: string;
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

const ACRONYM_MAP: Record<string, string> = {
  api: '/docs',
  about: '/about',
  docs: '/docs',
  faq: '/faq',
  explore: '/explore',
  images: '/images',
  nova: '/docs',
  pricing: '/pricing',
};

const ALLOWED_RECENT_ROUTE_PREFIXES = [
  '/about', '/docs', '/explore', '/faq', '/images',
  '/knowledge-base', '/keys', '/library', '/pricing', '/privacy', '/queues',
  '/status', '/teams', '/terms', '/billing',
];

function isAllowedRecentHref(href: string): boolean {
  return href === '/' || ALLOWED_RECENT_ROUTE_PREFIXES.some((prefix) => href === prefix || href.startsWith(`${prefix}/`));
}

const BASE_CATALOG_ITEMS: CatalogItem[] = [
  {
    title: 'GALX Images',
    description: 'Create an image and explore what others create.',
    category: 'Navigation',
    href: '/images',
    shortcutKey: 'G I',
    keywords: ['images', 'create', 'creation', 'prompt', 'image studio'],
    intentPhrases: ['make an image', 'create an image', 'open image studio', 'start creating'],
  },
  {
    title: 'Explore creations',
    description: 'Find images created on GALX and your next idea.',
    category: 'Navigation',
    href: '/explore',
    shortcutKey: 'G E',
    keywords: ['explore', 'community', 'gallery', 'creations', 'discover'],
    intentPhrases: ['see creations', 'find inspiration', 'browse images', 'explore the community'],
  },
  {
    title: 'Supported capabilities and documentation',
    description: 'Review API capabilities and integration requirements.',
    category: 'Documentation',
    href: '/docs',
    keywords: ['docs', 'documentation', 'api', 'integration', 'quickstart', 'capabilities'],
    intentPhrases: ['read the docs', 'how do I integrate', 'api guide', 'supported capabilities'],
  },
  {
    title: 'Pricing for creating',
    description: 'Review the consumer plan for image creation.',
    category: 'Finance',
    href: '/pricing',
    keywords: ['pricing', 'price', 'plan', 'pro'],
    intentPhrases: ['how much does it cost', 'review pricing', 'what is the pro plan'],
  },
  {
    title: 'Frequently asked questions',
    description: 'Answers about GALX, Nova, public creations, and access.',
    category: 'Support',
    href: '/faq',
    shortcutKey: 'G F',
    keywords: ['faq', 'questions', 'answers', 'help', 'nova', 'managed'],
    intentPhrases: ['what is galx', 'what is nova', 'what does managed mean', 'get help'],
  },
  {
    title: 'Knowledge base',
    description: 'Guidance for creating, sharing, remixing, and GALX Nova-powered experiences.',
    category: 'Support',
    href: '/knowledge-base',
    keywords: ['knowledge', 'guides', 'help', 'getting started', 'remix', 'public'],
    intentPhrases: ['read the guides', 'how do I get started', 'learn about public creations'],
  },
  {
    title: 'About GALX',
    description: 'Learn how GALX and Nova work together.',
    category: 'Navigation',
    href: '/about',
    keywords: ['about', 'managed intelligence', 'galx', 'nova'],
    intentPhrases: ['learn about galx', 'what is galx nova'],
  },
  {
    title: 'Service status',
    description: 'Check the current status of GALX services.',
    category: 'Help & Diagnostics',
    href: '/status',
    keywords: ['status', 'availability', 'service', 'health'],
    intentPhrases: ['is galx available', 'check service status'],
  },
  {
    title: 'Billing overview',
    description: 'Review your plan and payment activity.',
    category: 'Finance',
    href: BILLING_PATHS.overview,
    keywords: ['billing', 'payments', 'account'],
    intentPhrases: ['open billing', 'review payments'],
  },
  {
    title: 'Account credit',
    description: 'Review existing account credit and activity.',
    category: 'Finance',
    href: BILLING_PATHS.credits,
    keywords: ['credit', 'wallet', 'balance', 'account credit'],
    intentPhrases: ['top up wallet', 'view account credit', 'check my balance'],
  },
  {
    title: 'Plan and subscription',
    description: 'Review and manage your consumer subscription.',
    category: 'Finance',
    href: BILLING_PATHS.plan,
    keywords: ['plan', 'subscription', 'renewal', 'cancel'],
    intentPhrases: ['manage my subscription', 'cancel my plan'],
  },
  {
    title: 'Billing invoices',
    description: 'View invoices and available downloads.',
    category: 'Finance',
    href: BILLING_PATHS.invoices,
    keywords: ['invoice', 'invoices', 'receipts', 'tax', 'bills'],
    intentPhrases: ['view invoices', 'download a receipt', 'where is my invoice'],
  },
  {
    title: 'Billing transactions',
    description: 'Review account credit and usage activity.',
    category: 'Finance',
    href: BILLING_PATHS.transactions,
    keywords: ['transactions', 'activity', 'usage', 'history'],
    intentPhrases: ['view transactions', 'view billing history'],
  },
  {
    title: 'Payment settings',
    description: 'Manage saved payment methods in Stripe.',
    category: 'Finance',
    href: BILLING_PATHS.payments,
    keywords: ['payment methods', 'credit card', 'card', 'stripe'],
    intentPhrases: ['update my credit card', 'manage payment methods'],
  },
  {
    title: 'Privacy and terms',
    description: 'Read GALX privacy and service terms.',
    category: 'Help & Diagnostics',
    href: '/privacy',
    keywords: ['privacy', 'terms', 'data', 'legal'],
    intentPhrases: ['read privacy', 'read terms'],
  },
];

/** Calculates edit distance for small navigation typos. */
export function calculateLevenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = previous[j];
      previous[j] = a[i - 1] === b[j - 1]
        ? diagonal
        : Math.min(diagonal + 1, previous[j] + 1, previous[j - 1] + 1);
      diagonal = above;
    }
  }
  return previous[b.length];
}

/** Provides forgiving matching without loading a second public product catalog. */
export function calculateSoundex(value: string): string {
  const clean = value.toUpperCase().replace(/[^A-Z]/g, '');
  if (!clean) return '';
  const mapping: Record<string, string> = { B: '1', F: '1', P: '1', V: '1', C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2', D: '3', T: '3', L: '4', M: '5', N: '5', R: '6' };
  let result = clean[0];
  let previous = mapping[clean[0]] || '';
  for (let index = 1; index < clean.length && result.length < 4; index += 1) {
    const code = mapping[clean[index]] || '';
    if (code && code !== previous) result += code;
    previous = code;
  }
  return (result + '0000').slice(0, 4);
}

class BroccoliOmniSearchImpl {
  private static instance: BroccoliOmniSearchImpl | null = null;
  private readonly searchTable: BroccoliDbTable<OmniSearchItem>;
  private readonly recentTable: BroccoliDbTable<RecentNavItem>;
  private readonly prefetchedRoutes = new Set<string>();

  private constructor() {
    this.searchTable = new BroccoliDbTable<OmniSearchItem>('galx_omnisearch_catalog');
    this.searchTable.createIndex('category');
    this.searchTable.createIndex('href');
    this.recentTable = new BroccoliDbTable<RecentNavItem>('galx_recent_nav_history');
    this.recentTable.createSortedIndex('timestamp');
    this.recentTable.createSortedIndex('visitCount');
    this.seedCatalog();
    if (typeof window !== 'undefined') this.hydrateRecentNav();
  }

  public static getInstance(): BroccoliOmniSearchImpl {
    if (!BroccoliOmniSearchImpl.instance) BroccoliOmniSearchImpl.instance = new BroccoliOmniSearchImpl();
    return BroccoliOmniSearchImpl.instance;
  }

  private seedCatalog(): void {
    BASE_CATALOG_ITEMS.forEach((item, index) => {
      const id = `item_${index}_${item.href.replace(/[^a-zA-Z0-9]/g, '_')}`;
      this.searchTable.put(id, { id, ...item });
    });
  }

  private hydrateRecentNav(): void {
    try {
      const raw = SafeStorage.getItem(STORAGE_RECENT_NAV_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const recents = parsed.filter((item): item is RecentNavItem => {
        if (!item || typeof item !== 'object') return false;
        const candidate = item as Partial<RecentNavItem>;
        return typeof candidate.href === 'string' && typeof candidate.title === 'string' && isAllowedRecentHref(candidate.href);
      }).map((item) => ({ ...item, visitCount: item.visitCount || 1 }));
      for (const item of recents) this.recentTable.put(item.href, item);
      if (recents.length !== parsed.length) SafeStorage.setItem(STORAGE_RECENT_NAV_KEY, JSON.stringify(recents));
    } catch {}
  }

  private persistRecentNav(): void {
    try {
      const recent = this.recentTable.query({ sortBy: 'timestamp', sortOrder: 'desc', limit: 15 }).filter((item) => isAllowedRecentHref(item.href));
      SafeStorage.setItem(STORAGE_RECENT_NAV_KEY, JSON.stringify(recent));
    } catch {}
  }

  public recordVisit(title: string, href: string, category = 'Navigation'): void {
    if (!isAllowedRecentHref(href)) return;
    const existing = this.recentTable.get(href);
    this.recentTable.put(href, {
      id: href,
      title,
      href,
      category,
      timestamp: Date.now(),
      visitCount: (existing?.visitCount || 0) + 1,
    });
    this.persistRecentNav();
  }

  public getRecentVisits(limit = 4): readonly RecentNavItem[] {
    return this.recentTable.query({ sortBy: 'timestamp', sortOrder: 'desc', limit }).filter((item) => isAllowedRecentHref(item.href));
  }

  public clearRecentVisits(): void {
    for (const item of this.recentTable.getAll()) this.recentTable.delete(item.id);
    SafeStorage.removeItem(STORAGE_RECENT_NAV_KEY);
  }

  public getAutocompleteSuggestion(query: string): string | null {
    const normalized = query.trim().toLowerCase();
    if (normalized.length < 2) return null;
    for (const item of this.searchTable.getAll()) {
      if (item.title.toLowerCase().startsWith(normalized)) return item.title;
      const phrase = item.intentPhrases.find((value) => value.toLowerCase().startsWith(normalized));
      if (phrase) return phrase;
      const keyword = item.keywords.find((value) => value.toLowerCase().startsWith(normalized));
      if (keyword) return keyword;
    }
    return null;
  }

  public prefetchRoute(href: string): void {
    if (this.prefetchedRoutes.has(href)) return;
    this.prefetchedRoutes.add(href);
    const nextWindow = typeof window === 'undefined'
      ? null
      : window as Window & { __next?: { router?: { prefetch?: (path: string) => void } } };
    if (nextWindow?.__next?.router?.prefetch) {
      try { nextWindow.__next.router.prefetch(href); } catch {}
    }
  }

  public search(query: string, limit = 8): OmniSearchItem[] {
    let rawQuery = query.trim().toLowerCase();
    if (!rawQuery) return [...this.searchTable.query({ limit })];

    let categoryFilter: CatalogItem['category'] | null = null;
    if (rawQuery.startsWith('>') || rawQuery.startsWith('action:')) {
      categoryFilter = 'Actions & Tools';
      rawQuery = rawQuery.replace(/^(>|action:)\s*/i, '');
    } else if (rawQuery.startsWith('@') || rawQuery.startsWith('developer:')) {
      categoryFilter = 'Developer';
      rawQuery = rawQuery.replace(/^(@|developer:)\s*/i, '');
    } else if (rawQuery.startsWith('#') || rawQuery.startsWith('doc:') || rawQuery.startsWith('guide:')) {
      categoryFilter = 'Documentation';
      rawQuery = rawQuery.replace(/^(#|doc:|guide:)\s*/i, '');
    } else if (rawQuery.startsWith('$') || rawQuery.startsWith('billing:') || rawQuery.startsWith('pricing:')) {
      categoryFilter = 'Finance';
      rawQuery = rawQuery.replace(/^(\$|billing:|pricing:)\s*/i, '');
    } else if (rawQuery.startsWith('?') || rawQuery.startsWith('help:')) {
      categoryFilter = 'Help & Diagnostics';
      rawQuery = rawQuery.replace(/^(\?|help:)\s*/i, '');
    }

    const normalized = rawQuery.trim();
    const candidates = categoryFilter
      ? this.searchTable.query({ where: { category: categoryFilter } })
      : this.searchTable.getAll();
    if (!normalized) return candidates.slice(0, limit);

    const words = normalized.split(/\s+/).filter(Boolean);
    const scored = candidates.map((item) => {
      const title = item.title.toLowerCase();
      const description = item.description.toLowerCase();
      const href = item.href.toLowerCase();
      let score = 0;
      if (ACRONYM_MAP[normalized] && (href === ACRONYM_MAP[normalized] || href.startsWith(`${ACRONYM_MAP[normalized]}/`))) score += 190;
      if (title === normalized) score += 120;
      else if (title.startsWith(normalized)) score += 60;
      else if (title.includes(normalized)) score += 35;
      if (href === normalized || href === `/${normalized}`) score += 90;
      else if (href.includes(normalized)) score += 25;

      for (const phrase of item.intentPhrases) {
        const value = phrase.toLowerCase();
        if (value === normalized) score += 250;
        else if (value.startsWith(normalized) || normalized.startsWith(value)) score += 180;
        else if (value.includes(normalized) || normalized.includes(value)) score += 140;
        else score += words.filter((word) => value.includes(word)).length * 30;
        if (normalized.length >= 4) {
          const distance = calculateLevenshteinDistance(normalized, value.slice(0, normalized.length));
          if (distance === 1) score += 50;
          else if (distance === 2) score += 25;
        }
      }

      for (const keyword of item.keywords) {
        const value = keyword.toLowerCase();
        if (value === normalized) score += 50;
        else if (value.startsWith(normalized)) score += 25;
        else if (value.includes(normalized)) score += 15;
        else if (words.some((word) => value.includes(word))) score += 12;
        if (normalized.length >= 4 && value.length >= 4) {
          const distance = calculateLevenshteinDistance(normalized, value);
          if (distance === 1) score += 40;
          else if (distance === 2 && normalized.length >= 6) score += 20;
        }
        if (normalized.length >= 3 && value.length >= 3 && calculateSoundex(normalized) === calculateSoundex(value)) score += 35;
      }

      if (description.includes(normalized)) score += 15;
      else score += words.filter((word) => description.includes(word)).length * 5;
      const recent = this.recentTable.get(item.href);
      if (recent) score += Math.min(25, recent.visitCount * 3);
      return { item, score };
    });

    return scored
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ item }) => item);
  }
}

export const BroccoliOmniSearch = BroccoliOmniSearchImpl.getInstance();
