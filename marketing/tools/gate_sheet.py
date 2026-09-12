# -*- coding: utf-8 -*-
"""
gate_sheet.py — UGC 클립 게이트용 고정 시각 프레임 시트.

  PYTHONUTF8=1 python marketing/tools/gate_sheet.py <mp4...> [--times 0,2,4,6,8,10,12,14] [--cols 4]

frames.py(0.25초 밀집 해부)와 목적이 다르다: 이건 **동일인·타투·입 닫힘·화면 렌더 0** 를 보는
합격/불합격 판정용이라, 정해진 초에서만 뽑아 한 장에 붙인다.
CapCut ffmpeg 는 비ASCII 출력 경로에서 죽으므로 ASCII 임시 폴더에 뽑고 PIL 로 저장한다.
"""
import argparse
import os
import subprocess
import tempfile

from PIL import Image, ImageDraw, ImageFont

FF = r"C:/Users/HP/AppData/Local/CapCut/Apps/8.7.0.3685/ffmpeg.exe"
FONT = r"C:/Windows/Fonts/malgunbd.ttf"


def grab(src, t, tmp, i):
    out = os.path.join(tmp, f"g_{i:02d}.png")
    subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-ss", str(t), "-i", src,
                    "-frames:v", "1", "-y", out], check=True)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("srcs", nargs="+")
    ap.add_argument("--times", default="0,2,4,6,8,10,12,14")
    ap.add_argument("--cols", type=int, default=4)
    ap.add_argument("--cellw", type=int, default=360)
    a = ap.parse_args()
    times = [float(x) for x in a.times.split(",")]

    for src in a.srcs:
        with tempfile.TemporaryDirectory() as tmp:
            # 한글 경로 입력도 CapCut ffmpeg 가 싫어할 수 있어 ASCII 로 복사해 둔다
            ascii_src = os.path.join(tmp, "in.mp4")
            with open(src, "rb") as f, open(ascii_src, "wb") as g:
                g.write(f.read())
            ims = []
            for i, t in enumerate(times):
                p = grab(ascii_src, t, tmp, i)
                ims.append((t, Image.open(p).convert("RGB")))
            w0, h0 = ims[0][1].size
            cw = a.cellw
            ch = int(h0 * cw / w0)
            lab = 26
            cols = a.cols
            rows = (len(ims) + cols - 1) // cols
            sheet = Image.new("RGB", (cw * cols, (ch + lab) * rows), (16, 16, 18))
            d = ImageDraw.Draw(sheet)
            try:
                font = ImageFont.truetype(FONT, 18)
            except Exception:
                font = ImageFont.load_default()
            for n, (t, im) in enumerate(ims):
                r, c = divmod(n, cols)
                sheet.paste(im.resize((cw, ch), Image.LANCZOS), (c * cw, r * (ch + lab) + lab))
                d.text((c * cw + 8, r * (ch + lab) + 4), f"{t:.1f}s", fill=(232, 201, 106), font=font)
            out = os.path.splitext(src)[0] + "_gate.png"
            sheet.save(out)
            print("saved", out, sheet.size, f"(source {w0}x{h0})")


if __name__ == "__main__":
    main()
