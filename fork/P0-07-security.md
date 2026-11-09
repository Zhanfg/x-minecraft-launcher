# P0-07: archive, path and account-data guardrails

- Added a **read-only** `.mrpack` security audit to prevent path traversal, symlinks, duplicate names, compressed archives with suspicious expansion, private account/game data and weak remote hashes.
- Archive checks are deterministic and do not extract untrusted files or make network calls.
- Official login remains in upstream `instance.launch`; fork server launch refuses to operate if the project configuration disables the official-auth guardrail.
- The P0 fixture only contains original client-side test metadata and no Minecraft proprietary assets.
- Builds and tests use read-only GitHub permissions; distribution remains unsigned and manually reviewed.

**Not yet proven:** full Microsoft OAuth login test, production updater signing/rotation, Windows NTFS access behavior, symlink/Junction tricks in the real installer, or real-game save retention. These require later E2E/device tests and are **not** passed by static artifact auditing.

No third-party mod payloads, credentials, private keys, or Android code are added.
