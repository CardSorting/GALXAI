# Account migration: provider fingerprints and retained browser cookies

<!-- docs-scope: operational-record -->

## Impact and scope

INC-20261017-ACCOUNT-CUTOVER, SEV-2, identity. Observed during the October 17 planned central migration. The replacement serves canonical traffic against the final native database. Email delivery and actual GitHub login work, with the existing owner UUID preserved. Google rejects its configured secret. A browser with retained hosted cookies also reaches session-expired recovery in Library despite a verified account header. Customer impact outside these owned checks is unknown. No private workspace data was exposed.

## Evidence and cause

The source management export supplies 64-character provider-secret fingerprints, not usable client secrets. Private Auth diagnostics report Google's `invalid_client`. The retained real GitHub credential matches the existing client ID and repairs actual GitHub code exchange. Google's console explicitly no longer permits viewing/downloading its existing secret; adding a replacement requires the owner's credential handoff. Existing client identities, callbacks and permissions remain unchanged.

The general image API resolver selects the first matching account cookie. That can select an old hosted cookie while the fixed local SSR cookie authenticates the page/profile. The correction selects the fixed local cookie in local mode and retains denial when it is absent, malformed, incomplete or revoked; it never falls back to a different account. New adversarial regressions pass. Live correction acceptance is recorded separately in the [central cutover record](../../../releases/2026-10-17-central-native-cutover.json).

## Containment and recovery

Keep Auth verification, account/session liveness and resource ownership enforced. Do not clear unrelated browser cookies, auto-confirm accounts, accept the old signing key, bypass the rejected session or thaw the hosted writer. The source is stale after accepted local writes. The original preparation database and dated source/backup artifacts are retained.

Use the existing Google client to add a secret without disabling its predecessor; save it through the private numeric-loopback capture form, then explicitly refresh only local Auth provider credentials. Never paste secrets into chat or evidence. The new provider loader rejects management fingerprints before a future migration can drain clients. Require actual provider exchange and actual signed-in workspace/API content after staging; a redirect registration or streamed HTTP 200 alone does not pass them.

## Prevention and closure

The first cookie-only whole-image candidate also aborted after 40 checks and
the full 480-second shutdown allowance. It was never deployed. Deterministic
Nova/relay regressions reproduced a hung reader cancellation acknowledgement;
the correction initiates cancellation without awaiting that acknowledgement,
while preserving terminal persistence and unknown/no-replay behavior. Thirty-two
focused tests and 52 Connect tests pass. ACT-055 requires renewed full-image
acceptance and deployment to both native profiles; passing unit checks alone
does not close it. See [deployment failures](../../../failure-modes/deployment.md).

The second full-image attempt also failed after 40 checks/full stop allowance,
exit 137 without OOM. All fourteen fixture records were terminal (eight unknown).
Its new diagnostics distinguish successful persistence from an open public
pending read. An executor that ignores abort reproduced the remaining defect;
the local stream now races its read against the unchanged request/deadline
signal. Thirty-three focused tests and TypeScript pass; fresh build/full-image
acceptance remain pending. Neither failed candidate changed production.

The final fresh image passes all 44 whole-image checks, including a 304,410 ms
deadline, clean exit, restart and no replay. Both native web/Nova profiles run
that exact image after clean drains. The existing owner browser retains hosted
cookies and renders three private Library images and authorized Favorites; the
Library also works after hosted GALXAI is INACTIVE. Actual public response,
browser-asset, cache and sanitized-artifact checks pass. ACT-054/055 are completed;
the two earlier failed candidates remain preserved and were never deployed.

The original organization's Pro subscription is cancelled through Free. Central
was paused with one acknowledged POST and status-only reconciliation after its
initial PAUSING observation timed out. It is retained, not permanently deleted.
Native authority/configuration and independent recovery remain intact; no invoice
payment or new generation was submitted. Historical usage/invoices remain.

ACT-053 still tracks Google's manual credential handoff and actual provider
return. Keep it separate from ACT-052, whose expired Premium upstream sign-ins
predate this migration. See [identity failure modes](../../../failure-modes/identity.md).
The incident remains contained; partial recovery does not close either owner step.
