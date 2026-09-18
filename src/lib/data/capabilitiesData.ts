/**
 * AI Gateway Capabilities Dataset for Programmatic SEO (pSEO) and AEO
 */

export interface CapabilityItem {
  slug: string;
  badge: string;
  title: string;
  headline: string;
  description: string;
  architecturalOverview: string;
  technicalHighlights: string[];
  benchmarkMetric: {
    label: string;
    value: string;
    subtext: string;
  };
  codeSnippet: {
    language: string;
    code: string;
  };
  faqs: { q: string; a: string }[];
}

export const CAPABILITIES_DATA: CapabilityItem[] = [
  {
    "slug": "text-generation",
    "badge": "GALX API",
    "title": "Text generation",
    "headline": "Text generation",
    "description": "Generate text from messages using the model that fits your application.",
    "architecturalOverview": "Generate text from messages using the model that fits your application.",
    "technicalHighlights": [
      "Select a model from the catalog",
      "Send messages with system and user roles",
      "Use streaming for incremental text"
    ],
    "benchmarkMetric": {
      "label": "Reference",
      "value": "API",
      "subtext": "See the documented request contract"
    },
    "codeSnippet": {
      "language": "bash",
      "code": "curl https://galx.ai/v1/models"
    },
    "faqs": [
      {
        "q": "Where can I find supported inputs?",
        "a": "See the model catalog and API documentation for request fields and limitations."
      }
    ]
  },
  {
    "slug": "image-generation",
    "badge": "GALX API",
    "title": "Image generation",
    "headline": "Image generation",
    "description": "Generate a static image from a text prompt.",
    "architecturalOverview": "Generate a static image from a text prompt.",
    "technicalHighlights": [
      "Use galx-nova-image",
      "Receive PNG, JPEG, or WebP",
      "Request JSON explicitly for existing clients"
    ],
    "benchmarkMetric": {
      "label": "Reference",
      "value": "API",
      "subtext": "See the documented request contract"
    },
    "codeSnippet": {
      "language": "bash",
      "code": "curl https://galx.ai/v1/models"
    },
    "faqs": [
      {
        "q": "Where can I find supported inputs?",
        "a": "See the model catalog and API documentation for request fields and limitations."
      }
    ]
  },
  {
    "slug": "structured-outputs",
    "badge": "GALX API",
    "title": "Structured outputs",
    "headline": "Structured outputs",
    "description": "Request structured responses for supported text models.",
    "architecturalOverview": "Request structured responses for supported text models.",
    "technicalHighlights": [
      "Provide the response schema",
      "Validate results in your application",
      "Check model support before sending a request"
    ],
    "benchmarkMetric": {
      "label": "Reference",
      "value": "API",
      "subtext": "See the documented request contract"
    },
    "codeSnippet": {
      "language": "bash",
      "code": "curl https://galx.ai/v1/models"
    },
    "faqs": [
      {
        "q": "Where can I find supported inputs?",
        "a": "See the model catalog and API documentation for request fields and limitations."
      }
    ]
  },
  {
    "slug": "prompt-caching",
    "badge": "GALX API",
    "title": "Prompt caching",
    "headline": "Prompt caching",
    "description": "Eligible repeated prompt content uses the caching prices in the model catalog.",
    "architecturalOverview": "Eligible repeated prompt content uses the caching prices in the model catalog.",
    "technicalHighlights": [
      "Review the current model price",
      "Inspect your usage records",
      "Keep reusable instructions consistent"
    ],
    "benchmarkMetric": {
      "label": "Reference",
      "value": "API",
      "subtext": "See the documented request contract"
    },
    "codeSnippet": {
      "language": "bash",
      "code": "curl https://galx.ai/v1/models"
    },
    "faqs": [
      {
        "q": "Where can I find supported inputs?",
        "a": "See the model catalog and API documentation for request fields and limitations."
      }
    ]
  },
  {
    "slug": "async-requests",
    "badge": "GALX API",
    "title": "Asynchronous image requests",
    "headline": "Asynchronous image requests",
    "description": "Submit an image request and retrieve its result when complete.",
    "architecturalOverview": "Submit an image request and retrieve its result when complete.",
    "technicalHighlights": [
      "Send Prefer: respond-async",
      "Poll the returned task_url with authentication",
      "Use status events to update your interface"
    ],
    "benchmarkMetric": {
      "label": "Reference",
      "value": "API",
      "subtext": "See the documented request contract"
    },
    "codeSnippet": {
      "language": "bash",
      "code": "curl https://galx.ai/v1/models"
    },
    "faqs": [
      {
        "q": "Where can I find supported inputs?",
        "a": "See the model catalog and API documentation for request fields and limitations."
      }
    ]
  }
];
