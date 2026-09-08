/**
 * Developer AI Routing & Gateway Knowledge Glossary Data
 * High-authority definitions for Answer Engine Optimization (AEO) and Schema.org DefinedTermSet.
 */

export interface GlossaryTerm {
  slug: string;
  term: string;
  category: 'routing' | 'caching' | 'latency' | 'security' | 'economics';
  shortDefinition: string;
  fullDefinition: string;
  technicalContext: string;
  wikidataUri?: string;
  relatedTerms: string[];
}

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    "slug": "prompt-caching-rebate",
    "term": "Prompt caching",
    "category": "caching",
    "shortDefinition": "Eligible repeated prompt content receives the caching prices shown in the model catalog.",
    "fullDefinition": "Eligible repeated prompt content receives the caching prices shown in the model catalog.",
    "technicalContext": "See the API documentation for supported behavior.",
    "relatedTerms": []
  },
  {
    "slug": "time-to-first-token",
    "term": "Time to first token",
    "category": "latency",
    "shortDefinition": "The elapsed time before the first text token reaches your application.",
    "fullDefinition": "The elapsed time before the first text token reaches your application.",
    "technicalContext": "See the API documentation for supported behavior.",
    "relatedTerms": []
  },
  {
    "slug": "rate-limit-resilience",
    "term": "Rate limits",
    "category": "routing",
    "shortDefinition": "A request above your allowance may return HTTP 429. Follow Retry-After when supplied.",
    "fullDefinition": "A request above your allowance may return HTTP 429. Follow Retry-After when supplied.",
    "technicalContext": "See the API documentation for supported behavior.",
    "relatedTerms": []
  },
  {
    "slug": "api-key",
    "term": "API key",
    "category": "security",
    "shortDefinition": "A credential used to authenticate your requests. Keep it secret and revoke it if compromised.",
    "fullDefinition": "A credential used to authenticate your requests. Keep it secret and revoke it if compromised.",
    "technicalContext": "See the API documentation for supported behavior.",
    "relatedTerms": []
  }
];
