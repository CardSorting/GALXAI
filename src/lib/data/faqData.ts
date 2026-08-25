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
    q: 'What is GALXAI and how does it work?',
    a: 'GALXAI is an enterprise-grade Universal AI Gateway that provides direct, high-throughput access to the world\'s most powerful models—including OpenAI GPT-5.6 Sol, Terra, and Luna—at 25% to 40% below direct retail prices. It operates as a seamless, 1-line drop-in replacement for the official OpenAI SDK.',
  },
  {
    id: 'discounts-explained',
    category: 'pricing',
    q: 'How does GALXAI offer 25%–40% discounts compared to direct providers?',
    a: 'Through high-volume enterprise compute infrastructure and intelligent low-latency routing, GALXAI secures wholesale capacity and passes the direct savings to developers. We charge zero platform markup fees or monthly seat surcharges.',
  },
  {
    id: 'prompt-caching-rebate',
    category: 'pricing',
    q: 'How does the 75% Prompt Caching Rebate work?',
    a: 'When sending prompts with repeated context, system instructions, or document prefixes exceeding 1,024 tokens, cached input tokens automatically receive a 75% discount. Unlike other gateways that retain caching margins, GALXAI passes 100% of the prompt caching rebate directly to your wallet.',
  },
  {
    id: 'dropin-integration',
    category: 'developer',
    q: 'How do I integrate GALXAI into Python, Node.js, or Cursor IDE?',
    a: 'Integration takes under 30 seconds. In your OpenAI client code or Cursor/Windsurf IDE settings, set the Base URL to "https://api.galx.ai/v1" and supply your GALXAI developer key ("galx_live_..."). All standard parameters (stream, temperature, tools, structured JSON) work identically without changing your code.',
  },
  {
    id: 'wallet-billing-flow',
    category: 'pricing',
    q: 'How does the Developer Compute Wallet and billing work?',
    a: 'GALXAI operates a prepaid, pay-as-you-go developer wallet. Every new account receives an instant $5.00 free compute grant. Deductions are micro-metered in real-time per token with zero hidden minimums. You can top up with bonus packs (+5% to +20% extra credits) or activate auto-reload protection to guarantee zero downtime.',
  },
  {
    id: 'data-privacy-retention',
    category: 'security',
    q: 'Does GALXAI store, log, or train on my prompt data?',
    a: 'Strictly zero retention. GALXAI operates a strict zero-content-logging policy. Prompts and streaming tokens are processed entirely in ephemeral memory buffers and are never persisted to disk, recorded in database logs, or used for model training.',
  },
  {
    id: 'model-fleet-coverage',
    category: 'general',
    q: 'Which AI models and modalities are available?',
    a: 'GALXAI exclusively hosts flagship frontier models: OpenAI Codex coding and reasoning engines (GPT-5.6 Sol, GPT-5.6 Terra, GPT-5.6 Luna) and high-definition visual synthesis models (GPT-Image-2, DALL-E 3, and dense vector embeddings).',
  },
  {
    id: 'uptime-failover-sla',
    category: 'developer',
    q: 'How does GALXAI handle failover and high availability?',
    a: 'GALXAI operates multi-region Anycast Edge Proxies. Our gateway continuously monitors endpoint health and applies sub-15ms automated failover, shielding your production applications and agent fleets from upstream downtime and rate limit spikes.',
  },
];
