# Fork overlay (P0)

This folder contains all project-specific configuration and release decisions for `Zhanfg/x-minecraft-launcher`. It does not alter upstream defaults until an explicitly reviewed adapter applies it.

## Baseline

- Upstream: `Voxelum/x-minecraft-launcher`, `master` at `4aee50aaf1cb7ee741ba995c87017f4dbe85584e`.
- Fork `master` is kept aligned with upstream; changes go to topic branches and Draft PRs.
- Baseline is checked with `node scripts/fork/check-baseline.mjs`.
- No custom branding, game installer, or server address is active merely because a JSON config exists.

## Ownership and safety

- Keep branding, server policy, and pack distribution settings in `fork/config/project.json`. Do not hardcode server addresses or product names across upstream files.
- Do not commit Minecraft proprietary game binaries, launch credentials, user profiles, private server files, secrets, or OAuth tokens.
- Game installation must use legitimate authenticated distribution. Keep a user's saves, screenshots, and individual settings when updating an instance.
- Upstream `xmcl` and `xmcl-deskgap` identifiers and auto-update configuration are *unchanged* until a separate identity/update feed review. Never publish a fork with an upstream update feed by accident.
- DeskGap unsigned EXE remains a manual-install preview, not an auto-update release.
- No Android code or build changes in this P0 track.

## P0 acceptance map

| ID | Verification / Deliverable | Status in this branch |
| --- | --- | --- |
| P0-01 | Pin and verify upstream ancestry, document sync policy and licensing | Implemented |
| P0-02 | Produce Windows x64 Electron and DeskGap builds | Pending independent workflow |
| P0-03 | Cold/warm launch, idle/peak memory, CPU/disk measurements | Pending Windows telemetry |
| P0-04 | Test Fabric pack with client-only assets and configuration | Pending pack manifest and licensed test assets |
| P0-05 | Preset server and explicit one-click connect | Pending adapter and real server endpoint |
| P0-06 | Updates, rollback, file conflict recovery | Pending scenario tests |
| P0-07 | Integrity, paths, saves, account login | Pending security cases |
| P0-08 | GitHub Actions EXE, checksums, release manifest | Pending independent release workflow |

## Upstream sync protocol

1. Fetch upstream `master`, compare its new HEAD against our `fork/baseline.json` commit.
2. Review upstream changes against all open Draft PRs before rebasing topic branches.
3. Move the baseline anchor only after integrating a verified upstream commit. Treat this file as an anchor, *not* a forced package-version pin.
4. Keep fork CI independent from upstream release/signing actions. Never allow fork CI to publish to Voxelum resources.
