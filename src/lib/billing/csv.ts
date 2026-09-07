import type { BillingTransaction } from './account';
export function billingCsv(records: BillingTransaction[]) {
  const cell = (value: string) => `"${(/^[\s]*[=+@-]/.test(value) ? "'" + value : value).replace(/"/g, '""')}"`;
  return ['Date (UTC),Transaction ID,Type,Description,Amount USD,Balance after USD', ...records.map(row => [cell(row.createdAt), cell(row.id), cell(row.type), cell(row.description), row.amountUsd.toFixed(6), row.balanceAfterUsd.toFixed(6)].join(','))].join('\r\n');
}
