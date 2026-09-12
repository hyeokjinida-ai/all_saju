# -*- coding: utf-8 -*-
"""말풍선 시트 → 낱장 PNG(투명 배경) + 글자 상자 좌표 (2026-08-28)

왜 있나: 말풍선을 CSS 로 그리면 `border-radius:50%` 의 **기계적으로 완벽한 타원**이 나온다.
웹툰 말풍선은 손으로 그은 잉크선이라 미세하게 삐뚤고, 그 질감이 「웹툰 보는 느낌」의 일부다.
청월당도 **말풍선을 PNG 로 굽고 글자만 DOM 으로 얹는다**(해부 §2).

하는 일:
 ① 시트를 빈 행·열(투영)로 갈라 낱장으로 자른다 — 2x2 격자라 연결성분 라벨링까지 갈 필요가 없다.
 ② **바깥에서 시작하는 플러드필**로 배경만 투명하게 한다.
    말풍선 **안쪽 흰색은 남긴다** — 뚫리면 그림 위에 얹었을 때 그림이 비쳐 글자가 안 읽힌다.
 ③ **글자 상자**를 잰다. 꼬리가 달린 그림이라 이미지 정중앙에 글자를 놓으면 아래로 밀린다 —
    안쪽 흰 영역에서 **가로 폭이 넓은 행들**(=몸통, 꼬리는 좁다)만 골라 그 범위를 상자로 삼는다.

쓰기: python 직녀/tools/bubble-cut.py 직녀/말풍선/시트1.png --out public/products/jiknyeo
"""
import sys, os, json
import numpy as np
from PIL import Image


def opt(name, default=None):
    return sys.argv[sys.argv.index(f"--{name}") + 1] if f"--{name}" in sys.argv else default


args, skip = [], False
for a in sys.argv[1:]:
    if skip:
        skip = False; continue
    if a.startswith("--"):
        skip = True; continue
    args.append(a)

SRC = args[0]
OUT = opt("out", ".")
NAMES = (opt("names", "say-lg-br,say-lg-bl,say-md-bl,say-none")).split(",")
INK = int(opt("ink", "150"))

im = Image.open(SRC).convert("RGB")
arr = np.asarray(im).astype(np.int16)
lum = arr.mean(axis=2)
ink = lum < INK
H, W = ink.shape


def runs(proj):
    """비어 있지 않은 구간들의 (시작,끝)"""
    out, s = [], None
    for i, v in enumerate(proj):
        if v and s is None:
            s = i
        elif not v and s is not None:
            out.append((s, i - 1)); s = None
    if s is not None:
        out.append((s, len(proj) - 1))
    return out


rows = runs(ink.any(axis=1))
cells = []
for (y0, y1) in rows:
    band = ink[y0:y1 + 1]
    for (x0, x1) in runs(band.any(axis=0)):
        cells.append((x0, y0, x1, y1))
print(f"시트 {W}x{H} → 셀 {len(cells)}개")


def flood_outside(light):
    """가장자리에서 출발해 이어진 밝은 픽셀만 배경으로 — 안쪽 흰색은 보존"""
    h, w = light.shape
    seen = np.zeros((h, w), bool)
    stack = []
    for x in range(w):
        for y in (0, h - 1):
            if light[y, x] and not seen[y, x]:
                seen[y, x] = True; stack.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if light[y, x] and not seen[y, x]:
                seen[y, x] = True; stack.append((y, x))
    while stack:
        y, x = stack.pop()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and light[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True; stack.append((ny, nx))
    return seen


meta = {}
PAD = 6
for i, (x0, y0, x1, y1) in enumerate(cells):
    name = NAMES[i] if i < len(NAMES) else f"say-{i}"
    cx0, cy0 = max(0, x0 - PAD), max(0, y0 - PAD)
    cx1, cy1 = min(W - 1, x1 + PAD), min(H - 1, y1 + PAD)
    sub = arr[cy0:cy1 + 1, cx0:cx1 + 1]
    sl = sub.mean(axis=2)
    light = sl >= INK
    bg = flood_outside(light)

    a = np.where(bg, 0, 255).astype(np.uint8)
    # 잉크선 계단을 부드럽게 — 밝기로 알파를 깎으면 선이 얇아지므로 배경만 자른다
    rgb = np.clip(sub, 0, 255).astype(np.uint8)
    out_img = Image.fromarray(np.dstack([rgb, a]), "RGBA")

    # ③ 글자 상자 — 안쪽(=배경도 아니고 잉크도 아닌 흰 영역)에서 넓은 행만 몸통으로 본다
    inside = (~bg) & light
    widths = inside.sum(axis=1)
    mx = widths.max()
    body_rows = np.nonzero(widths > mx * 0.55)[0]
    ry0, ry1 = int(body_rows.min()), int(body_rows.max())
    cols = inside[ry0:ry1 + 1].sum(axis=0)
    mc = cols.max()
    body_cols = np.nonzero(cols > mc * 0.55)[0]
    rx0, rx1 = int(body_cols.min()), int(body_cols.max())
    h_, w_ = inside.shape
    box = {
        "x": round(rx0 / w_ * 100, 1),
        "y": round(ry0 / h_ * 100, 1),
        "w": round((rx1 - rx0 + 1) / w_ * 100, 1),
        "h": round((ry1 - ry0 + 1) / h_ * 100, 1),
    }
    dst = os.path.join(OUT, name + ".png")
    out_img.save(dst)
    meta[name] = {"size": [w_, h_], "textBox": box}
    print(f"  {name:10} {w_}x{h_}  글자상자 x{box['x']}% y{box['y']}% w{box['w']}% h{box['h']}%  {os.path.getsize(dst)//1024}KB")

print(json.dumps(meta, ensure_ascii=False, indent=2))
