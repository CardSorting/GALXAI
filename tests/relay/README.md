# Relay image verification

This directory is the home for relay-focused verification notes and future
fixtures. The current test implementations remain under `scripts/` because
they are also used by the existing lifecycle commands.

Run the local image dispatch matrix from the repository root:

```sh
node --import tsx --test \
  scripts/test-image-availability.ts \
  scripts/test-image-studio-recovery.ts \
  scripts/test-image-premium-routing.ts \
  scripts/test-image-public-http.ts \
  scripts/test-relay-services.ts \
  scripts/test-relay-federation-http.ts
```

The matrix verifies:

- silent availability checks and preserved drafts;
- authenticated relay admission and successful image dispatch;
- sanitized image artifacts and customer-facing response allowlists;
- async acceptance, polling, recovery, and duplicate-dispatch protection;
- federation ownership, model validation, and relay replacement behavior.

These tests use local fixtures and do not generate billable production images.
