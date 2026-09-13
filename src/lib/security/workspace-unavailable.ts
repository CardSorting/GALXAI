import { NextRequest, NextResponse } from 'next/server';
import { workspaceReturnPath } from './workspace-policy';

export function workspaceUnavailableResponse(request: NextRequest): NextResponse {
  const message = 'Your session could not be checked. Try again shortly.';
  const html = ['GET', 'HEAD'].includes(request.method) && request.headers.get('accept')?.includes('text/html') && request.headers.get('rsc') !== '1';
  if (!html) return new NextResponse(message, { status: 503, headers: { 'Retry-After': '3', 'Content-Type': 'text/plain; charset=utf-8' } });
  const retry = workspaceReturnPath(request.nextUrl.pathname, request.nextUrl.searchParams).replace(/[&<>"']/g, value => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[value]!);
  return new NextResponse(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Session unavailable | GALX</title><style>
    :root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#07080d;color:#f3f4f6;font:16px/1.5 system-ui,sans-serif}main{min-height:100svh;display:grid;place-content:center;padding:24px}section{max-width:400px}h1{font-size:30px;line-height:1.25;font-weight:600;letter-spacing:-.025em;margin:0 0 16px}p{color:#9ca3af;margin:0 0 24px}a{display:flex;align-items:center;justify-content:center;min-height:48px;padding:12px 16px;border-radius:8px;color:#00f0ff;text-underline-offset:3px}a:first-of-type{background:#4f46e5;color:white;text-decoration:none;margin-bottom:12px}a:focus-visible{outline:3px solid #00f0ff;outline-offset:4px}
    </style></head><body><main><section><h1>We couldn’t check your session</h1><p>This may be temporary. Try again to continue to your workspace.</p><a href="${retry}">Try again</a><a href="/">Back to home</a></section></main></body></html>`, {
    status: 503, headers: { 'Retry-After': '3', 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'" },
  });
}
