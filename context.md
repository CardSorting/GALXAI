# Current implementation context

Private context, reconciled September 9, 2026 against implementation through `96ae392`. Use [the handover](HANDOVER.md) for dated status and [the contract](docs/FEDERATION_STRATEGY.md) for behavior.

Automatic worker lifecycle is retained. New accounts require explicit validated create-only enrollment; ambient host-cache import is retired. Cold-start inventory checks precede allocation and 401 rejection is persisted by credential revision. Inventory access alone does not prove inference capability.

Repair desktops are independent Linux workspaces with Terminal/Chromium and explicit shard links. Host launchers delegate separate monitor and desktop browser sessions. Maintenance holds preserve an existing worker while blocking new work/replacements; authority removal, revocation, expiry and rotation still apply.

Saved guest login is validated and synchronized through durable intent plus conditional registry replacement. Custom guest homes require explicit selection; keyrings are not extracted and unknown accounts are not auto-enrolled. Login, registry save, worker application and ready traffic are separate states.

[ADRs 0131–0133](docs/adr/README.md) govern those changes. [ADR 0129](docs/adr/0129-public-image-artifacts-and-verified-identity.md) governs public information, sanitized images and verified identity. Public aliases describe capabilities without exposing topology or execution mechanics.

Dated verification is in [the September 9 record](docs/maintainers/RELAY_SESSION_VERIFICATION_20260909.md). Source, local tests, image builds and component deployments are distinct evidence. Actual sign-in, physical-device acceptance, guest semantic accessibility and complete paid-entry verification retain their stated boundaries.
