import { SITE_CONFIG } from '../src/lib/seo/siteConfig';

console.log('🔍 Auditing Edge Middleware & Search Engine Verification Protocols...\n');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failCount++;
  }
}

// 1. GSC Verification
assert(Boolean(SITE_CONFIG.verification.google), 'Google Search Console verification token configured');

// 2. Bing Webmaster
assert(Boolean(SITE_CONFIG.verification.bing), 'Bing Webmaster Tools verification token configured');

// 3. Yandex Webmaster
assert(Boolean(SITE_CONFIG.verification.yandex), 'Yandex Webmaster verification token configured');

// 4. IndexNow API Key
assert(Boolean(SITE_CONFIG.indexNow.key), 'IndexNow protocol key configured');
assert(SITE_CONFIG.indexNow.key === 'galxai-indexnow-key-2026', 'IndexNow key matches public key file');
assert(SITE_CONFIG.indexNow.keyLocation.endsWith('.txt'), 'IndexNow keyLocation points to valid txt key file');

console.log(`\nMiddleware & Search Protocols Audit: ${passCount} Passed, ${failCount} Failed.`);

if (failCount > 0) {
  process.exit(1);
}
