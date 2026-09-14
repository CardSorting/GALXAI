# Generation quota read blocked by developer approval

<!-- docs-scope: operational-record -->

## Impact and scope

INC-20260914-QUOTA, SEV-2, authorization. Codex is the active responder. Detected during signed-in release acceptance on September 14, 2026, at approximately 04:25 UTC. Billing confirmed Pro while the new quota header displayed temporarily unavailable. Generation controls depend on this read; customer count and full duration are unknown. No generation was submitted during this check.

## Evidence and timeline

Deployment `dpl_2fcK1FRXc9yyFomC8F7w3Pa6ae1p` served the clean pushed `cd4585f` source. The raw anonymous quota response returned the developer-preview authentication error and access URL, confirming interception before account quota authority. See the append-only journal and [local verification](local-verification.json). [Corrected production acceptance](../../../releases/2026-09-14-free-generation-gate.json) is retained separately.

## Cause and contributing conditions

The new account endpoint was absent from the exact product-support API allowlist. Its handler tests bypassed middleware, synthetic browser tests intercepted the quota response, and the original live negative check accepted any private 401. Those checks could pass while ordinary account requests were blocked by a separate developer permission.

## Containment and recovery

Both private free budgets remained paused during correction. After verified recovery, only the bounded image trial was enabled; Sites stayed paused. The correction adds only the exact quota read path to the developer exemption; account authentication, owner-derived reads, private/no-store responses, sibling-route protections and all mutation gates remain. No grant, usage, migration or paid policy is changed by this correction. Use a compatible gate-preserving rollback; never restore the earlier unbounded free implementation.

## Verification and limits

Regression coverage must traverse preview middleware before the account handler, verify anonymous denial and Pro projection, and reject sibling/deeper path exemptions. Raw HTTP acceptance must identify the account error body as well as status. Production build, compiled/private scans and signed-in Pro Billing/Images/Sites acceptance passed on the corrected deployment. Free-account generation and actual load acceptance remain separate.

## Prevention and closure

ACT-017 tracks the exact middleware/handler regression, negative response-body check, corrected deployment and live Pro UI acceptance. Follow the authorization failure-mode guidance and [triage](../../../runbooks/triage.md). Recovery is verified on deployment `dpl_4ToBKASnCSgDbWNLkpaRbw4zxhgU` and ACT-017 is complete. The incident is recorded as recovered; unrelated prevention work remains separate.
