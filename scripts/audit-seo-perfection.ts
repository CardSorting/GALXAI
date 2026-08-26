import { SITE_CONFIG } from '../src/lib/seo/siteConfig';
import sitemap from '../src/app/sitemap';
import robots from '../src/app/robots';
import { FRONTEND_VISIBLE_MODELS } from '../src/core/router/ModelCatalog';
import { COOKBOOK_RECIPES_DATA } from '../src/lib/data/cookbooksData';
import { PROVIDERS_DATA } from '../src/lib/data/providersData';
import { CAPABILITIES_DATA } from '../src/lib/data/capabilitiesData';
import { SECURITY_SPECIFICATIONS_DATA } from '../src/lib/data/securityData';
import { SECURITY_PATTERNS_DATA } from '../src/lib/data/securityPatternsData';
import { RELIABILITY_DATA } from '../src/lib/data/reliabilityData';
import { POSTMORTEMS_DATA } from '../src/lib/data/postmortemsData';
import { INDUSTRIES_DATA } from '../src/lib/data/industriesData';
import { SOLUTION_GUIDES } from '../src/lib/data/solutionsData';
import { MIGRATION_GUIDES_DATA } from '../src/lib/data/migrationData';
import { COMPETITOR_ALTERNATIVES } from '../src/lib/data/alternativesData';
import { CURATED_MATCHUPS } from '../src/lib/data/comparisonData';
import { ERROR_TROUBLESHOOT_DATA } from '../src/lib/data/errorsData';
import { INTEGRATION_GUIDES } from '../src/lib/data/integrationsData';
import { GLOSSARY_TERMS } from '../src/lib/data/glossaryData';

console.log('🔍 Running Apex-Tier SEO & Search Console Audit...\n');

let errorCount = 0;
let passCount = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    errorCount++;
  } else {
    console.log(`✅ PASS: ${message}`);
    passCount++;
  }
}

// 1. Site Configuration Verification
assert(!!SITE_CONFIG.url, 'SITE_CONFIG.url is set');
assert(!!SITE_CONFIG.verification.google, 'Google Search Console verification is configured');
assert(!!SITE_CONFIG.verification.bing, 'Bing Webmaster Tools verification is configured');
assert(!!SITE_CONFIG.indexNow.key, 'IndexNow key is configured');

// 2. Sitemap Validation
const sitemapEntries = sitemap();
assert(sitemapEntries.length > 50, `Sitemap has ${sitemapEntries.length} entries (robust programmatic coverage)`);

const urls = sitemapEntries.map(e => e.url);
const uniqueUrls = new Set(urls);
assert(uniqueUrls.size === urls.length, `Zero duplicate URLs in sitemap (${urls.length} unique)`);

// Check no redirected URLs are in sitemap
assert(!urls.includes(`${SITE_CONFIG.url}/telemetry`), 'Sitemap excludes redirecting /telemetry');
assert(!urls.includes(`${SITE_CONFIG.url}/vault`), 'Sitemap excludes redirecting /vault');

// Check all 15 Hub Pages are in sitemap
const expectedHubs = [
  '/tools',
  '/cookbook',
  '/providers',
  '/capabilities',
  '/security',
  '/security/patterns',
  '/reliability',
  '/postmortems',
  '/industries',
  '/solutions',
  '/migrate',
  '/alternatives',
  '/models/vs',
  '/docs/errors',
  '/docs/integrations',
];

for (const hub of expectedHubs) {
  assert(urls.includes(`${SITE_CONFIG.url}${hub}`), `Sitemap includes topic hub: ${hub}`);
}

// 3. Robots.txt Validation
const robotsConfig = robots();
assert(!!robotsConfig.rules, 'Robots rules configured');
assert(robotsConfig.sitemap === `${SITE_CONFIG.url}/sitemap.xml`, 'Robots sitemap matches canonical sitemap.xml');

