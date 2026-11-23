# P0-03: Windows launcher performance protocol

This PR provides **measurement instrumentation only**; it does not claim an optimization or a verified performance number.

## Procedure

1. Use a disposable interactive Windows x64 account or VM with no personal Minecraft credentials and no other XMCL process. Avoid GitHub's headless Actions runner for visual/window-ready results.
2. Build both P0-02 host targets at the same revision. Run the benchmark separately for both executables; do not include a Minecraft process.
3. Use PowerShell 7 (native Windows), run:

```powershell
pwsh -NoProfile -File scripts/fork/benchmark-windows.ps1 -Executable "C:\\xmcl-electron\\XMCL.exe" -HostKind Electron -Runs 2 -DurationSeconds 30
pwsh -NoProfile -File scripts/fork/benchmark-windows.ps1 -Executable "C:\\xmcl-deskgap\\xmcl-deskgap-0.73.1-win32-x64.exe" -HostKind DeskGap -Runs 2 -DurationSeconds 30
```

4. For a meaningful cold-start result, restart Windows and use a clean disposable user profile before each first run. The script reports `first-run-in-session`, *not* proof of cold OS caches. Do not clear caches on a production device.
5. Repeat with identical driver, Windows power plan, display mode and launch revision. Review median and P95 startup window timings across at least five comparable independent sessions.
6. Collect additional Minecraft benchmarks in a separate test: Fabric version, Mod list, render distance, resolution, frametime P50/P95, GC metrics, total Java+native RSS and 30-minute thermal behavior.
7. The tool only writes local JSON into ignored `fork/bench-results`; never commit personal account paths, game credentials or raw client logs.

## Metrics and limits

| Metric | Source | Limit |
| --- | --- | --- |
| First responsive window | Win32 process window handle | Not fully loaded UI or account ready |
| Sum working set | Launcher process tree | Shared pages may be counted twice |
| Sum private bytes | Launcher process tree | Not entire system commit |
| Cumulative CPU seconds | Launcher process tree | Not systemwide CPU utilization |
| Disk footprint | Files under packaged executable directory | Doesn't include downloaded Minecraft/JRE |
| Cold/warm | Session label | Requires separate reboot and cache controls |

**Acceptance status**: Telemetry script submitted; P0-03 remains pending until genuine Windows results and interpretation are attached to this PR.
