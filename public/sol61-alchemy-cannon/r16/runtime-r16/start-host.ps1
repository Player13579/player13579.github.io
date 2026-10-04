$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$node = (Get-Command node -ErrorAction Stop).Source
$serve = Join-Path $root 'serve-r16.mjs'
$stdout = Join-Path $root 'HOST.stdout.log'
$stderr = Join-Path $root 'HOST.stderr.log'
$process = Start-Process -FilePath $node -ArgumentList @($serve) -WorkingDirectory $root -PassThru -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr
$deadline = (Get-Date).AddSeconds(12)
do {
    Start-Sleep -Milliseconds 200
    $leasePath = Join-Path $root 'HOST-LEASE.json'
    if (Test-Path -LiteralPath $leasePath) { try { $lease = Get-Content -LiteralPath $leasePath -Raw | ConvertFrom-Json } catch { $lease = $null } }
} while ((-not $lease -or -not $lease.port) -and (Get-Date) -lt $deadline)
if (-not $lease -or -not $lease.port) { throw 'R16 host did not write a live lease before timeout.' }
$owned = Get-Process -Id ([int]$process.Id) -ErrorAction Stop
$wmi = Get-CimInstance Win32_Process -Filter "ProcessId = $($process.Id)"
$identity = [ordered]@{ schema='dva-cannon-r16-host-identity/v1'; pid=$process.Id; startTimeUtc=$owned.StartTime.ToUniversalTime().ToString('o'); executablePath=$wmi.ExecutablePath; commandLine=$wmi.CommandLine; workingDirectory=$root; purpose='private R16 native material gate host'; leaseFile='HOST-LEASE.json' }
$identity | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $root 'HOST-IDENTITY.json') -Encoding utf8
if (-not (Get-NetTCPConnection -LocalPort ([int]$lease.port) -State Listen -ErrorAction SilentlyContinue)) { throw 'R16 lease port is not listening.' }
[ordered]@{status='started';pid=$process.Id;port=$lease.port;expiresAt=$lease.expiresAt;reviewUrl=$lease.reviewUrl;identity='HOST-IDENTITY.json';lease='HOST-LEASE.json'} | ConvertTo-Json -Depth 4
