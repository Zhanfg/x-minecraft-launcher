# P0-03: launcher's own process-tree metrics, NOT Minecraft FPS.
# Run in an interactive disposable Windows user/VM with no running XMCL instance.
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$Executable,
    [ValidateSet('Electron','DeskGap')][string]$HostKind = 'Electron',
    [ValidateRange(1,5)][int]$Runs = 2,
    [ValidateRange(5,180)][int]$DurationSeconds = 30,
    [ValidateRange(250,2000)][int]$SampleIntervalMs = 750,
    [string]$OutputDirectory = 'fork/bench-results'
)

$ErrorActionPreference = 'Stop'
$exe = (Resolve-Path -LiteralPath $Executable -ErrorAction Stop).Path
$folder = Split-Path -Parent $exe
$exeName = Split-Path -Leaf $exe
$existing = @(Get-Process -Name ([IO.Path]::GetFileNameWithoutExtension($exeName)) -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -eq $exe })
if ($existing.Count -gt 0) {
    throw "Existing launcher process uses $exe. Exit it before sampling to avoid a single-instance handoff."
}

function Get-ProcessTree([int]$RootPid) {
    $ids = [System.Collections.Generic.HashSet[int]]::new()
    [void]$ids.Add($RootPid)
    $rows = @(Get-CimInstance -ClassName Win32_Process -Property ProcessId, ParentProcessId)
    do {
        $count = $ids.Count
        foreach ($row in $rows) {
            if ($ids.Contains([int]$row.ParentProcessId)) {
                [void]$ids.Add([int]$row.ProcessId)
            }
        }
    } while ($ids.Count -gt $count)
    return @($ids)
}

$diskItems = @(Get-ChildItem -LiteralPath $folder -Recurse -File -ErrorAction Stop)
$diskBytes = ($diskItems | Measure-Object -Property Length -Sum).Sum
if ($null -eq $diskBytes) { $diskBytes = 0 }
$results = @()

for ($i = 1; $i -le $Runs; $i++) {
    $started = [Diagnostics.Stopwatch]::StartNew()
    $launch = Start-Process -FilePath $exe -WorkingDirectory $folder -PassThru
    $samples = @()
    $windowReadyMs = $null
    $maxWsMiB = 0.0
    $maxPrivateMiB = 0.0
    $lastCpuSeconds = 0.0
    $spawned = [System.Collections.Generic.HashSet[int]]::new()
    [void]$spawned.Add([int]$launch.Id)
    try {
        while ($started.Elapsed.TotalSeconds -lt $DurationSeconds) {
            $ids = @(Get-ProcessTree -RootPid $launch.Id)
            foreach ($id in $ids) { [void]$spawned.Add([int]$id) }
            $processes = @($ids | ForEach-Object { Get-Process -Id $_ -ErrorAction SilentlyContinue } |
                Where-Object { $null -ne $_ })
            if ($processes.Count -eq 0) { break }
            $memory = [double](($processes | Measure-Object -Property WorkingSet64 -Sum).Sum)
            $private = [double](($processes | Measure-Object -Property PrivateMemorySize64 -Sum).Sum)
            $cpu = [double](($processes | Measure-Object -Property CPU -Sum).Sum)
            $ws = [math]::Round($memory / 1MB, 1)
            $pr = [math]::Round($private / 1MB, 1)
            if ($ws -gt $maxWsMiB) { $maxWsMiB = $ws }
            if ($pr -gt $maxPrivateMiB) { $maxPrivateMiB = $pr }
            if ($cpu -gt $lastCpuSeconds) { $lastCpuSeconds = $cpu }
            if ($null -eq $windowReadyMs -and @($processes | Where-Object { $_.MainWindowHandle -ne 0 -and $_.Responding }).Count -gt 0) {
                $windowReadyMs = [math]::Round($started.Elapsed.TotalMilliseconds)
            }
            $samples += [pscustomobject]@{
                elapsedMs = [math]::Round($started.Elapsed.TotalMilliseconds)
                processCount = $processes.Count
                sumWorkingSetMiB = $ws
                sumPrivateMiB = $pr
                sumCpuSeconds = [math]::Round($cpu,2)
            }
            Start-Sleep -Milliseconds $SampleIntervalMs
        }
    } finally {
        foreach ($id in $spawned) {
            $p = Get-Process -Id $id -ErrorAction SilentlyContinue
            if ($p) {
                try { Stop-Process -Id $id -Force -ErrorAction Stop } catch {
                    Write-Warning "Could not stop measured child PID $id : $_"
                }
            }
        }
        $started.Stop()
    }
    $results += [pscustomobject]@{
        host = $HostKind
        run = $i
        startupLabel = if ($i -eq 1) { 'first-run-in-session' } else { 'warm-repeat' }
        firstResponsiveWindowMs = $windowReadyMs
        peakSumWorkingSetMiB = $maxWsMiB
        peakSumPrivateMiB = $maxPrivateMiB
        observedCpuSeconds = [math]::Round($lastCpuSeconds,2)
        sampleCount = $samples.Count
        samples = $samples
    }
}

New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$report = [pscustomobject]@{
    benchmarkSchema = 1
    host = $HostKind
    executable = $exeName
    windowsVersion = [Environment]::OSVersion.VersionString
    logicalProcessors = [Environment]::ProcessorCount
    applicationDirectoryMiB = [math]::Round([double]$diskBytes / 1MB,1)
    durationSeconds = $DurationSeconds
    sampleIntervalMs = $SampleIntervalMs
    caveats = @(
        'First-in-session is not a true cold OS cache run; reboot with a clean profile to measure cold start.',
        'Window detection uses first responsive top-level Win32 window, not game-ready time.',
        'Process working sets may double-count shared memory; CPU seconds are cumulative, not percent CPU.',
        'CIM sampling introduces observer overhead; do not compare to game-frame telemetry.'
    )
    measurements = $results
}
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$out = Join-Path $OutputDirectory "p0-03-$HostKind-$stamp.json"
$report | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $out -Encoding utf8
Write-Host "P0-03 launcher telemetry saved to $out"
$results | Select-Object host,run,startupLabel,firstResponsiveWindowMs,peakSumWorkingSetMiB,peakSumPrivateMiB,observedCpuSeconds | Format-Table -AutoSize
