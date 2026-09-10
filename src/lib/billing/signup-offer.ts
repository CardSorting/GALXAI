/** This public contract contains only the currently advertised allowance. */
export interface SignupCreditOffer { enabled: boolean; amountUsd: number | null }
export function parseSignupCreditOffer(value: unknown): SignupCreditOffer | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (row.enabled === false && row.amountUsd === null) return { enabled: false, amountUsd: null };
  if (row.enabled !== true || typeof row.amountUsd !== 'number' || !Number.isFinite(row.amountUsd)
    || row.amountUsd <= 0 || row.amountUsd > 1000 || Math.abs(row.amountUsd * 100 - Math.round(row.amountUsd * 100)) > 0.000001) return null;
  return { enabled: true, amountUsd: row.amountUsd };
}
