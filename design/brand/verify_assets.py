# -*- coding: utf-8 -*-
"""로고 자산 기계 판정 — 「보기 좋다」가 아니라 숫자로 통과/탈락을 찍는다.
계획서 `로고_기획_2026-08-23.md` §5 게이트 구현.  실행: python verify_assets.py
"""
from pathlib import Path
from PIL import Image
import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
PUB = ROOT / "public" / "brand"
APP = ROOT / "src" / "app"

INK = (0x14, 0x14, 0x14)
IVORY = (0xF3, 0xEA, 0xD6)
BLACK = (0, 0, 0)

rows = []


def gate(name, ok, detail):
    rows.append((("PASS" if ok else "FAIL"), name, detail))
    return ok


def rel_lum(c):
    s = [v / 255 for v in c]
    s = [(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4) for v in s]
    return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2]


def contrast(a, b):
    la, lb = rel_lum(a), rel_lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


# ── 1. 대비 ────────────────────────────────────────────────────────────────
c_ink_ivory = contrast(INK, IVORY)
c_ivory_black = contrast(IVORY, BLACK)
gate("대비 · 먹↔상아", c_ink_ivory >= 4.5, f"{c_ink_ivory:.2f}:1  (기준 4.5)")
gate("대비 · 상아↔검정헤더", c_ivory_black >= 4.5, f"{c_ivory_black:.2f}:1  (기준 4.5)")

# ── 2. 소형 가독 — 파비콘 16px ─────────────────────────────────────────────
seal = Image.open(APP / "icon.png").convert("RGBA")
s16 = seal.resize((16, 16), Image.LANCZOS)
a16 = np.asarray(s16)[..., 3]
ink_px = int((a16 > 90).sum())
cover = ink_px / a16.size
# 실루엣이 하나의 덩어리로 읽히는가 = 가장 두꺼운 가로 획 폭
widths = [int((row > 90).sum()) for row in a16]
gate("16px 파비콘 · 잉크 면적", 0.15 <= cover <= 0.85, f"{cover * 100:.0f}%  (기준 15~85%)")
gate("16px 파비콘 · 최대 획 폭", max(widths) >= 6, f"{max(widths)}px  (기준 ≥6 — 덩어리로 읽힘)")

# ── 3. 원형 안전영역 — 메타 프로필 512 ─────────────────────────────────────
prof = Image.open(PUB / "symbol-512-circle-safe.png").convert("RGB")
p = np.asarray(prof).astype(int)
L = 0.299 * p[..., 0] + 0.587 * p[..., 1] + 0.114 * p[..., 2]
mark = L < 150
H, W = mark.shape
yy, xx = np.mgrid[0:H, 0:W]
r = np.hypot(yy - (H - 1) / 2, xx - (W - 1) / 2)
outside = int((mark & (r > W * 0.40)).sum())          # 지름 80% 원 밖
gate("원형 안전영역 (지름 80%)", outside == 0, f"원 밖 잉크 {outside}px  (기준 0)")

# ── 4. 헤더 실측 — 워드마크 h24 ────────────────────────────────────────────
wm = Image.open(PUB / "wordmark-ivory.png")
w24 = round(wm.width * 24 / wm.height)
gate("헤더 로고 폭 @h24", w24 <= 110, f"{w24}×24px  (기준 ≤110 — 청월당 83 대비 +30% 이내)")

# 헤더에서 획이 사라지지 않는가 — h24 로 줄였을 때 알파 평균
wm24 = wm.resize((w24, 24), Image.LANCZOS)
a = np.asarray(wm24)[..., 3]
gate("헤더 로고 · h24 잉크 잔존", (a > 90).sum() >= 60, f"불투명 픽셀 {(a > 90).sum()}개  (기준 ≥60)")

# ── 5. 파일 규약 — Next 자동 배선 대상이 제자리에 있는가 ───────────────────
for f, want in ((APP / "icon.png", (64, 64)),
                (APP / "apple-icon.png", (180, 180)),
                (APP / "opengraph-image.png", (1200, 630)),
                (APP / "twitter-image.png", (1200, 630)),
                (PUB / "icon-192.png", (192, 192)),
                (PUB / "icon-512.png", (512, 512))):
    ok = f.exists() and Image.open(f).size == want
    gate(f"파일 · {f.name}", ok, f"{Image.open(f).size if f.exists() else '없음'}  (기준 {want})")

# ── 6. 용량 — 헤더는 첫 화면이라 가벼워야 한다 ─────────────────────────────
for f, cap in (("wordmark-ivory.png", 90), ("wordmark-ink.png", 90),
               ("symbol-ivory.png", 260), ("symbol-ink.png", 260), ("seal.png", 300)):
    kb = (PUB / f).stat().st_size / 1024
    gate(f"용량 · {f}", kb <= cap, f"{kb:.0f}KB  (기준 ≤{cap})")

# ── 7. maskable 안전영역 — 안드로이드가 원/물방울로 잘라낸다 ──────────────
mk = Image.open(PUB / "icon-512.png").convert("RGB")
mp = np.asarray(mk).astype(int)
mL = 0.299 * mp[..., 0] + 0.587 * mp[..., 1] + 0.114 * mp[..., 2]
mm = mL < 150
mH, mW = mm.shape
myy, mxx = np.mgrid[0:mH, 0:mW]
mr = np.hypot(myy - (mH - 1) / 2, mxx - (mW - 1) / 2)
mout = int((mm & (mr > mW * 0.40)).sum())
gate("maskable 안전영역 (icon-512)", mout == 0, f"원 밖 잉크 {mout}px  (기준 0)")

# ── 출력 ───────────────────────────────────────────────────────────────────
w = max(len(n) for _, n, _ in rows)
print()
for st, name, detail in rows:
    print(f"  [{st}] {name.ljust(w)}  {detail}")
bad = [r for r in rows if r[0] == "FAIL"]
print(f"\n  {len(rows) - len(bad)}/{len(rows)} 통과" + ("" if not bad else "  ⚠ 실패 있음"))
raise SystemExit(1 if bad else 0)
