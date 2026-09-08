/**
 * Canonical AI Latency & Throughput Benchmark Dataset for pSEO and AEO
 * Focused exclusively on the OpenAI GPT flagship suite.
 */

export interface ModelBenchmarkItem {
  modelId: string;
  name: string;
  provider: string;
  category: string;
  avgTtftMs: number;
  tokensPerSec: number;
  cacheHitTtftMs: number;
  p99LatencyMs: number;
  contextK: number;
  inputPricePer1M: number;
  cachedInputPricePer1M: number;
  outputPricePer1M: number;
  architectureTier: 'Frontier Reasoning' | 'Balanced Production' | 'Extreme Velocity' | 'Visual Synthesis';
}

export const BENCHMARKS_DATA: ModelBenchmarkItem[] = [
  {
    modelId: 'gpt-5.6-luna',
    name: 'OpenAI GPT-5.6 Luna',
    provider: 'OpenAI',
    category: 'LLM',
    avgTtftMs: 11.8,
    tokensPerSec: 145.2,
    cacheHitTtftMs: 6.4,
    p99LatencyMs: 24.5,
    contextK: 500,
    inputPricePer1M: 0.75,
    cachedInputPricePer1M: 0.25,
    outputPricePer1M: 2.25,
    architectureTier: 'Extreme Velocity',
  },
  {
    modelId: 'gpt-5.6-terra',
    name: 'OpenAI GPT-5.6 Terra',
    provider: 'OpenAI',
    category: 'LLM',
    avgTtftMs: 13.4,
    tokensPerSec: 110.5,
    cacheHitTtftMs: 7.1,
    p99LatencyMs: 28.2,
    contextK: 750,
    inputPricePer1M: 2.25,
    cachedInputPricePer1M: 0.75,
    outputPricePer1M: 6.75,
    architectureTier: 'Balanced Production',
  },
  {
    modelId: 'gpt-5.6-sol',
    name: 'OpenAI GPT-5.6 Sol',
    provider: 'OpenAI',
    category: 'LLM',
    avgTtftMs: 14.2,
    tokensPerSec: 88.4,
    cacheHitTtftMs: 7.8,
    p99LatencyMs: 31.0,
    contextK: 900,
    inputPricePer1M: 3.75,
    cachedInputPricePer1M: 1.25,
    outputPricePer1M: 11.25,
    architectureTier: 'Frontier Reasoning',
  },
  {
    modelId: 'openai-gpt-image-2',
    name: 'Codex Image Generation',
    provider: 'OpenAI',
    category: 'Image Synthesis',
    avgTtftMs: 420.0,
    tokensPerSec: 0,
    cacheHitTtftMs: 0,
    p99LatencyMs: 1150.0,
    contextK: 0,
    inputPricePer1M: 0.032,
    cachedInputPricePer1M: 0,
    outputPricePer1M: 0,
    architectureTier: 'Visual Synthesis',
  },
];

export const BENCHMARK_FAQS = [
  {
    q: 'Which LLM model provides the lowest Time-To-First-Token (TTFT)?',
    a: 'OpenAI GPT-5.6 Luna delivers the lowest latency with an average TTFT of 11.8ms (6.4ms on warm prompt cache hits) and a streaming generation velocity of 145.2 tokens/second on GALXAI Anycast edge nodes.',
  },
  {
    q: 'How much latency does prompt caching eliminate?',
    a: 'Prompt caching reduces TTFT by up to 55% (from 14.2ms down to 7.8ms on GPT-5.6 Sol) by skipping prefill KV recomputation on prefixes exceeding 1,024 tokens.',
  },
  {
    q: 'Are these benchmarks measured at the gateway edge or origin server?',
    a: 'These metrics represent true end-to-end client latency terminating at GALXAI Anycast edge proxies across North America, Europe, and Asia.',
  },
];
