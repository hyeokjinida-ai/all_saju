# -*- coding: utf-8 -*-
"""전통 결(3차 T1~T6) 원본 6장에서 실제 쓰일 자리 크기의 확정안 시트를 만든다.
사용: python make_trad_sheet.py  (design/brand 에서)  →  logo-trad-sheet.png
원본 픽셀(먹 질감·주사 낙관)을 그대로 쓴다 — 2색 재채색은 검정 헤더용 반전에만.
"""
from PIL import Image, ImageDraw, ImageFont
import numpy as np

INK = (20, 20, 20); IVORY = (243, 234, 214); PAPER = (239, 239, 241); WHITE = (255, 255, 255); BLACK = (0, 0, 0)


def cell(img, col, row, shrink=0.05):
    W, H = img.size; cw, ch = W / 2, H / 2
    x0, y0 = col * cw, row * ch; sx, sy = cw * shrink, ch * shrink
    return img.crop((int(x0 + sx), int(y0 + sy), int(x0 + cw - sx), int(y0 + ch - sy)))


def ink_mask(im, thr=120):
    return np.array(im.convert('L')) < thr


def strip_grid_lines(m, band=0.14, frac=0.5):
    m = m.copy(); H, W = m.shape; bh, bw = int(H * band), int(W * band)
    rows = m.sum(axis=1) > W * frac; cols = m.sum(axis=0) > H * frac
    idx = np.arange(H); edge_r = (idx < bh) | (idx >= H - bh)
    idy = np.arange(W); edge_c = (idy < bw) | (idy >= W - bw)
    m[rows & edge_r, :] = False; m[:, cols & edge_c] = False
    return m


def trim(im, pad=0.10):
    m = strip_grid_lines(ink_mask(im)); ys, xs = np.where(m)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    p = int(max(x1 - x0, y1 - y0) * pad)
    return im.crop((max(0, x0 - p), max(0, y0 - p), min(im.width, x1 + p), min(im.height, y1 + p)))


