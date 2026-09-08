import { NextResponse } from 'next/server';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';
import { FRONTEND_VISIBLE_MODELS } from '@/core/router/PublicModelCatalog';

export const runtime = 'nodejs';

export const dynamic = 'force-static';
export const revalidate = 86400; // 24 hours

export async function GET() {
  const openApiSpec = {
    openapi: '3.1.0',
    info: {
      title: 'GALXAI Universal AI Gateway & Model Router API',
      version: '1.0.0',
      description:
        'Universal OpenAI-compatible API gateway providing high-throughput access to OpenAI (GPT-5.6 Sol, Terra, Luna) and visual synthesis models with 25%–40% wholesale savings, 75% prompt caching, and zero data retention.',
      contact: {
        name: 'GALXAI Developer Support',
        url: SITE_CONFIG.links.docs,
        email: SITE_CONFIG.contactPoint.email,
      },
      license: {
        name: 'Apache 2.0',
        url: 'https://www.apache.org/licenses/LICENSE-2.0.html',
      },
    },
    servers: [
      {
        url: SITE_CONFIG.apiUrl,
        description: 'GALX API',
      },
    ],
    paths: {
      "/images/generations": {"post": {"summary": "Generate an image", "description": "Returns one static binary image by default. Explicit JSON requests return only created and data. Download URLs expire after one hour or are self-contained data URLs. Dimensions may vary.", "security": [{"BearerAuth": []}], "requestBody": {"required": true, "content": {"application/json": {"schema": {"type": "object", "required": ["prompt"], "properties": {"prompt": {"type": "string", "minLength": 1, "maxLength": 32000}, "model": {"type": "string", "enum": ["openai-gpt-image-latest"]}, "response_format": {"type": "string", "enum": ["binary", "b64_json", "url"], "default": "binary"}, "output_format": {"type": "string", "enum": ["png", "jpeg", "webp"]}, "n": {"type": "integer", "minimum": 1, "maximum": 4, "description": "Binary output requires n=1."}}}}}}, "responses": {"200": {"description": "Generated image", "content": {"image/png": {"schema": {"type": "string", "format": "binary"}}, "image/jpeg": {"schema": {"type": "string", "format": "binary"}}, "image/webp": {"schema": {"type": "string", "format": "binary"}}, "application/json": {"schema": {"type": "object", "additionalProperties": false, "required": ["created", "data"], "properties": {"created": {"type": "integer"}, "data": {"type": "array", "minItems": 1, "maxItems": 4, "items": {"oneOf": [{"type": "object", "additionalProperties": false, "required": ["b64_json"], "properties": {"b64_json": {"type": "string"}}}, {"type": "object", "additionalProperties": false, "required": ["url"], "properties": {"url": {"type": "string"}}}]}}}}}}}, "400": {"description": "Request failed", "content": {"application/json": {"schema": {"type": "object", "additionalProperties": false, "required": ["error"], "properties": {"error": {"type": "object", "additionalProperties": false, "required": ["code", "message", "request_id"], "properties": {"code": {"type": "string"}, "message": {"type": "string"}, "request_id": {"type": "string"}}}}}}}}, "401": {"description": "Request failed", "content": {"application/json": {"schema": {"type": "object", "additionalProperties": false, "required": ["error"], "properties": {"error": {"type": "object", "additionalProperties": false, "required": ["code", "message", "request_id"], "properties": {"code": {"type": "string"}, "message": {"type": "string"}, "request_id": {"type": "string"}}}}}}}}, "404": {"description": "Request failed", "content": {"application/json": {"schema": {"type": "object", "additionalProperties": false, "required": ["error"], "properties": {"error": {"type": "object", "additionalProperties": false, "required": ["code", "message", "request_id"], "properties": {"code": {"type": "string"}, "message": {"type": "string"}, "request_id": {"type": "string"}}}}}}}}, "429": {"description": "Request failed", "content": {"application/json": {"schema": {"type": "object", "additionalProperties": false, "required": ["error"], "properties": {"error": {"type": "object", "additionalProperties": false, "required": ["code", "message", "request_id"], "properties": {"code": {"type": "string"}, "message": {"type": "string"}, "request_id": {"type": "string"}}}}}}}}, "502": {"description": "Request failed", "content": {"application/json": {"schema": {"type": "object", "additionalProperties": false, "required": ["error"], "properties": {"error": {"type": "object", "additionalProperties": false, "required": ["code", "message", "request_id"], "properties": {"code": {"type": "string"}, "message": {"type": "string"}, "request_id": {"type": "string"}}}}}}}}, "503": {"description": "Request failed", "content": {"application/json": {"schema": {"type": "object", "additionalProperties": false, "required": ["error"], "properties": {"error": {"type": "object", "additionalProperties": false, "required": ["code", "message", "request_id"], "properties": {"code": {"type": "string"}, "message": {"type": "string"}, "request_id": {"type": "string"}}}}}}}}, "504": {"description": "Request failed", "content": {"application/json": {"schema": {"type": "object", "additionalProperties": false, "required": ["error"], "properties": {"error": {"type": "object", "additionalProperties": false, "required": ["code", "message", "request_id"], "properties": {"code": {"type": "string"}, "message": {"type": "string"}, "request_id": {"type": "string"}}}}}}}}, "202": {"description": "Asynchronous request accepted", "content": {"application/json": {"schema": {"type": "object", "additionalProperties": false, "required": ["id", "status", "task_url"], "properties": {"id": {"type": "string"}, "status": {"type": "string"}, "task_url": {"type": "string"}}}}}}}}},
      '/chat/completions': {
        post: {
          summary: 'Create Chat Completion',
          description:
            'Execute 100% OpenAI-compatible chat completions with streaming SSE, function calling, and structured outputs.',
          operationId: 'createChatCompletion',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['model', 'messages'],
                  properties: {
                    model: {
                      type: 'string',
                      enum: FRONTEND_VISIBLE_MODELS.filter((m) => m.category === 'llm').map((m) => m.id),
                      description: 'The target model identifier.',
                    },
                    messages: {
                      type: 'array',
                      items: {
                        type: 'object',
                        required: ['role', 'content'],
                        properties: {
                          role: { type: 'string', enum: ['system', 'user', 'assistant', 'tool'] },
                          content: { type: 'string' },
                        },
                      },
                    },
                    stream: { type: 'boolean', default: false },
                    temperature: { type: 'number', minimum: 0, maximum: 2, default: 0.7 },
                    max_tokens: { type: 'integer' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Successful completion or Server-Sent Events stream',
            },
            '401': { description: 'Unauthorized — Missing or invalid API key' },
            '429': { description: 'Rate Limit (Automatically pooled and prevented on GALXAI)' },
          },
        },
      },
      '/models': {
        get: {
          summary: 'List Available Models',
          description: 'Retrieve the active catalog of frontier models with real-time pricing and context specs.',
          operationId: 'listModels',
          responses: {
            '200': {
              description: 'List of model objects',
            },
          },
        },
      },
      '/embeddings': {
        post: {
          summary: 'Create Embeddings',
          description: 'Generate high-dimensional vector embeddings for semantic search and retrieval.',
          operationId: 'createEmbeddings',
          security: [{ BearerAuth: [] }],
        },
      },

    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'API Key (galx_live_...)',
        },
      },
    },
  };

  return NextResponse.json(openApiSpec, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
