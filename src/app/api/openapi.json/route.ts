import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

const errorResponse = {
  description: 'Request failed',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            additionalProperties: false,
            required: ['code', 'message', 'request_id'],
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              request_id: { type: 'string' },
            },
          },
        },
      },
    },
  },
};

export function GET() {
  return NextResponse.json(
    {
      openapi: '3.1.0',
      info: {
        title: 'GALX Image API',
        version: '1.0.0',
        description:
          'Image generation for explicitly authorized private integrations using supported GALX Nova capabilities. The browser Image Studio remains governed by its separate GALX Pro/account contract.',
      },
      servers: [{ url: 'https://galx.ai/v1' }],
      paths: {
        '/images/generations': {
          post: {
            summary: 'Generate an image',
            description:
              'Returns one static binary image by default. Explicit JSON requests return only created and data. Download URLs expire after one hour or are self-contained data URLs. Dimensions may vary.',
            security: [{ BearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['prompt'],
                    properties: {
                      prompt: { type: 'string', minLength: 1, maxLength: 32000 },
                      model: {
                        type: 'string',
                        description: 'Use the documented GALX image capability assigned to your integration.',
                      },
                      response_format: {
                        type: 'string',
                        enum: ['binary', 'b64_json', 'url'],
                        default: 'binary',
                      },
                      visibility: {
                        type: 'string',
                        enum: ['public', 'unlisted', 'private'],
                        default: 'public',
                        description: 'Choose whether the generated asset is published to the community stream. Private assets remain owner-only.',
                      },
                      output_format: { type: 'string', enum: ['png', 'jpeg', 'webp'] },
                      n: { type: 'integer', minimum: 1, maximum: 4, description: 'Binary output requires n=1.' },
                    },
                  },
                },
              },
            },
            responses: {
              '200': {
                description: 'Generated image',
                content: {
                  'image/png': { schema: { type: 'string', format: 'binary' } },
                  'image/jpeg': { schema: { type: 'string', format: 'binary' } },
                  'image/webp': { schema: { type: 'string', format: 'binary' } },
                  'application/json': {
                    schema: {
                      type: 'object',
                      additionalProperties: false,
                      required: ['created', 'data'],
                      properties: {
                        created: { type: 'integer' },
                        data: {
                          type: 'array',
                          minItems: 1,
                          maxItems: 4,
                          items: {
                            oneOf: [
                              {
                                type: 'object',
                                additionalProperties: false,
                                required: ['b64_json'],
                                properties: { b64_json: { type: 'string' } },
                              },
                              {
                                type: 'object',
                                additionalProperties: false,
                                required: ['url'],
                                properties: { url: { type: 'string' } },
                              },
                            ],
                          },
                        },
                      },
                    },
                  },
                },
              },
              '202': {
                description: 'Asynchronous request accepted',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      additionalProperties: false,
                      required: ['id', 'status', 'task_url'],
                      properties: {
                        id: { type: 'string' },
                        status: { type: 'string' },
                        task_url: { type: 'string' },
                      },
                    },
                  },
                },
              },
              '400': errorResponse,
              '401': errorResponse,
              '404': errorResponse,
              '429': errorResponse,
              '502': errorResponse,
              '503': errorResponse,
              '504': errorResponse,
            },
          },
        },
      },
      components: { securitySchemes: { BearerAuth: { type: 'http', scheme: 'bearer' } } },
    },
    { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=3600' } },
  );
}
