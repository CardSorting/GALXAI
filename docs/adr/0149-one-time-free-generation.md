# ADR 0149: One-time free generation allowance

<!-- docs-scope: decision-record -->

Date: 2026-09-14. Status: proposed. Owner: Product/API maintainer. Delivery: deployed.

## Context and decision

The resumed working tree implements a restricted welcome allowance: one Sites workspace, three Site turns and five images. The user requested completion of that work. This record documents the implemented choice; it does not retrospectively assert approval of a production commercial launch.

Keep the allowance in private, persistent account grants and operation usage, separate from wallet credit and subscription payments. Enroll confirmed, active, non-anonymous email accounts lazily. A unique normalized-email hash retains the original claim across account deletion. Do not rely on user metadata, browser counts or process-local balances. This is account/email claim protection, not proof that multiple accounts belong to different people.

Serialize short quota transactions and commit deductions with workspace turns or image receipts. Count requested images, and count Build and Discuss equally. Only a confirmed absence of Pro permits free admission; uncertain payment or database authority fails closed. Current paid or explicit complimentary Pro access bypasses the welcome quota and retains existing admission and usage requirements. The standalone Sites content API retains its Pro requirement; free Sites generation and publication belong to the allocated workspace.

Return only public plan and remaining counts to the browser. Both sync and async free images use durable receipts and sanitized artifact delivery. Repeated operation identities return saved outcomes without further deduction or dispatch. Release usage only with proven non-start, atomically with terminal state. Unknown/failed dispatched work remains deducted. Archiving or unpublishing does not reset the Site allocation.

This partially extends the Pro eligibility scope of ADRs [0140](0140-paid-sites-and-shared-fair-usage.md), [0141](0141-sites-pro-self-service-launch.md) and [0148](0148-complimentary-pro-access.md). Their current payment/grant authority and accepted-operation recovery remain intact. A wallet-credit implementation was rejected because it would expose this restricted allowance to unrelated spending; browser-only counters would not enforce concurrency or account isolation.

## Delivery, recovery and confirmation

Apply both quota migrations in timestamp order before a compatible application deployment. ADR 0150 adds the required aggregate stop gate. Its DOWN file pauses free admission and retains records; the earlier quota DOWN only preserves denied privileges. Roll back to compatible gated code or the preceding Pro-only release, never the earlier unbounded free application. Retain grants, usage, receipts and saved work; never delete allowance records as a refund or rollback.

The [quota runbook](../maintainers/FREE_GENERATION_QUOTA.md) defines exact lifetime/release behavior, rollout, verification and remaining limitations. [Local evidence](../knowledge/audits/2026-09-14-free-generation.json) records tests and reviewed source. The [September 14 release](../../post-mortem/releases/2026-09-14-free-generation-gate.json) records both applied migrations, the corrected deployed application, signed-in Pro/read-only acceptance and the bounded image trial. Free Sites remain paused. Actual free generation and publication were not submitted; delivery does not mark this decision accepted.
