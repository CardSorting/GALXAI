import { constructMetadata } from '../src/lib/seo/metadata';
import { SITE_CONFIG } from '../src/lib/seo/siteConfig';

console.log('🔍 Auditing constructMetadata SEO Factory & Tag Normalization...\n');

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

// Test 1: Default Metadata
const def = constructMetadata();
assert(typeof def.title === 'string' && def.title.includes(SITE_CONFIG.name), 'Default title contains brand name');
assert(Boolean(def.metadataBase), 'metadataBase is configured');
assert((def.twitter as any)?.card === 'summary_large_image', 'Twitter card is summary_large_image');
assert((def.robots as any)?.googleBot?.['max-image-preview'] === 'large', 'googleBot max-image-preview is large');

// Test 2: Custom Canonical & Path
const custom = constructMetadata({
  title: 'Custom Test Page',
  description: 'Custom description text for verification.',
  canonicalPath: '/custom-test',
});
assert((custom.title as string).startsWith('Custom Test Page'), 'Custom title formatted correctly');
assert((custom.alternates as any)?.canonical === `${SITE_CONFIG.url}/custom-test`, 'Canonical URL generated cleanly without trailing slash issues');

// Test 3: Noindex flag
const noIndexMeta = constructMetadata({
  noIndex: true,
});
assert((noIndexMeta.robots as any)?.index === false, 'noIndex flag sets robots index to false');
assert((noIndexMeta.robots as any)?.googleBot?.index === false, 'noIndex flag sets googleBot index to false');

console.log(`\nMetadata Factory Audit: ${passCount} Passed, ${failCount} Failed.`);

if (failCount > 0) {
  process.exit(1);
}
