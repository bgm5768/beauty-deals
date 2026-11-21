# 로컬 PC 전용: GitHub IP가 막힌 퀘이사존·올리브영을 수집해 local.json으로 커밋/푸시한다.
$ErrorActionPreference = "Stop"
$root = Split-Path (Split-Path $PSScriptRoot)
Set-Location $root
$env:PYTHONUTF8 = "1"; $env:PYTHONIOENCODING = "utf-8"
git pull --rebase --autostash -q
& "$root/.venv-scrape/Scripts/python.exe" "$PSScriptRoot/scrape.py" "$PSScriptRoot/local.json" quasarzone oliveyoung
git add worker/scrape/local.json
git diff --cached --quiet
if ($LASTEXITCODE -eq 0) { exit 0 }
git commit -q -m "chore: refresh local scrape (quasarzone, oliveyoung)"
git push -q origin main
