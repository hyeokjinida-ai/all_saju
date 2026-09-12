# -*- coding: utf-8 -*-
"""말풍선 자리 실측 격자 (2026-08-28)

왜 있나: 결과지 말풍선을 `left:12 / bottom:18` 같은 **고정 좌표**로 박아 뒀더니
컷마다 인물이 다른 자리에 서 있어서 어떤 컷은 손을, 어떤 컷은 허공을 가리켰다.
티저는 이미 `SAY_BOX`(컷 기준 %좌표)로 이 문제를 풀었는데 결과지에 적용이 안 돼 있었다.

이 도구는 **결과지가 실제로 자르는 그 프레임**을 재현하고 10% 격자를 얹는다.
좌표를 눈대중으로 찍지 않기 위한 자다 — SAY_BOX 는 컷 폭/높이 기준 % 이므로
여기서 읽은 숫자를 그대로 쓸 수 있다.

쓰기:
  python 직녀/tools/say-grid.py <이미지> <ratio(w/h)> <pos%> [--out 경로] [--label 이름]
  예) python 직녀/tools/say-grid.py public/products/jiknyeo/w7.webp 1.5 18 --label w7
"""
import sys, os
from PIL import Image, ImageDraw

def opt(name, default=None):
    return sys.argv[sys.argv.index(f"--{name}") + 1] if f"--{name}" in sys.argv else default

args, skip = [], False
for a in sys.argv[1:]:
    if skip:
        skip = False; continue
    if a.startswith("--"):
        skip = True; continue
    args.append(a)

path, ratio, pos = args[0], float(args[1]), float(args[2]) / 100.0
label = opt("label", os.path.basename(path))
OUT = opt("out", os.path.join(os.environ.get("TEMP", "."), "say-grid.png"))

im = Image.open(path).convert("RGB")
w, h = im.size
vis = int(w / ratio)                       # object-fit: cover — 폭이 채워지므로 보이는 높이
if vis <= h:
    top = int(pos * (h - vis))
    frame = im.crop((0, top, w, top + vis))
else:                                      # 원본이 더 납작하면 좌우를 자른다
    vw = int(h * ratio)
    left = int(pos * (w - vw))
    frame = im.crop((left, 0, left + vw, h))

# 표시 크기로 맞춘다 — 결과지 컷은 448px 폭에서 84~86%(= 361~444px)
DISP_W = 720
frame = frame.resize((DISP_W, int(DISP_W / ratio)), Image.LANCZOS)
W, H = frame.size

d = ImageDraw.Draw(frame, "RGBA")
for p in range(10, 100, 10):
    x = W * p // 100
    y = H * p // 100
    major = (p == 50)
    col = (255, 224, 122, 190) if major else (255, 255, 255, 90)
    d.line([(x, 0), (x, H)], fill=col, width=2 if major else 1)
    d.line([(0, y), (W, y)], fill=col, width=2 if major else 1)
    d.text((x + 3, 3), str(p), fill=(255, 224, 122, 230))
    d.text((3, y + 3), str(p), fill=(255, 224, 122, 230))
d.text((6, H - 18), f"{label}  ratio={ratio}  pos={pos:.0%}  (격자=컷 기준 %)", fill=(255, 255, 255, 230))
frame.save(OUT)
print(f"{OUT}  {W}x{H}")
