import { NextRequest, NextResponse } from 'next/server';
import { GalxPersistence } from '@/lib/storage/GalxPersistence';

export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

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

let mockConfig: AutoTopUpConfig = {
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
  return NextResponse.json({
    success: true,
    config: mockConfig
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      enabled,
      thresholdUsd,
      reloadAmountUsd,
      maxMonthlyReloadCapUsd,
      emailAlerts
    } = body;

    if (enabled !== undefined) mockConfig.enabled = Boolean(enabled);
    if (thresholdUsd !== undefined) mockConfig.thresholdUsd = Number(thresholdUsd);
    if (reloadAmountUsd !== undefined) mockConfig.reloadAmountUsd = Number(reloadAmountUsd);
    if (maxMonthlyReloadCapUsd !== undefined) mockConfig.maxMonthlyReloadCapUsd = Number(maxMonthlyReloadCapUsd);
    if (emailAlerts !== undefined) mockConfig.emailAlerts = Boolean(emailAlerts);

    const persistence = GalxPersistence.getInstance();
    persistence.logAudit('AUTO_TOPUP_CONFIG_UPDATED', mockConfig, 'wallet_auto_topup', 'user_demo');

    return NextResponse.json({
      success: true,
      message: 'Auto-Top Up settings updated successfully',
      config: mockConfig
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
