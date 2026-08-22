# Render an HTML canvas with headless Chrome, then report key bounding boxes.
# usage: powershell -File shoot.ps1 -Html a_clone.html -Out a_render.png [-H 3211]
# NOTE: ASCII-only file. PS 5.1 mangles non-ASCII in BOM-less UTF-8.
param([string]$Html, [string]$Out, [int]$H = 3211, [int]$W = 1125)

$SP = Split-Path -Parent $MyInvocation.MyCommand.Path
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$outPath = Join-Path $SP $Out
if (Test-Path $outPath) { Remove-Item $outPath -Force }

$uri = "file:///" + ((Join-Path $SP $Html) -replace '\\','/')
& $chrome --headless=new --disable-gpu --no-sandbox --hide-scrollbars `
  --force-device-scale-factor=1 --allow-file-access-from-files `
  --virtual-time-budget=10000 --screenshot="$outPath" --window-size=$W,$H $uri 2>&1 | Out-Null

if (-not (Test-Path $outPath)) { Write-Output "RENDER FAILED"; exit 1 }

Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile($outPath)
Write-Output ("rendered {0} : {1} x {2}" -f $Out, $img.Width, $img.Height)
$img.Dispose()
