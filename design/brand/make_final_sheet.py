# -*- coding: utf-8 -*-
"""M(한글 낙관) + Q(명●록) 원본 PNG 두 장에서 실제 쓰일 자리 크기의 확정안 시트를 만든다.
사용: python make_final_sheet.py  (design/brand 에서)  →  logo-final-sheet.png
"""
from PIL import Image, ImageDraw, ImageFont
import numpy as np

INK = (14, 14, 16); IVORY = (243, 234, 214); PAPER = (239, 239, 241); WHITE = (255, 255, 255)


def cell(img, col, row, shrink=0.06):
    W, H = img.size; cw, ch = W / 2, H / 2
    x0, y0 = col * cw, row * ch
    sx, sy = cw * shrink, ch * shrink
    return img.crop((int(x0 + sx), int(y0 + sy), int(x0 + cw - sx), int(y0 + ch - sy)))


def mask_of(im, thr=110):
    return np.array(im.convert('L')) < thr


def strip_grid_lines(m, band=0.14, frac=0.5):
    """셀 가장자리 band 안에서만 긴 직선(행/열의 frac 이상 먹)을 지운다 — 도장 테두리는 안쪽이라 보존"""
    m = m.copy(); H, W = m.shape; bh, bw = int(H * band), int(W * band)
    rows = m.sum(axis=1) > W * frac; cols = m.sum(axis=0) > H * frac
    idx = np.arange(H); edge_r = (idx < bh) | (idx >= H - bh)
    idy = np.arange(W); edge_c = (idy < bw) | (idy >= W - bw)
    m[rows & edge_r, :] = False; m[:, cols & edge_c] = False
    return m


def trim(im, pad=0.12):
    m = mask_of(im)
    # 격자 구분선 제거: 행/열의 60% 이상이 먹이면 선으로 보고 지운다
    m = strip_grid_lines(m)
    ys, xs = np.where(m)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    p = int(max(x1 - x0, y1 - y0) * pad)
    return im.crop((max(0, x0 - p), max(0, y0 - p), min(im.width, x1 + p), min(im.height, y1 + p)))


def recolor(im, fg, bg, thr=110):
    m = mask_of(im, thr)
    out = np.zeros((im.height, im.width, 3), np.uint8); out[:] = bg; out[m] = fg
    return Image.fromarray(out)


def clean(im, thr=110):
    """구분선 제거 + 트림한 뒤 먹/상아 2색으로 정리"""
    m = mask_of(im, thr)
    m = strip_grid_lines(m)
    out = np.zeros((im.height, im.width, 3), np.uint8); out[:] = IVORY; out[m] = INK
    return trim(Image.fromarray(out))


