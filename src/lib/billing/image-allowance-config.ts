/**
 * The only activation surface for human image allowances.
 *
 * Approved launch allocation and shared output weights live only here.
 * Accounting tables store per-period snapshots after activation; they are not
 * an alternate configuration source.
 */
export type ImagePlanKey = 'creator-v1' | 'studio-v1' | 'team-v1';
export type ImageQuality = 'standard' | 'hd';

// Keep activation values within the corresponding Postgres accounting columns.
const POSTGRES_INTEGER_MAX = 2_147_483_647;
const POSTGRES_SMALLINT_MAX = 32_767;

export interface ApprovedImagePlanAllowance {
  readonly status: 'APPROVED';
  readonly monthlyUnits: number;
  readonly standardOutputUnits: number;
  readonly hdOutputUnits: number;
}

export type ImagePlanAllowance =
  | { readonly status: 'UNAPPROVED' }
  | { readonly status: 'APPROVED'; readonly monthlyUnits: number };

export interface ImageAllowanceConfiguration {
  readonly revision: string;
  readonly outputUnits: Readonly<Record<ImageQuality, number>>;
  readonly plans: Readonly<Record<ImagePlanKey, ImagePlanAllowance>>;
}

export const IMAGE_ALLOWANCE_CONFIGURATION: ImageAllowanceConfiguration = Object.freeze({
  revision: 'launch-2026-09-25',
  outputUnits: Object.freeze({ standard: 1, hd: 2 }),
  plans: Object.freeze({
    'creator-v1': Object.freeze({ status: 'APPROVED' as const, monthlyUnits: 100 }),
    'studio-v1': Object.freeze({ status: 'APPROVED' as const, monthlyUnits: 500 }),
    'team-v1': Object.freeze({ status: 'APPROVED' as const, monthlyUnits: 2_000 }),
  }),
});

/** Reject malformed configuration even if an approved edit bypasses TypeScript. */
export function approvedAllowanceFor(
  configuration: ImageAllowanceConfiguration,
  planKey: ImagePlanKey,
): ApprovedImagePlanAllowance | null {
  if (!configuration || typeof configuration !== 'object' ||
      !configuration.plans || typeof configuration.plans !== 'object') return null;
  const allowance = configuration.plans[planKey];
  if (!allowance || allowance.status !== 'APPROVED') return null;
  const { monthlyUnits } = allowance;
  const standardOutputUnits = configuration.outputUnits?.standard;
  const hdOutputUnits = configuration.outputUnits?.hd;
  if (!Number.isSafeInteger(monthlyUnits) || monthlyUnits < 1 || monthlyUnits > POSTGRES_INTEGER_MAX ||
      !Number.isSafeInteger(standardOutputUnits) || standardOutputUnits < 1 || standardOutputUnits > POSTGRES_SMALLINT_MAX ||
      !Number.isSafeInteger(hdOutputUnits) || hdOutputUnits < standardOutputUnits || hdOutputUnits > POSTGRES_SMALLINT_MAX) return null;
  return { status: 'APPROVED', monthlyUnits, standardOutputUnits, hdOutputUnits };
}

export function imagePlanAllowanceApproved(
  configuration: ImageAllowanceConfiguration,
  planKey: ImagePlanKey,
): boolean {
  return approvedAllowanceFor(configuration, planKey) !== null;
}
