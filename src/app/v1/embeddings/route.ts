import { NextRequest, NextResponse } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { EmbeddingsRepository } from '@/lib/supabase/repositories/EmbeddingsRepository';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Galx-Shard-Preference',
      'Access-Control-Max-Age': '86400'
    }
  });
}

/**
 * Universal OpenAI-Compatible POST /v1/embeddings Endpoint.
 */
export async function POST(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);

    if (!authResult.authenticated && req.headers.get('authorization')) {
      return NextResponse.json(
        { error: { message: authResult.error || 'Invalid API credentials', type: 'invalid_request_error' } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const input = body.input;
    const model = body.model || 'text-embedding-3-small';

    if (!input) {
      return NextResponse.json(
        { error: { message: 'Missing required parameter: input', type: 'invalid_request_error' } },
        { status: 400 }
      );
    }

    const inputs = Array.isArray(input) ? input : [input];
    const embeddingRepo = EmbeddingsRepository.getInstance();

    const data = inputs.map((text: string, index: number) => {
      const vector = embeddingRepo.generateDeterministicVector(text, 1536);
      return {
        object: 'embedding',
        index,
        embedding: vector
      };
    });

    return NextResponse.json({
      object: 'list',
      data,
      model,
      usage: {
        prompt_tokens: inputs.reduce((acc, str) => acc + Math.ceil(str.length / 4), 0),
        total_tokens: inputs.reduce((acc, str) => acc + Math.ceil(str.length / 4), 0)
      }
    }, {
      headers: {
        'X-Galx-Model-Resolved': model,
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: { message: err.message || 'Internal server error', type: 'api_error' } },
      { status: 500 }
    );
  }
}
