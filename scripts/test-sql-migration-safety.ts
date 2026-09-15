import { test } from 'node:test';
import assert from 'node:assert/strict';
import { containsTruncateStatement } from './lib/sql-migration-safety';
test('truncate protection triggers are not destructive statements', () => {
  for (const sql of ['CREATE TRIGGER guard BEFORE TRUNCATE ON private.accounts', 'CREATE TRIGGER guard AFTER INSERT OR TRUNCATE ON public.accounts', "EXECUTE format('CREATE TRIGGER guard BEFORE TRUNCATE ON private.%I', relation);"]) assert.equal(containsTruncateStatement(sql),false);
});
test('real truncation remains blocked, including after a trigger and quoted targets', () => {
  for (const sql of ['TRUNCATE TABLE public.accounts;', 'TRUNCATE public.accounts;', 'TRUNCATE ONLY public.accounts;', 'TRUNCATE "Accounts";', 'TRUNCATE "ON";', 'truncate\tprivate.accounts;', 'CREATE TRIGGER guard BEFORE TRUNCATE ON public.accounts; TRUNCATE public.accounts;', "EXECUTE 'TRUNCATE public.accounts';"]) assert.equal(containsTruncateStatement(sql),true);
});
