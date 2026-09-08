/**
 * Curated Model Comparison Matchup Data for Programmatic SEO (pSEO) and AEO
 * Focused exclusively on the OpenAI GPT flagship suite.
 */

export interface ModelMatchup {
  slug: string;
  modelAId: string;
  modelBId: string;
  title: string;
  headline: string;
  description: string;
  verdict: {
    summary: string;
    modelABestFor: string;
    modelBBestFor: string;
    costDifferenceSummary: string;
  };
  faqs: { q: string; a: string }[];
}

export const CURATED_MATCHUPS: ModelMatchup[] = [
  {
    slug: 'gpt-5.6-sol-vs-gpt-5.6-terra',
    modelAId: 'gpt-5.6-sol',
    modelBId: 'gpt-5.6-terra',
    title: 'OpenAI GPT-5.6 Sol vs GPT-5.6 Terra Comparison & Token Economics',
    headline: 'Flagship vs Balanced Workhorse: GPT-5.6 Sol vs Terra',
    description:
      'Evaluate trade-offs between OpenAI GPT-5.6 Sol and GPT-5.6 Terra on reasoning depth, token velocity, and cost per million tokens on GALXAI.',
    verdict: {
      summary:
        'GPT-5.6 Sol is OpenAI’s flagship high-reasoning model for complex cognitive tasks, whereas GPT-5.6 Terra provides 85% of Sol’s intelligence at a 40% lower token cost for high-volume SaaS workflows.',
      modelABestFor: 'Complex algorithmic architecture, deep mathematical reasoning, multi-turn code refactors.',
      modelBBestFor: 'Daily SaaS backend processing, structured data extraction, conversational agents at scale.',
      costDifferenceSummary:
        'Terra costs $2.25/1M input ($0.75 cached) vs Sol at $3.75/1M input ($1.25 cached), saving 40% on standard volume.',
    },
    faqs: [
      {
        q: 'When should I use GPT-5.6 Terra over GPT-5.6 Sol?',
        a: 'Use GPT-5.6 Terra for production pipelines where high concurrency and token budgets are paramount, and reserve Sol for difficult architectural or analytical requests.',
      },
      {
        q: 'Do both models support 75% prompt caching on GALXAI?',
        a: 'Yes. Both GPT-5.6 Sol and GPT-5.6 Terra automatically qualify for the 75% prompt caching rebate on prompts over 1,024 tokens.',
      },
    ],
  },
  {
    slug: 'gpt-5.6-sol-vs-gpt-5.6-luna',
    modelAId: 'gpt-5.6-sol',
    modelBId: 'gpt-5.6-luna',
    title: 'OpenAI GPT-5.6 Sol vs GPT-5.6 Luna: Deep Reasoning vs Extreme Velocity',
    headline: 'Reasoning vs Speed: GPT-5.6 Sol vs GPT-5.6 Luna',
    description:
      'Compare OpenAI’s heavyweight reasoning engine against its ultra-fast streaming sibling to choose the right balance for your agent architecture.',
    verdict: {
      summary:
        'Sol provides unmatched depth of thought for multi-step tasks, while Luna offers 5x higher token velocity and 80% lower cost for instantaneous conversational workflows.',
      modelABestFor: 'Deep planning, multi-file code modifications, complex math and legal verification.',
      modelBBestFor: 'User-facing chat, real-time code autocomplete, low-latency summarization.',
      costDifferenceSummary:
        'Luna is 80% cheaper at $0.75/1M input vs Sol at $3.75/1M input on GALXAI.',
    },
    faqs: [
      {
        q: 'Can I route between Sol and Luna dynamically based on query difficulty?',
        a: 'Yes. You can use GALXAI Resolver (/models/resolver) to automatically dispatch simple queries to Luna and escalate complex reasoning to Sol.',
      },
      {
        q: 'What are the latency differences between Sol and Luna?',
        a: 'Luna delivers sub-12ms TTFT with 145 tok/s streaming velocity, while Sol prioritizes deep internal reasoning tokens before emitting output.',
      },
    ],
  },
  {
    slug: 'gpt-5.6-terra-vs-gpt-5.6-luna',
    modelAId: 'gpt-5.6-terra',
    modelBId: 'gpt-5.6-luna',
    title: 'OpenAI GPT-5.6 Terra vs GPT-5.6 Luna Cost vs Velocity Comparison',
    headline: 'Balanced Enterprise Workhorse vs Sub-Second Velocity: Terra vs Luna',
    description:
      'Analyze the throughput, latency, reasoning capabilities, and token economics between GPT-5.6 Terra and GPT-5.6 Luna.',
    verdict: {
      summary:
        'GPT-5.6 Terra provides superior multi-step logic and 750K context for enterprise backend tasks, while GPT-5.6 Luna maximizes streaming speed (145 tok/s) at an ultra-low cost ($0.75/1M input).',
      modelABestFor: 'Complex data transformations, document summarization, agent workflow nodes.',
      modelBBestFor: 'Real-time autocomplete, live transcription cleanup, instant user-facing chatbots.',
      costDifferenceSummary:
        'Luna is 66% cheaper at $0.75/1M input vs Terra at $2.25/1M input.',
    },
    faqs: [
      {
        q: 'When should I choose Luna over Terra?',
        a: 'Choose Luna when sub-15ms TTFT and token volume economics are the primary constraints, such as typing autocompletion and high-concurrency classification.',
      },
      {
        q: 'Can both models operate within a single multi-agent pipeline?',
        a: 'Yes, orchestrators often use Luna for fast intent classification and Terra for structured entity extraction and final JSON rendering.',
      },
    ],
  },
];
