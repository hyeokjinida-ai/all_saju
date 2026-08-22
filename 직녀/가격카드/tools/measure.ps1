# Machine diff: measure the same landmarks on reference and on our render.
# usage: powershell -File measure.ps1 -Mine a_render.png
# NOTE: ASCII-only file.
param([string]$Mine, [string]$Ref = "ref_orig.png")

Add-Type -AssemblyName System.Drawing
$SP = Split-Path -Parent $MyInvocation.MyCommand.Path
$imgR = [System.Drawing.Image]::FromFile((Join-Path $SP $Ref))
$imgM = [System.Drawing.Image]::FromFile((Join-Path $SP $Mine))
$bmpR = New-Object System.Drawing.Bitmap($imgR)
$bmpM = New-Object System.Drawing.Bitmap($imgM)

function PinkBox($bmp,$y1,$y2,$x1,$x2){
  $minx=99999;$maxx=0;$miny=99999;$maxy=0
  for($y=$y1;$y -le $y2;$y++){ for($x=$x1;$x -le $x2;$x++){
    $c=$bmp.GetPixel($x,$y)
    if($c.R -gt 230 -and $c.G -lt 160 -and $c.B -lt 190){
      if($x -lt $minx){$minx=$x}; if($x -gt $maxx){$maxx=$x}
      if($y -lt $miny){$miny=$y}; if($y -gt $maxy){$maxy=$y} } } }
  if($maxx -eq 0){ return $null }
  return @{x1=$minx;x2=$maxx;y1=$miny;y2=$maxy;w=($maxx-$minx);h=($maxy-$miny)}
}
# vertical run of near-white pixels in one column (card body)
function WhiteCol($bmp,$x,$y1,$y2){
  $t=-1;$b=-1
  for($y=$y1;$y -le $y2;$y++){ $c=$bmp.GetPixel($x,$y)
    if($c.R -gt 248 -and $c.G -gt 248 -and $c.B -gt 248){ if($t -lt 0){$t=$y}; $b=$y } }
  return @{y1=$t;y2=$b}
}

function Show($tag,$r,$m){
  if($null -eq $r -or $null -eq $m){ Write-Output ("{0,-12} MISSING" -f $tag); return }
  $dx = $m.x1 - $r.x1; $dy = $m.y1 - $r.y1; $dw = $m.w - $r.w; $dh = $m.h - $r.h
  Write-Output ("{0,-12} REF x{1} y{2} {3}x{4}  |  OURS x{5} y{6} {7}x{8}  |  d: x{9,4} y{10,4} w{11,4} h{12,4}" -f `
    $tag,$r.x1,$r.y1,$r.w,$r.h,$m.x1,$m.y1,$m.w,$m.h,$dx,$dy,$dw,$dh)
}

# charname window must stop short of the lettering glow, or the two boxes merge
Show "charname"  (PinkBox $bmpR 300 440 380 760)  (PinkBox $bmpM 300 440 380 760)
Show "lettering" (PinkBox $bmpR 450 780 100 1050) (PinkBox $bmpM 450 780 100 1050)
Show "badge"     (PinkBox $bmpR 790 1010 200 950) (PinkBox $bmpM 790 1010 200 950)

$cR = WhiteCol $bmpR 120 900 3100; $cM = WhiteCol $bmpM 120 900 3100
Write-Output ("{0,-12} REF y{1}..{2}  |  OURS y{3}..{4}  |  d: top{5,4} bot{6,4}" -f `
  "card",$cR.y1,$cR.y2,$cM.y1,$cM.y2,($cM.y1-$cR.y1),($cM.y2-$cR.y2))

Show "bullet1-hh" (PinkBox $bmpR 1240 1360 150 300) (PinkBox $bmpM 1240 1360 150 300)
Show "bullet9-hh" (PinkBox $bmpR 1900 2100 150 300) (PinkBox $bmpM 1900 2100 150 300)
Show "note-box"  (PinkBox $bmpR 2180 2380 140 1000) (PinkBox $bmpM 2180 2380 140 1000)
# CTA is unmeasurable by hue - the page background at that depth is the same pink.
# It sits flush under the card, so the card measurement already covers it.

$bmpR.Dispose(); $bmpM.Dispose(); $imgR.Dispose(); $imgM.Dispose()
