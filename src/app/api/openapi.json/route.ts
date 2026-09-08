import { NextResponse } from 'next/server';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';
import { FRONTEND_VISIBLE_MODELS } from '@/core/router/ModelCatalog';

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
        description: 'Global Anycast Low-Latency Gateway (Sub-15ms TTFT)',
      },
    ],
    paths: {
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
      '/images/generations': {
        post: {
          summary: 'Create Image Generation',
          description: 'Generate images from text prompts using OpenAI Image Generation.',
          operationId: 'createImage',
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
