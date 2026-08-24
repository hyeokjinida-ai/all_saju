# -*- coding: utf-8 -*-
"""
짝 얼굴 — 배경을 정확한 오행색으로 **통일** + 판정 + 콘택트시트 (2026-08-24, v2)

왜 후처리를 하나 (이유가 바뀌었다 — 실측으로 정정):
  처음엔 "AI 가 hex 를 안 따른다"고 봤는데 **그건 오판이었다**. 상단 띠를 재 보니
  #F4D4DC→#FDD1D7 (편차9) · #CED2E7→#C9CAE5 (편차8) · #E9E7F1→#E5E1EC (편차6) 로
  ChatGPT 는 색을 잘 따랐다. 스크린샷 눈대중으로 "두 개가 같은 연보라"라고 본 내가 틀렸다.
  ([[design-clone-loop]] 의 "눈대중 금지, 기계 대조" 규칙을 어긴 사례.)
  → 진짜 이유: **장마다 편차가 6~9 로 조금씩 다르다.** 같은 오행 카드 여러 장이 나란히 놓이면
    그 미세한 차이가 "대충 만든 세트"로 보인다. 편차 0 으로 못 박기 위해 후처리한다.

방식: 상단 띠에서 배경색을 **자동 추정**하고(순백으로 뽑든 색으로 뽑든 상관없다),
     그 색과 가까운 픽셀 중 **가장자리에서 연결된 덩어리**만 목표색으로 갈아끼운다.
     연결성 검사는 1/4 축소본에서 BFS — 인물 안쪽의 흰 옷·밝은 피부를 먹지 않게 하는 안전장치다.
     경계는 알파 페더링으로 부드럽게(안 하면 머리카락 둘레에 원래 배경색 테가 남는다).

사용:
  python compose_partner_bg.py                      # _앵커 → _앵커_합성 + 시트
  python compose_partner_bg.py --in <dir> --out <dir>
"""
import os, argparse
from collections import deque

import numpy as np
from PIL import Image, ImageFilter, ImageDraw, ImageFont

BASE = r'C:\Users\HP\OneDrive\Desktop\all_saju\marketing\소재\짝얼굴'

# gen_partner_prompts.py 와 **같은 값**이어야 한다. 진원지는 JiknyeoResult.tsx 의 EL_BG.
BG = {'wood': '#D9E9DF', 'fire': '#F4D4DC', 'earth': '#F1E3D0', 'metal': '#E9E7F1', 'water': '#CED2E7'}
KO = {'wood': '목木', 'fire': '화火', 'earth': '토土', 'metal': '금金', 'water': '수水'}

TOL = 42        # 배경 추정색과의 채널 최대차 허용치. 넘기면 밝은 옷을 먹는다
SHRINK = 4      # 연결성 검사 축소 배율
FEATHER = 1.8   # 경계 페더링(px)


def hex2rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def element_of(name):
    for el in BG:
        if el in name:
            return el
    return None


def bg_seed_color(a):
    """상단 좌우 귀퉁이 띠의 중앙값 = 배경색 추정. 하단은 인물이 차 있어 쓰면 안 된다
       (실측: v2 앵커의 아래 모서리는 (171,165,160) 로 옷이었다)."""
    band = np.concatenate([a[0:60, 0:80].reshape(-1, 3), a[0:60, -80:].reshape(-1, 3)])
    return np.median(band, axis=0)


def bg_mask(a):
    seed = bg_seed_color(a)
    near = (np.abs(a.astype(np.int16) - seed).max(axis=2) <= TOL)

    small = near[::SHRINK, ::SHRINK]
    h, w = small.shape
    seen = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if small[y, x] and not seen[y, x]:
                seen[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if small[y, x] and not seen[y, x]:
                seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and small[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))

    big = np.kron(seen, np.ones((SHRINK, SHRINK), bool))[:a.shape[0], :a.shape[1]]
    if big.shape != a.shape[:2]:
        pad = np.zeros(a.shape[:2], bool)
        pad[:big.shape[0], :big.shape[1]] = big
        big = pad
    return near & big, seed


def compose(src, el, dst):
    im = Image.open(src).convert('RGB')
    a = np.asarray(im)
    m, seed = bg_mask(a)

    mask = Image.fromarray((m * 255).astype(np.uint8), 'L')
    if FEATHER:
        mask = mask.filter(ImageFilter.GaussianBlur(FEATHER))
    out = Image.composite(Image.new('RGB', im.size, hex2rgb(BG[el])), im, mask)
    out.save(dst)

    oa = np.asarray(out)
    band = np.concatenate([oa[0:60, 0:80].reshape(-1, 3), oa[0:60, -80:].reshape(-1, 3)])
    got = band.mean(0).round().astype(int)
    tgt = hex2rgb(BG[el])
    return {'size': '%dx%d' % im.size, 'ratio': round(im.size[0] / im.size[1], 3),
            '원본배경': '#%02X%02X%02X' % tuple(seed.round().astype(int)),
            '결과배경': '#%02X%02X%02X' % tuple(got),
            '목표': BG[el],
            '편차': int(max(abs(int(got[i]) - tgt[i]) for i in range(3))),
            '배경면적': round(m.mean() * 100, 1)}


def sheet(items, dst, cols=4, cell=300):
    rows = (len(items) + cols - 1) // cols
    ch, pad, lh = int(cell * 4 / 3), 12, 30
    sh = Image.new('RGB', (cols * (cell + pad) + pad, rows * (ch + lh + pad) + pad), '#F5F5F7')
    d = ImageDraw.Draw(sh)
    try:
        f = ImageFont.truetype('malgun.ttf', 13)
    except Exception:
        f = ImageFont.load_default()
    for i, (p, label) in enumerate(items):
        x = pad + (i % cols) * (cell + pad)
        y = pad + (i // cols) * (ch + lh + pad)
        sh.paste(Image.open(p).convert('RGB').resize((cell, ch), Image.LANCZOS), (x, y))
        d.text((x + 2, y + ch + 6), label, fill='#222', font=f)
    sh.save(dst)
    return dst


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--in', dest='src', default=os.path.join(BASE, '_앵커'))
    ap.add_argument('--out', dest='dst', default=os.path.join(BASE, '_앵커_합성'))
    ap.add_argument('--cols', type=int, default=4)
    a = ap.parse_args()
    os.makedirs(a.dst, exist_ok=True)

    items = []
    print('%-34s %-10s %-9s %-9s %-9s %s' % ('파일', '규격', '원본배경', '결과배경', '목표', '편차/배경%'))
    for fn in sorted(os.listdir(a.src)):
        if not fn.lower().endswith('.png'):
            continue
        el = element_of(fn)
        if not el:
            print('  건너뜀(오행 못 읽음):', fn); continue
        outp = os.path.join(a.dst, fn)
        r = compose(os.path.join(a.src, fn), el, outp)
        print('%-34s %-10s %-9s %-9s %-9s %d / %s%%' % (
            fn[:34], r['size'], r['원본배경'], r['결과배경'], r['목표'], r['편차'], r['배경면적']))
        items.append((outp, fn.replace('.png', '') + '  ' + KO[el]))

    if items:
        print('시트 →', sheet(items, os.path.join(a.dst, '_시트.png'), cols=a.cols))


if __name__ == '__main__':
    main()
