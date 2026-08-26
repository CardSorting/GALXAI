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
  {
    slug: 'openai-gpt-image-2-vs-openai-gpt-image-1.5',
    modelAId: 'openai-gpt-image-2',
    modelBId: 'openai-gpt-image-1.5',
    title: 'OpenAI GPT-Image-2 vs GPT-Image-1.5 Visual Synthesis Benchmark',
    headline: 'Visual Synthesis SOTA: GPT-Image-2 vs GPT-Image-1.5',
    description:
      'Detailed visual quality, typography rendering, prompt fidelity, and per-image pricing comparison between GPT-Image-2 and GPT-Image-1.5 on GALXAI.',
    verdict: {
      summary:
        'GPT-Image-2 represents flagship 4K image synthesis with photorealistic text rendering and complex scene composition, while GPT-Image-1.5 offers balanced photorealistic asset creation at lower cost.',
      modelABestFor: 'Flagship 4K visual assets, complex text layouts, raytraced scene composition.',
      modelBBestFor: 'Photorealistic product mockups, rapid creative iterations.',
      costDifferenceSummary:
        'GPT-Image-2 is $0.032/image (-20% wholesale) vs GPT-Image-1.5 at $0.024/image (-20% wholesale) on GALXAI.',
    },
    faqs: [
      {
        q: 'Can GPT-Image-2 render accurate text inside generated images?',
        a: 'Yes, GPT-Image-2 features advanced glyph and typography adherence, allowing crisp logos, signage, and textual headlines within images.',
      },
      {
        q: 'Are both image models compatible with the OpenAI Images API endpoint?',
        a: 'Yes, both models operate via standard /v1/images/generations requests with identical parameter schemas.',
      },
    ],
  },
  {
    slug: 'openai-gpt-image-2-vs-openai-gpt-image-1',
    modelAId: 'openai-gpt-image-2',
    modelBId: 'openai-gpt-image-1',
    title: 'OpenAI GPT-Image-2 vs GPT-Image-1 Generational Comparison',
    headline: 'Flagship 4K Diffusion vs Foundation Image Generation',
    description:
      'Evaluate generational leaps in typography, prompt alignment, and image fidelity between GPT-Image-2 and GPT-Image-1 on GALXAI.',
    verdict: {
      summary:
        'GPT-Image-2 brings a 3x leap in anatomical precision and complex in-image text synthesis compared to the first-generation GPT-Image-1 engine.',
      modelABestFor: 'Commercial advertising imagery, complex multi-character scenes, typography.',
      modelBBestFor: 'Standard illustrative content, basic thumbnails, rapid conceptualization.',
      costDifferenceSummary:
        'GPT-Image-2 is $0.032/image vs GPT-Image-1 at $0.016/image on GALXAI.',
    },
    faqs: [
      {
        q: 'What is the primary upgrade in GPT-Image-2 over GPT-Image-1?',
        a: 'GPT-Image-2 features native typography rendering, higher dynamic range lighting, and fine anatomical realism.',
      },
    ],
  },
  {
    slug: 'openai-gpt-image-1.5-vs-openai-gpt-image-1',
    modelAId: 'openai-gpt-image-1.5',
    modelBId: 'openai-gpt-image-1',
    title: 'OpenAI GPT-Image-1.5 vs GPT-Image-1 Speed & Fidelity Comparison',
    headline: 'Balanced Mid-Tier vs Foundation Visual Model',
    description:
      'Compare throughput, generation latency, and texture rendering between GPT-Image-1.5 and GPT-Image-1 on GALXAI.',
    verdict: {
      summary:
        'GPT-Image-1.5 provides sharper textural detail and 25% faster generation latencies than the original GPT-Image-1 foundation engine.',
      modelABestFor: 'High-throughput product visuals, dynamic marketing banners, UI asset generation.',
      modelBBestFor: 'Legacy rendering workflows, basic avatars, prototype wireframes.',
      costDifferenceSummary:
        'GPT-Image-1.5 is $0.024/image vs GPT-Image-1 at $0.016/image on GALXAI.',
    },
    faqs: [
      {
        q: 'How fast does GPT-Image-1.5 generate standard 1024x1024 assets?',
        a: 'GPT-Image-1.5 completes generations in under 2.8 seconds on average across GALXAI edge proxies.',
      },
    ],
  },
];
