$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSCommandPath
$client = Join-Path $root 'tunnel-client-v0.0.10-windows-amd64\tunnel-client.exe'
$profileDir = Join-Path $root '.tunnel-client'

if (-not (Test-Path -LiteralPath $client)) {
    throw "Không tìm thấy tunnel-client tại: $client"
}

$secureKey = Read-Host 'Dán OpenAI Runtime API key (sẽ không được lưu)' -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)

try {
    $env:CONTROL_PLANE_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    & $client run --profile prewise-local --profile-dir $profileDir --open-web-ui
}
finally {
    if ($bstr -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
    Remove-Item Env:CONTROL_PLANE_API_KEY -ErrorAction SilentlyContinue
}
