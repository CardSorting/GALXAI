export function GET() {
  return new Response('<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>GALX</title><link>https://galx.ai</link><description>Create and explore with GALX, powered by GALX Nova.</description></channel></rss>', { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
