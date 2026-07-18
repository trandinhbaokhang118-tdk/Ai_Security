# Runs only inside a disposable Windows Sandbox Cloud AMI.
# It polls for one consented sample, executes it with a short timeout, and sends
# bounded telemetry back to the gateway. Install it as the PrewiseSandboxAgent
# Windows service in the hardened AMI; never run it on a user workstation.

$ErrorActionPreference = 'Stop'
$api = $env:PREWISE_SANDBOX_API.TrimEnd('/')
$session = $env:PREWISE_SANDBOX_SESSION
$token = $env:PREWISE_SANDBOX_TOKEN
if (!$api -or !$session -or !$token) { throw 'Missing Prewise sandbox agent configuration.' }

$headers = @{ 'X-Sandbox-Agent-Token' = $token }
$sampleDir = 'C:\Prewise\Sample'
New-Item -ItemType Directory -Path $sampleDir -Force | Out-Null
$downloadPath = Join-Path $sampleDir 'sample.download'
$samplePath = $null
$allowedExtensions = @('.exe', '.msi', '.bat', '.cmd', '.com', '.scr', '.ps1')

function Send-Report([string] $status, [string] $verdict, [string] $summary, [array] $processes) {
  $body = @{
    status = $status
    verdict = $verdict
    summary = $summary
    process_tree = $processes
    file_events = @()
    registry_events = @()
    network_events = @()
  } | ConvertTo-Json -Depth 6
  Invoke-RestMethod -Method Post -Uri "$api/v1/sandbox-cloud/agent/sessions/$session/report" -Headers $headers -ContentType 'application/json' -Body $body | Out-Null
}

for ($attempt = 0; $attempt -lt 120; $attempt++) {
  try {
    $response = Invoke-WebRequest -Uri "$api/v1/sandbox-cloud/agent/sessions/$session/exe" -Headers $headers -OutFile $downloadPath -UseBasicParsing
    $filename = $response.Headers['X-Sandbox-Sample-Filename']
    $extension = [IO.Path]::GetExtension($filename).ToLowerInvariant()
    if ($allowedExtensions -notcontains $extension) { throw "Unsupported sample extension: $extension" }
    $samplePath = Join-Path $sampleDir ("sample" + $extension)
    Move-Item -LiteralPath $downloadPath -Destination $samplePath -Force
    break
  } catch {
    Remove-Item -LiteralPath $downloadPath -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 5
  }
}

if (!$samplePath -or !(Test-Path -LiteralPath $samplePath)) { exit 0 }

try {
  $extension = [IO.Path]::GetExtension($samplePath).ToLowerInvariant()
  $process = switch ($extension) {
    '.msi' { Start-Process -FilePath 'msiexec.exe' -ArgumentList @('/i', $samplePath, '/qn', '/norestart') -WorkingDirectory $sampleDir -PassThru; break }
    { $_ -in @('.bat', '.cmd') } { Start-Process -FilePath 'cmd.exe' -ArgumentList @('/d', '/c', "`"$samplePath`"") -WorkingDirectory $sampleDir -PassThru; break }
    '.ps1' { Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $samplePath) -WorkingDirectory $sampleDir -PassThru; break }
    default { Start-Process -FilePath $samplePath -WorkingDirectory $sampleDir -PassThru }
  }
  $finished = $process.WaitForExit(60000)
  if (!$finished) { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue }
  $entry = @{
    pid = $process.Id
    image = $samplePath
    exited = $finished
    exit_code = if ($finished) { $process.ExitCode } else { $null }
  }
  $verdict = if ($finished -and $process.ExitCode -eq 0) { 'completed_no_obvious_behavior' } else { 'suspicious_or_timed_out' }
  Send-Report 'completed' $verdict "Sample executed in disposable VM; timed_out=$(!$finished)." @($entry)
} catch {
  Send-Report 'failed' 'execution_failed' ("Agent execution failed: " + $_.Exception.Message) @()
}
