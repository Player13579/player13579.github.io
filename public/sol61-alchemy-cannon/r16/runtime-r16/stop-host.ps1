$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$lease = Get-Content -LiteralPath (Join-Path $root 'HOST-LEASE.json') -Raw | ConvertFrom-Json
$identity = Get-Content -LiteralPath (Join-Path $root 'HOST-IDENTITY.json') -Raw | ConvertFrom-Json
$proc = Get-Process -Id ([int]$identity.pid) -ErrorAction SilentlyContinue
if (-not $proc) { throw 'Owned R16 host PID is absent; refusing to signal another process.' }
$wmi = Get-CimInstance Win32_Process -Filter "ProcessId = $($identity.pid)"
if ($proc.StartTime.ToUniversalTime().Ticks -ne ([DateTime]$identity.startTimeUtc).ToUniversalTime().Ticks -or $wmi.ExecutablePath -ne $identity.executablePath -or $wmi.CommandLine -ne $identity.commandLine) { throw 'R16 host PID identity changed; refusing to signal.' }
$response = Invoke-WebRequest -UseBasicParsing -Method Post -Uri "http://$($lease.host):$($lease.port)/__shutdown" -Headers @{ 'x-codex-stop-token' = $lease.shutdownToken } -TimeoutSec 5
if ($response.StatusCode -ne 200) { throw "R16 host shutdown failed: $($response.StatusCode)" }
$deadline = (Get-Date).AddSeconds(10)
do { Start-Sleep -Milliseconds 200; $still = Get-Process -Id ([int]$identity.pid) -ErrorAction SilentlyContinue; $port = Get-NetTCPConnection -LocalPort ([int]$lease.port) -State Listen -ErrorAction SilentlyContinue } while (($still -or $port) -and (Get-Date) -lt $deadline)
if ($still -or $port) { throw 'R16 host process or listening port remains after shutdown.' }
$result = [ordered]@{schema='dva-cannon-r16-host-stop-result/v1';status='stopped';pid=$identity.pid;port=$lease.port;identityStartTimeUtc=$identity.startTimeUtc;stoppedAtUtc=[DateTime]::UtcNow.ToString('o');portClosed=$true}
$result | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $root 'HOST-STOP-RESULT.json') -Encoding utf8
$result | ConvertTo-Json -Compress
