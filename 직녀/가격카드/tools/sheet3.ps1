# Three-up judging sheet: [reference | code clone | jiknyeo]
# NOTE: ASCII-only file.
param([string]$Out = "PILOT_3UP.png", [double]$Scale = 1.0)

Add-Type -AssemblyName System.Drawing
$SP = Split-Path -Parent $MyInvocation.MyCommand.Path

$files  = @("ref_orig.png","a_render.png","b_render.png")
$labels = @("1. REF - Cheongwoldang", "2. OURS - code clone", "3. OURS - Jiknyeo")
$imgs = @()
foreach($f in $files){ $imgs += [System.Drawing.Image]::FromFile((Join-Path $SP $f)) }

$W = [int]($imgs[0].Width * $Scale); $H = [int]($imgs[0].Height * $Scale)
$GAP = 34; $TOP = 78
$canvas = New-Object System.Drawing.Bitmap(($W*3+$GAP*2), ($H+$TOP))
$g = [System.Drawing.Graphics]::FromImage($canvas)
$g.Clear([System.Drawing.Color]::FromArgb(22,22,26))
$g.InterpolationMode = 'HighQualityBicubic'

$font  = New-Object System.Drawing.Font("Malgun Gothic", 24, [System.Drawing.FontStyle]::Bold)
$white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)

for($i=0; $i -lt 3; $i++){
  $x = $i * ($W + $GAP)
  $dst = New-Object System.Drawing.Rectangle($x,$TOP,$W,$H)
  $g.DrawImage($imgs[$i], $dst)
  $g.DrawString($labels[$i], $font, $white, ($x+14), 24)
}

$g.Dispose()
$canvas.Save((Join-Path $SP $Out), [System.Drawing.Imaging.ImageFormat]::Png)
$canvas.Dispose()
foreach($im in $imgs){ $im.Dispose() }
Write-Output "3up -> $Out"
