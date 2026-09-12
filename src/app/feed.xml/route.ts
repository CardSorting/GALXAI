export function GET() {
  return new Response('<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>GALX</title><link>https://galx.ai</link><description>Create images and build sites. Developer tools are in private preview.</description></channel></rss>', { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
