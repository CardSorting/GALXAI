/**
 * GALXAI Global SEO & Site Configuration (Apex Tier)
 * Single source of truth for canonical domains, social metadata, branding, Wikidata Knowledge Graph mappings, and E-E-A-T descriptors.
 */

export const SITE_CONFIG = {
  name: 'GALXAI',
  legalName: 'GALXAI Technologies Inc.',
  alternateName: ['GALX AI'],
  tagline: 'Generative Creative Playground & Sustainable Frontier Intelligence',
  description:
    'A generative creative playground with community creators and sustainable serving of frontier-level intelligence. Serving OpenAI GPT-5.6 Luna for the highest performance per dollar so developers can build and explore without constraints.',
  // Discovery always identifies the public origin, including local/preview builds.
  // Runtime callback and request origins have their own configuration.
  url: 'https://galx.ai',
  apiUrl: 'https://galx.ai/v1',
  ogImage: '/brand/galaxy-hero-banner.jpg',
  twitterHandle: '@galxai',
  foundingDate: '2024-01-15',
  address: {
    streetAddress: '548 Market St, Suite 39201',
    addressLocality: 'San Francisco',
    addressRegion: 'CA',
    postalCode: '94104',
    addressCountry: 'US',
  },
  links: {
    twitter: 'https://twitter.com/galxai',
    github: 'https://github.com/galxai',
    docs: 'https://galx.ai/docs',
    status: 'https://galx.ai/status',
    discord: 'https://discord.gg/galxai',
    linkedin: 'https://linkedin.com/company/galxai',
  },
  wikidataEntities: {
    openai: 'https://www.wikidata.org/wiki/Q105634538',
    largeLanguageModel: 'https://www.wikidata.org/wiki/Q115305900',
    artificialIntelligence: 'https://www.wikidata.org/wiki/Q11660',
    serverSentEvents: 'https://www.wikidata.org/wiki/Q1890352',
    applicationProgrammingInterface: 'https://www.wikidata.org/wiki/Q165137',
    cloudComputing: 'https://www.wikidata.org/wiki/Q483247',
    jsonSchema: 'https://www.wikidata.org/wiki/Q28935449',
    computerSecurity: 'https://www.wikidata.org/wiki/Q3510521',
    tokenBucket: 'https://www.wikidata.org/wiki/Q1499596',
    reverseProxy: 'https://www.wikidata.org/wiki/Q1143875',
    loadBalancing: 'https://www.wikidata.org/wiki/Q652487',
    latency: 'https://www.wikidata.org/wiki/Q1819543',
    throughput: 'https://www.wikidata.org/wiki/Q1412662',
    zeroTrust: 'https://www.wikidata.org/wiki/Q85816911',
  },
  certifications: [
    {
      name: 'SOC 2 Type II Security Attestation',
      auditor: 'Schellman & Company, LLC',
      status: 'Active / Clean Unqualified Opinion',
    },
    {
      name: 'ISO/IEC 27001:2022 Certification',
      auditor: 'BSI Group Global Registrars',
      status: 'ANAB Accredited',
    },
    {
      name: 'HIPAA Business Associate Security Compliance',
      status: 'Verified Zero PHI Storage',
    },
  ],
  keywords: ['GALX', 'GALX Images', 'AI image generator', 'masonry stream', 'prompt studio', 'diffusion models', 'public beta'],
  authors: [
    {
      name: 'GALXAI Systems & AI Security Architecture Group',
      url: 'https://galx.ai/about',
    },
  ],
  creator: 'GALXAI Technologies Inc.',
  publisher: 'GALXAI Technologies Inc.',
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || 'google-site-verification-galxai-apex',
    bing: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION || 'bing-site-verification-galxai-apex',
    yandex: process.env.NEXT_PUBLIC_YANDEX_SITE_VERIFICATION || 'yandex-site-verification-galxai',
    baidu: process.env.NEXT_PUBLIC_BAIDU_SITE_VERIFICATION,
  },
  indexNow: {
    key: process.env.INDEXNOW_KEY || 'galxai-indexnow-key-2026',
    keyLocation: 'https://galx.ai/galxai-indexnow-key-2026.txt',
  },
  contactPoint: {
    email: 'support@galx.ai',
    contactType: 'Customer Support & Security Incident Response',
    availableLanguage: ['English'],
  },
};
