import { NextRequest, NextResponse } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { WalletRepository } from '@/lib/supabase/repositories/WalletRepository';
import { GalxPersistence } from '@/lib/storage/GalxPersistence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400'
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let {
      depositAmount = 50,
      paymentMethod = 'card',
      currency = 'USD'
    } = body;

    const amount = Number(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Deposit amount must be greater than $0.00' },
        { status: 400 }
      );
    }

    const auth = await GalxAuthEngine.getInstance().resolveAuthIdentity(req);
    const userId = auth.authenticated ? auth.userId : 'user_demo';

    // 50% Match Grant Incentivization Strategy
    // Minimum $10 unlocks $5 grant ($15 total); $100+ unlocks 50% match
    const bonusGrantPct = amount >= 100 ? 0.50 : amount >= 50 ? 0.25 : amount >= 25 ? 0.10 : 0.50; // $10 gets 50% ($5)
    let matchGrant = 0;
    if (amount >= 10 && amount < 25) {
      matchGrant = 5.0;
    } else {
      matchGrant = Number((amount * bonusGrantPct).toFixed(2));
    }

    const totalCredit = Number((amount + matchGrant).toFixed(2));

    const walletRepo = WalletRepository.getInstance();
    const depositResult = await walletRepo.verifyDepositAndApplyMatch({
      userId,
      depositAmountUsd: amount,
      paymentRef: `pay_${Date.now()}_${paymentMethod}`
    });

    const persistence = GalxPersistence.getInstance();
    persistence.logAudit(
      'WALLET_DEPOSIT_CREDITED',
      { amount, matchGrant, totalCredit, newBalance: depositResult.newBalance },
      `wallet_${userId}`,
      userId
    );

    return NextResponse.json({
      success: true,
      depositAmount: amount,
      matchGrant,
      totalCredit,
      newBalance: depositResult.newBalance,
      proofOfDepositVerified: true,
      message: `Successfully credited $${totalCredit.toFixed(2)} USD to your compute wallet! Includes +$${matchGrant.toFixed(2)} promotional match grant.`
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Deposit failed to process' },
      { status: 500 }
    );
  }
}
