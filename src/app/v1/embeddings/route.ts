import { withDeveloperAccess } from '@/lib/security/developer-access';
import { NextRequest, NextResponse } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { EmbeddingsRepository } from '@/lib/supabase/repositories/EmbeddingsRepository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}

/**
 * Universal OpenAI-Compatible POST /v1/embeddings Endpoint.
 */
async function previewPOST(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);

    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: { message: authResult.error || 'Authentication required. Please provide a valid Authorization header with Bearer token or API key.', type: 'invalid_request_error' } },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawInput = body.input ?? body.text ?? body.prompt ?? body.content ?? body.inputs ?? body.data ?? 'Hello';
    const model = body.model || 'text-embedding-3-small';

    const inputs = Array.isArray(rawInput) ? rawInput.map(String) : [String(rawInput)];
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
    const { GalxModelRouter } = await import('@/core/router/GalxModelRouter');
    const sanitized = GalxModelRouter.sanitizeUpstreamError(err?.message || 'Internal server error');
    return NextResponse.json(
      { error: { message: sanitized, type: 'api_error' } },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

export const POST = withDeveloperAccess(previewPOST);
