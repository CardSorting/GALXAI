import { GET } from '../src/app/feed.xml/route';
import { SITE_CONFIG } from '../src/lib/seo/siteConfig';

console.log('🔍 Auditing RSS 2.0 Syndication Feed Structure & XML Validity...\n');

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

async function run() {
  const response = await GET();
  assert(response.status === 200, 'Feed route returns HTTP 200 OK');

  const contentType = response.headers.get('Content-Type');
  assert(Boolean(contentType?.includes('rss+xml') || contentType?.includes('xml')), 'Content-Type is valid RSS/XML');

  const xml = await response.text();
  assert(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), 'Valid XML declaration present');
  assert(xml.includes('<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">'), 'Valid RSS 2.0 namespace present');
  assert(xml.includes(`<atom:link href="${SITE_CONFIG.url}/feed.xml" rel="self" type="application/rss+xml"/>`), 'Self atom:link present');
  assert(xml.includes('<title>'), 'Channel title present');
  assert(xml.includes('<item>'), 'Contains syndicated items');
  assert(xml.includes('/tools'), 'Syndicates /tools hub');
  assert(xml.includes('/providers'), 'Syndicates /providers hub');
  assert(xml.includes('/capabilities'), 'Syndicates /capabilities hub');
  assert(xml.includes('/solutions'), 'Syndicates /solutions hub');
  assert(xml.includes('/industries'), 'Syndicates /industries hub');
  assert(xml.includes('/migrate'), 'Syndicates /migrate hub');
  assert(xml.includes('/alternatives'), 'Syndicates /alternatives hub');

  console.log(`\nRSS Feed Integrity Audit: ${passCount} Passed, ${failCount} Failed.`);

  if (failCount > 0) {
    process.exit(1);
  }
}

run();
