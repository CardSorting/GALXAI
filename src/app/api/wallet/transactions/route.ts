import { NextRequest, NextResponse } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { WalletRepository } from '@/lib/supabase/repositories/WalletRepository';

export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

export interface EnrichedTransaction {
  id: string;
  type: 'deposit' | 'usage' | 'grant' | 'refund';
  description: string;
  amountUsd: number;
  balanceAfterUsd: number;
  model?: string;
  modelName?: string;
  promptTokens?: number;
  completionTokens?: number;
  cachedTokens?: number;
  totalTokens?: number;
  savingsUsd?: number;
  retailEquivalentUsd?: number;
  latencyMs?: number;
  keyPrefix?: string;
  keyName?: string;
  zdrDigest?: string;
  status: 'settled' | 'pending' | 'failed';
  timestamp: string;
}

const SEED_TRANSACTIONS: EnrichedTransaction[] = [
  {
    id: 'tx_live_8912',
    type: 'usage',
    description: 'API Chat: OpenAI Codex GPT-5.6 Sol',
    amountUsd: -0.007750,
    balanceAfterUsd: 114.590000,
    model: 'gpt-5.6-sol',
    modelName: 'OpenAI Codex GPT-5.6 Sol',
    promptTokens: 1200,
    cachedTokens: 400,
    completionTokens: 320,
    totalTokens: 1520,
    savingsUsd: 0.003250,
    retailEquivalentUsd: 0.011000,
    latencyMs: 164,
    keyPrefix: 'galx_live_d819',
    keyName: 'Cursor IDE / Coding Assistant',
    zdrDigest: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    status: 'settled',
    timestamp: 'Just now'
  },
  {
    id: 'tx_live_8911',
    type: 'usage',
    description: 'Stream Chat: OpenAI Codex GPT-5.6 Terra',
    amountUsd: -0.003420,
    balanceAfterUsd: 114.597750,
    model: 'gpt-5.6-terra',
    modelName: 'OpenAI Codex GPT-5.6 Terra',
    promptTokens: 850,
    cachedTokens: 300,
    completionTokens: 180,
    totalTokens: 1030,
    savingsUsd: 0.001480,
    retailEquivalentUsd: 0.004900,
    latencyMs: 128,
    keyPrefix: 'galx_live_p401',
    keyName: 'Production API Backend',
    zdrDigest: 'sha256:9a32c2560ef7a812b77cc48188e1a65dfc2d4b1fa3d677284addd200126d8412',
    status: 'settled',
    timestamp: '4 mins ago'
  },
  {
    id: 'tx_live_8910',
    type: 'usage',
    description: 'API Chat: xAI Grok 4.5 (500K)',
    amountUsd: -0.011240,
    balanceAfterUsd: 114.601170,
    model: 'x-ai/grok-4.5',
    modelName: 'xAI Grok 4.5 (500K)',
    promptTokens: 4100,
    cachedTokens: 1800,
    completionTokens: 640,
    totalTokens: 4740,
    savingsUsd: 0.004760,
    retailEquivalentUsd: 0.016000,
    latencyMs: 285,
    keyPrefix: 'galx_live_lc99',
    keyName: 'Agent Swarm / LangChain Fleet',
    zdrDigest: 'sha256:8b41f1789aa1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d7190',
    status: 'settled',
    timestamp: '18 mins ago'
  },
  {
    id: 'tx_topup_100',
    type: 'deposit',
    description: 'Developer Compute Deposit (+50% Match Grant Applied)',
    amountUsd: 150.00,
    balanceAfterUsd: 114.612410,
    savingsUsd: 50.00,
    retailEquivalentUsd: 150.00,
    keyPrefix: undefined,
    keyName: 'Card •••• 4242',
    zdrDigest: 'dep:stripe_ch_98124b8912aa',
    status: 'settled',
    timestamp: '2 hours ago'
  },
  {
    id: 'tx_welcome_grant',
    type: 'grant',
    description: 'Welcome Grant ($5.00 Free Starter Compute Credit)',
    amountUsd: 5.00,
    balanceAfterUsd: 5.00,
    savingsUsd: 5.00,
    retailEquivalentUsd: 5.00,
    keyPrefix: undefined,
    keyName: 'Platform Promotion',
    zdrDigest: 'promo:welcome_grant_claim',
    status: 'settled',
    timestamp: 'Yesterday'
  }
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filterType = searchParams.get('type') || 'all'; // 'all' | 'deposit' | 'usage' | 'grant'
    const modelFilter = searchParams.get('model') || 'all';
    const keyFilter = searchParams.get('key') || 'all';
    const searchQuery = (searchParams.get('q') || '').toLowerCase().trim();
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const format = searchParams.get('format'); // 'csv' | 'json'

    let transactions = [...SEED_TRANSACTIONS];

    // Filter by type
    if (filterType !== 'all') {
      transactions = transactions.filter(t => t.type === filterType);
    }

    // Filter by model
    if (modelFilter !== 'all') {
      transactions = transactions.filter(t => t.model?.includes(modelFilter));
    }

    // Filter by key
    if (keyFilter !== 'all') {
      transactions = transactions.filter(t => t.keyPrefix === keyFilter);
    }

    // Search query filter
    if (searchQuery) {
      transactions = transactions.filter(t =>
        t.description.toLowerCase().includes(searchQuery) ||
        t.id.toLowerCase().includes(searchQuery) ||
        (t.modelName && t.modelName.toLowerCase().includes(searchQuery)) ||
        (t.keyName && t.keyName.toLowerCase().includes(searchQuery))
      );
    }

    // CSV format export option
    if (format === 'csv') {
      const headers = [
        'Transaction ID',
        'Type',
        'Description',
        'Model',
        'Prompt Tokens',
        'Cached Tokens',
        'Completion Tokens',
        'Total Tokens',
        'Amount USD',
        'Wholesale Savings USD',
        'Retail Equivalent USD',
        'Latency (ms)',
        'API Key',
        'ZDR Hash',
        'Timestamp'
      ].join(',');

      const rows = transactions.map(t => [
        t.id,
        t.type,
        `"${t.description.replace(/"/g, '""')}"`,
        t.model || '',
        t.promptTokens || 0,
        t.cachedTokens || 0,
        t.completionTokens || 0,
        t.totalTokens || 0,
        t.amountUsd.toFixed(6),
        (t.savingsUsd || 0).toFixed(6),
        (t.retailEquivalentUsd || 0).toFixed(6),
        t.latencyMs || 0,
        `"${t.keyName || ''}"`,
        t.zdrDigest || '',
        `"${t.timestamp}"`
      ].join(','));

      const csvData = [headers, ...rows].join('\n');

      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="galxai_wallet_ledger_${Date.now()}.csv"`
        }
      });
    }

    return NextResponse.json({
      success: true,
      transactions: transactions.slice(0, limit),
      total: transactions.length,
      filteredCount: transactions.length
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch transaction ledger' },
      { status: 500 }
    );
  }
}
