import { NextRequest, NextResponse } from 'next/server';
import { requireAccountIdentity, AccountIdentityError } from '@/lib/auth/accountIdentity';
import { TeamGovernanceRepository } from '@/lib/supabase/repositories/TeamGovernanceRepository';
import { USAGE_PRICING } from '@/lib/billing/usage-pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };

function publicUsage(summary: Record<string, unknown> | null) {
  const current = summary && summary.status === 'active' ? summary : null;
  const completed = Number(current?.completedUnits || 0);
  const reserved = Number(current?.reservedUnits || 0);
  const cap = Number(current?.capUnits || Math.floor(USAGE_PRICING.monthlySpendCapUsd / USAGE_PRICING.unitAmountUsd));
  const rate = USAGE_PRICING.unitAmountUsd;
  return {
    unit: 'message',
    rateUsd: rate,
    monthlyCapUsd: USAGE_PRICING.monthlySpendCapUsd,
    currentPeriod: {
      start: typeof current?.periodStart === 'string' ? current.periodStart : null,
      end: typeof current?.periodEnd === 'string' ? current.periodEnd : null,
      resetAt: typeof current?.resetAt === 'string' ? current.resetAt : null,
      completedMessages: completed,
      pendingMessages: reserved,
      capMessages: cap,
      accruedUsd: Number((completed * rate).toFixed(6)),
      pendingUsd: Number((reserved * rate).toFixed(6)),
      remainingUsd: Number(Math.max(0, (cap - completed - reserved) * rate).toFixed(6)),
      percentUsed: cap > 0 ? Math.min(100, Math.round(((completed + reserved) / cap) * 1000) / 10) : 0,
    },
    notifications: Array.isArray(current?.notifications) ? current.notifications.slice(0, 3).map((notice: any) => ({
      id: typeof notice?.id === 'string' ? notice.id : undefined,
      thresholdPercent: Number(notice?.thresholdPercent),
      title: typeof notice?.title === 'string' ? notice.title : 'Usage update',
      body: typeof notice?.body === 'string' ? notice.body : '',
      createdAt: typeof notice?.createdAt === 'string' ? notice.createdAt : null,
      readAt: typeof notice?.readAt === 'string' ? notice.readAt : null,
    })) : [],
  };
}

export async function GET(req: NextRequest) {
  try {
    const actor = await requireAccountIdentity(req);
    const summary = await TeamGovernanceRepository.getInstance().getNovaMessageUsageSummary(actor.id);
    return NextResponse.json(publicUsage(summary), { headers });
  } catch (error) {
    const known = error instanceof AccountIdentityError;
    return NextResponse.json({ error: known ? error.message : 'Usage is temporarily unavailable. Try again shortly.' }, { status: known ? error.status : 503, headers });
  }
}
