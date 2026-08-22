# Text-line profiler: lists every text line (y-range, height, width) in a region.
# Background is sampled per row at x=40 so dark and light blocks both work.
# usage: powershell -File lines.ps1 -Src file.png -Y1 0 -Y2 9999
param([string]$Src, [int]$Y1 = 0, [int]$Y2 = 999999, [int]$X1 = 100, [int]$X2 = 1025, [int]$MinH = 14)
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @"
using System; using System.Drawing; using System.Drawing.Imaging; using System.Collections.Generic; using System.Text;
public static class Lines {
  public static string Run(string src, int y1, int y2, int x1, int x2, int minH) {
    Bitmap b0 = new Bitmap(src);
    Bitmap b = new Bitmap(b0.Width, b0.Height, PixelFormat.Format32bppArgb);
    using (Graphics g = Graphics.FromImage(b)) g.DrawImage(b0, 0, 0, b0.Width, b0.Height);
    b0.Dispose();
    int w = b.Width, h = b.Height; y2 = Math.Min(y2, h - 1); x2 = Math.Min(x2, w - 1);
    BitmapData bd = b.LockBits(new Rectangle(0,0,w,h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    int stride = bd.Stride; byte[] buf = new byte[stride*h];
    System.Runtime.InteropServices.Marshal.Copy(bd.Scan0, buf, 0, buf.Length); b.UnlockBits(bd);
    StringBuilder sb = new StringBuilder();
    int runStart = -1; int minx = int.MaxValue, maxx = -1;
    for (int y = y1; y <= y2 + 1; y++) {
      bool has = false; int rowMin = int.MaxValue, rowMax = -1;
      if (y <= y2) {
        int ob = y*stride + 40*4; int bgL = (buf[ob]+buf[ob+1]+buf[ob+2])/3;
        bool darkBg = bgL < 110;
        for (int x = x1; x <= x2; x++) {
          int o = y*stride + x*4; int L = (buf[o]+buf[o+1]+buf[o+2])/3;
          bool t = darkBg ? (L > bgL + 70) : (L < bgL - 80);
          if (t) { has = true; if (x < rowMin) rowMin = x; if (x > rowMax) rowMax = x; }
        }
      }
      if (has) { if (runStart < 0) runStart = y; if (rowMin < minx) minx = rowMin; if (rowMax > maxx) maxx = rowMax; }
      else if (runStart >= 0) {
        int hh = y - runStart;
        if (hh >= minH) sb.AppendLine(string.Format("y {0,5}..{1,5}  h {2,4}   x {3,4}..{4,4}  w {5,4}", runStart, y-1, hh, minx, maxx, maxx-minx+1));
        runStart = -1; minx = int.MaxValue; maxx = -1;
      }
    }
    b.Dispose(); return sb.ToString();
  }
}
"@ -ReferencedAssemblies System.Drawing
$SP = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Output ([Lines]::Run((Join-Path $SP $Src), $Y1, $Y2, $X1, $X2, $MinH))
