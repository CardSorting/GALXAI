# ADR 0165: GALX Media, Connect and Nova boundaries

<!-- docs-scope: decision-record -->

Date: 2026-10-03. Decision: accepted for the user's explicit responsibility split and bounded implementation. Delivery: local application with the Connect migration applied to the existing primary database for the controlled acceptance cohort. Actual provider completion and subsequent revocation are demonstrated; hosted application rollout has not occurred. The explicit-entitlement adapter does not approve a pass price or commercial migration. [Dated acceptance](../../post-mortem/releases/2026-10-03-connect-provider-recovery.json) is delivery evidence, separate from this decision status; the [earlier blocked attempt](../../post-mortem/releases/2026-10-03-connect-real-acceptance.json) remains historical evidence.

## Context

People need capability in a chosen tool without adopting the media surface or operating a provider-key proxy. Full-account credentials would grant more authority than inference requires. Earlier public developer retirement does not authorize unrestricted keys or token wallets.

## Decision

Keep three modules in the existing deployment. Media owns media relationships and publishing. Connect reuses verified identity for consent, grants, normalized entitlement and credential lifecycle. Nova accepts inference permission and enforces shared admission without commercial or media business rules.

Use authorization code and S256 PKCE for registered browser and native public clients. Opaque Nova-only credentials cannot become account sessions. Transactions serialize code redemption, refresh reuse, revocation and admission. No cached grant authorizes new work after acknowledged disconnect. Application permission may exist without entitlement; capacity failure is independent. Connections create no public profile or media, payment, Star or administrative authority.

The first contract is text-only and disabled by default, with two reference hosts and a small runtime API. Only explicit, time-bounded operator inference grants qualify initially. There is no automatic Foundry/Developer subscription migration, new account system, deployment rewrite, agent runtime, marketplace, token wallet, automatic purchasing or subdelegation. Existing Media image allowance accounting retains its scope.

## Alternatives and consequences

Sharing account tokens breaks least privilege. Reusing legacy provider/device preview flows inherits unrelated authority. The current Supabase OAuth-server audience requires broader policy changes for safe third-party access and lacks the custom inference scope. Three new services add operational work before proving the boundary. A narrow standard protocol in the current application establishes the requested behavior with bounded tests.

Grant-store outages fail closed. Refresh reuse revokes the application; the runtime coalesces refreshes and reconnects after ambiguous rotation. Browser credentials remain in memory, so a reload requires reconnecting. Request identity prevents automatic replay, and interrupted streams retain uncertainty. Stop, disconnect and ending entitlement are different operations.

This partially replaces the product-wide “no public inference API” and universal quota interpretation for the reviewed Connect path only. It does not reopen legacy developer enrollment, change ADR 0160's private-human/Star publishing boundary, or change ADR 0164's Foundry/Orbit contracts. Historical deployment evidence remains historical.

## Confirmation and recovery

[Connect operations](../operations/galx-connect.md) owns protocol details, source interfaces, setup, errors, release and paired rollback. [Current state](../../post-mortem/CURRENT_STATE.md) owns dated evidence. Local fixture success does not establish production availability, real sign-in or an actual provider completion.
