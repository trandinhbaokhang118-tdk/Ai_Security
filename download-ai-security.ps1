param(
    [string]$Destination = (Join-Path $PWD "Ai_Security")
)

$ErrorActionPreference = "Stop"
$RepositoryUrl = "https://github.com/trandinhbaokhang118-tdk/Ai_Security.git"
$Destination = [System.IO.Path]::GetFullPath($Destination)

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "Khong tim thay Git. Hay cai Git for Windows: https://git-scm.com/download/win"
}

Write-Host "Repository: $RepositoryUrl"
Write-Host "Thu muc:    $Destination"

if (-not (Test-Path -LiteralPath $Destination)) {
    Write-Host "Chua co source code. Dang clone nhanh main..."
    git clone --branch main --single-branch $RepositoryUrl $Destination
    if ($LASTEXITCODE -ne 0) {
        throw "Clone that bai."
    }
}
else {
    $GitDirectory = Join-Path $Destination ".git"
    if (-not (Test-Path -LiteralPath $GitDirectory)) {
        throw "Thu muc da ton tai nhung khong phai Git repository: $Destination"
    }

    Push-Location $Destination
    try {
        $RemoteUrl = (git remote get-url origin 2>$null).Trim()
        if ($LASTEXITCODE -ne 0 -or -not $RemoteUrl) {
            throw "Repository khong co remote 'origin'."
        }

        $ExpectedSuffix = "trandinhbaokhang118-tdk/Ai_Security.git"
        if (-not $RemoteUrl.Replace("\", "/").EndsWith($ExpectedSuffix)) {
            throw "Remote origin khong dung repository Ai_Security: $RemoteUrl"
        }

        $LocalChanges = git status --porcelain
        if ($LocalChanges) {
            Write-Host ""
            Write-Host "Dung cap nhat: may dang co code chua commit." -ForegroundColor Yellow
            Write-Host "Hay commit hoac stash cac file sau truoc khi chay lai:"
            $LocalChanges | ForEach-Object { Write-Host "  $_" }
            exit 2
        }

        Write-Host "Dang tai cap nhat moi nhat tu main..."
        git fetch origin main
        if ($LASTEXITCODE -ne 0) {
            throw "Fetch that bai."
        }

        git switch main
        if ($LASTEXITCODE -ne 0) {
            throw "Khong the chuyen sang nhanh main."
        }

        git pull --ff-only origin main
        if ($LASTEXITCODE -ne 0) {
            throw "Pull that bai. Main local co the da tach lich su; khong tu dong ghi de."
        }
    }
    finally {
        Pop-Location
    }
}

Write-Host ""
Write-Host "Hoan tat. Source code moi nhat nam tai:" -ForegroundColor Green
Write-Host $Destination
Write-Host "Commit main hien tai:"
git -C $Destination log -1 --oneline
