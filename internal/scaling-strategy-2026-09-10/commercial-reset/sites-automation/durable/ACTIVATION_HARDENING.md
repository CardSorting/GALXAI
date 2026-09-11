# Metered activation hardening — September 11, 2026

Private historical implementation record. The complete original narrative, measurements, references and procedures are retained in [the verbatim snapshot](../../historical-docs/sites-automation__durable__ACTIVATION_HARDENING.md.txt). This record describes the earlier pass; current instructions are in [Sites operations](../../../../../docs/maintainers/SITES_OPERATIONS.md) and [the delivery runbook](LIVE_ADAPTERS.md).

## Recorded work

The first activation hardening persisted tenant-bound worker completion receipts, saved the accepted job/origin before streaming, restricted requests to one attempt and bounded local bytes/time. Fenced replacement distinguished queued non-dispatch from running unknown work. Recovery retained the original wallet rate and exposed only the customer response DTO.

Its schema-1 activation evidence bound the exact origin, model, tariff, supplier output ceiling, receipt retention/restart and CLI upload/publication. That validator remains available only for explicit legacy metered cards. The report's absent-usage holds and supplier-ceiling prerequisite describe metered settlement. Fixed pricing now settles known completions with null usage and uses the version-2 local readiness profile. Cohort and rolling account limits are implemented.

## Current interpretation

[ADRs 0134–0136](../../../../../docs/adr/README.md) supersede metered-only activation prerequisites for the new fixed-price content mode. Preserve original completion/ownership evidence and actual recorded measurements. Opaque supplier quotas are accepted as unknown; passing quota or cost assertions are not invented. The fixed-mode implementation was locally verified but not deployed or enabled by that pass.

[Fixed-mode verification](opaque-provider-verification.json) and [historical activation evidence](activation-verification.json).