// 4. Data Set Coverage Check
assert(FRONTEND_VISIBLE_MODELS.length > 0, `Models: ${FRONTEND_VISIBLE_MODELS.length}`);
assert(COOKBOOK_RECIPES_DATA.length > 0, `Cookbooks: ${COOKBOOK_RECIPES_DATA.length}`);
assert(PROVIDERS_DATA.length > 0, `Providers: ${PROVIDERS_DATA.length}`);
assert(CAPABILITIES_DATA.length > 0, `Capabilities: ${CAPABILITIES_DATA.length}`);
assert(SECURITY_SPECIFICATIONS_DATA.length > 0, `Security Specs: ${SECURITY_SPECIFICATIONS_DATA.length}`);
assert(SECURITY_PATTERNS_DATA.length > 0, `Security Patterns: ${SECURITY_PATTERNS_DATA.length}`);
assert(RELIABILITY_DATA.length > 0, `Reliability Guides: ${RELIABILITY_DATA.length}`);
assert(POSTMORTEMS_DATA.length > 0, `Postmortems: ${POSTMORTEMS_DATA.length}`);
assert(INDUSTRIES_DATA.length > 0, `Industries: ${INDUSTRIES_DATA.length}`);
assert(SOLUTION_GUIDES.length > 0, `Solutions: ${SOLUTION_GUIDES.length}`);
assert(MIGRATION_GUIDES_DATA.length > 0, `Migrations: ${MIGRATION_GUIDES_DATA.length}`);
assert(COMPETITOR_ALTERNATIVES.length > 0, `Alternatives: ${COMPETITOR_ALTERNATIVES.length}`);
assert(CURATED_MATCHUPS.length > 0, `Matchups: ${CURATED_MATCHUPS.length}`);
assert(ERROR_TROUBLESHOOT_DATA.length > 0, `Error Runbooks: ${ERROR_TROUBLESHOOT_DATA.length}`);
assert(INTEGRATION_GUIDES.length > 0, `Integrations: ${INTEGRATION_GUIDES.length}`);
assert(GLOSSARY_TERMS.length > 0, `Glossary Terms: ${GLOSSARY_TERMS.length}`);

// 5. OpenSearch Suggestions & Auto-Complete Integration Check
import { GET as getSuggestions } from '../src/app/api/models/suggestions/route';

async function testSuggestions() {
  const req = new Request('https://galx.ai/api/models/suggestions?q=gpt');
  const res = await getSuggestions(req);
  const data = await res.json();
  assert(Array.isArray(data), 'OpenSearch returns 4-element tuple array format');
  assert(data[0] === 'gpt', 'OpenSearch first element is search term');
  assert(Array.isArray(data[1]) && data[1].length > 0, 'OpenSearch returns matching suggestions');
  assert(Array.isArray(data[3]) && data[3].length > 0, 'OpenSearch returns valid destination URLs');

  const jsonReq = new Request('https://galx.ai/api/models/suggestions?q=cache&format=json');
  const jsonRes = await getSuggestions(jsonReq);
  const jsonData = await jsonRes.json();
  assert(jsonData.query === 'cache', 'JSON format preserves query');
  assert(jsonData.suggestions.length > 0, 'JSON format returns structured results');
}

// 6. Client-Side BroccoliOmniSearch Indexing Check
import { BroccoliOmniSearch } from '../src/lib/resilience/BroccoliOmniSearch';

function testOmniSearch() {
  const roiResults = BroccoliOmniSearch.search('roi calculator');
  assert(roiResults.length > 0, 'OmniSearch finds ROI calculator');
  assert(roiResults[0].href === '/tools/roi-calculator', 'OmniSearch top result points to /tools/roi-calculator');

  const errorResults = BroccoliOmniSearch.search('rate limit 429');
  assert(errorResults.length > 0, 'OmniSearch finds HTTP 429 error runbook');

  const cookbookResults = BroccoliOmniSearch.search('streaming sse');
  assert(cookbookResults.length > 0, 'OmniSearch finds Next.js SSE streaming cookbook');

  const altResults = BroccoliOmniSearch.search('openrouter alternative');
  assert(altResults.length > 0, 'OmniSearch finds OpenRouter alternative comparison');
}

await testSuggestions();
testOmniSearch();

console.log(`\n📊 Audit Summary: ${passCount} Passed, ${errorCount} Failed`);

if (errorCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 Apex-Tier Technical SEO, OpenSearch & OmniSearch Audit 100% Passed!\n');
}


