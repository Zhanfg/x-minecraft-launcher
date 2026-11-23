# P0-02: dual Windows host build

The standalone fork workflow `.github/workflows/fork-windows-build.yml` builds Windows x64 Electron and DeskGap in one Windows job.

- **Electron**: unmodified XMCL production renderer and `win-unpacked` portable app.
- **DeskGap**: pinned DeskGap source/runtime, SHA256 verification, `package.ts` single-click EXE integrity check.
- Both outputs are uploaded as **unsigned test artifacts**, and never auto-published, signed with upstream credentials, or offered as verified production downloads.
- Default `master`, product IDs, upstream updater URLs, and upstream workflow files remain untouched.
- Accept P0-02 only after both artifact uploads and all CI steps succeed. A successful CI build does not prove Minecraft startup, Microsoft login, or game rendering.
- P0-03 is a separate Windows runtime benchmark with real measurements.
- This is a Windows-only workflow; no Android changes.

## Retry / run

Open [GitHub Actions](https://github.com/Zhanfg/x-minecraft-launcher/actions/workflows/fork-windows-build.yml) and choose *Run workflow*, or update the Draft PR. The workflow is intentionally independent of the upstream release pipeline.
