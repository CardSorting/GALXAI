import { NextResponse } from 'next/server';
import { ModelCatalog } from '@/core/router/ModelCatalog';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

/**
 * Native Ollama-Compatible GET /api/tags Endpoint.
 * Returns supported models formatted as Ollama tags.
 */
export async function GET() {
  const models = ModelCatalog.getSupportedModels().map(m => ({
    name: `${m.id}:latest`,
    model: `${m.id}:latest`,
    modified_at: new Date(1735689600000).toISOString(),
    size: m.contextWindowTokens * 4,
    digest: `sha256:${Buffer.from(m.id).toString('hex').padEnd(64, '0')}`,
    details: {
      parent_model: '',
      format: 'gguf',
      family: m.category === 'llm' ? 'frontier' : m.category,
      families: [m.provider],
      parameter_size: m.contextWindowTokens > 500000 ? 'frontier-1m' : 'frontier',
      quantization_level: 'f16'
    }
  }));

  return NextResponse.json(
    { models },
    {
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    }
  );
}
