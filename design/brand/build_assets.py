# -*- coding: utf-8 -*-
"""명운록 로고 자산 굽기 — ChatGPT 원본(한지 위 먹) → 투명 PNG 세트 + 파비콘/앱아이콘/OG.

확정안 (2026-08-23 형님):
  · 앱아이콘 · 메타 프로필 = 命 원   (candidates/T5_myeong_char.png 우하단 칸)
  · 헤더 · 푸터 워드마크    = 붓글씨 명운록 해서 (candidates/T1_brush_wordmark.png 좌상단 칸, 낙관 제외)
  · 파비콘 · 결과지 도장     = 주사 낙관 (candidates/T2_seal_script.png 좌상단 칸)

원리: 원본은 「밝은 한지 + 어두운 먹」이라 **밝기를 알파로 뒤집으면** 붓 질감이 그대로 살아난다.
      색은 알파에 얹기만 하므로 먹판/상아판을 같은 원본에서 뽑는다.

실행: python build_assets.py   (design/brand 에서)
"""
from pathlib import Path
from PIL import Image
import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent                    # 저장소 루트
CAND = HERE / "candidates"
PUB = ROOT / "public" / "brand"
APP = ROOT / "src" / "app"
PUB.mkdir(parents=True, exist_ok=True)

INK = (20, 20, 20)          # 먹
IVORY = (243, 234, 214)     # 상아 (globals.css 산군 --bone)
PAPER = (243, 234, 214)     # 한지 바탕(불투명 판용)

# ────────────────────────────────────────────────────────────── 공통 유틸


def cell(img: Image.Image, col: int, row: int, shrink: float = 0.05) -> Image.Image:
    """2×2 그리드에서 한 칸을 떼어낸다(칸 구분선을 피하려 안쪽으로 조금 줄여 자름)."""
    W, H = img.size
    cw, ch = W / 2, H / 2
    x0, y0 = col * cw, row * ch
    sx, sy = cw * shrink, ch * shrink
    return img.crop((int(x0 + sx), int(y0 + sy), int(x0 + cw - sx), int(y0 + ch - sy)))


def channels(im: Image.Image):
    a = np.asarray(im.convert("RGB")).astype(np.float32)
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    L = 0.299 * R + 0.587 * G + 0.114 * B
    return R, G, B, L


def red_mask(im: Image.Image) -> np.ndarray:
    """주사(朱砂) 낙관 픽셀."""
    R, G, B, _ = channels(im)
    return (R > 100) & (R - G > 45) & (R - B > 45)


def paper_level(L: np.ndarray) -> float:
    """가장자리 테두리에서 한지 밝기를 잰다 — 하드코딩 대신 실측."""
    h, w = L.shape
    b = max(2, int(min(h, w) * 0.02))
    edge = np.concatenate([L[:b].ravel(), L[-b:].ravel(), L[:, :b].ravel(), L[:, -b:].ravel()])
    return float(np.percentile(edge, 70))


def alpha_from_ink(im: Image.Image, gamma: float = 1.0, floor: float = 0.10) -> np.ndarray:
    """밝기를 뒤집어 알파로. floor 미만(종이 얼룩)은 잘라 배경을 깨끗하게 만든다."""
    _, _, _, L = channels(im)
    p = paper_level(L)
    ink = float(np.percentile(L, 1))
    a = (p - L) / max(1.0, (p - ink))
    a = np.clip(a, 0, 1)
    a[a < floor] = 0.0                       # 종이 노이즈 제거
    a = (a - floor).clip(0) / (1 - floor)    # 남은 구간을 0~1 로 다시 편다
    if gamma != 1.0:
        a = a ** gamma
    return a


