# Relay contract hardening and CLI upload investigation — September 11, 2026

Private historical implementation record. The complete original narrative, measurements, references and procedures are retained in [the verbatim snapshot](../../historical-docs/sites-automation__durable__RELAY_CONTRACT_HARDENING.md.txt). This record describes the earlier pass; current instructions are in [Sites operations](../../../../../docs/maintainers/SITES_OPERATIONS.md) and [the delivery runbook](LIVE_ADAPTERS.md).

## Recorded work

This earlier pass closed an admission gap where old workers could ignore a required output-ceiling flag. It added administrator-only fresh challenges, exact reply validation, bounded reads, checks across eligible workers, and a second selected-worker check. A failure before dispatch released admission capacity and preserved safe key reuse. Those mechanisms now also support the version-2 local profile without asserting supplier enforcement.

The earlier supplier rejected `max_output_tokens`; direct CLI archive upload remained unqualified. Native-host upload followed by private publication succeeded separately. The original record contains the diagnostic distinctions and the then-current metered release gates. These findings do not require a supplier ceiling or successful direct CLI upload to admit fixed-price content.

## Current interpretation

[ADRs 0134–0136](../../../../../docs/adr/README.md) supersede metered-only activation prerequisites for the new fixed-price content mode. Preserve original completion/ownership evidence and actual recorded measurements. Opaque supplier quotas are accepted as unknown; passing quota or cost assertions are not invented. The fixed-mode implementation was locally verified but not deployed or enabled by that pass.

[Fixed-mode verification](opaque-provider-verification.json) and [historical activation evidence](activation-verification.json).
