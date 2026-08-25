import { NextResponse } from 'next/server';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';
import { FRONTEND_VISIBLE_MODELS } from '@/core/router/ModelCatalog';

export const dynamic = 'force-static';
export const revalidate = 86400; // 24 hours

export async function GET() {
  const currentDate = new Date().toUTCString();

  const modelItemsXml = FRONTEND_VISIBLE_MODELS.map((model) => {
    const slug = model.id.replace('/', '-');
    const link = `${SITE_CONFIG.url}/models/${slug}`;
    const pubDate = new Date('2026-01-01').toUTCString();

    return `
    <item>
      <title><![CDATA[${model.name} — Specs & Wholesale Pricing]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description><![CDATA[${model.description} Wholesale Rate: $${model.inputPricePer1M.toFixed(2)}/1M Input, $${model.outputPricePer1M.toFixed(2)}/1M Output (${model.discountPercentage ?? 25}% off list). 75% prompt caching pass-through enabled.]]></description>
      <pubDate>${pubDate}</pubDate>
      <category>Frontier AI Models</category>
    </item>`;
  }).join('\n');

  const toolsXml = `
    <item>
      <title><![CDATA[LLM Context Window Capacity & Prompt Caching Visualizer]]></title>
      <link>${SITE_CONFIG.url}/tools/context-window-visualizer</link>
      <guid isPermaLink="true">${SITE_CONFIG.url}/tools/context-window-visualizer</guid>
      <description><![CDATA[Interactive 1,000,000 token context window simulator and prompt caching calculator for OpenAI Codex GPT-5.6. Model document capacities, AST code lines, and 75% cached rebate math.]]></description>
      <pubDate>${currentDate}</pubDate>
      <category>Developer Tools</category>
    </item>
    <item>
      <title><![CDATA[AI Latency & Time-To-First-Token (TTFT) Estimator]]></title>
      <link>${SITE_CONFIG.url}/tools/latency-estimator</link>
      <guid isPermaLink="true">${SITE_CONFIG.url}/tools/latency-estimator</guid>
      <description><![CDATA[Interactive streaming latency and TTFT simulator. Model TLS handshake acceleration, GPU prefill times, and token velocity across Anycast Edge vs Single-Origin routing.]]></description>
      <pubDate>${currentDate}</pubDate>
      <category>Developer Tools</category>
    </item>
    <item>
      <title><![CDATA[OpenAI Token Counter & BPE Tokenizer Studio]]></title>
      <link>${SITE_CONFIG.url}/tools/token-counter</link>
      <guid isPermaLink="true">${SITE_CONFIG.url}/tools/token-counter</guid>
      <description><![CDATA[Interactive Byte-Pair Encoding (BPE) subword visualizer and token counter for o200k_base and cl100k_base vocabularies.]]></description>
      <pubDate>${currentDate}</pubDate>
      <category>Developer Tools</category>
    </item>
    <item>
      <title><![CDATA[AI Token Streaming & Speed Benchmark Simulator]]></title>
      <link>${SITE_CONFIG.url}/tools/stream-benchmark</link>
      <guid isPermaLink="true">${SITE_CONFIG.url}/tools/stream-benchmark</guid>
      <description><![CDATA[Interactive real-time Server-Sent Events (SSE) token generation velocity and Time-To-First-Token (TTFT) benchmark simulator across OpenAI Codex GPT-5.6.]]></description>
      <pubDate>${currentDate}</pubDate>
      <category>Developer Tools</category>
    </item>
    <item>
      <title><![CDATA[Enterprise LLM ROI & Token Budget Calculator]]></title>
      <link>${SITE_CONFIG.url}/tools/roi-calculator</link>
      <guid isPermaLink="true">${SITE_CONFIG.url}/tools/roi-calculator</guid>
      <description><![CDATA[Interactive financial modeling tool for enterprise AI inference costs, DAU scale forecasting, and compound 75% prompt caching savings.]]></description>
      <pubDate>${currentDate}</pubDate>
      <category>Developer Tools</category>
    </item>`;

  const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}</title>
    <link>${SITE_CONFIG.url}</link>
    <description>${SITE_CONFIG.description}</description>
    <language>en-us</language>
    <lastBuildDate>${currentDate}</lastBuildDate>
    <atom:link href="${SITE_CONFIG.url}/feed.xml" rel="self" type="application/rss+xml"/>
    ${modelItemsXml}
    ${toolsXml}
  </channel>
</rss>`;

  return new NextResponse(rssFeed, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200',
    },
  });
}

