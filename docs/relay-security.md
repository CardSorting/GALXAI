# Relay access and containment

<!-- docs-scope: current-guide -->
> Private relay policy. See [security boundaries](SECURITY.md) and [the contract](FEDERATION_STRATEGY.md).

Only the controller holds registry/vault and Docker authority. Workers receive one assigned credential and scoped internal keys; desktops have separate guest homes/profiles without host, source, Docker socket or registry/vault mounts. Containers do not establish hardware isolation or an egress firewall.

Inference keys cannot administer the controller or issue browser grants. Host launchers delegate separate loopback monitor and desktop sessions through one-use tickets. Operational assets/data require server authorization. Origin, Host, forwarding-header and WebSocket checks enforce the local boundary. No browser admin-key storage.

Explicit enrollment validates and creates without overwriting an existing account. Desktop sync safely reads an owned guest file, checks the linked account and conditionally replaces current authority after durable intent. It cannot export host keyrings, enroll unknown accounts or claim success after checkpoint failure.

Holds block new work/replacements while allowing inspection; they cannot override removed, revoked, expired or rotated authority. Rejection is revision-specific. Preserve private signing/journal state and scope cleanup by ownership.

Public application responses use explicit allowlists and sanitized images. Keep internal execution metadata, topology and upstream diagnostics out of public bodies, headers, streams and assets. Guest homes and job checkpoints are sensitive retention surfaces. These controls are not compliance certification.
