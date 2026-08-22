# Background knockout via edge flood fill.
# A plain brightness threshold would punch holes in the glossy highlights inside the
# glyphs, so we only clear background-coloured pixels that are CONNECTED to the border.
# usage: powershell -File cutout.ps1 -Src gpt_raw.png -Out gpt_cut.png
param([string]$Src, [string]$Out, [int]$MinBright = 232, [int]$MaxSat = 30, [int]$Feather = 2)

Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;

public static class Knockout {
  public static string Run(string src, string dst, int minBright, int maxSat, int feather) {
    Bitmap srcBmp = new Bitmap(src);
    Bitmap bmp = new Bitmap(srcBmp.Width, srcBmp.Height, PixelFormat.Format32bppArgb);
    using (Graphics g = Graphics.FromImage(bmp)) { g.DrawImage(srcBmp, 0, 0, srcBmp.Width, srcBmp.Height); }
    srcBmp.Dispose();

    int w = bmp.Width, h = bmp.Height;
    Rectangle rect = new Rectangle(0, 0, w, h);
    BitmapData bd = bmp.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
    int stride = bd.Stride;
    byte[] buf = new byte[stride * h];
    System.Runtime.InteropServices.Marshal.Copy(bd.Scan0, buf, 0, buf.Length);

    bool[] bg = new bool[w * h];
    bool[] seen = new bool[w * h];
    for (int y = 0; y < h; y++) {
      for (int x = 0; x < w; x++) {
        int o = y * stride + x * 4;
        int b = buf[o], gr = buf[o + 1], r = buf[o + 2];
        int max = Math.Max(r, Math.Max(gr, b));
        int min = Math.Min(r, Math.Min(gr, b));
        bg[y * w + x] = (max >= minBright && (max - min) <= maxSat);
      }
    }

    Stack<int> st = new Stack<int>();
    for (int x = 0; x < w; x++) { st.Push(x); st.Push((h - 1) * w + x); }
    for (int y = 0; y < h; y++) { st.Push(y * w); st.Push(y * w + w - 1); }

    int cleared = 0;
    while (st.Count > 0) {
      int p = st.Pop();
      if (p < 0 || p >= w * h) continue;
      if (seen[p] || !bg[p]) continue;
      seen[p] = true; cleared++;
      int px = p % w, py = p / w;
      if (px > 0) st.Push(p - 1);
      if (px < w - 1) st.Push(p + 1);
      if (py > 0) st.Push(p - w);
      if (py < h - 1) st.Push(p + w);
    }

    // hard clear
    for (int y = 0; y < h; y++)
      for (int x = 0; x < w; x++)
        if (seen[y * w + x]) buf[y * stride + x * 4 + 3] = 0;

    // feather: soften alpha on kept pixels that touch cleared ones
    for (int pass = 0; pass < feather; pass++) {
      List<int> edge = new List<int>();
      for (int y = 1; y < h - 1; y++) {
        for (int x = 1; x < w - 1; x++) {
          int o = y * stride + x * 4;
          if (buf[o + 3] == 0) continue;
          if (buf[o - 4 + 3] == 0 || buf[o + 4 + 3] == 0 ||
              buf[o - stride + 3] == 0 || buf[o + stride + 3] == 0) edge.Add(o);
        }
      }
      foreach (int o in edge) buf[o + 3] = (byte)(buf[o + 3] * 0.55);
    }

    System.Runtime.InteropServices.Marshal.Copy(buf, 0, bd.Scan0, buf.Length);
    bmp.UnlockBits(bd);

    // crop to remaining content
    int minx = w, maxx = -1, miny = h, maxy = -1;
    for (int y = 0; y < h; y++) {
      for (int x = 0; x < w; x++) {
        if (!seen[y * w + x]) {
          if (x < minx) minx = x; if (x > maxx) maxx = x;
          if (y < miny) miny = y; if (y > maxy) maxy = y;
        }
      }
    }
    Bitmap outBmp = bmp.Clone(new Rectangle(minx, miny, maxx - minx + 1, maxy - miny + 1), PixelFormat.Format32bppArgb);
    outBmp.Save(dst, ImageFormat.Png);
    string info = "cleared " + cleared + " px | crop " + (maxx - minx + 1) + "x" + (maxy - miny + 1);
    outBmp.Dispose(); bmp.Dispose();
    return info;
  }
}
"@ -ReferencedAssemblies System.Drawing

$SP = Split-Path -Parent $MyInvocation.MyCommand.Path
$r = [Knockout]::Run((Join-Path $SP $Src), (Join-Path $SP $Out), $MinBright, $MaxSat, $Feather)
Write-Output $r
