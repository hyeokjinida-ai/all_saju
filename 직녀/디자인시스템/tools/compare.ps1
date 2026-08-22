# Side-by-side sheet: [reference | ours]
# usage: powershell -File compare.ps1 -Mine a_render.png -Out cmp.png -Label "OURS R1"
# NOTE: keep this file ASCII-only. PS 5.1 reads BOM-less UTF-8 as ANSI and mangles non-ASCII paths.
param([string]$Mine, [string]$Out, [string]$Label = "OURS", [string]$Ref = "ref_orig.png")

Add-Type -AssemblyName System.Drawing
$SP = Split-Path -Parent $MyInvocation.MyCommand.Path

# NOTE: never reuse a [string]-typed param name for the image - PS re-casts it back to string.
$src  = [System.Drawing.Image]::FromFile((Join-Path $SP $Ref))
$imgB = [System.Drawing.Image]::FromFile((Join-Path $SP $Mine))

$W = $src.Width; $H = $src.Height
$GAP = 40; $TOP = 70

$canvas = New-Object System.Drawing.Bitmap(($W*2+$GAP), ($H+$TOP))
$g = [System.Drawing.Graphics]::FromImage($canvas)
$g.Clear([System.Drawing.Color]::FromArgb(24,24,28))
$g.InterpolationMode = 'HighQualityBicubic'

$dstL = New-Object System.Drawing.Rectangle(0,$TOP,$W,$H)
$dstR = New-Object System.Drawing.Rectangle(($W+$GAP),$TOP,$W,$H)
$g.DrawImage($src, $dstL)
$g.DrawImage($imgB, $dstR)

$font  = New-Object System.Drawing.Font("Malgun Gothic", 26, [System.Drawing.FontStyle]::Bold)
$white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$g.DrawString("REF", $font, $white, 16, 20)
$g.DrawString($Label, $font, $white, ($W+$GAP+16), 20)

$g.Dispose()
$canvas.Save((Join-Path $SP $Out), [System.Drawing.Imaging.ImageFormat]::Png)
$canvas.Dispose(); $src.Dispose(); $imgB.Dispose()
Write-Output "sheet -> $Out"
