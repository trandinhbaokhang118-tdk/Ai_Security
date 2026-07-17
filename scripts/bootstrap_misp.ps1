param(
    [string]$TargetPath = ".aisec-data\misp-docker"
)

$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$allowedRoot = [IO.Path]::GetFullPath((Join-Path $repoRoot ".aisec-data"))
$target = [IO.Path]::GetFullPath((Join-Path $repoRoot $TargetPath))

if (-not $target.StartsWith($allowedRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "MISP target must stay inside $allowedRoot"
}

if (-not (Test-Path -LiteralPath $target)) {
    git clone --depth 1 https://github.com/MISP/misp-docker.git $target
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to clone the official MISP Docker repository"
    }
}

$template = Join-Path $target "template.env"
$environment = Join-Path $target ".env"
if ((Test-Path -LiteralPath $template) -and -not (Test-Path -LiteralPath $environment)) {
    Copy-Item -LiteralPath $template -Destination $environment
}

Write-Host "Official MISP Docker files are ready at: $target"
Write-Host "Review .env, passwords, TLS and disk placement before running docker compose up -d."
