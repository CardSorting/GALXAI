import { NextResponse } from 'next/server';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';
import { EXCLUSIVE_MODEL_CATALOG } from '@/core/router/ModelCatalog';

export const dynamic = 'force-static';
export const revalidate = 86400; // 24 hours

export async function GET() {
  const currentDate = new Date().toUTCString();

  const modelItemsXml = EXCLUSIVE_MODEL_CATALOG.map((model) => {
    const slug = model.id.replace('/', '-');
    const link = `${SITE_CONFIG.url}/models/${slug}`;
    const pubDate = new Date('2025-01-01').toUTCString();

    return `
    <item>
      <title><![CDATA[${model.name} — Specs & Wholesale Pricing]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description><![CDATA[${model.description} Wholesale Rate: $${model.inputPricePer1M.toFixed(2)}/1M Input, $${model.outputPricePer1M.toFixed(2)}/1M Output (${model.discountPercentage}% off list).]]></description>
      <pubDate>${pubDate}</pubDate>
      <category>AI Models</category>
    </item>`;
  }).join('\n');

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
  </channel>
</rss>`;

  return new NextResponse(rssFeed, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200',
    },
  });
}
