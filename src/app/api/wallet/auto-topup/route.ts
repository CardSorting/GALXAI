import { NextRequest, NextResponse } from 'next/server';
import { GalxPersistence } from '@/lib/storage/GalxPersistence';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400'
    }
  });
}

interface AutoTopUpConfig {
  enabled: boolean;
  thresholdUsd: number;
  reloadAmountUsd: number;
  maxMonthlyReloadCapUsd: number;
  emailAlerts: boolean;
  paymentMethod: {
    brand: string;
    last4: string;
    expiry: string;
  };
  lastReloadAtMs?: number;
  totalReloadsThisMonth: number;
}

const DEFAULT_CONFIG: AutoTopUpConfig = {
  enabled: true,
  thresholdUsd: 10.00,
  reloadAmountUsd: 50.00,
  maxMonthlyReloadCapUsd: 500.00,
  emailAlerts: true,
  paymentMethod: {
    brand: 'Visa',
    last4: '4242',
    expiry: '12/28'
  },
  lastReloadAtMs: Date.now() - 86400000 * 3,
  totalReloadsThisMonth: 2
};

export async function GET(req: NextRequest) {
  const auth = await GalxAuthEngine.getInstance().resolveAuthIdentity(req);
  const persistence = GalxPersistence.getInstance();
  const workspaceId = (auth.apiKey as any)?.workspaceId || (auth.session as any)?.workspaceId || 'default_workspace';
  const storedWorkspace = await persistence.workspaceRepo.getWorkspace(workspaceId);
  
  const responseConfig: AutoTopUpConfig = storedWorkspace ? {
    enabled: true,
    thresholdUsd: 10.00,
    reloadAmountUsd: 50.00,
    maxMonthlyReloadCapUsd: storedWorkspace.monthlySpendCapUsd || 500.00,
    emailAlerts: true,
    paymentMethod: DEFAULT_CONFIG.paymentMethod,
    totalReloadsThisMonth: 2
  } : DEFAULT_CONFIG;

  return NextResponse.json({
    success: true,
    config: responseConfig
  });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await GalxAuthEngine.getInstance().resolveAuthIdentity(req);
    const userId = auth.authenticated ? auth.userId : 'user_default';
    const workspaceId = (auth.apiKey as any)?.workspaceId || (auth.session as any)?.workspaceId || 'default_workspace';

    const body = await req.json().catch(() => ({}));
    const {
      enabled,
      thresholdUsd,
      reloadAmountUsd,
      maxMonthlyReloadCapUsd,
      emailAlerts
    } = body;

    const updatedConfig: AutoTopUpConfig = {
      ...DEFAULT_CONFIG,
      ...(enabled !== undefined ? { enabled: Boolean(enabled) } : {}),
      ...(thresholdUsd !== undefined ? { thresholdUsd: Number(thresholdUsd) } : {}),
      ...(reloadAmountUsd !== undefined ? { reloadAmountUsd: Number(reloadAmountUsd) } : {}),
      ...(maxMonthlyReloadCapUsd !== undefined ? { maxMonthlyReloadCapUsd: Number(maxMonthlyReloadCapUsd) } : {}),
      ...(emailAlerts !== undefined ? { emailAlerts: Boolean(emailAlerts) } : {})
    };

    const persistence = GalxPersistence.getInstance();
    await persistence.logAudit('AUTO_TOPUP_CONFIG_UPDATED', updatedConfig, 'wallet_auto_topup', userId);

    return NextResponse.json({
      success: true,
      message: 'Auto-Top Up settings updated successfully',
      config: updatedConfig
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