def square(im, size, bg, scale=0.78):
    im = trim(im)
    w, h = im.size; s = size * scale / max(w, h)
    im = im.resize((max(1, int(w * s)), max(1, int(h * s))), Image.LANCZOS)
    tile = Image.new('RGB', (size, size), bg)
    tile.paste(im, ((size - im.width) // 2, (size - im.height) // 2))
    return tile


def rmask(size, r):
    mask = Image.new('L', size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), r, fill=255)
    return mask


M = Image.open('candidates/M_hangul_seal.png').convert('RGB')
Q = Image.open('candidates/Q_wordmark_dot.png').convert('RGB')
m_square = clean(cell(M, 0, 0)); m_round = clean(cell(M, 1, 0)); m_circle = clean(cell(M, 0, 1)); m_tall = clean(cell(M, 1, 1))
q_dial = clean(cell(Q, 0, 0)); q_dot = clean(cell(Q, 1, 0)); q_ring = clean(cell(Q, 0, 1)); q_enso = clean(cell(Q, 1, 1))

dot = Image.new('RGB', (400, 400), IVORY); ImageDraw.Draw(dot).ellipse((40, 40, 360, 360), fill=INK)

try:
    font = ImageFont.truetype('C:/Windows/Fonts/malgunbd.ttf', 22)
    small = ImageFont.truetype('C:/Windows/Fonts/malgun.ttf', 15)
    big = ImageFont.truetype('C:/Windows/Fonts/malgunbd.ttf', 30)
except Exception:
    font = small = big = ImageFont.load_default()

sheet = Image.new('RGB', (1500, 1180), PAPER); d = ImageDraw.Draw(sheet)
d.text((40, 30), '명운록 로고 — 확정안 (M 한글 낙관 + Q 「명●록」 + ●)  ·  ChatGPT 생성 원본, 벡터화 전', font=big, fill=(20, 20, 20))
d.text((40, 76), '쓰일 자리 크기 그대로: 앱아이콘 180 · 파비콘 48/32/16 · 메타 광고 프로필 40px 원 · 검정 헤더 h60/로고 h24(1.45배) · 세로 스택', font=small, fill=(90, 90, 90))


def card(x, y, w, h):
    d.rounded_rectangle((x, y, x + w, y + h), 18, fill=WHITE)


# ① app icons
card(40, 110, 700, 420)
d.text((60, 125), '① 앱아이콘 · 메타 프로필 = M 도장(둥근 모서리판)', font=font, fill=(20, 20, 20))
t = square(m_round, 180, IVORY, 0.8); sheet.paste(t, (60, 165), rmask(t.size, 40)); d.text((60, 352), '180 · 상아판', font=small, fill=(110, 110, 110))
t2 = square(recolor(m_round, IVORY, INK), 180, INK, 0.8); sheet.paste(t2, (260, 165), rmask(t2.size, 40)); d.text((260, 352), '180 · 먹판', font=small, fill=(110, 110, 110))
xx = 470
for px in (48, 32, 16):
    t = square(m_round, px, IVORY, 0.86); sheet.paste(t, (xx, 165 + (48 - px)), rmask(t.size, max(3, px // 5))); xx += px + 18
d.text((470, 230), '48 · 32 · 16 파비콘 (도장형)', font=small, fill=(110, 110, 110))
xx = 470
for px in (48, 32, 16):
    t = square(dot, px, IVORY, 0.62); sheet.paste(t, (xx, 262 + (48 - px)), rmask(t.size, max(3, px // 5))); xx += px + 18
d.text((470, 325), '48 · 32 · 16 파비콘 (● 단독형)', font=small, fill=(110, 110, 110))
d.rounded_rectangle((60, 395, 420, 455), 10, fill=WHITE, outline=(226, 226, 226))
av = square(m_round, 40, IVORY, 0.84); cm = Image.new('L', (40, 40), 0); ImageDraw.Draw(cm).ellipse((0, 0, 39, 39), fill=255); sheet.paste(av, (72, 405), cm)
d.text((124, 403), '명운록', font=font, fill=(20, 20, 20)); d.text((124, 430), '광고 · 후원', font=small, fill=(101, 103, 107))
d.text((60, 465), '메타 광고 프로필 40px 원', font=small, fill=(110, 110, 110))
xx = 470
for im in (m_square, m_round, m_circle, m_tall):
    t = square(im, 56, IVORY, 0.86); sheet.paste(t, (xx, 395)); xx += 64
d.text((470, 460), 'M 4형: 정사각 · 둥근(확정) · 원형 · 세로', font=small, fill=(110, 110, 110))

# ② header
card(770, 110, 690, 420)
d.text((790, 125), '② 헤더·푸터 워드마크 = Q 「명●록」', font=font, fill=(20, 20, 20))
hw, hh = 650, 87; logo_h = int(24 * 1.45)
q = q_dot
qs = q.resize((int(q.width * logo_h / q.height), logo_h), Image.LANCZOS)
strip = Image.new('RGB', (hw, hh), (0, 0, 0)); strip.paste(recolor(qs, (250, 250, 250), (0, 0, 0), thr=120), (int(20 * 1.45), (hh - logo_h) // 2))
sd = ImageDraw.Draw(strip)
for ox in (hw - int(20 * 1.45) - 32 - 14 - 32, hw - int(20 * 1.45) - 32):
    sd.rounded_rectangle((ox, (hh - 32) // 2, ox + 32, (hh + 32) // 2), 8, outline=(187, 187, 187), width=2)
sheet.paste(strip, (790, 165)); d.text((790, 258), '검정 헤더 h60 · 로고 h24 (1.45배 확대) — 홈 계획서 규격', font=small, fill=(110, 110, 110))
strip2 = Image.new('RGB', (hw, hh), IVORY); strip2.paste(recolor(qs, INK, IVORY, thr=120), (int(20 * 1.45), (hh - logo_h) // 2))
sheet.paste(strip2, (790, 285)); d.text((790, 378), '상아 헤더 변형', font=small, fill=(110, 110, 110))
lk = Image.new('RGB', (650, 110), WHITE)
s = square(m_round, 90, IVORY, 0.82); lk.paste(s, (10, 10), rmask(s.size, 18))
qq = q.resize((int(q.width * 56 / q.height), 56), Image.LANCZOS); lk.paste(qq, (120, 27))
sheet.paste(lk, (790, 405)); d.text((790, 518), '가로 락업(도장 + 워드마크) — 결과지 머리·OG용', font=small, fill=(110, 110, 110))

# ③ stack + wordmark variants
card(40, 560, 700, 580)
d.text((60, 575), '③ 세로 스택(OG · 엔드카드) / 워드마크 4형', font=font, fill=(20, 20, 20))
st = Image.new('RGB', (320, 320), INK)
s = square(recolor(m_round, IVORY, INK), 150, INK, 0.9); st.paste(s, (85, 40))
qw = recolor(q.resize((int(q.width * 64 / q.height), 64), Image.LANCZOS), (250, 250, 250), INK, thr=120); st.paste(qw, ((320 - qw.width) // 2, 205))
sheet.paste(st, (60, 615), rmask(st.size, 24))
st2 = Image.new('RGB', (320, 320), IVORY)
s = square(m_round, 150, IVORY, 0.9); st2.paste(s, (85, 40)); qw2 = q.resize((int(q.width * 64 / q.height), 64), Image.LANCZOS); st2.paste(qw2, ((320 - qw2.width) // 2, 205))
sheet.paste(st2, (400, 615), rmask(st2.size, 24))
d.text((60, 945), '먹판 / 상아판 — 세계관 액센트(산군 금 · 직녀 은)는 이 1색만 갈아 끼움', font=small, fill=(110, 110, 110))
yy = 985; xx = 60
for im, lab in ((q_dial, 'ㅇ=열두달 바퀴'), (q_dot, 'ㅇ=달 (확정)'), (q_ring, 'ㅇ=고리+점'), (q_enso, 'ㅇ=붓 원')):
    w = int(im.width * 48 / im.height); t = im.resize((w, 48), Image.LANCZOS); sheet.paste(t, (xx, yy)); d.text((xx, yy + 56), lab, font=small, fill=(110, 110, 110)); xx += max(w, 150) + 20

# ④ 2안 placeholder
card(770, 560, 690, 580)
d.text((790, 575), '④ 2안 — A 사침 장부 심볼 + Q 워드마크', font=font, fill=(20, 20, 20))
d.text((790, 610), 'A 원본은 아직 다운로드 전. 형님이 「책」 쪽이면 한마디 — 실물로 교체.', font=small, fill=(110, 110, 110))
bx, by = 790, 650
d.rounded_rectangle((bx + 40, by, bx + 40 + 150, by + 200), 10, fill=INK)
d.rounded_rectangle((bx + 60, by + 18, bx + 60 + 34, by + 18 + 90), 4, fill=IVORY)
for i in range(4):
    d.rounded_rectangle((bx + 150, by + 30 + i * 40, bx + 150 + 40, by + 30 + i * 40 + 8), 4, fill=IVORY)
d.text((bx + 40, by + 210), '(낙서 — 판정 근거 아님, A 실물은 ChatGPT 대화에)', font=small, fill=(150, 150, 150))
qq = q.resize((int(q.width * 72 / q.height), 72), Image.LANCZOS); sheet.paste(qq, (bx + 240, by + 60))

sheet.save('logo-final-sheet.png'); print('saved', sheet.size)
