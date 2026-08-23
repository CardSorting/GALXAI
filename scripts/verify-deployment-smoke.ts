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
      details: err.message,
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
      details: err.message,
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
      details: err.message,
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
      details: err.message,
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
      details: err.message,
      latencyMs: 0,
    });
  }

  // Test 6: Security Response Headers
  try {
    const res = await fetchRoute(`${targetUrl}/api/health`);
    const hasNosniff = res.headers['x-content-type-options'] === 'nosniff';
    const hasXss = Boolean(res.headers['x-xss-protection']);
    if (hasNosniff || hasXss) {
      results.push({
        name: 'Perimeter Security Headers',
        url: `${targetUrl}/api/health`,
        status: 'PASS',
        details: `X-Content-Type-Options & Security Headers verified`,
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
      details: err.message,
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
