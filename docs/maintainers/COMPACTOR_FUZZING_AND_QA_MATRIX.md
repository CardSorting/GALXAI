# BroccoliDB compaction and synchronization checks

<!-- docs-scope: current-guide -->

Private maintainer guide. This review covers the canonical compaction facade, provenance checks and current preview synchronization contract. It does not certify every generated domain module, prove semantic equivalence or establish a latency/SLO guarantee.

## Choose the boundary

| Change | Source and checks | What success establishes |
| --- | --- | --- |
| Facade modes, validation or API contract | [Facade](../../src/core/broccolidb/BroccoliCompactionFacade.ts), `npm run test:broccolidb:api` | Supported dispatch, bounded inputs, response/error cases and private-preview authorization in fixtures |
| Provenance and adversarial input | [Safety guard](../../src/core/broccolidb/BroccoliCompactionSafety.ts), `npm run test:broccolidb:hardening` | The tested high-risk evidence and fallback invariants; not complete semantic fidelity |
| Preview read caching or batching | [Read coordinator](../../src/lib/supabase/repositories/PreviewReadSync.ts), [sync contract](../operations/preview-hybrid-sync.md), `npm run test:developer-preview` | Current authorization despite warm snapshots, pool/account isolation, eviction, bounded batches and failure handling |
| Database read/write effects | `npm run test:developer-preview:db`, `npm run test:preview-admin:db`, `npm run db:test` | The tested SQL, transaction, role, concurrency and durability cases in disposable fixtures |
| Image library working sets | [Scale guide](image-library-scale.md), `npm run test:image:scale`, `npm run test:image:library-db`, `npm run test:image:security` | Bounded caches/queues, expiry, coalescing, cursor ties, older assets, sanitized thumbnails and failed-read recovery in isolated fixtures |
| Image persistence | [Image recovery](../../post-mortem/runbooks/image-generation.md), `npm run test:image:db` | Receipt ownership, single dispatch and durable Favorites behavior in the fixture |
| Transport and build isolation | `npm run test:egress:transport` | Physical request budgets and isolated build configuration for the tested paths |

## Maintain meaningful fixtures

Derive size boundaries from the owning source constants and check both allowed and rejected inputs. Exercise missing fields, unsupported modes, malformed/truncated input, Unicode and adversarial numeric evidence when the changed path handles them. Test deterministic fallback and preservation of original content where required. A fixed runtime such as five milliseconds is not a portable correctness assertion.

The compaction API is private preview. The facade API suite supplies synthetic verified identities and approval reads while retaining the real route guards. It tests unauthenticated and verified-but-unapproved denial. Do not restore anonymous access or use real credentials to make the suite pass. Public Images and Sites keep their separate product policy.

BroccoliDB snapshots optimize response payloads; they do not authorize a caller, commit a mutation or replace durable PostgreSQL records. Re-check current grants before reusing payloads and preserve uncertainty on failed writes. Preview reads retain their existing bounded per-pool coordinator. Image-library metadata and artifact processing have separate bounded work coordinators described in the scale guide; neither is a permission cache.

## Evidence and limits

Run the relevant checks and record actual results, environment and source scope in the domain review. Benchmarks and generated-domain evaluations are separate research; inspect their runtime, network and cost prerequisites before running them. Do not infer production egress savings from serialized fixture row sizes or turn historical test totals into permanent requirements.

The prior guide's universal resilience claim, fixed timing target and blanket benchmark recipe were removed during the September 13 domain review. Use [knowledge reviews](../knowledge/README.md) for current review state and dated evidence.
