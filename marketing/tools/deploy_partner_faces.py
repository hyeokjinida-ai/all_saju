# -*- coding: utf-8 -*-
"""
짝 얼굴 70장 배치 — webp 변환 + public 배치 + 전수 검사 (2026-08-24)

들어오는 것: `marketing/소재/짝얼굴/_합성/` (배경이 오행색으로 통일된 PNG 1086×1448)
나가는 것  : `public/products/partner/{파일명}.webp`

검사 항목(하나라도 어긋나면 배치 안 한다):
  ① 70장이 **전부** 있는가 — 빠진 축이 있으면 그 명식의 손님에게 빈 카드가 뜬다
  ② 규격 3:4 인가
  ③ **중복 얼굴이 없는가** — 같은 얼굴 두 장은 이 장치의 유일한 사망 원인이다
     (친구끼리 돌려 보다 같은 얼굴이 나오는 순간 "아무 사진이나 띄웠네"가 된다)
  ④ 배경색이 그 축의 오행색과 편차 ≤2 인가
"""
import io, os, sys, glob, hashlib

import numpy as np
from PIL import Image

BASE = r'C:\Users\HP\OneDrive\Desktop\all_saju'
SRC = os.path.join(BASE, 'marketing', '소재', '짝얼굴', '_합성')
DST = os.path.join(BASE, 'public', 'products', 'partner')

BG = {'wood': '#D9E9DF', 'fire': '#F4D4DC', 'earth': '#F1E3D0', 'metal': '#E9E7F1', 'water': '#CED2E7'}
ELS = list(BG)
QUALITY = 88


def expected():
    """있어야 할 70장. partner-face.ts 의 파일명 규칙과 **글자 그대로** 같아야 한다."""
    out = []
    for sex in ('f', 'm'):
        for el in ELS:
            for typ in ('jeong', 'pyeon'):
                for age in ('elder', 'same', 'younger'):
                    out.append('p-%s-%s-%s-%s' % (sex, el, typ, age))
    for sex in ('f', 'm'):
        for el in ELS:
            out.append('w-%s-%s' % (sex, el))
    return out


def el_of(name):
    for el in ELS:
        if el in name:
            return el
    return None


def main():
    want = expected()
    have = {os.path.basename(p)[:-4] for p in glob.glob(os.path.join(SRC, '*.png'))}
    missing = [n for n in want if n not in have]
    extra = sorted(have - set(want))

    print('있어야 할 장수 %d / 실제 %d' % (len(want), len(have)))
    if extra:
        print('  규칙 밖 파일:', extra)
    if missing:
        print('  ✗ 빠진 축 %d개:' % len(missing))
        for m in missing:
            print('     ', m)

    # 전수 검사
    seen, dups, bad_ratio, bad_bg = {}, [], [], []
    for n in sorted(have & set(want)):
        p = os.path.join(SRC, n + '.png')
        im = Image.open(p).convert('RGB')
        if round(im.size[0] / im.size[1], 3) != 0.75:
            bad_ratio.append((n, im.size))
        a = np.asarray(im)
        band = np.concatenate([a[0:60, 0:80].reshape(-1, 3), a[0:60, -80:].reshape(-1, 3)])
        got = band.mean(0).round().astype(int)
        el = el_of(n)
        tgt = [int(BG[el][i:i + 2], 16) for i in (1, 3, 5)]
        dev = max(abs(int(got[i]) - tgt[i]) for i in range(3))
        if dev > 2:
            bad_bg.append((n, '#%02X%02X%02X' % tuple(got), BG[el], dev))
        h = hashlib.md5(a.tobytes()).hexdigest()
        if h in seen:
            dups.append((seen[h], n))
        seen[h] = n

    print('규격 어긋남:', bad_ratio or '없음')
    print('배경 편차>2:', bad_bg or '없음')
    print('중복 얼굴  :', dups or '없음')

    if missing or dups or bad_ratio or bad_bg:
        print('\n✗ 검사 불통과 — 배치하지 않는다.')
        return 1

    os.makedirs(DST, exist_ok=True)
    total = 0
    for n in want:
        im = Image.open(os.path.join(SRC, n + '.png')).convert('RGB')
        out = os.path.join(DST, n + '.webp')
        im.save(out, 'WEBP', quality=QUALITY, method=6)
        total += os.path.getsize(out)
    print('\n✓ %d장 배치 완료 → %s' % (len(want), DST))
    print('  합계 %.1fMB · 장당 평균 %dKB' % (total / 1048576, total / len(want) / 1024))
    return 0


if __name__ == '__main__':
    sys.exit(main())
