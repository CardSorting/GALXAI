import { withDeveloperAccess } from '@/lib/security/developer-access';
import { NextRequest, NextResponse } from 'next/server';
import { GalxTrainingStreamEngine } from '@/core/training/GalxTrainingStreamEngine';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function previewPOST(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);

    const isApiCall = authResult.authType === 'developer_key' && req.headers.get('x-galx-client') !== 'web-chat';

    const body = await req.json().catch(() => ({}));
    const {
      type,
      prompt,
      chosen,
      rejected,
      completion,
      label,
      modelId,
      source,
      qualityDelta,
      klWeight,
      allowModelTraining,
    } = body;

    const trainingEngine = GalxTrainingStreamEngine.getInstance();

    // 1. KTO Unpaired Binary Feedback Mode (Thumbs Up / Thumbs Down)
    if (type === 'kto' || (completion && typeof label === 'boolean')) {
      if (!prompt || !completion) {
        return NextResponse.json(
          { error: 'Missing required fields: prompt and completion are required for KTO feedback.' },
          { status: 400 }
        );
      }

      const result = await trainingEngine.ingestKTOFeedback({
        source: source || 'user_thumb_rating',
        userId: authResult.userId,
        modelId: modelId || 'galx-nova',
        prompt: String(prompt),
        completion: String(completion),
        label: Boolean(label),
        klWeight: typeof klWeight === 'number' ? klWeight : undefined,
        allowModelTraining: allowModelTraining !== undefined ? allowModelTraining : undefined,
        isApiCall,
        headers: req.headers,
      });

      return NextResponse.json({
        success: true,
        alignmentMode: 'kto_prospect_theory',
        result,
      });
    }

    // 2. DPO Paired Preference Feedback Mode (Alternative Response Swiping < 1/3 >)
    if (!prompt || !chosen || !rejected) {
      return NextResponse.json(
        { error: 'Missing required fields: prompt, chosen, and rejected are mandatory for DPO feedback.' },
        { status: 400 }
      );
    }

    const result = await trainingEngine.ingestDPOFeedback({
      source: source || 'web_chat_swipe',
      userId: authResult.userId,
      modelId: modelId || 'galx-nova',
      prompt: String(prompt),
      chosen: String(chosen),
      rejected: String(rejected),
      qualityDelta: typeof qualityDelta === 'number' ? qualityDelta : 0.85,
      allowModelTraining: allowModelTraining !== undefined ? allowModelTraining : undefined,
      isApiCall,
      headers: req.headers,
    });

    return NextResponse.json({
      success: true,
      alignmentMode: 'dpo_paired_preference',
      result,
      architecture: 'broccolidb_hybrid_alignment_mesh',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal error recording alignment feedback' },
      { status: 500 }
    );
  }
}

export const POST = withDeveloperAccess(previewPOST);
