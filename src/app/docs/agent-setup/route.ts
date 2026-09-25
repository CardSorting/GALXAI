export function GET(request: Request) {
  void request;
  return new Response('This public capability does not have an integration setup guide. Visit https://galx.ai/docs for the current product overview.', {
    status: 410,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600', 'X-Robots-Tag': 'noindex, nofollow' },
  });
}
