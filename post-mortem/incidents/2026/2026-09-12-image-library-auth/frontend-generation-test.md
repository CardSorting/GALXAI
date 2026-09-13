# Live frontend image-generation test

> Historical evidence from the date in this record. Commands and deployment observations below are not current operating instructions. Use [current state](../../../CURRENT_STATE.md) and the [incident runbooks](../../../runbooks/triage.md).

<!-- docs-scope: operational-record -->

Private operational record. Tested September 12, 2026, using the existing signed-in Chrome session on `https://galx.ai/`. No cookies or tokens were extracted, replaced, or printed.

**Result: failed end-to-end image generation.** The earlier successful library smoke checks did not establish that the complete generation flow worked.

This failed attempt is retained as evidence. It was superseded by [the September 13 repair and successful test](../2026-09-13-image-generation/README.md).

## Submitted request

- Submitted once through the Generate image button at `2026-09-13T02:51:15.162Z`.
- One image, standard quality, square 1:1, requested 1024 × 1024.
- Prompt: “A cobalt blue ceramic teapot on a warm cream table beside a small yellow lemon. Soft morning window light, gentle shadows, clean editorial still-life photograph, square composition, no text or logos.”
- Subsequent actions checked this existing request. No second generation was submitted.

## Observations

| Step | Observed result |
| --- | --- |
| Homepage → Images | Passed; the existing session remained signed in. |
| Submit generation | The UI created a pending generation and showed the prompt and elapsed timer. |
| Initial status lookup | At approximately one second, displayed “This request is no longer available. Check your library for its images before generating again.” |
| Check status | Retrying the same request reproduced the missing-request message. |
| Check my images | The library refresh then displayed “Your session has expired. Sign in again to continue.” |
| Reload | The saved prompt and pending request survived; the missing-request message returned. No sign-in was performed. |
| My images after reload | The normal empty-library state returned. No test image was visible. |
| Final library refresh | Refreshed the library after three minutes. It remained empty, while the original generation still showed the missing-request error. |
| Inspect, download, favorite generated result | Blocked: no generated result was available in the frontend. |

## Read-only code diagnosis

The status message is the frontend mapping for HTTP 404. This test observed the rendered UI; it did not capture a raw network trace.

The asynchronous POST calls `GalxTaskQueueEngine.createTask()`. That method writes the task into `GalxPersistence.taskTable`, a `BroccoliDbTable` backed by a process-local Map. The request-status GET calls the synchronous `getTask()`, which only reads that table. Neither path uses the available durable task repository for creation or retrieval. This is consistent with a request created in one server process being unavailable to a subsequent status request in another process.

Relevant code: `src/app/v1/images/generations/route.ts`, `src/app/v1/images/requests/[id]/route.ts`, `src/core/queue/GalxTaskQueueEngine.ts`, and `src/lib/storage/GalxPersistence.ts`.

The recurrence of the session-expired message is separately observed; its exact runtime cause has not been established. Authentication errors and exceptions still collapse to an unauthenticated result in `resolveAuthIdentity`, so a temporary verification failure can produce that message. Reload recovery alone does not prove which failure occurred.

No application code or deployment was changed during this test. Eventual backend completion and billing were not independently established.
