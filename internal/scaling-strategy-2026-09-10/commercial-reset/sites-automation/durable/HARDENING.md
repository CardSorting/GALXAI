# Initial durable workflow hardening — September 10, 2026

Private historical implementation record. The complete original narrative, measurements, references and procedures are retained in [the verbatim snapshot](../../historical-docs/sites-automation__durable__HARDENING.md.txt). This record describes the earlier pass; current instructions are in [Sites operations](../../../../../docs/maintainers/SITES_OPERATIONS.md) and [the delivery runbook](LIVE_ADAPTERS.md).

## Recorded work

The initial hardening added transactional local jobs, account reservations, fenced leases, immutable artifacts, copied publication intent, uncertain-operation locks and bounded connector execution. It corrected archive metadata handling and separated local fixture units from financial authority. The companion runtime was qualified on Node 26.8.1/SQLite 3.53.4; the worker receipt journal later used a separate rollback-journal implementation.

The original report records process-kill recovery, concurrency, archive and source identity, cancellation, mutable-input races and connection/tool authorization checks. Its local generation path did not supply a monetary receipt. That diagnostic limitation remains scoped to `local.ts`; server-authoritative billing is now implemented in `live.ts` and the content API.

## Current interpretation

[ADRs 0134–0136](../../../../../docs/adr/README.md) supersede metered-only activation prerequisites for the new fixed-price content mode. Preserve original completion/ownership evidence and actual recorded measurements. Opaque supplier quotas are accepted as unknown; passing quota or cost assertions are not invented. The fixed-mode implementation was locally verified but not deployed or enabled by that pass.

[Fixed-mode verification](opaque-provider-verification.json) and [historical activation evidence](activation-verification.json).
