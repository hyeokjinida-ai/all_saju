# -*- coding: utf-8 -*-
"""
worst 10장 파일명 교정 (2026-08-24)

문제: 생성 큐는 worst 이름을 **손님 짝의 오행**으로 붙였는데(w-f-wood = "짝이 木인 사람용"),
      그 파일에 실제로 그려진 얼굴은 木을 극(剋)하는 **金의 결**이다.
      `partner-face.ts` 의 buildWorstFace 는 이미 GEUK 를 적용한 뒤 파일명을 만든다:
          const el = GEUK[mine];  src = `w-${sex}-${el}.webp`
      즉 코드는 파일명을 **「그려진 얼굴의 오행」** 으로 읽는다. 이름이 규칙과 어긋나 있었다.

왜 「그려진 얼굴의 오행」이 맞나: 배경색을 파일명에서 바로 읽어야 하고,
    배경색은 「그 사람의 결」을 뜻하기 때문이다. 손님 오행으로 이름 붙이면
    金 얼굴에 木 배경이 깔려 근거가 그 자리에서 깨진다(실제로 그렇게 합성됐다).

GEUK 가 순환(wood→metal→fire→water→earth→wood)이라 그냥 rename 하면 충돌한다.
임시 이름을 한 번 거친다.
"""
import os, sys, glob

GEUK = {'wood': 'metal', 'fire': 'water', 'earth': 'wood', 'metal': 'fire', 'water': 'earth'}


def main(d):
    files = sorted(glob.glob(os.path.join(d, 'w-*.png')))
    if not files:
        print('worst 파일 없음:', d); return
    moves = []
    for f in files:
        base = os.path.basename(f)[:-4]          # w-f-wood
        parts = base.split('-')
        if len(parts) != 3 or parts[2] not in GEUK:
            print('  건너뜀(형식 이상):', base); continue
        _, sex, mine = parts
        drawn = GEUK[mine]                        # 실제로 그려진 얼굴의 오행
        moves.append((f, os.path.join(d, 'w-%s-%s.png' % (sex, drawn))))

    # 1단계: 전부 임시 이름으로
    tmp = []
    for src, dst in moves:
        t = src + '.tmp'
        os.replace(src, t)
        tmp.append((t, dst))
    # 2단계: 최종 이름으로
    for t, dst in tmp:
        os.replace(t, dst)
        print('  %-22s → %s' % (os.path.basename(t)[:-8], os.path.basename(dst)))
    print('worst %d장 교정 완료' % len(tmp))


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1
         else r'C:\Users\HP\OneDrive\Desktop\all_saju\marketing\소재\짝얼굴\_원본')
