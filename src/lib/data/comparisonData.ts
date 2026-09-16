/**
 * Curated Model Comparison Matchup Data for Programmatic SEO (pSEO) and AEO
 * Focused exclusively on the OpenAI GPT flagship suite:
 * 1. gpt-6-astra (default)
 * 2. gpt-5.6-sol (workhorse)
 * 3. gpt-5.6-terra (balanced)
 * 4. gpt-5.6-luna (fast & affordable)
 * 5. gpt-5.5 (proven)
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
    slug: 'gpt-6-astra-vs-gpt-5.6-sol',
    modelAId: 'gpt-6-astra',
    modelBId: 'gpt-5.6-sol',
    title: 'OpenAI GPT-6 Astra vs GPT-5.6 Sol: Apex Reasoning vs Everyday Workhorse',
    headline: 'Apex Flagship vs Workhorse: GPT-6 Astra vs GPT-5.6 Sol',
    description:
      'Compare OpenAI’s default flagship GPT-6 Astra against the proven GPT-5.6 Sol workhorse on complex agentic architecture, token economics, and reasoning depth.',
    verdict: {
      summary:
        'GPT-6 Astra is OpenAI’s apex model for complex, demanding workloads and multi-repository synthesis, while GPT-5.6 Sol serves as the dependable everyday workhorse for high-frequency agentic tasks.',
      modelABestFor: 'Apex multi-step reasoning, complex systems architecture, mathematical proofs, long-horizon planning.',
      modelBBestFor: 'Everyday agentic coding, high-volume production refactoring, structured data processing.',
      costDifferenceSummary:
        'GPT-6 Astra is $5.00/1M input ($0.50 cached) vs GPT-5.6 Sol at $4.00/1M input ($0.40 cached) on GALXAI.',
    },
    faqs: [
      {
        q: 'How do I access GPT-6 Astra and GPT-5.6 Sol?',
        a: 'Both GPT-6 Astra and GPT-5.6 Sol are routed through the dedicated Premium Relay for maximum performance and SLA protection.',
      },
      {
        q: 'Which model should I use for large codebase migrations?',
        a: 'Use GPT-6 Astra for top-level architectural partitioning and dependency analysis, and GPT-5.6 Sol for executing file-by-file refactors.',
      },
    ],
  },
  {
    slug: 'gpt-5.6-sol-vs-gpt-5.6-terra',
    modelAId: 'gpt-5.6-sol',
    modelBId: 'gpt-5.6-terra',
    title: 'OpenAI GPT-5.6 Sol vs GPT-5.6 Terra Comparison & Token Economics',
    headline: 'Workhorse vs Balanced Model: GPT-5.6 Sol vs Terra',
    description:
      'Evaluate trade-offs between OpenAI GPT-5.6 Sol and GPT-5.6 Terra on reasoning depth, token velocity, and cost per million tokens on GALXAI.',
    verdict: {
      summary:
        'GPT-5.6 Sol is a reliable agentic workhorse for everyday tasks, whereas GPT-5.6 Terra provides a balanced coding model for standard volume workflows.',
      modelABestFor: 'Complex algorithmic architecture, deep mathematical reasoning, multi-turn code refactors.',
      modelBBestFor: 'Daily SaaS backend processing, structured data extraction, conversational agents at scale.',
      costDifferenceSummary:
        'Terra costs $2.00/1M input ($0.20 cached) vs Sol at $4.00/1M input ($0.40 cached), saving 50% on standard volume.',
    },
    faqs: [
      {
        q: 'When should I use GPT-5.6 Terra over GPT-5.6 Sol?',
        a: 'Use GPT-5.6 Terra for standard production pipelines where concurrency and token budgets are paramount, and reserve Sol for difficult analytical requests.',
      },
      {
        q: 'Do both models support prompt caching on GALXAI?',
        a: 'Yes. Both GPT-5.6 Sol and GPT-5.6 Terra automatically qualify for 90% prompt caching rebates on repeated prompt prefixes.',
      },
    ],
  },
  {
    slug: 'gpt-5.6-sol-vs-gpt-5.6-luna',
    modelAId: 'gpt-5.6-sol',
    modelBId: 'gpt-5.6-luna',
    title: 'OpenAI GPT-5.6 Sol vs GPT-5.6 Luna: Deep Reasoning vs Extreme Velocity',
    headline: 'Workhorse vs Velocity: GPT-5.6 Sol vs GPT-5.6 Luna',
    description:
      'Compare OpenAI’s heavyweight reasoning engine against its ultra-fast streaming sibling to choose the right balance for your agent architecture.',
    verdict: {
      summary:
        'Sol provides unmatched depth of thought for multi-step tasks, while Luna offers fast and affordable agentic coding for instantaneous conversational workflows.',
      modelABestFor: 'Deep planning, multi-file code modifications, complex math and legal verification.',
      modelBBestFor: 'User-facing chat, real-time code autocomplete, low-latency summarization.',
      costDifferenceSummary:
        'Luna is 95% cheaper at $0.20/1M input vs Sol at $4.00/1M input on GALXAI.',
    },
    faqs: [
      {
        q: 'Can I route between Sol and Luna dynamically based on query difficulty?',
        a: 'Yes. You can use GALXAI Resolver (/models/resolver) to automatically dispatch simple queries to Luna and escalate complex reasoning to Sol.',
      },
      {
        q: 'What are the latency differences between Sol and Luna?',
        a: 'Luna delivers sub-15ms TTFT with high streaming velocity, while Sol prioritizes deep internal reasoning tokens before emitting output.',
      },
    ],
  },
  {
    slug: 'gpt-5.6-terra-vs-gpt-5.6-luna',
    modelAId: 'gpt-5.6-terra',
    modelBId: 'gpt-5.6-luna',
    title: 'OpenAI GPT-5.6 Terra vs GPT-5.6 Luna Cost vs Velocity Comparison',
    headline: 'Balanced Coding vs Sub-Second Velocity: Terra vs Luna',
    description:
      'Analyze the throughput, latency, reasoning capabilities, and token economics between GPT-5.6 Terra and GPT-5.6 Luna.',
    verdict: {
      summary:
        'GPT-5.6 Terra provides balanced agentic coding for daily enterprise work, while GPT-5.6 Luna maximizes streaming speed at an ultra-low cost ($0.20/1M input).',
      modelABestFor: 'Complex data transformations, document summarization, agent workflow nodes.',
      modelBBestFor: 'Real-time autocomplete, live transcription cleanup, instant user-facing chatbots.',
      costDifferenceSummary:
        'Luna is 90% cheaper at $0.20/1M input vs Terra at $2.00/1M input.',
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
  {
    slug: 'gpt-5.6-terra-vs-gpt-5.5',
    modelAId: 'gpt-5.6-terra',
    modelBId: 'gpt-5.5',
    title: 'OpenAI GPT-5.6 Terra vs GPT-5.5: Next-Gen Agentic vs Proven Workhorse',
    headline: 'Next-Gen Balanced vs Proven Workhorse: GPT-5.6 Terra vs GPT-5.5',
    description:
      'Evaluate differences between OpenAI GPT-5.6 Terra and GPT-5.5 on context window, coding precision, and latency.',
    verdict: {
      summary:
        'GPT-5.6 Terra offers a 1M token context window and agentic reasoning loops, while GPT-5.5 remains a proven, highly reliable model for legacy scripts and general work.',
      modelABestFor: 'Modern agentic workflows, long-context repository indexing, complex multi-tool schemas.',
      modelBBestFor: 'Simple batch text classification, legacy pipeline compatibility, single-prompt transformations.',
      costDifferenceSummary:
        'GPT-5.5 is priced at $1.00/1M input vs Terra at $2.00/1M input.',
    },
    faqs: [
      {
        q: 'Is GPT-5.5 still supported on GALXAI?',
        a: 'Yes. GPT-5.5 is fully supported via standard OpenAI SDK drop-in configuration across all tiers.',
      },
      {
        q: 'Should I upgrade from GPT-5.5 to GPT-5.6 Terra?',
        a: 'For multi-step agentic execution or context larger than 500k tokens, upgrading to GPT-5.6 Terra delivers significantly higher accuracy and instruction-following.',
      },
    ],
  },
];
