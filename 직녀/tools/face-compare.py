# -*- coding: utf-8 -*-
"""인물 컷 동일인 대조 시트 (2026-08-26)

왜 있나: 4앵커(눈·점·은사·나이)는 **부품 검사**다. 넷 다 통과해도 골격이 다르면 다른 사람이다 —
N1·N2 를 「4/4 통과」로 판정했는데 형님이 페이지에서 한눈에 잡아냈다(계보가 갈라진 것).
그래서 ⑤ 동일인 앵커를 세웠고, 그건 **기존 컷을 옆에 붙여야만** 보인다.

쓰기:
  python 직녀/tools/face-compare.py <기존컷> <후보1> [후보2 ...] [--out 경로] [--top 0.42]
  예) python 직녀/tools/face-compare.py public/products/jiknyeo/j-greet.webp 직녀/컷후보/N1-b.png

만드는 것: 얼굴 구간을 같은 높이로 맞춰 가로로 이어 붙인 한 장.
얼굴 검출기를 안 쓴다 — 반신 컷은 얼굴이 위쪽 40% 안에 들어오므로 그 구간을 잘라 키만 맞춘다.
(검출기를 붙이면 의존성이 늘고, 여기서 필요한 건 정밀 좌표가 아니라 **나란히 보는 것**이다)
"""
import sys, os
from PIL import Image, ImageDraw

def opt(name, default):
    if f"--{name}" in sys.argv:
        return sys.argv[sys.argv.index(f"--{name}") + 1]
    return default

# 옵션은 「--이름 값」 두 칸을 차지한다. 이름만 걸러내면 값이 입력 파일로 섞인다
args, skip = [], False
for a in sys.argv[1:]:
    if skip:
        skip = False
        continue
    if a.startswith("--"):
        skip = True
        continue
    args.append(a)

if len(args) < 2:
    print(__doc__)
    sys.exit(1)

TOP = float(opt("top", "0.42"))     # 위에서부터 얼마를 얼굴 구간으로 볼지
H = 560                              # 시트 안에서 각 칸의 높이
OUT = opt("out", os.path.join(
    os.environ.get("TEMP", "."), "face-compare.png"))

cells = []
for i, path in enumerate(args):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    face = im.crop((0, 0, w, int(h * TOP)))
    scale = H / face.size[1]
    face = face.resize((max(1, int(face.size[0] * scale)), H), Image.LANCZOS)
    cells.append((os.path.basename(path), face, i == 0))

pad, label_h = 10, 26
total_w = sum(c[1].size[0] for c in cells) + pad * (len(cells) + 1)
sheet = Image.new("RGB", (total_w, H + label_h + pad * 2), "#15131F")
d = ImageDraw.Draw(sheet)
x = pad
for name, img, is_ref in cells:
    sheet.paste(img, (x, label_h + pad))
    # 기준(기존 컷)은 테두리로 표시한다 — 어느 쪽이 정답인지 헷갈리면 판정이 무의미해진다
    if is_ref:
        d.rectangle([x - 2, label_h + pad - 2, x + img.size[0] + 1, label_h + pad + H + 1],
                    outline="#C9A94E", width=2)
    d.text((x + 4, 6), ("기준 " if is_ref else "후보 ") + name, fill="#E8E2F5")
    x += img.size[0] + pad

sheet.save(OUT)
print(f"{OUT}  ({sheet.size[0]}x{sheet.size[1]})  칸 {len(cells)}개 · 금테=기준")