def trim_alpha(rgba: Image.Image, pad_ratio: float = 0.06, thr: int = 45) -> Image.Image:
    """여백 잘라내기.

    ⚠ 임계값을 낮게(>12) 잡으면 **종이 노이즈가 잉크로 잡혀 여백이 안 잘린다** —
      1차 실측에서 워드마크가 543×360 으로 나왔는데 실제 글자는 495×182 였고,
      그 탓에 헤더 h24 에서 글자가 15px 로 쪼그라들었다. 실잉크만 잡게 45 로 올렸다.
    """
    a = np.asarray(rgba)[..., 3]
    ys, xs = np.where(a > thr)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    p = int(max(x1 - x0, y1 - y0) * pad_ratio)
    return rgba.crop((max(0, x0 - p), max(0, y0 - p), min(rgba.width, x1 + p + 1), min(rgba.height, y1 + p + 1)))


def clean_paper_patch(im: Image.Image, size: int = 64) -> Image.Image:
    """붓 획이 없는 한지 조각 — 후보를 훑어 표준편차가 가장 낮은 곳을 고른다."""
    _, _, _, L = channels(im)
    size = min(size, im.width // 3, im.height // 3)
    best, best_std = (0, 0), 1e9
    step = max(4, size // 2)
    for y in range(0, im.height - size, step):
        for x in range(0, im.width - size, step):
            s = float(L[y:y + size, x:x + size].std())
            if s < best_std:
                best_std, best = s, (x, y)
    return im.crop((best[0], best[1], best[0] + size, best[1] + size))


def tile_to(patch: Image.Image, w: int, h: int) -> Image.Image:
    """조각을 **타일링**해 채운다. 늘리면 결이 뭉개지고 밴딩이 생긴다(1차 실측: OG 가로줄)."""
    out = Image.new("RGB", (w, h))
    for y in range(0, h, patch.height):
        for x in range(0, w, patch.width):
            out.paste(patch, (x, y))
    return out


def cut_seal(im: Image.Image, margin: float = 0.06) -> Image.Image:
    """붉은 낙관이 찍힌 자리를 **깨끗한 한지**로 덮는다.

    ⚠ 함정 둘, 둘 다 실측으로 밟았다:
      1) 붉은 픽셀만 지우면 인주 가장자리의 어두운 번짐이 남아 얼룩이 된다 →
         낙관 **바운딩박스 전체**를 덮는다.
      2) 덮개를 「이미지 윗부분 복사본」으로 만들면 그 안의 붓 획까지 딸려와
         유령 그림이 생긴다(앱아이콘에 작은 命이 하나 더 찍혔다) →
         반드시 **획이 없는 종이 조각**을 타일링해 덮는다.
    """
    m = red_mask(im)
    if not m.any():
        return im
    ys, xs = np.where(m)
    pad = int(max(im.width, im.height) * margin)
    box = (max(0, xs.min() - pad), max(0, ys.min() - pad),
           min(im.width, xs.max() + pad + 1), min(im.height, ys.max() + pad + 1))
    out = im.copy()
    out.paste(tile_to(clean_paper_patch(im), box[2] - box[0], box[3] - box[1]), box[:2])
    return out


def tint(im: Image.Image, color, *, drop_red=True, gamma=1.0, floor=0.10) -> Image.Image:
    """먹 그림 → 지정 색 + 투명 배경. 주사 낙관은 기본적으로 제거(별도 자산이므로)."""
    if drop_red:
        im = cut_seal(im)
    a = alpha_from_ink(im, gamma=gamma, floor=floor)
    out = np.zeros((im.height, im.width, 4), np.uint8)
    out[..., 0], out[..., 1], out[..., 2] = color
    out[..., 3] = (a * 255).astype(np.uint8)
    return trim_alpha(Image.fromarray(out, "RGBA"))


def seal_rgba(im: Image.Image) -> Image.Image:
    """주사 낙관만 남기고 투명화 — 붉은 인주의 색과 갈라진 결을 그대로 보존.

    ⚠ 알파를 **밝기**로 만들면 안 된다(2차 실측): 한지(밝은 베이지)가 약한 알파로 살아남아
      어두운 바탕에서 **회색 네모 판**으로 비친다(결과지 도장 주위에 판이 깔렸다).
      인주는 무채색 종이와 「붉은 정도」로 갈리므로 **채도만** 알파로 쓴다.
      도장 안쪽 글자는 종이색(양각 음영)이라 자연히 뚫린다 — 그게 맞다.
    """
    arr = np.asarray(im.convert("RGB")).astype(np.float32)
    R, G, B, _ = channels(im)
    sat = R - np.maximum(G, B)          # 인주 ≈ 100 이상, 한지 ≈ 10 이하
    a = np.clip(sat / 70.0, 0, 1)
    a[a < 0.22] = 0.0
    a = (a - 0.22).clip(0) / 0.78
    out = np.zeros((im.height, im.width, 4), np.uint8)
    out[..., :3] = np.clip(arr, 0, 255).astype(np.uint8)
    out[..., 3] = (a * 255).astype(np.uint8)
    return trim_alpha(Image.fromarray(out, "RGBA"), thr=30)


def fit_square(rgba: Image.Image, size: int, scale: float, bg=None) -> Image.Image:
    """정사각 판 가운데 얹기. bg=None 이면 투명."""
    w, h = rgba.size
    s = size * scale / max(w, h)
    im = rgba.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
    tile = Image.new("RGBA", (size, size), (0, 0, 0, 0) if bg is None else (*bg, 255))
    tile.alpha_composite(im, ((size - im.width) // 2, (size - im.height) // 2))
    return tile


def height_to(rgba: Image.Image, h: int) -> Image.Image:
    return rgba.resize((max(1, round(rgba.width * h / rgba.height)), h), Image.LANCZOS)


def save(im: Image.Image, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, optimize=True)
    print(f"  {path.relative_to(ROOT)}  {im.size[0]}×{im.size[1]}  {path.stat().st_size / 1024:.1f}KB")


# ────────────────────────────────────────────────────────────── 원본에서 조각 뽑기

T1 = Image.open(CAND / "T1_brush_wordmark.png").convert("RGB")
T2 = Image.open(CAND / "T2_seal_script.png").convert("RGB")
T5 = Image.open(CAND / "T5_myeong_char.png").convert("RGB")

# 워드마크: 좌상단 칸(해서). 낙관은 tint() 안에서 cut_seal 이 지운다
# (비율로 잘라내면 낙관 윗변이 남아 헤더 24px 에서 정체불명의 점으로 보였다).
w_cell = cell(T1, 0, 0)

# 命 원: 우하단 칸(ensō). 낙관은 tint() 가 빼 준다.
m_cell = cell(T5, 1, 1)

# 낙관: 좌상단 칸(주사 정사각)
s_cell = cell(T2, 0, 0)

print("자산 굽는 중…")

# ────────────────────────────────────────────────────────────── 1. 원자 자산 (투명 PNG)

symbol_ink = tint(m_cell, INK, gamma=0.92)
symbol_ivory = tint(m_cell, IVORY, gamma=0.92)
word_ink = tint(w_cell, INK, gamma=0.92)
word_ivory = tint(w_cell, IVORY, gamma=0.92)
seal = seal_rgba(s_cell)

# 해상도는 **실제 최대 쓰임의 2~3배**로만 잡는다 — 붓 질감은 안티에일리어싱 그라데이션이
# 많아 PNG 압축이 잘 안 먹고, 헤더 워드마크는 첫 화면이라 무게가 곧 이탈이다.
#   워드마크 최대 쓰임 = 헤더 24px(@3x=72) · 결과지 머리 락업(별도 파일) → 240
#   심볼   최대 쓰임 = apple-icon 180 · OG 286                        → 512
#   낙관   최대 쓰임 = 파비콘 64(구움) · 결과지 도장 ~120              → 320
save(height_to(symbol_ink, 512), PUB / "symbol-ink.png")
save(height_to(symbol_ivory, 512), PUB / "symbol-ivory.png")
save(height_to(word_ink, 240), PUB / "wordmark-ink.png")
save(height_to(word_ivory, 240), PUB / "wordmark-ivory.png")
save(height_to(seal, 320), PUB / "seal.png")

# ────────────────────────────────────────────────────────────── 2. 가로 락업 (결과지 머리 · OG)


def lockup(sym: Image.Image, word: Image.Image, h: int = 220) -> Image.Image:
    s = height_to(sym, h)
    w = height_to(word, int(h * 0.62))
    gap = int(h * 0.34)
    W = s.width + gap + w.width
    out = Image.new("RGBA", (W, h), (0, 0, 0, 0))
    out.alpha_composite(s, (0, 0))
    out.alpha_composite(w, (s.width + gap, (h - w.height) // 2))
    return trim_alpha(out, 0.02)


save(lockup(symbol_ink, word_ink), PUB / "logo-h-ink.png")
save(lockup(symbol_ivory, word_ivory), PUB / "logo-h-ivory.png")

# ────────────────────────────────────────────────────────────── 3. 메타 페이지 프로필 (형님 업로드용)
# 원형 크롭을 당하므로 지름 80% 안에 마크가 전부 들어가야 한다.
save(fit_square(symbol_ink, 512, 0.72, bg=IVORY).convert("RGB"), PUB / "symbol-512-circle-safe.png")

# ────────────────────────────────────────────────────────────── 4. 파비콘 · 앱아이콘 (Next 파일 규약)
# 파비콘 = 주사 낙관. 16px 에서 살아남는 건 붉은 네모 실루엣이다(命 원은 뭉친다 — §5 게이트에서 실측).
save(fit_square(seal, 64, 0.92), APP / "icon.png")
# iOS 홈화면·카톡 인앱 = 命 원, 상아 바탕(투명은 검게 깔린다)
save(fit_square(symbol_ink, 180, 0.74, bg=IVORY).convert("RGB"), APP / "apple-icon.png")

# PWA(안드로이드 「홈 화면에 추가」) — manifest.ts 가 가리킨다.
# maskable 은 OS 가 원/사각/물방울로 잘라내므로 **안전영역(지름 80%)** 안에 마크를 넣는다 → 512 는 더 작게.
save(fit_square(symbol_ink, 192, 0.70, bg=IVORY).convert("RGB"), PUB / "icon-192.png")
save(fit_square(symbol_ink, 512, 0.62, bg=IVORY).convert("RGB"), PUB / "icon-512.png")

# ────────────────────────────────────────────────────────────── 5. OG / 카톡 공유 카드 1200×630

def og_card() -> Image.Image:
    from PIL import ImageDraw, ImageFont
    W, H = 1200, 630
    card = Image.new("RGBA", (W, H), (*IVORY, 255))
    # 한지 결 — 획 없는 종이 조각을 **타일링**해 깐다(늘리면 밴딩, 아무 데나 뜨면 획이 섞인다)
    paper = tile_to(clean_paper_patch(Image.open(CAND / "T1_brush_wordmark.png").convert("RGB"), 96), W, H)
    card.alpha_composite(Image.fromarray(np.dstack([np.asarray(paper), np.full((H, W), 120, np.uint8)]), "RGBA"))

    s = height_to(symbol_ink, 286)
    card.alpha_composite(s, ((W - s.width) // 2, 74))
    w = height_to(word_ink, 92)
    wx = (W - w.width) // 2
    card.alpha_composite(w, (wx, 396))
    sl = height_to(seal, 58)
    card.alpha_composite(sl, (wx + w.width + 20, 418))

    # 태그라인 — 전통 명조(바탕). 붓글씨와 같은 계열이라 튀지 않는다.
    try:
        tf = ImageFont.truetype("C:/Windows/Fonts/batang.ttc", 34, index=0)
    except Exception:
        tf = ImageFont.load_default()
    d = ImageDraw.Draw(card)
    line = "정통 만세력으로 읽고, 한 권으로 기록합니다"
    tw = d.textlength(line, font=tf)
    d.text(((W - tw) / 2, 524), line, font=tf, fill=(90, 78, 60, 235))
    return card.convert("RGB")


og = og_card()
save(og, APP / "opengraph-image.png")
save(og, APP / "twitter-image.png")

# ────────────────────────────────────────────────────────────── 6. 검증 시트 (실제 크기)

def contact_sheet() -> Image.Image:
    from PIL import ImageDraw, ImageFont
    try:
        f = ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 14)
        fb = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 20)
    except Exception:
        f = fb = ImageFont.load_default()
    W, H = 1220, 900
    sh = Image.new("RGB", (W, H), (239, 239, 241))
    d = ImageDraw.Draw(sh)
    d.text((28, 20), "명운록 로고 자산 — 실제 크기 검증", font=fb, fill=(20, 20, 20))

    LX, y = 28, 60
    # 검정 헤더 h60 (실물 크기 + 2배)
    for k in (1, 2):
        strip = Image.new("RGBA", (448 * k, 60 * k), (0, 0, 0, 255))
        wm = height_to(word_ivory, 24 * k)
        strip.alpha_composite(wm, (20 * k, (60 * k - wm.height) // 2))
        sh.paste(strip.convert("RGB"), (LX, y)); y += 60 * k + 10
    d.text((LX, y), "검정 헤더 h60 · 로고 h24 (실물 / 2배)", font=f, fill=(110, 110, 110)); y += 30

    # 파비콘 실물 (흰 / 검정 탭바)
    for bg, lab in (((255, 255, 255), "파비콘 16 · 32 · 48 · 64 (흰 탭바)"), ((24, 24, 27), "파비콘 (검정 탭바)")):
        x = LX
        for px in (16, 32, 48, 64):
            t = Image.new("RGBA", (px, px), (*bg, 255))
            t.alpha_composite(fit_square(seal, px, 0.92))
            sh.paste(t.convert("RGB"), (x, y + 64 - px)); x += px + 22
        y += 70
        d.text((LX, y), lab, font=f, fill=(110, 110, 110)); y += 26

    # 메타 광고 프로필 40px 원
    y += 6
    prof = Image.open(PUB / "symbol-512-circle-safe.png").resize((40, 40), Image.LANCZOS)
    mask = Image.new("L", (40, 40), 0); ImageDraw.Draw(mask).ellipse((0, 0, 39, 39), fill=255)
    d.rounded_rectangle((LX, y, LX + 360, y + 60), 10, fill=(255, 255, 255), outline=(226, 226, 226))
    sh.paste(prof, (LX + 12, y + 10), mask)
    d.text((LX + 64, y + 8), "명운록", font=fb, fill=(20, 20, 20))
    d.text((LX + 64, y + 35), "광고 · 후원", font=f, fill=(101, 103, 107))
    y += 68
    d.text((LX, y), "메타 광고 프로필 40px 원", font=f, fill=(110, 110, 110)); y += 28

    # apple-icon 180
    sh.paste(Image.open(APP / "apple-icon.png"), (LX, y)); y += 186
    d.text((LX, y), "apple-icon 180 (iOS 홈화면 · 카톡 인앱)", font=f, fill=(110, 110, 110))

    # ── 오른쪽 열 ──
    RX, ry = 520, 60
    ogs = og.resize((660, 346), Image.LANCZOS)
    sh.paste(ogs, (RX, ry)); ry += 352
    d.text((RX, ry), "opengraph-image 1200×630 (카톡 · 메타 공유 카드)", font=f, fill=(110, 110, 110)); ry += 30

    lk = Image.new("RGB", (660, 140), IVORY)
    l = height_to(lockup(symbol_ink, word_ink), 104)
    lk.paste(l, (24, 18), l)
    sh.paste(lk, (RX, ry)); ry += 146
    d.text((RX, ry), "가로 락업 (결과지 머리 · 상아 바탕)", font=f, fill=(110, 110, 110)); ry += 30

    lk2 = Image.new("RGB", (660, 140), (0, 0, 0))
    l2 = height_to(lockup(symbol_ivory, word_ivory), 104)
    lk2.paste(l2, (24, 18), l2)
    sh.paste(lk2, (RX, ry)); ry += 146
    d.text((RX, ry), "가로 락업 (검정 바탕)", font=f, fill=(110, 110, 110))
    return sh


save(contact_sheet(), HERE / "logo-contact-sheet.png")
print("완료.")
