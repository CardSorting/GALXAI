import { NextRequest, NextResponse } from 'next/server';
import { galxRedactor } from '@/core/privacy/GalxPIIRedactor';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

/**
 * POST /api/compliance/redact
 * Real-time testing & validation utility for HIPAA Safe Harbor 18 PHI and GDPR PII de-identification.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = body.text || '';
    const options = body.options || { hipaa: true, gdpr: true, financial: true, reversible: false };

    const result = galxRedactor.redactText(text, options);

    return NextResponse.json({
      success: true,
      sanitizedText: result.sanitizedText,
      hasPhi: result.hasPhi,
      hasPii: result.hasPii,
      entitiesDetected: result.entitiesDetected.map(e => ({
        type: e.type,
        category: e.category,
        redactedToken: e.redactedToken
      })),
      entitiesCount: result.entitiesDetected.length
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'X-Galx-ZDR-Verified': 'true'
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Redaction failed' } },
      { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
