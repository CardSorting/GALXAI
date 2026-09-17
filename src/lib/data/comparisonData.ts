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
    slug: 'gpt-5-6-luna-low-vs-openai-gpt-image-latest',
    modelAId: 'gpt-5-6-luna-low',
    modelBId: 'openai-gpt-image-latest',
    title: 'OpenAI GPT-5.6 Luna Low vs Visual Synthesis: High-Velocity Text & Code vs Image Generation',
    headline: 'Flagship Text & Code vs Visual Synthesis: GPT-5.6 Luna Low vs OpenAI Image',
    description:
      'Compare OpenAI GPT-5.6 Luna Low for high-velocity inference, coding, and reasoning against OpenAI Visual Synthesis for production-ready image generation.',
    verdict: {
      summary:
        'GPT-5.6 Luna Low is OpenAI’s flagship ultra-fast model for text, inline coding, and agentic workflows at $0.20/1M input and $1.20/1M output, while Visual Synthesis (openai-gpt-image-latest) generates high-definition visual assets.',
      modelABestFor: 'High-velocity text generation, autonomous agentic loops, inline coding autocompletion, and structured JSON extraction.',
      modelBBestFor: 'Production image synthesis, graphic asset generation, UI mockups, and visual design pipelines.',
      costDifferenceSummary:
        'GPT-5.6 Luna Low is priced at $0.20/1M input and $1.20/1M output, whereas Visual Synthesis is priced at $0.040 per 1024x1024 image.',
    },
    faqs: [
      {
        q: 'Can I use both GPT-5.6 Luna Low and Visual Synthesis in the same application?',
        a: 'Yes. You can use GPT-5.6 Luna Low for prompt expansion, logic orchestration, and metadata extraction, then route image synthesis tasks to openai-gpt-image-latest.',
      },
      {
        q: 'What are the latency expectations for GPT-5.6 Luna Low?',
        a: 'GPT-5.6 Luna Low delivers sub-15ms Time-To-First-Token (TTFT) across our Anycast edge relay network.',
      },
      {
        q: 'How does image generation billing work?',
        a: 'Visual synthesis requests are billed per sanitized binary artifact at wholesale rates ($0.040 per standard image).',
      },
    ],
  },
];
