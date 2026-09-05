import { NextResponse } from 'next/server';
import {
  GALX_AGENT_PROTOCOL_VERSION,
  type GalxAgentBootstrap,
} from '@/sdk/browser-agent';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA;
  const payload: GalxAgentBootstrap = {
    protocolVersion: GALX_AGENT_PROTOCOL_VERSION,
    deployment: {
      ...(deploymentId ? { id: deploymentId } : {}),
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
      skewProtectionEnabled: process.env.VERCEL_SKEW_PROTECTION_ENABLED === '1',
    },
    agent: {
      interactiveEndpoint: '/v1/chat/completions',
      transport: 'sse',
      sessionModes: ['new', 'continue', 'stateless'],
      maxInteractiveDurationSeconds: 300,
    },
    security: {
      sameOrigin: true,
      providerKeysAcceptedInBrowser: false,
    },
  };

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'X-Galx-Protocol-Version': GALX_AGENT_PROTOCOL_VERSION,
    },
  });
}
