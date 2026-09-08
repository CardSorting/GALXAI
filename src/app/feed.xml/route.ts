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
      <description><![CDATA[Interactive 1,000,000 token context window simulator and prompt caching calculator for OpenAI GPT-5.6. Model document capacities, AST code lines, and 75% cached rebate math.]]></description>
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
      <description><![CDATA[Interactive real-time Server-Sent Events (SSE) token generation velocity and Time-To-First-Token (TTFT) benchmark simulator across OpenAI GPT-5.6.]]></description>
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

  const cookbooksXml = `
    <item>
      <title><![CDATA[Streaming Server-Sent Events with Next.js App Router & OpenAI SDK]]></title>
      <link>${SITE_CONFIG.url}/cookbook/streaming-sse-nextjs</link>
      <guid isPermaLink="true">${SITE_CONFIG.url}/cookbook/streaming-sse-nextjs</guid>
      <description><![CDATA[Production code recipe for ultra-low latency token streaming in Next.js 15 App Router using standard OpenAI SDK and Server-Sent Events on GALXAI.]]></description>
      <pubDate>${currentDate}</pubDate>
      <category>Developer Cookbooks</category>
    </item>
    <item>
      <title><![CDATA[Dynamic Model Fallback Circuit Breaker in Python]]></title>
      <link>${SITE_CONFIG.url}/cookbook/dynamic-model-fallback-circuit-breaker</link>
      <guid isPermaLink="true">${SITE_CONFIG.url}/cookbook/dynamic-model-fallback-circuit-breaker</guid>
      <description><![CDATA[Implement automated zero-downtime origin failover across GPT-5.6 Sol and Terra in Python with exponential backoff.]]></description>
      <pubDate>${currentDate}</pubDate>
      <category>Developer Cookbooks</category>
    </item>`;

  const hubsXml = `
    <item>
      <title><![CDATA[GALXAI Developer Tools & Calculators Suite]]></title>
      <link>${SITE_CONFIG.url}/tools</link>
      <guid isPermaLink="true">${SITE_CONFIG.url}/tools</guid>
      <description><![CDATA[13 free interactive developer tools for AI token optimization, latency benchmarking, and enterprise ROI modeling.]]></description>
      <pubDate>${currentDate}</pubDate>
      <category>Developer Hubs</category>
    </item>
    <item>
      <title><![CDATA[Frontier AI Model Providers & Wholesale Channels]]></title>
      <link>${SITE_CONFIG.url}/providers</link>
      <guid isPermaLink="true">${SITE_CONFIG.url}/providers</guid>
      <description><![CDATA[Official provider hubs connecting developers to frontier compute with wholesale pricing and sub-15ms Anycast routing.]]></description>
      <pubDate>${currentDate}</pubDate>
      <category>Developer Hubs</category>
    </item>
    <item>
      <title><![CDATA[Architectural Capabilities & Edge Engine Features]]></title>
      <link>${SITE_CONFIG.url}/capabilities</link>
      <guid isPermaLink="true">${SITE_CONFIG.url}/capabilities</guid>
      <description><![CDATA[1M context windows, zero data retention, 75% prompt caching, and predictive headroom governance.]]></description>
      <pubDate>${currentDate}</pubDate>
      <category>Developer Hubs</category>
    </item>
    <item>
      <title><![CDATA[Enterprise AI Solutions & Workload Blueprints]]></title>
      <link>${SITE_CONFIG.url}/solutions</link>
      <guid isPermaLink="true">${SITE_CONFIG.url}/solutions</guid>
      <description><![CDATA[Production reference architectures for Coding Agents, RAG, Swarms, Voice AI, and Structured Extraction.]]></description>
      <pubDate>${currentDate}</pubDate>
      <category>Developer Hubs</category>
    </item>
    <item>
      <title><![CDATA[Vertical Industry AI Gateways & Compliance Blueprints]]></title>
      <link>${SITE_CONFIG.url}/industries</link>
      <guid isPermaLink="true">${SITE_CONFIG.url}/industries</guid>
      <description><![CDATA[Sector-specific AI routing architectures for Healthcare, FinTech, Legal, and Cybersecurity.]]></description>
      <pubDate>${currentDate}</pubDate>
      <category>Developer Hubs</category>
    </item>
    <item>
      <title><![CDATA[Cloud Provider Migration Center — 30-Second Cutover]]></title>
      <link>${SITE_CONFIG.url}/migrate</link>
      <guid isPermaLink="true">${SITE_CONFIG.url}/migrate</guid>
      <description><![CDATA[Step-by-step 30-second migration guides to switch to GALXAI from Azure OpenAI, AWS Bedrock, and Google Vertex AI.]]></description>
      <pubDate>${currentDate}</pubDate>
      <category>Developer Hubs</category>
    </item>
    <item>
      <title><![CDATA[AI Gateway Competitor Alternatives & Comparisons]]></title>
      <link>${SITE_CONFIG.url}/alternatives</link>
      <guid isPermaLink="true">${SITE_CONFIG.url}/alternatives</guid>
      <description><![CDATA[Objective architectural comparisons between GALXAI and OpenRouter, Together AI, Portkey, and LiteLLM.]]></description>
      <pubDate>${currentDate}</pubDate>
      <category>Developer Hubs</category>
    </item>
    <item>
      <title><![CDATA[Frontier AI Model Matchups & Evaluations]]></title>
      <link>${SITE_CONFIG.url}/models/vs</link>
      <guid isPermaLink="true">${SITE_CONFIG.url}/models/vs</guid>
      <description><![CDATA[Head-to-head comparisons evaluating reasoning depth, token velocity, and wholesale token economics.]]></description>
      <pubDate>${currentDate}</pubDate>
      <category>Developer Hubs</category>
    </item>
    <item>
      <title><![CDATA[AI Gateway Error Codes & Resolution Runbooks]]></title>
      <link>${SITE_CONFIG.url}/docs/errors</link>
      <guid isPermaLink="true">${SITE_CONFIG.url}/docs/errors</guid>
      <description><![CDATA[Developer resolution runbooks for HTTP 429, 500, 503, and token context overflow errors.]]></description>
      <pubDate>${currentDate}</pubDate>
      <category>Developer Hubs</category>
    </item>
    <item>
      <title><![CDATA[Framework & IDE Integrations Directory]]></title>
      <link>${SITE_CONFIG.url}/docs/integrations</link>
      <guid isPermaLink="true">${SITE_CONFIG.url}/docs/integrations</guid>
      <description><![CDATA[Drop-in connection guides for Cursor IDE, Windsurf, Claude Code, LangChain, and Vercel AI SDK.]]></description>
      <pubDate>${currentDate}</pubDate>
      <category>Developer Hubs</category>
    </item>
    <item>
      <title><![CDATA[Enterprise AI Security & Compliance Specifications]]></title>
      <link>${SITE_CONFIG.url}/security</link>
      <guid isPermaLink="true">${SITE_CONFIG.url}/security</guid>
      <description><![CDATA[SOC 2 Type II, ISO 27001, HIPAA BAA, EU AI Act, and PCI DSS compliance specifications for AI model routing.]]></description>
      <pubDate>${currentDate}</pubDate>
      <category>Security & Compliance</category>
    </item>
    <item>
      <title><![CDATA[OWASP Top 10 LLM Security Defense Runbooks]]></title>
      <link>${SITE_CONFIG.url}/security/patterns</link>
      <guid isPermaLink="true">${SITE_CONFIG.url}/security/patterns</guid>
      <description><![CDATA[Production security defense runbooks and code patterns for Prompt Injection, Jailbreaking, Data Exfiltration, and PII Masking.]]></description>
      <pubDate>${currentDate}</pubDate>
      <category>Security & Compliance</category>
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
    ${cookbooksXml}
    ${hubsXml}
  </channel>
</rss>`;

  return new NextResponse(rssFeed, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200',
    },
  });
}
