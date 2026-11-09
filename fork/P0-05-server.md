# P0-05: server preset (disabled by default)

Fork-specific CLI command `fork launch [instance]` is registered **before** upstream CLI parsing on both Electron and DeskGap hosts.

- Reads the embedded `fork/config/project.json` at build time. It contains no real server by default.
- Resolves a selected instance from the argument or `modpack.instanceId`.
- Parses a validated `host[:port]` or bracketed IPv6 address and dispatches upstream `instance.launch` with `side:client` and `server` override.
- Keeps the official account session and Fabric installation handling in XMCL; no manual Minecraft JAR distribution.
- Does **not** rewrite existing `servers.dat` or overwrite users' settings, and does not auto-connect unless explicitly invoked.
- Both host implementations add just two narrow integration lines (import + plugin registration) each.

## Commands (once product is built and configured)

```powershell
.\XMCL.exe fork launch "Fabric Test"
```

DeskGap uses the same fork command when given its single EXE name.

**Acceptance remains partial:** a real server endpoint, selected pack instance and interactive Windows account test are required. A branded home-page one-click button is deliberately deferred; the command can already be placed in a desktop shortcut, but its launch behavior is not yet runtime-tested.

We intentionally do not set or guess a hostname or username.
