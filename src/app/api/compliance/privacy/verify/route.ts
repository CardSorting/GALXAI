import { withDeveloperAccess } from '@/lib/security/developer-access';
import { NextRequest, NextResponse } from 'next/server';
import { GalxPersistence } from '@/lib/storage/GalxPersistence';
import { galxZDR } from '@/core/privacy/GalxZDRProtocol';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

/**
 * GET /api/compliance/privacy/verify
 * Cryptographically verifies the unbroken SHA-256 chain of custody for all system audit logs.
 */
async function previewGET() {
  try {
    const persistence = GalxPersistence.getInstance();
    const verification = persistence.auditRepo.verifyAuditChainIntegrity();

    return NextResponse.json({
      success: true,
      auditChainVerification: verification
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'X-Galx-Audit-Chain-Valid': String(verification.valid)
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Audit verification failed' } },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

/**
 * POST /api/compliance/privacy/verify
 * Validates a client-provided ZDR session attestation proof.
 */
async function previewPOST(req: NextRequest) {
  try {
    const body = await req.json();
    const isValid = galxZDR.verifyZDRProof(body);

    return NextResponse.json({
      success: true,
      valid: isValid,
      verifiedAt: new Date().toISOString()
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Proof verification failed' } },
      { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

export const GET = withDeveloperAccess(previewGET);
export const POST = withDeveloperAccess(previewPOST);
