# ADR 0023: Step-Up SUDO Session Elevation & Fine-Grained Token Scoping

## Status
**Accepted & Implemented**

## Context
Standard web applications grant equal authority to all active session requests. If a session token is leaked or an unattended workstation is accessed, attackers could perform high-impact mutations (e.g. exporting API keys, changing billing caps, mutating vault keys). Additionally, microservices and AI subagents often need only a small subset of capabilities (e.g. `chat:*`) rather than master root permissions.

## Decision
1. **GitHub/AWS-Style Step-Up SUDO Elevation**:
   - Privileged administrative endpoints require active SUDO mode (`sudo_elevated_until_ms > now`).
   - Standard session tokens receive an initial 15-minute SUDO window on login.
   - When expired, high-risk operations are rejected with HTTP 403 (`SUDO_MODE_REQUIRED`) and must be re-elevated via `POST /api/auth/sudo/elevate`.
2. **Stripe/AWS STS-Style Fine-Grained Token Scopes**:
   - Implemented wildcard scope validation (`*`, `chat:*`, `images:*`, `shards:read`, `billing:read`, `admin:sudo`).
   - `GalxAuthEngine.createRestrictedToken`: Mints ephemeral, restricted child bearer tokens for downstream workers/subagents with bounded TTLs (e.g., 1 hour) without exposing master user credentials.
3. **Multi-Device Remote Logout Governance**:
   - `GET /api/auth/sessions`: Returns humanized list of active devices (OS, browser, IP, current session badge).
   - `DELETE /api/auth/sessions`: Instantly logs out all other remote devices while maintaining the current user session.

## Consequences
### Positive
- **Blast Radius Reduction**: Downstream microservices and agents operate under strict principle of least privilege.
- **Critical Action Protection**: Unattended browser sessions cannot perform destructive actions once the 15-minute SUDO window expires.
- **Device Clarity**: Non-technical users can see all logged-in devices and revoke suspicious sessions with 1 click.
