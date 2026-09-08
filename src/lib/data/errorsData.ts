/**
 * Programmatic Error Code Troubleshooting Dataset for pSEO and AEO
 */

export interface ErrorTroubleshootItem {
  code: string;
  httpStatus: number;
  errorType: string;
  badge: string;
  title: string;
  headline: string;
  description: string;
  rootCause: string;
  sampleErrorPayload: string;
  permanentFix: string;
  codeSnippet: {
    language: 'Python' | 'TypeScript';
    code: string;
  };
  faqs: { q: string; a: string }[];
}

export const ERROR_TROUBLESHOOT_DATA: ErrorTroubleshootItem[] = [
  {
    "code": "429-too-many-requests",
    "httpStatus": 429,
    "errorType": "rate_limited",
    "badge": "HTTP 429",
    "title": "HTTP 429: rate limited",
    "headline": "Rate limited",
    "description": "Reduce concurrent requests and follow Retry-After when supplied.",
    "rootCause": "Reduce concurrent requests and follow Retry-After when supplied.",
    "sampleErrorPayload": "{\n  \"error\": {\n    \"code\": \"rate_limited\",\n    \"message\": \"Reduce concurrent requests and follow Retry-After when supplied.\",\n    \"request_id\": \"00000000-0000-4000-8000-000000000000\"\n  }\n}",
    "permanentFix": "Reduce concurrent requests and follow Retry-After when supplied.",
    "codeSnippet": {
      "language": "TypeScript",
      "code": "// Retain the public request ID when contacting support.\nconsole.log(response.headers.get(\"x-request-id\"));"
    },
    "faqs": [
      {
        "q": "Should I automatically repeat an image request?",
        "a": "A timeout can leave the outcome uncertain. Check an asynchronous request status before submitting another generation."
      }
    ]
  },
  {
    "code": "504-gateway-timeout",
    "httpStatus": 504,
    "errorType": "timeout",
    "badge": "HTTP 504",
    "title": "HTTP 504: timeout",
    "headline": "Timeout",
    "description": "The request timed out. Check its status before submitting again.",
    "rootCause": "The request timed out. Check its status before submitting again.",
    "sampleErrorPayload": "{\n  \"error\": {\n    \"code\": \"timeout\",\n    \"message\": \"The request timed out. Check its status before submitting again.\",\n    \"request_id\": \"00000000-0000-4000-8000-000000000000\"\n  }\n}",
    "permanentFix": "The request timed out. Check its status before submitting again.",
    "codeSnippet": {
      "language": "TypeScript",
      "code": "// Retain the public request ID when contacting support.\nconsole.log(response.headers.get(\"x-request-id\"));"
    },
    "faqs": [
      {
        "q": "Should I automatically repeat an image request?",
        "a": "A timeout can leave the outcome uncertain. Check an asynchronous request status before submitting another generation."
      }
    ]
  },
  {
    "code": "context-length-exceeded",
    "httpStatus": 400,
    "errorType": "invalid_request",
    "badge": "HTTP 400",
    "title": "HTTP 400: invalid request",
    "headline": "Invalid request",
    "description": "Check the request fields against the API documentation.",
    "rootCause": "Check the request fields against the API documentation.",
    "sampleErrorPayload": "{\n  \"error\": {\n    \"code\": \"invalid_request\",\n    \"message\": \"Check the request fields against the API documentation.\",\n    \"request_id\": \"00000000-0000-4000-8000-000000000000\"\n  }\n}",
    "permanentFix": "Check the request fields against the API documentation.",
    "codeSnippet": {
      "language": "TypeScript",
      "code": "// Retain the public request ID when contacting support.\nconsole.log(response.headers.get(\"x-request-id\"));"
    },
    "faqs": [
      {
        "q": "Should I automatically repeat an image request?",
        "a": "A timeout can leave the outcome uncertain. Check an asynchronous request status before submitting another generation."
      }
    ]
  },
  {
    "code": "json-parse-failed",
    "httpStatus": 422,
    "errorType": "invalid_request",
    "badge": "HTTP 422",
    "title": "HTTP 422: invalid request",
    "headline": "Invalid request",
    "description": "Check the API documentation and contact support with the request ID.",
    "rootCause": "Check the API documentation and contact support with the request ID.",
    "sampleErrorPayload": "{\n  \"error\": {\n    \"code\": \"invalid_request\",\n    \"message\": \"Check the API documentation and contact support with the request ID.\",\n    \"request_id\": \"00000000-0000-4000-8000-000000000000\"\n  }\n}",
    "permanentFix": "Check the API documentation and contact support with the request ID.",
    "codeSnippet": {
      "language": "TypeScript",
      "code": "// Retain the public request ID when contacting support.\nconsole.log(response.headers.get(\"x-request-id\"));"
    },
    "faqs": [
      {
        "q": "Should I automatically repeat an image request?",
        "a": "A timeout can leave the outcome uncertain. Check an asynchronous request status before submitting another generation."
      }
    ]
  },
  {
    "code": "401-invalid-api-key",
    "httpStatus": 401,
    "errorType": "unauthorized",
    "badge": "HTTP 401",
    "title": "HTTP 401: unauthorized",
    "headline": "Unauthorized",
    "description": "Provide a valid GALX API key or sign in.",
    "rootCause": "Provide a valid GALX API key or sign in.",
    "sampleErrorPayload": "{\n  \"error\": {\n    \"code\": \"unauthorized\",\n    \"message\": \"Provide a valid GALX API key or sign in.\",\n    \"request_id\": \"00000000-0000-4000-8000-000000000000\"\n  }\n}",
    "permanentFix": "Provide a valid GALX API key or sign in.",
    "codeSnippet": {
      "language": "TypeScript",
      "code": "// Retain the public request ID when contacting support.\nconsole.log(response.headers.get(\"x-request-id\"));"
    },
    "faqs": [
      {
        "q": "Should I automatically repeat an image request?",
        "a": "A timeout can leave the outcome uncertain. Check an asynchronous request status before submitting another generation."
      }
    ]
  },
  {
    "code": "overloaded-error",
    "httpStatus": 503,
    "errorType": "temporarily_unavailable",
    "badge": "HTTP 503",
    "title": "HTTP 503: temporarily unavailable",
    "headline": "Temporarily unavailable",
    "description": "The service is temporarily unavailable. Try again later.",
    "rootCause": "The service is temporarily unavailable. Try again later.",
    "sampleErrorPayload": "{\n  \"error\": {\n    \"code\": \"temporarily_unavailable\",\n    \"message\": \"The service is temporarily unavailable. Try again later.\",\n    \"request_id\": \"00000000-0000-4000-8000-000000000000\"\n  }\n}",
    "permanentFix": "The service is temporarily unavailable. Try again later.",
    "codeSnippet": {
      "language": "TypeScript",
      "code": "// Retain the public request ID when contacting support.\nconsole.log(response.headers.get(\"x-request-id\"));"
    },
    "faqs": [
      {
        "q": "Should I automatically repeat an image request?",
        "a": "A timeout can leave the outcome uncertain. Check an asynchronous request status before submitting another generation."
      }
    ]
  },
  {
    "code": "503-service-unavailable",
    "httpStatus": 503,
    "errorType": "temporarily_unavailable",
    "badge": "HTTP 503",
    "title": "HTTP 503: temporarily unavailable",
    "headline": "Temporarily unavailable",
    "description": "The service is temporarily unavailable. Try again later.",
    "rootCause": "The service is temporarily unavailable. Try again later.",
    "sampleErrorPayload": "{\n  \"error\": {\n    \"code\": \"temporarily_unavailable\",\n    \"message\": \"The service is temporarily unavailable. Try again later.\",\n    \"request_id\": \"00000000-0000-4000-8000-000000000000\"\n  }\n}",
    "permanentFix": "The service is temporarily unavailable. Try again later.",
    "codeSnippet": {
      "language": "TypeScript",
      "code": "// Retain the public request ID when contacting support.\nconsole.log(response.headers.get(\"x-request-id\"));"
    },
    "faqs": [
      {
        "q": "Should I automatically repeat an image request?",
        "a": "A timeout can leave the outcome uncertain. Check an asynchronous request status before submitting another generation."
      }
    ]
  },
  {
    "code": "400-invalid-request-error",
    "httpStatus": 400,
    "errorType": "invalid_request",
    "badge": "HTTP 400",
    "title": "HTTP 400: invalid request",
    "headline": "Invalid request",
    "description": "Check the request fields against the API documentation.",
    "rootCause": "Check the request fields against the API documentation.",
    "sampleErrorPayload": "{\n  \"error\": {\n    \"code\": \"invalid_request\",\n    \"message\": \"Check the request fields against the API documentation.\",\n    \"request_id\": \"00000000-0000-4000-8000-000000000000\"\n  }\n}",
    "permanentFix": "Check the request fields against the API documentation.",
    "codeSnippet": {
      "language": "TypeScript",
      "code": "// Retain the public request ID when contacting support.\nconsole.log(response.headers.get(\"x-request-id\"));"
    },
    "faqs": [
      {
        "q": "Should I automatically repeat an image request?",
        "a": "A timeout can leave the outcome uncertain. Check an asynchronous request status before submitting another generation."
      }
    ]
  },
  {
    "code": "streaming-timeout-interrupted",
    "httpStatus": 408,
    "errorType": "invalid_request",
    "badge": "HTTP 408",
    "title": "HTTP 408: invalid request",
    "headline": "Invalid request",
    "description": "Check the API documentation and contact support with the request ID.",
    "rootCause": "Check the API documentation and contact support with the request ID.",
    "sampleErrorPayload": "{\n  \"error\": {\n    \"code\": \"invalid_request\",\n    \"message\": \"Check the API documentation and contact support with the request ID.\",\n    \"request_id\": \"00000000-0000-4000-8000-000000000000\"\n  }\n}",
    "permanentFix": "Check the API documentation and contact support with the request ID.",
    "codeSnippet": {
      "language": "TypeScript",
      "code": "// Retain the public request ID when contacting support.\nconsole.log(response.headers.get(\"x-request-id\"));"
    },
    "faqs": [
      {
        "q": "Should I automatically repeat an image request?",
        "a": "A timeout can leave the outcome uncertain. Check an asynchronous request status before submitting another generation."
      }
    ]
  }
];
