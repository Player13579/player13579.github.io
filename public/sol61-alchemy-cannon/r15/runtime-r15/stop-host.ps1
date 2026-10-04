$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$lease = Get-Content -LiteralPath (Join-Path $root 'HOST-LEASE.json') -Raw | ConvertFrom-Json
$identityPath = Join-Path $root 'HOST-IDENTITY.json'
if (-not (Test-Path -LiteralPath $identityPath)) { throw 'Owned host identity record is missing.' }
$expected = Get-Content -LiteralPath $identityPath -Raw | ConvertFrom-Json
$proc = Get-Process -Id ([int]$expected.pid) -ErrorAction SilentlyContinue
if (-not $proc) { throw 'Owned host PID is already absent; do not signal a replacement process.' }
$wmi = Get-CimInstance Win32_Process -Filter "ProcessId = $($expected.pid)"
if ($proc.StartTime.ToUniversalTime().Ticks -ne ([DateTime]$expected.startTimeUtc).ToUniversalTime().Ticks -or $wmi.ExecutablePath -ne $expected.executablePath -or $wmi.CommandLine -ne $expected.commandLine) { throw 'PID identity changed; refusing to signal.' }
$response = Invoke-WebRequest -UseBasicParsing -Method Post -Uri "http://$($lease.host):$($lease.port)/__shutdown" -Headers @{ 'x-codex-stop-token' = $lease.shutdownToken } -TimeoutSec 5
if ($response.StatusCode -ne 200) { throw "Host shutdown failed: $($response.StatusCode)" }
$deadline = (Get-Date).AddSeconds(10)
do { Start-Sleep -Milliseconds 200; $still = Get-Process -Id ([int]$expected.pid) -ErrorAction SilentlyContinue; $port = Get-NetTCPConnection -LocalPort ([int]$lease.port) -State Listen -ErrorAction SilentlyContinue } while (($still -or $port) -and (Get-Date) -lt $deadline)
if ($still -or $port) { throw 'Owned host process or listening port remains after shutdown.' }
$result = [ordered]@{schema='dva-cannon-r15-single-pulse-host-stop-result/v1';status='stopped';pid=$expected.pid;port=$lease.port;identityStartTimeUtc=$expected.startTimeUtc;stoppedAtUtc=[DateTime]::UtcNow.ToString('o');portClosed=$true}
$result|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $root 'HOST-STOP-RESULT.json') -Encoding utf8
$result|ConvertTo-Json -Compress

