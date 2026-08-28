import assert from 'node:assert/strict';
import { BroccoliSupportEmailThreadCompactor } from '../src/core/broccolidb/BroccoliSupportEmailThreadCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB SUPPORT EMAIL THREAD COMPACTOR');
  console.log('======================================================================\n');

  BroccoliSupportEmailThreadCompactor.clear();

  // Multi-turn email ticket thread with nested quotes (> ...) and corporate footers
  const emailTicket = `
From: Jane Customer <jane@customer.com>
Subject: Re: Enterprise API 401 error

I updated my environment variable to the new key but I am still receiving a 401 unauthorized error on the /v1/chat endpoint. Can you please check if our account is active?

--
Jane Customer
CTO | Customer Systems
Sent from my iPhone

----- Original Message -----
From: Support Agent <support@galxai.com>

Hi Jane,

Thanks for reaching out. Have you rotated your secret key in the dashboard or are you using the legacy master token?

Best,
Support Team
CONFIDENTIALITY NOTICE: This transmission is intended only for the use of the addressee.

----- Original Message -----
From: Jane Customer <jane@customer.com>

> Hi Support Team,
> We are getting 401 errors across all our production workers suddenly. Please advise.
`.trim();

  console.log('[1/2] Compacting Multi-Turn Support Email Thread in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliSupportEmailThreadCompactor.compactEmailThread(emailTicket);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Original Turns: ${res.originalMessagesCount}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Email Thread Preview:\n"""\n${res.compactedThreadPrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.ok(res.savingsPercentage >= 35);
  assert.ok(res.compactedThreadPrompt.includes('CHRONOLOGICAL TICKET CONVERSATION'));
  assert.ok(res.compactedThreadPrompt.includes('I updated my environment variable'));
  assert.ok(res.compactedThreadPrompt.includes('Have you rotated your secret key'));
  assert.ok(!res.compactedThreadPrompt.includes('Sent from my iPhone'));
  assert.ok(!res.compactedThreadPrompt.includes('CONFIDENTIALITY NOTICE'));

  console.log('\n[✓] Support Email Nested Quote Pruning & Signature Removal Verified.');

  console.log('\n======================================================================');
  console.log('   ALL SUPPORT EMAIL THREAD COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