def fit(im, size, bg, scale=0.8):
    im = trim(im); w, h = im.size; s = size * scale / max(w, h)
    im = im.resize((max(1, int(w * s)), max(1, int(h * s))), Image.LANCZOS)
    tile = Image.new('RGB', (size, size), bg); tile.paste(im, ((size - im.width) // 2, (size - im.height) // 2))
    return tile


def on_black(im, h):
    """먹 → 흰, 주사 → 그대로, 종이 → 검정. 검정 헤더용."""
    im = trim(im); im = im.resize((int(im.width * h / im.height), h), Image.LANCZOS)
    a = np.array(im).astype(int); R, G, B = a[..., 0], a[..., 1], a[..., 2]
    L = (0.299 * R + 0.587 * G + 0.114 * B)
    red = (R > 110) & (G < 110) & (B < 110) & (R - G > 40)
    ink = (L < 150) & ~red
    out = np.zeros_like(a); out[:] = BLACK; out[ink] = (250, 250, 250); out[red] = a[red]
    return Image.fromarray(out.astype(np.uint8))


def rmask(size, r):
    mask = Image.new('L', size, 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), r, fill=255); return mask


T1 = Image.open('candidates/T1_brush_wordmark.png').convert('RGB'); T2 = Image.open('candidates/T2_seal_script.png').convert('RGB')
T3 = Image.open('candidates/T3_yundo_ring.png').convert('RGB'); T4 = Image.open('candidates/T4_old_book.png').convert('RGB')
T5 = Image.open('candidates/T5_myeong_char.png').convert('RGB'); T6 = Image.open('candidates/T6_scroll.png').convert('RGB')

_c = cell(T1, 0, 0); w_text = trim(_c.crop((0, 0, _c.width, int(_c.height * 0.72))))  # 낙관 뺀 글자만(헤더용)
w_haeseo = trim(_c); w_haengseo = trim(cell(T1, 1, 0)); w_vert = trim(cell(T1, 0, 1)); w_yeseo = trim(cell(T1, 1, 1))
s_red = trim(cell(T2, 0, 0)); s_ink = trim(cell(T2, 1, 0)); s_round = trim(cell(T2, 0, 1)); s_in = trim(cell(T2, 1, 1))
y_full = trim(cell(T3, 0, 0)); y_tick = trim(cell(T3, 1, 0)); y_double = trim(cell(T3, 0, 1))
b_closed = trim(cell(T4, 0, 0)); b_seal = trim(cell(T4, 0, 1))
m_haeseo = trim(cell(T5, 0, 0)); m_enso = trim(cell(T5, 1, 1))
sc_hanja = trim(cell(T6, 0, 0)); sc_hangul = trim(cell(T6, 1, 0))

try:
    font = ImageFont.truetype('C:/Windows/Fonts/malgunbd.ttf', 22); small = ImageFont.truetype('C:/Windows/Fonts/malgun.ttf', 15); big = ImageFont.truetype('C:/Windows/Fonts/malgunbd.ttf', 30)
except Exception:
    font = small = big = ImageFont.load_default()

sheet = Image.new('RGB', (1500, 1260), PAPER); d = ImageDraw.Draw(sheet)
d.text((40, 30), '명운록 로고 — 전통 결 (3차) · 추천 한 벌: 命 원(앱아이콘) + 붓글씨 명운록(헤더) + 주사 낙관(파비콘·도장)', font=big, fill=(20, 20, 20))
d.text((40, 76), 'ChatGPT 원본 그대로, 쓰일 자리 크기 배치 · 앱아이콘 180 · 파비콘 48/32/16 · 메타 프로필 40px 원 · 검정 헤더 h60/로고 h24(1.45배)', font=small, fill=(90, 90, 90))


def card(x, y, w, h):
    d.rounded_rectangle((x, y, x + w, y + h), 18, fill=WHITE)


# ① 앱아이콘 후보 3
card(40, 110, 700, 440)
d.text((60, 125), '① 앱아이콘 · 메타 프로필 — 후보 3 (왼쪽이 추천)', font=font, fill=(20, 20, 20))
for i, (im, lab, sc) in enumerate(((m_enso, '命 원 (T5-4)', 0.86), (s_red, '주사 인장 (T2-1)', 0.8), (y_full, '윤도 십이지 (T3-1)', 0.86))):
    t = fit(im, 180, IVORY, sc); sheet.paste(t, (60 + i * 215, 165), rmask(t.size, 40)); d.text((60 + i * 215, 352), lab, font=small, fill=(110, 110, 110))
# 작은 크기
xx = 60
for im in (m_enso, s_red, y_full):
    for px in (48, 32, 16):
        t = fit(im, px, IVORY, 0.88); sheet.paste(t, (xx, 385 + (48 - px)), rmask(t.size, max(3, px // 5))); xx += px + 10
    xx += 28
d.text((60, 445), '48 · 32 · 16 — 命 원 / 주사 인장 / 윤도  → 16px에선 주사 인장(빨간 네모)만 살아남음', font=small, fill=(110, 110, 110))
# 메타 광고 머리
d.rounded_rectangle((60, 475, 420, 535), 10, fill=WHITE, outline=(226, 226, 226))
av = fit(m_enso, 40, IVORY, 0.9); cm = Image.new('L', (40, 40), 0); ImageDraw.Draw(cm).ellipse((0, 0, 39, 39), fill=255); sheet.paste(av, (72, 485), cm)
d.text((124, 483), '명운록', font=font, fill=(20, 20, 20)); d.text((124, 510), '광고 · 후원', font=small, fill=(101, 103, 107))
av2 = fit(s_red, 40, IVORY, 0.86); sheet.paste(av2, (440, 485), cm); d.text((490, 483), '명운록', font=font, fill=(20, 20, 20)); d.text((490, 510), '광고 · 후원', font=small, fill=(101, 103, 107))

# ② 헤더
card(770, 110, 690, 440)
d.text((790, 125), '② 헤더·푸터 = 붓글씨 「명운록」 + 낙관 (T1-1 해서)', font=font, fill=(20, 20, 20))
hw, hh = 650, 87; logo_h = int(24 * 1.45)
strip = Image.new('RGB', (hw, hh), BLACK); wm = on_black(w_text, logo_h); strip.paste(wm, (int(20 * 1.45), (hh - logo_h) // 2))
sd = ImageDraw.Draw(strip)
for ox in (hw - int(20 * 1.45) - 32 - 14 - 32, hw - int(20 * 1.45) - 32):
    sd.rounded_rectangle((ox, (hh - 32) // 2, ox + 32, (hh + 32) // 2), 8, outline=(187, 187, 187), width=2)
sheet.paste(strip, (790, 165)); d.text((790, 258), '검정 헤더 h60 · 로고 h24 (1.45배) — 먹→흰 (낙관은 24px에서 안 읽혀 헤더에선 뺌)', font=small, fill=(110, 110, 110))
strip2 = Image.new('RGB', (hw, hh), IVORY); w2 = trim(w_text); w2 = w2.resize((int(w2.width * logo_h / w2.height), logo_h), Image.LANCZOS); strip2.paste(w2, (int(20 * 1.45), (hh - logo_h) // 2))
sheet.paste(strip2, (790, 285)); d.text((790, 378), '상아 헤더 변형 (원본 픽셀)', font=small, fill=(110, 110, 110))
lk = Image.new('RGB', (650, 120), IVORY)
s = fit(m_enso, 100, IVORY, 0.9); lk.paste(s, (10, 10)); w3 = trim(w_text); w3 = w3.resize((int(w3.width * 56 / w3.height), 56), Image.LANCZOS); lk.paste(w3, (130, 25))
sheet.paste(lk, (790, 405), rmask(lk.size, 14)); d.text((790, 530), '가로 락업(命 원 + 붓글씨) — 결과지 머리 · OG', font=small, fill=(110, 110, 110))

# ③ 워드마크 4형 + 낙관 4형
card(40, 580, 700, 640)
d.text((60, 595), '③ 붓글씨 4형 (T1) / 낙관 4형 (T2)', font=font, fill=(20, 20, 20))
yy = 635; xx = 60
for im, lab in ((w_haeseo, '해서 (추천)'), (w_haengseo, '행서'), (w_yeseo, '예서')):
    t = trim(im); t = t.resize((int(t.width * 70 / t.height), 70), Image.LANCZOS); sheet.paste(t, (xx, yy)); d.text((xx, yy + 78), lab, font=small, fill=(110, 110, 110)); xx += t.width + 40
t = trim(w_vert); t = t.resize((int(t.width * 150 / t.height), 150), Image.LANCZOS); sheet.paste(t, (60, 740)); d.text((60, 895), '세로 (엔드카드)', font=small, fill=(110, 110, 110))
xx = 200
for im, lab in ((s_red, '주사 정사각'), (s_ink, '먹'), (s_round, '원형'), (s_in, '命運錄印')):
    t = fit(im, 120, IVORY, 0.9); sheet.paste(t, (xx, 745)); d.text((xx, 870), lab, font=small, fill=(110, 110, 110)); xx += 130
d.text((60, 930), '낙관은 결과지 말미 「기록 완료」 도장 + 파비콘 + 광고 소재 우상단 스팅으로 재사용', font=small, fill=(110, 110, 110))
yy = 965; xx = 60
for im, lab in ((y_tick, '윤도 눈금+命'), (y_double, '윤도 이중원'), (b_seal, '고서+낙관 (T4)'), (sc_hangul, '족자 한글 (T6)')):
    t = fit(im, 120, IVORY, 0.9); sheet.paste(t, (xx, yy)); d.text((xx, yy + 125), lab, font=small, fill=(110, 110, 110)); xx += 150

# ④ 세로 스택 + 설명
card(770, 580, 690, 640)
d.text((790, 595), '④ 세로 스택 (OG · 엔드카드) — 먹판 / 상아판', font=font, fill=(20, 20, 20))
st = Image.new('RGB', (320, 340), IVORY)
s = fit(m_enso, 170, IVORY, 0.95); st.paste(s, (75, 20)); w4 = trim(w_text); w4 = w4.resize((int(w4.width * 56 / w4.height), 56), Image.LANCZOS); st.paste(w4, ((320 - w4.width) // 2, 215))
sheet.paste(st, (790, 635), rmask(st.size, 24))
st2 = Image.new('RGB', (320, 340), BLACK)
s2 = on_black(m_enso, 170); st2.paste(s2, ((320 - s2.width) // 2, 20)); w5 = on_black(w_text, 56); st2.paste(w5, ((320 - w5.width) // 2, 215))
sheet.paste(st2, (1130, 635), rmask(st2.size, 24))
d.text((790, 990), '먹판은 산군 세계관(검정 바탕)용 · 상아판은 직녀·홈 상아 구간용', font=small, fill=(110, 110, 110))
d.text((790, 1030), '청월당과 겹치는 부분: 「붉은 도장」 문법 자체 (靑月堂印). 우리는 도장이 조연(낙관)이고', font=small, fill=(110, 110, 110))
d.text((790, 1052), '주연은 붓글씨·命 원 — 광고 40px 원에서 보이는 건 命 원이라 한눈에 갈림.', font=small, fill=(110, 110, 110))
d.text((790, 1090), '벡터화 메모: 붓 질감은 PNG(투명) 고해상으로 쓰고, 16px 파비콘만 단순화 벡터(주사 네모).', font=small, fill=(110, 110, 110))

sheet.save('logo-trad-sheet.png'); print('saved', sheet.size)
