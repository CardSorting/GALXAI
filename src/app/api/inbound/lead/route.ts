import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface InboundLeadPayload {
  email: string;
  companyName?: string;
  source?: 'calculator' | 'grants' | 'playground' | 'contact' | 'cli' | 'docs' | 'tools' | 'migrate' | 'pricing';
  modelPreference?: string;
  estimatedMonthlyTokens?: number;
  estimatedMonthlySpend?: number;
  stack?: string[];
  notes?: string;
}

export interface StoredInboundLead extends InboundLeadPayload {
  leadId: string;
  capturedAt: number;
  status: 'PENDING_GTM_SYNC' | 'SYNCED_TO_LUMI' | 'PROCESSED';
  provisionedKey: string;
  grantAmountUsd: number;
  sha256Hash: string;
}

function getLeadsFilePath(): string {
  const dataDir = path.resolve(process.cwd(), '.data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.resolve(dataDir, 'inbound_leads.json');
}

function readStoredLeads(): StoredInboundLead[] {
  const filePath = getLeadsFilePath();
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeStoredLeads(leads: StoredInboundLead[]): void {
  const filePath = getLeadsFilePath();
  fs.writeFileSync(filePath, JSON.stringify(leads, null, 2), 'utf-8');
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

/**
 * GET /api/inbound/lead - Query stored inbound leads for LUMI-GTM sync
 */
export async function GET(req: NextRequest) {
  const leads = readStoredLeads();
  const url = new URL(req.url);
  const pendingOnly = url.searchParams.get('pending') === 'true';

  const result = pendingOnly ? leads.filter((l) => l.status === 'PENDING_GTM_SYNC') : leads;

  return NextResponse.json({
    success: true,
    totalCount: leads.length,
    pendingCount: leads.filter((l) => l.status === 'PENDING_GTM_SYNC').length,
    leads: result,
  });
}

/**
 * POST /api/inbound/lead - Ingest high-intent inbound developer inquiry & provision instant $100 test key
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as InboundLeadPayload;

    if (!body.email || !body.email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Valid email is required for inbound lead capture.' },
        { status: 400 }
      );
    }

    const email = body.email.trim().toLowerCase();
    const leadId = `inbound_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const provisionedKey = `galx_live_inbound_${crypto.randomBytes(16).toString('hex')}`;
    const grantAmountUsd = body.source === 'grants' ? 2500.0 : 100.0;

    const hash = crypto
      .createHash('sha256')
      .update(`${email}_${Date.now()}_${body.companyName || 'unknown'}_${provisionedKey}`)
      .digest('hex');

    const newLead: StoredInboundLead = {
      leadId,
      email,
      companyName: body.companyName?.trim() || 'Undisclosed Team',
      source: body.source || 'calculator',
      modelPreference: body.modelPreference || 'gpt-5.6-sol',
      estimatedMonthlyTokens: body.estimatedMonthlyTokens || 25_000_000,
      estimatedMonthlySpend: body.estimatedMonthlySpend || 187.5,
      stack: body.stack || ['openai', 'nextjs'],
      notes: body.notes || 'Inbound calculation via GALXAI ROI Simulator',
      capturedAt: Date.now(),
      status: 'PENDING_GTM_SYNC',
      provisionedKey,
      grantAmountUsd,
      sha256Hash: hash,
    };

    const leads = readStoredLeads();
    leads.push(newLead);
    writeStoredLeads(leads);

    return NextResponse.json({
      success: true,
      leadId: newLead.leadId,
      provisionedKey: newLead.provisionedKey,
      grantAmountUsd: newLead.grantAmountUsd,
      endpointUrl: 'https://galx.ai/v1',
      message: `Inbound lead captured! Live $${grantAmountUsd} compute key provisioned and routed to GTM Board.`,
      sha256Hash: newLead.sha256Hash,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
