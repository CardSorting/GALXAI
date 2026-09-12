import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readBilling, readBillingTransactions } from '../src/lib/billing/account';

const privateNote = 'relay.private.invalid shard=private credential_source=private';
const transaction = { id: '00000000-0000-0000-0000-000000000001', type: 'usage_draw',
  description: privateNote, amountUsd: '-0.125', balanceAfterUsd: '1.875',
  createdAt: '2026-09-12T00:00:00.000000Z', diagnostics: privateNote };

test('billing transaction DTOs exclude operational notes and unexpected fields', async () => {
  const db = { query: async () => ({ rows: [transaction, { ...transaction, type: privateNote }] }) } as any;
  const result = await readBillingTransactions(db, 'verified-owner', new URLSearchParams());
  assert.deepEqual(result.transactions[0], { id: transaction.id, type: 'usage_draw',
    description: 'Compute usage.', amountUsd: -0.125, balanceAfterUsd: 1.875, createdAt: transaction.createdAt });
  assert.equal(result.transactions[1].type, 'adjustment');
  assert.equal(result.transactions[1].description, 'Account activity.');
  assert(!JSON.stringify(result).includes(privateNote));
  assert(!JSON.stringify(result).includes('diagnostics'));
});

test('billing invoice DTOs allowlist fields and status without changing private records', async () => {
  let query = 0;
  const invoice = { id: 'in_public', amountDueUsd: '20', amountPaidUsd: '20', status: privateNote,
    url: 'https://invoice.stripe.com/i/public', createdAt: '2026-09-12T00:00:00Z', diagnostics: privateNote };
  const db = { query: async () => ({ rows: [[], [transaction], [invoice], []][query++] }) } as any;
  const result = await readBilling(db, 'verified-owner', new URLSearchParams());
  assert.deepEqual(result.invoices, [{ id: 'in_public', amountDueUsd: 20, amountPaidUsd: 20,
    status: 'unknown', url: invoice.url, createdAt: '2026-09-12T00:00:00.000Z' }]);
  assert(!JSON.stringify(result).includes(privateNote));
  assert.equal(transaction.description, privateNote);
  assert.equal(invoice.status, privateNote);
});
