export interface FAQItem {
  id: string;
  category: 'general' | 'pricing' | 'developer' | 'security';
  q: string;
  a: string;
}

export const FAQS: FAQItem[] = [
  {
    id: 'what-is-galxai',
    category: 'general',
    q: 'What is GALXAI?',
    a: 'GALXAI is a high-speed intelligence platform providing GALX Nova and frontier intelligence at 25%–40% wholesale discounts with a 1-line OpenAI drop-in.',
  },
  {
    id: 'discounts-explained',
    category: 'pricing',
    q: 'How are 25%–40% discounts possible?',
    a: 'We aggregate enterprise compute volume and pass tier-1 wholesale rates directly to developers with 0% platform markup.',
  },
  {
    id: 'prompt-caching-rebate',
    category: 'pricing',
    q: 'How does 75% prompt caching work?',
    a: 'Shared prompt prefixes (>1,024 tokens) receive an automatic 75% input discount. 100% of the rebate is credited to your wallet.',
  },
  {
    id: 'dropin-integration',
    category: 'developer',
    q: 'How do I integrate GALXAI?',
    a: 'Set your baseURL to "https://galx.ai/v1" and pass your API key. Compatible with OpenAI SDK, Cursor, Claude Code, Python, and TypeScript.',
  },
  {
    id: 'wallet-billing-flow',
    category: 'pricing',
    q: 'How does billing work?',
    a: 'Prepaid wallet with $5 free credit. Micro-metered per token with zero subscriptions, hidden minimums, or seat fees.',
  },
  {
    id: 'data-privacy-retention',
    category: 'security',
    q: 'Is my prompt data logged or trained on?',
    a: 'Zero data retention (ZDR-100). Prompts are processed strictly in RAM and never stored, logged, or used for model training.',
  },
  {
    id: 'model-fleet-coverage',
    category: 'general',
    q: 'Which AI models are available?',
    a: 'Frontier intelligence models including GALX Nova, GALX Nova-image, and high-dimension vector embeddings.',
  },
  {
    id: 'uptime-failover-sla',
    category: 'developer',
    q: 'How does distributed edge failover prevent 429 stalls?',
    a: 'Check the status page for current availability. If a request fails, follow its documented error guidance.',
  },
];
