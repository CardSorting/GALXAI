/**
 * Curated Model Comparison Matchup Data for Programmatic SEO (pSEO) and AEO
 * Focused on GALX Nova and visual synthesis.
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
    slug: 'galx-nova-vs-galx-nova-image',
    modelAId: 'galx-nova',
    modelBId: 'galx-nova-image',
    title: 'GALX Nova vs GALX Nova-image: Sustainable Intelligence vs Visual Synthesis',
    headline: 'Flagship Text & Code vs Visual Synthesis: GALX Nova vs Nova-image',
    description:
      'Compare GALX Nova for high-velocity inference, coding, and reasoning against GALX Nova-image for production-ready image generation.',
    verdict: {
      summary:
        'GALX Nova is our flagship model for text, inline coding, and agentic workflows at $0.20/1M input and $1.20/1M output, while GALX Nova-image generates high-definition visual assets.',
      modelABestFor: 'High-velocity text generation, autonomous agentic loops, inline coding autocompletion, and structured JSON extraction.',
      modelBBestFor: 'Production image synthesis, graphic asset generation, UI mockups, and visual design pipelines.',
      costDifferenceSummary:
        'GALX Nova is priced at $0.20/1M input and $1.20/1M output, whereas GALX Nova-image is priced at $0.060 per 1M tokens.',
    },
    faqs: [
      {
        q: 'Can I use both GALX Nova and GALX Nova-image in the same application?',
        a: 'Yes. You can use GALX Nova for prompt expansion, logic orchestration, and metadata extraction, then route image synthesis tasks to galx-nova-image.',
      },
      {
        q: 'What are the latency expectations for GALX Nova?',
        a: 'GALX Nova delivers sub-15ms Time-To-First-Token (TTFT) across our distributed edge relay network.',
      },
      {
        q: 'How does image generation billing work?',
        a: 'Visual synthesis requests are billed per sanitized binary artifact at direct developer rates with zero markups.',
      },
    ],
  },
];
