import http from 'node:http';
import https from 'node:https';

// ANSI Colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

function parseArgs() {
  const args = process.argv.slice(2);
  let targetUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  for (const arg of args) {
    if (arg.startsWith('--url=')) {
      targetUrl = arg.split('=')[1];
    }
  }
  // Trim trailing slash
  targetUrl = targetUrl.replace(/\/+$/, '');
  return { targetUrl };
}

interface TestResult {
  name: string;
  url: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  details: string;
  latencyMs: number;
}

function formatError(err: any): string {
  if (!err) return 'Unknown connection error';
  if (err.code === 'ECONNREFUSED') {
    return 'Connection refused (Server is not running on this URL/port)';
  }
  if (err.code === 'ENOTFOUND') {
    return 'DNS Host lookup failed (Domain does not resolve)';
  }
  if (err.code === 'ETIMEDOUT') {
    return 'Connection timed out (10s limit)';
  }
  if (typeof err === 'object' && err.message) {
    return err.message;
  }
  return String(err);
}

async function fetchRoute(url: string, options: { method?: string; headers?: Record<string, string> } = {}): Promise<{
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
  latencyMs: number;
}> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;

    const req = client.request(
      url,
      {
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'GALXAI-Vercel-Deployment-Auditor/2.0',
          ...options.headers,
        },
        timeout: 10000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers,
            body: data,
            latencyMs: Date.now() - start,
          });
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out (10s limit)'));
    });
    req.end();
  });
}

