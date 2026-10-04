# Maintainer glossary

<!-- docs-scope: domain-reference -->

Private terminology reference. Definitions point to owning contracts; they do not promise performance, provider identity or compliance. [Architecture](../ARCHITECTURE.md) and [account management](../reference/relay-account-management.md) own current relay behavior.

## Accounts and execution

| Term | Meaning |
| --- | --- |
| Central account authority | Main project `mazhcjisettrzbqhorvp` and its private service; canonical credentials, assignment, lifecycle and existing account lease ledger |
| Premium pool | Exclusive paid provider accounts; text, Sites and images |
| Customer plan | GALX product access/usage policy, independent of provider paid/free account class |
| Registration | Centrally saved manual setup/review flow bound to one pool, installation and desktop; not an enabled account |
| Assignment | Exclusive immutable central ownership relation; no account transfer or peer borrowing |
| Runtime engine | In-process execution engine for an eligible account inside its fixed pool runtime container |
| Legacy worker | Separate per-account container managed by the retained single controller; different lifecycle/recovery contract |
| Monitor | Fixed pool operator/viewer interface using scoped central authorization; no combined browser registry |
| Saved revision | Version committed centrally by a lifecycle/credential operation |
| Applied revision | Matching account/credential revision reported by the current runtime epoch with fresh evidence |
| Request status / account health evidence | Availability defaults to unknown; explicit request results supply evidence. Cancellation and transport uncertainty are neutral, and saved credentials are not a continuous health verdict |
| Remove account | Permanent central revocation with retained assignment, credentials, leases, files and history; not upstream logout |
| Restore registration | Restore an unfinished removed registration with new review; never restore a removed registered account |
| Execution epoch | Current central runtime ownership generation that fences stale execution/acknowledgments |
| Grant | Short-lived renewable central permission bound to the existing account lease and execution scope |
| Execution reservation | Durable own-pool operation identity before provider I/O; not a second account budget |
| Uncertain outcome | Work cannot be proven unstarted or completed; preserve identity and never automatically redispatch |
| Legacy maintenance hold | Blocks new work/replacement while preserving an existing legacy worker; distinct from new-pool Pause |

## Representation and compaction

**BroccoliDB** names the repository's representation, buffering and compaction components. Use the [domain index](../broccolidb/README.md) and [component guide](../BROCCOLIDB_COMPACTION_ONBOARDING_GUIDE.md) for actual supported paths and validation. It is not database authorization or durable receipt authority.

**Representation redundancy** is repeated structure or formatting that may be reduced for a particular task. **Task-relevant invariants** are facts that the transformation must preserve. Claims of quality or savings require measured workloads and the owning checks.

**Compaction safety** refers to validation/fallback mechanisms in the owning implementation. The existence of a safety component does not establish universal losslessness, exact numerical preservation or a throughput guarantee.

**Stream cascader**, **document pyramid** and **rolling context** name different representation/context-processing modules. Their retention, token budgets, dependency support and measured performance are component-specific; do not copy dated numeric claims into routing or customer promises.

## Security and custody

**Envelope encryption / AES-GCM** protects stored credential material under the configured vault and authenticated context. **Authenticated associated data (AAD)** binds ciphertext to its intended identity/context; use [key rotation](MULTI_TENANT_SHARD_AND_KEY_ROTATION.md) for preserving that association during rewrap.

**Buffer zeroization** overwrites selected mutable buffers. It does not certify erasure of immutable strings, provider copies, guest files, backups or garbage-collected memory.

**Principal** is a centrally authenticated role/pool/installation identity. A caller-supplied identifier or ordinary GALX session cannot select a more privileged principal. **Fail closed** means missing required authority refuses the operation rather than substituting cached permission or broader credentials.

## Routing and accounting

**Model eligibility** means the owning route has the required current access/capability evidence. It is evaluated inside Premium. Premium retains its matching-engine cursor, bounded concurrency and cooldown/backoff exclusion. Historical weighted/headroom utilities do not define these algorithms. See [routing](../ROUTING_ALGORITHMS.md).

**Alias** is an explicitly supported input mapping. It cannot promise an unverified underlying model, provision an account, grant tool access or authorize fallback. **Circuit breaker** is a component-specific temporary admission/failure mechanism; it cannot overwrite central lifecycle authority or permit replay after uncertainty.

**Account lease** reserves provider-account capacity centrally. **Customer usage/fair usage** governs product access separately. **Receipt** retains the original operation/outcome under its owning protocol; it does not imply exactly-once upstream execution or transferable recovery.

## Evidence

**Inference boundary** identifies the actual provider call when measuring execution. Transport chunks are not tokenizer usage, and completed output alone does not certify persistence, publication or billing. **A/B evaluation** compares stated workloads under an explicit method; one benchmark does not establish general quality or economics.

**Installed**, **registration open**, **execution open**, **applied** and **provider qualified** describe different checkpoints. [Current state](../../post-mortem/CURRENT_STATE.md) owns dated observations; ADR status records a decision independently of delivery. Historical proofs and prototypes remain scoped evidence.
