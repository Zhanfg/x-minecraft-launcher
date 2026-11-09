# P0-08: controlled Windows release candidate

Extends P0-02's independent Windows build. Produces:

- `xmcl-VERSION-electron-win64-portable.zip`: entire Electron portable runtime.
- `xmcl-deskgap-VERSION-win32-x64.exe`: unsigned DeskGap preview.
- `SHA256SUMS`: SHA-256 for **both complete deliverables**.
- `release-manifest.json`: source revision, file size/hash, unsigned status, and explicit `releaseReady:false`.

**This is not a signed production release.** The fork is intentionally isolated from upstream Voxelum signing, Azure/CDN and GitHub release workflows. We do not reuse the upstream `xmcl` auto-update feed, product ID, or signing keys.

Before a production release, decide and isolate fork product identifiers and release/update URLs, implement verified signing, exercise clean-install/update/rollback on Windows, and verify Microsoft login and Fabric/server play.

The P0-08 workflow is independently executable on the PR; review and download the `p0-08-windows-unsigned-candidate` Actions artifact. Do not publish it as stable.