async function runSmokeTests() {
  const { targetUrl } = parseArgs();

  console.log(`\n${BOLD}${CYAN}======================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}     GALXAI: POST-DEPLOYMENT VERCEL LIVE SMOKE TEST SUITE             ${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================================${RESET}`);
  console.log(`  Target Deployment URL: ${BOLD}${targetUrl}${RESET}\n`);

  const results: TestResult[] = [];

  // Test 1: Health & Telemetry Endpoint
  try {
    const res = await fetchRoute(`${targetUrl}/api/health`);
    const json = JSON.parse(res.body);
    if (res.statusCode === 200 && json.status === 'healthy') {
      results.push({
        name: 'API Health & Readiness Telemetry',
        url: `${targetUrl}/api/health`,
        status: 'PASS',
        details: `HTTP 200 OK | Version: ${json.version} | Models: ${json.models?.total}`,
        latencyMs: res.latencyMs,
      });
    } else {
      results.push({
        name: 'API Health & Readiness Telemetry',
        url: `${targetUrl}/api/health`,
        status: 'FAIL',
        details: `Unexpected response: HTTP ${res.statusCode}`,
        latencyMs: res.latencyMs,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'API Health & Readiness Telemetry',
      url: `${targetUrl}/api/health`,
      status: 'FAIL',
      details: formatError(err),
      latencyMs: 0,
    });
  }

  // Test 2: Homepage HTML Prerender
  try {
    const res = await fetchRoute(`${targetUrl}/`);
    if (res.statusCode === 200 && res.body.includes('<html')) {
      results.push({
        name: 'Landing Page Static Prerender',
        url: `${targetUrl}/`,
        status: 'PASS',
        details: `HTTP 200 OK | Payload: ${(res.body.length / 1024).toFixed(1)} KB`,
        latencyMs: res.latencyMs,
      });
    } else {
      results.push({
        name: 'Landing Page Static Prerender',
        url: `${targetUrl}/`,
        status: 'FAIL',
        details: `HTTP status: ${res.statusCode}`,
        latencyMs: res.latencyMs,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'Landing Page Static Prerender',
      url: `${targetUrl}/`,
      status: 'FAIL',
      details: formatError(err),
      latencyMs: 0,
    });
  }

  // Test 3: Edge OpenGraph Image Generator
  try {
    const res = await fetchRoute(`${targetUrl}/opengraph-image`);
    const contentType = String(res.headers['content-type'] || '');
    if (res.statusCode === 200 && contentType.includes('image')) {
      results.push({
        name: 'Edge OpenGraph Image Generator',
        url: `${targetUrl}/opengraph-image`,
        status: 'PASS',
        details: `HTTP 200 OK | Content-Type: ${contentType}`,
        latencyMs: res.latencyMs,
      });
    } else {
      results.push({
        name: 'Edge OpenGraph Image Generator',
        url: `${targetUrl}/opengraph-image`,
        status: 'WARN',
        details: `HTTP ${res.statusCode} | Content-Type: ${contentType}`,
        latencyMs: res.latencyMs,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'Edge OpenGraph Image Generator',
      url: `${targetUrl}/opengraph-image`,
      status: 'WARN',
      details: formatError(err),
      latencyMs: 0,
    });
  }

  // Test 4: Dynamic Robots.txt
  try {
    const res = await fetchRoute(`${targetUrl}/robots.txt`);
    if (res.statusCode === 200 && res.body.includes('User-Agent')) {
      results.push({
        name: 'Robots.txt Crawl Policy',
        url: `${targetUrl}/robots.txt`,
        status: 'PASS',
        details: `HTTP 200 OK | Valid crawl directive`,
        latencyMs: res.latencyMs,
      });
    } else {
      results.push({
        name: 'Robots.txt Crawl Policy',
        url: `${targetUrl}/robots.txt`,
        status: 'FAIL',
        details: `HTTP ${res.statusCode}`,
        latencyMs: res.latencyMs,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'Robots.txt Crawl Policy',
      url: `${targetUrl}/robots.txt`,
      status: 'FAIL',
      details: formatError(err),
      latencyMs: 0,
    });
  }

  // Test 5: Dynamic Sitemap.xml
  try {
    const res = await fetchRoute(`${targetUrl}/sitemap.xml`);
    if (res.statusCode === 200 && (res.body.includes('urlset') || res.body.includes('<?xml'))) {
      results.push({
        name: 'Dynamic XML Sitemap Generation',
        url: `${targetUrl}/sitemap.xml`,
        status: 'PASS',
        details: `HTTP 200 OK | Valid sitemap structure`,
        latencyMs: res.latencyMs,
      });
    } else {
      results.push({
        name: 'Dynamic XML Sitemap Generation',
        url: `${targetUrl}/sitemap.xml`,
        status: 'FAIL',
        details: `HTTP ${res.statusCode}`,
        latencyMs: res.latencyMs,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'Dynamic XML Sitemap Generation',
      url: `${targetUrl}/sitemap.xml`,
      status: 'FAIL',
      details: formatError(err),
      latencyMs: 0,
    });
  }

  // Test 6: Security Response Headers
  try {
    const res = await fetchRoute(`${targetUrl}/api/health`);
    const hasNosniff = res.headers['x-content-type-options'] === 'nosniff';
    const hasCsp = Boolean(res.headers['content-security-policy']);
    if (hasNosniff && hasCsp) {
      results.push({
        name: 'Perimeter Security Headers',
        url: `${targetUrl}/api/health`,
        status: 'PASS',
        details: `X-Content-Type-Options and Content-Security-Policy verified`,
        latencyMs: res.latencyMs,
      });
    } else {
      results.push({
        name: 'Perimeter Security Headers',
        url: `${targetUrl}/api/health`,
        status: 'WARN',
        details: `Security headers not detected on response`,
        latencyMs: res.latencyMs,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'Perimeter Security Headers',
      url: `${targetUrl}/api/health`,
      status: 'WARN',
      details: formatError(err),
      latencyMs: 0,
    });
  }

  // Test 7: Universal OpenAPI Models Catalog Endpoint
  try {
    const res = await fetchRoute(`${targetUrl}/v1/models`);
    const json = JSON.parse(res.body);
    if (res.statusCode === 200 && Array.isArray(json.data) && json.data.length > 0) {
      results.push({
        name: 'OpenAI-Compatible Models Catalog (/v1/models)',
        url: `${targetUrl}/v1/models`,
        status: 'PASS',
        details: `HTTP 200 OK | ${json.data.length} registered frontier models`,
        latencyMs: res.latencyMs,
      });
    } else {
      results.push({
        name: 'OpenAI-Compatible Models Catalog (/v1/models)',
        url: `${targetUrl}/v1/models`,
        status: 'FAIL',
        details: `HTTP ${res.statusCode} | Invalid model payload`,
        latencyMs: res.latencyMs,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'OpenAI-Compatible Models Catalog (/v1/models)',
      url: `${targetUrl}/v1/models`,
      status: 'FAIL',
      details: formatError(err),
      latencyMs: 0,
    });
  }

  // Test 8: CORS Preflight Handler Verification
  try {
    const res = await fetchRoute(`${targetUrl}/api/health`, { method: 'OPTIONS' });
    const allowOrigin = res.headers['access-control-allow-origin'];
    if (res.statusCode === 204 || res.statusCode === 200) {
      results.push({
        name: 'CORS Pre-Flight OPTIONS Handler',
        url: `${targetUrl}/api/health`,
        status: 'PASS',
        details: `HTTP ${res.statusCode} | Access-Control-Allow-Origin: ${allowOrigin || '*'}`,
        latencyMs: res.latencyMs,
      });
    } else {
      results.push({
        name: 'CORS Pre-Flight OPTIONS Handler',
        url: `${targetUrl}/api/health`,
        status: 'WARN',
        details: `HTTP ${res.statusCode}`,
        latencyMs: res.latencyMs,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'CORS Pre-Flight OPTIONS Handler',
      url: `${targetUrl}/api/health`,
      status: 'WARN',
      details: formatError(err),
      latencyMs: 0,
    });
  }

  // Test 9: OpenSearch XML Auto-Discovery Endpoint
  try {
    const res = await fetchRoute(`${targetUrl}/opensearch.xml`);
    if (res.statusCode === 200 && res.body.includes('OpenSearchDescription')) {
      results.push({
        name: 'OpenSearch Browser XML Auto-Discovery',
        url: `${targetUrl}/opensearch.xml`,
        status: 'PASS',
        details: `HTTP 200 OK | OpenSearch compliant`,
        latencyMs: res.latencyMs,
      });
    } else {
      results.push({
        name: 'OpenSearch Browser XML Auto-Discovery',
        url: `${targetUrl}/opensearch.xml`,
        status: 'WARN',
        details: `HTTP ${res.statusCode}`,
        latencyMs: res.latencyMs,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'OpenSearch Browser XML Auto-Discovery',
      url: `${targetUrl}/opensearch.xml`,
      status: 'WARN',
      details: formatError(err),
      latencyMs: 0,
    });
  }

  // Test 10: Model Updates RSS / Atom Feed
  try {
    const res = await fetchRoute(`${targetUrl}/feed.xml`);
    if (res.statusCode === 200 && (res.body.includes('<rss') || res.body.includes('<xml') || res.body.includes('<feed'))) {
      results.push({
        name: 'Model & Engine RSS/Atom XML Feed',
        url: `${targetUrl}/feed.xml`,
        status: 'PASS',
        details: `HTTP 200 OK | RSS feed valid`,
        latencyMs: res.latencyMs,
      });
    } else {
      results.push({
        name: 'Model & Engine RSS/Atom XML Feed',
        url: `${targetUrl}/feed.xml`,
        status: 'WARN',
        details: `HTTP ${res.statusCode}`,
        latencyMs: res.latencyMs,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'Model & Engine RSS/Atom XML Feed',
      url: `${targetUrl}/feed.xml`,
      status: 'WARN',
      details: formatError(err),
      latencyMs: 0,
    });
  }

  // Test 11: RFC 9116 Security Vulnerability Policy
  try {
    const res = await fetchRoute(`${targetUrl}/.well-known/security.txt`);
    if (res.statusCode === 200 && res.body.includes('Contact:')) {
      results.push({
        name: 'RFC 9116 Security Vulnerability Policy',
        url: `${targetUrl}/.well-known/security.txt`,
        status: 'PASS',
        details: `HTTP 200 OK | Canonical disclosure policy verified`,
        latencyMs: res.latencyMs,
      });
    } else {
      results.push({
        name: 'RFC 9116 Security Vulnerability Policy',
        url: `${targetUrl}/.well-known/security.txt`,
        status: 'WARN',
        details: `HTTP ${res.statusCode}`,
        latencyMs: res.latencyMs,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'RFC 9116 Security Vulnerability Policy',
      url: `${targetUrl}/.well-known/security.txt`,
      status: 'WARN',
      details: formatError(err),
      latencyMs: 0,
    });
  }

  // Test 12: Individual Model Specs Endpoint & SWR Caching
  try {
    const res = await fetchRoute(`${targetUrl}/v1/models/gpt-5.6-sol`);
    const json = JSON.parse(res.body);
    const hasCachedHeader = Boolean(res.headers['cache-control'] || res.headers['x-galx-cached']);
    if (res.statusCode === 200 && json.id === 'gpt-5.6-sol') {
      results.push({
        name: 'Model Spec Endpoint & Edge SWR (/v1/models/[id])',
        url: `${targetUrl}/v1/models/gpt-5.6-sol`,
        status: 'PASS',
        details: `HTTP 200 OK | ID: ${json.id} | Edge Caching: ${hasCachedHeader ? 'Active' : 'Bypassed'}`,
        latencyMs: res.latencyMs,
      });
    } else {
      results.push({
        name: 'Model Spec Endpoint & Edge SWR (/v1/models/[id])',
        url: `${targetUrl}/v1/models/gpt-5.6-sol`,
        status: 'FAIL',
        details: `HTTP ${res.statusCode}`,
        latencyMs: res.latencyMs,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'Model Spec Endpoint & Edge SWR (/v1/models/[id])',
      url: `${targetUrl}/v1/models/gpt-5.6-sol`,
      status: 'FAIL',
      details: formatError(err),
      latencyMs: 0,
    });
  }

  // Test 13: Versioned browser agent bootstrap (no secret-bearing payload)
  try {
    const res = await fetchRoute(`${targetUrl}/api/client/bootstrap`);
    const json = JSON.parse(res.body);
    const serialized = JSON.stringify(json).toLowerCase();
    const hasSecretField = serialized.includes('api_key') || serialized.includes('client_secret') || serialized.includes('access_token');
    if (
      res.statusCode === 200 &&
      json.protocolVersion === '2026-09-04' &&
      json.agent?.transport === 'sse' &&
      json.security?.sameOrigin === true &&
      json.security?.providerKeysAcceptedInBrowser === false &&
      !hasSecretField
    ) {
      results.push({
        name: 'Versioned Browser Agent Bootstrap',
        url: `${targetUrl}/api/client/bootstrap`,
        status: 'PASS',
        details: `Protocol ${json.protocolVersion} | same-origin SSE | secret-free payload`,
        latencyMs: res.latencyMs,
      });
    } else {
      results.push({
        name: 'Versioned Browser Agent Bootstrap',
        url: `${targetUrl}/api/client/bootstrap`,
        status: 'FAIL',
        details: `HTTP ${res.statusCode} | invalid or secret-bearing bootstrap contract`,
        latencyMs: res.latencyMs,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'Versioned Browser Agent Bootstrap',
      url: `${targetUrl}/api/client/bootstrap`,
      status: 'FAIL',
      details: formatError(err),
      latencyMs: 0,
    });
  }

  // Print Results
  let fails = 0;
  for (const r of results) {
    const icon = r.status === 'PASS' ? `${GREEN}✓${RESET}` : r.status === 'WARN' ? `${YELLOW}⚠${RESET}` : `${RED}✗${RESET}`;
    console.log(`  ${icon} ${BOLD}${r.name}${RESET} ${DIM}(${r.latencyMs}ms)${RESET}`);
    console.log(`     ${DIM}Endpoint:${RESET} ${r.url}`);
    console.log(`     ${DIM}Details:${RESET}  ${r.details}\n`);
    if (r.status === 'FAIL') fails++;
  }

  console.log(`${BOLD}${CYAN}======================================================================${RESET}`);
  if (fails === 0) {
    console.log(`${GREEN}${BOLD}✓ ALL LIVE DEPLOYMENT SMOKE TESTS PASSED!${RESET}`);
  } else {
    console.log(`${RED}${BOLD}✗ ${fails} SMOKE TEST(S) FAILED ON ${targetUrl}${RESET}`);
    process.exit(1);
  }
  console.log(`${BOLD}${CYAN}======================================================================${RESET}\n`);
}

runSmokeTests().catch((err) => {
  console.error('Smoke test suite error:', err);
  process.exit(1);
});
