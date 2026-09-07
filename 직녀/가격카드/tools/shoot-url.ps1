# Shoot a live URL with headless Chrome (shoot.ps1 only takes local files).
# usage: powershell -File shoot-url.ps1 -Url http://localhost:3100/ -Out home.png [-W 448] [-H 3000] [-Col 448]
# NOTE: ASCII-only file. PS 5.1 mangles non-ASCII in BOM-less UTF-8.
#
# Why a separate tool: the in-app Browser pane cannot composite frames in this
# environment, so screenshots time out. Headless Chrome is the fallback that has
# worked before (teaser measurement, 2026-08-11).
#
# TRAP (measured 2026-08-23): on Windows, Chrome clamps window width to about
# 500px. Asking for --window-size=448 silently lays out at ~504 and scales the
# capture, so a centered 448 column lands 28px off and the right edge is clipped.
# -Col fixes it: shoot wide, then crop the centered column of that width.
param(
  [string]$Url,
  [string]$Out,
  [int]$W = 448,
  [int]$H = 3000,
  [int]$Col = 0,
  [int]$Wait = 3500,
  [int]$Scale = 1
)

$SP = Split-Path -Parent $MyInvocation.MyCommand.Path
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chrome)) { $chrome = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" }
$outPath = if ([System.IO.Path]::IsPathRooted($Out)) { $Out } else { Join-Path $SP $Out }
if (Test-Path $outPath) { Remove-Item $outPath -Force }

$shotW = $W
if ($Col -gt 0) { $shotW = 1000 }        # wide enough that the clamp never bites
$raw = if ($Col -gt 0) { "$outPath.raw.png" } else { $outPath }
if (Test-Path $raw) { Remove-Item $raw -Force }

# Mobile Chrome UA: the saju chart API blocks user agents containing "headless".
$ua = "Mozilla/5.0 (Linux; Android 13; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"

& $chrome --headless=new --disable-gpu --no-sandbox --hide-scrollbars `
  --force-device-scale-factor=$Scale --user-agent="$ua" `
  --virtual-time-budget=$Wait --screenshot="$raw" --window-size=$shotW,$H $Url 2>&1 | Out-Null

if (-not (Test-Path $raw)) { Write-Output "SHOOT FAILED: $Url"; exit 1 }

Add-Type -AssemblyName System.Drawing
if ($Col -gt 0) {
  $src = [System.Drawing.Image]::FromFile($raw)
  $left = [int](($src.Width - $Col) / 2)
  $bmp = New-Object System.Drawing.Bitmap $Col, $src.Height
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.DrawImage($src, (New-Object System.Drawing.Rectangle 0, 0, $Col, $src.Height), `
                     (New-Object System.Drawing.Rectangle $left, 0, $Col, $src.Height), `
                     [System.Drawing.GraphicsUnit]::Pixel)
  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose(); $src.Dispose()
  Remove-Item $raw -Force
}

$img = [System.Drawing.Image]::FromFile($outPath)
Write-Output ("shot {0} : {1} x {2}" -f (Split-Path -Leaf $outPath), $img.Width, $img.Height)
$img.Dispose()
