# -*- coding: utf-8 -*-
"""
직녀·산군 「운명의 짝」 얼굴 70장 프롬프트 생성기 (2026-08-24, v2)

왜 코드로 만드나: 70장을 손으로 쓰면 반드시 어긋난다. 어긋나면 70장이 한 세트로 안 보이고,
한 세트로 안 보이면 「계산해서 고른 얼굴」이라는 주장 자체가 무너진다.

── v1 앵커 3장 실측(2026-08-24)에서 고친 것 ────────────────────────
① ★ 매력 (형님 지시) — v1 은 "no beauty retouching / visible pores" 로 증명사진 리얼리즘을 좇았다.
   상품이 **「운명의 상대」** 인데 그러면 안 된다. `partner-face.ts` 주석에 이미
   "인물은 매력적으로 그린다"고 박혀 있었는데 프롬프트가 그걸 어겼다. 청월당 실물도 확실한 미인이다.
   → 전원 잘생기고 예쁘게. 단 **인형처럼 매끈하게는 금지** — 실사 증거 레이어라 사진이어야 한다.
② ★ 배경색을 AI 에 맡기지 않는다 — hex 를 줘도 안 따랐다(실측: #CED2E7 요청 → 연보라,
   #E9E7F1 요청 → 거의 같은 연보라. 水와 金이 구분 불가). 오행색이 「왜 이 얼굴인가」의 근거인데
   색이 뭉개지면 근거가 통째로 무너진다.
   → **순백 배경으로 뽑고 배경만 후처리로 정확한 hex 로 치환**한다(compose_partner_bg.py).
③ ★ 인물 변별력 — v1 은 "같은 스타일"을 세게 걸었더니 **얼굴까지 복사**됐다
   (火·정·동갑 과 水·편·연하가 거의 동일인). 친구끼리 같은 얼굴이 뜨는 순간 이 장치는 죽는다.
   → 고정하는 것은 **카메라·조명·프레이밍뿐**이라고 못 박고, 오행마다 **머리 모양**을 다르게 고정,
     나이는 숫자로 명시한다. 머리는 얼굴이 닮아도 한눈에 갈라주는 가장 싼 변별자다.

축(전부 InyeonFacts 확정값 — src/lib/saju/partner-face.ts 와 같은 이름):
  best  60 = 성별2 × 오행5 × 정편2 × 나이대3
  worst 10 = 성별2 × 오행5           (짝의 오행을 극(剋)하는 결 = 멀리할 사람)
"""
import io, os

OUT_DIR = r'C:\Users\HP\OneDrive\Desktop\all_saju\marketing\소재\짝얼굴'

# ── 오행 배경색 (후처리 합성용 — 프롬프트에는 안 들어간다) ────────────
# 진원지는 JiknyeoResult.tsx 의 EL_BG 상단색(밤 배경용). 증명사진 배경으로 쓰기엔 진해서
# 흰색과 섞어 스튜디오 톤으로 낮춘다.
# 청월당 배경은 오행과 **무관한** 베이지·그레이다(8/22 실측). 배경색을 오행에 묶으면
# 「왜 이 얼굴인가」를 색으로도 설명할 수 있다 — 저쪽이 못 하는 자리다.
EL_BASE = {
    'wood':  ('#8FBFA0', '木', '목'),
    'fire':  ('#E08098', '火', '화'),
    'earth': ('#D6AC76', '土', '토'),
    'metal': ('#BDB9D6', '金', '금'),
    'water': ('#6E7BB8', '水', '수'),
}
WHITE_MIX = 0.66  # 얼굴이 주인공이고 배경은 근거 표시일 뿐


def tint(hex_color, w=WHITE_MIX):
    r, g, b = (int(hex_color[i:i + 2], 16) for i in (1, 3, 5))
    f = lambda c: int(round(c + (255 - c) * w))
    return '#%02X%02X%02X' % (f(r), f(g), f(b))


BG = {k: tint(v[0]) for k, v in EL_BASE.items()}

# ── 오행별 인상 ──────────────────────────────────────────────
# ⚠ partner-face.ts 의 LOOK 과 **뜻이 어긋나면 안 된다**. 티저에서 「이목구비가 또렷하고 ▓▓▓ 인상」을
#   읽은 손님이 결과지에서 이 얼굴을 보기 때문이다. 전부 미인이되 **매력의 결이 달라야** 한다
#   ("잘생겼다" 한 줄로 통일하면 70장이 한 장처럼 보인다 — partner-face.ts 주석의 경고 그대로).
LOOK_EN = {
    'wood':  'strikingly tall and slender with a long neck, clean straight elegant features, model-like proportions',
    'fire':  'vivid clearly-defined features, bright lively eyes, a radiant open face that draws attention instantly',
    'earth': 'soft gentle beautiful features, flawless smooth skin, a warm face that is comforting to look at',
    'metal': 'fair porcelain skin, sharply refined elegant features, a chic and impeccably groomed look',
    'water': 'deep alluring eyes and clear luminous skin, a quiet mysterious beauty with a lingering impression',
}
LOOK_KO = {
    'wood':  '키가 크고 선이 곧은, 늘씬한 인상',
    'fire':  '이목구비가 또렷하고 눈빛이 살아 있는 화사한 인상',
    'earth': '이목구비가 순하고 살결이 고운, 보고 있으면 편안한 인상',
    'metal': '피부가 희고 이목구비가 정갈한, 단정하고 세련된 인상',
    'water': '눈매가 깊고 살결이 맑은, 분위기 있는 인상',
}

# ★ 변별자 — 머리 모양. 얼굴이 닮아도 한눈에 갈라주는 가장 싼 장치다(v1 의 실패를 여기서 막는다).
HAIR = {
    'wood':  {'f': 'very long straight black hair falling past the shoulders',
              'm': 'short neat cropped hair, clean forehead'},
    'fire':  {'f': 'shoulder-length hair with soft waves, side-parted',
              'm': 'textured hair swept back off the forehead'},
    'earth': {'f': 'a soft rounded medium bob, center-parted',
              'm': 'natural side-parted hair, slightly soft on top'},
    'metal': {'f': 'sleek dark hair pulled back tightly into a low bun',
              'm': 'sharp side part, tidy short hair, very groomed'},
    'water': {'f': 'long loose wavy hair with a wispy fringe',
              'm': 'slightly longer hair with a soft fringe over the brow'},
}

# 정(正)=오래 가는 결 / 편(偏)=끌리는 결. **분위기와 매무새**로만 가른다
# (같은 오행인데 이목구비까지 바꾸면 오행 축이 무의미해진다).
TYPE_EN = {
    'jeong': 'composed and trustworthy air, a gentle closed-lip smile, relaxed shoulders, plain unpatterned knit',
    'pyeon': 'magnetic confident air, a direct steady gaze and faint asymmetric smile, sharper cut top',
}
TYPE_KO = {'jeong': '정(正) — 오래 가는 결', 'pyeon': '편(偏) — 끌리는 결'}

# 나이는 **숫자로** 박는다 — v1 은 "mid 20s / around 30" 로 줬더니 셋 다 같은 나이로 나왔다.
AGE_EN = {'elder': '37 years old', 'same': '31 years old', 'younger': '26 years old'}
AGE_KO = {'elder': '연상 쪽', 'same': '동갑 언저리', 'younger': '연하 쪽'}

SEX_EN = {'f': 'Korean woman', 'm': 'Korean man'}
SEX_KO = {'f': '여성', 'm': '남성'}

# worst — 짝의 오행을 극(剋)하는 오행. **못생기게 그리지 않는다**: 경고는 글의 몫이고,
# 밉게 그리는 순간 상품이 저열해진다. 「눈에 띄게 매력적인데 서늘한」이 정답이다.
GEUK = {'wood': 'metal', 'fire': 'water', 'earth': 'wood', 'metal': 'fire', 'water': 'earth'}
WORST_EN = ('good-looking but emotionally distant, a cool unreadable expression, no smile, '
            'chin slightly raised, guarded eyes')

# ── 공통 골격 ────────────────────────────────────────────────
# 70장이 한 세트로 보이게 하는 유일한 장치. 여기를 고치면 70장을 전부 다시 구워야 한다.
# ⚠ "같은 스타일"의 범위를 **카메라·조명·프레이밍으로 한정**한다 — v1 처럼 통으로 걸면 얼굴이 복제된다.
# ★ 형님 지시(2026-08-24, 2차): "좀 더 잘생기고 이쁘게" — 배우급으로 올린다.
# 단 'not plastic / not airbrushed into a doll' 을 같이 박아 사진 질감은 지킨다
# (여기를 놓치면 증거 레이어가 일러스트처럼 보여 2레이어 원칙이 깨진다).
BEAUTY = {
    'f': 'strikingly beautiful — Korean actress level visuals, the kind of face people turn around to look at. '
         'Flawless clear skin, refined symmetrical bone structure, elegant jawline',
    'm': 'strikingly handsome — Korean actor level visuals, the kind of face people turn around to look at. '
         'Clear healthy skin, refined symmetrical bone structure, clean defined jawline',
}

SKELETON = (
    'Photorealistic studio portrait photograph of a distinct individual — a new face, '
    'not resembling any previous image. '
    '{subject}, {age}, {beauty}. '
    '{look}. {hair}. {mood}. '
    'Framing: head and upper chest, centered, facing camera straight on, eyes level with lens. '
    'Soft even beauty-dish light from the front, no harsh shadow, no rim light. '
    'Pure white seamless background, completely plain, no gradient, no texture, no shadow on the background, no props. '
    'Real photographic skin with fine natural texture and healthy glow — beautiful but still a real '
    'photograph, not plastic, not airbrushed into a doll, not an illustration, not 3D render. '
    'Neutral modern clothing in a muted tone. '
    'Vertical 3:4 aspect ratio. '
    'No text, no watermark, no border, no logo, no hands, no accessories on the face.'
)

INTRO = ('Keep the camera, lens, focal length, framing, crop and lighting identical to the previous images '
         '— but the PERSON must be a completely different individual with a different face. ')


def build_best(sex, el, typ, age):
    return SKELETON.format(subject=SEX_EN[sex], age=AGE_EN[age], beauty=BEAUTY[sex],
                           look=LOOK_EN[el], hair=HAIR[el][sex], mood=TYPE_EN[typ])


def build_worst(sex, el):
    """el = 손님 짝의 오행. 실제로 그리는 얼굴은 그 짝을 극(剋)하는 오행이다."""
    foe = GEUK[el]
    return SKELETON.format(subject=SEX_EN[sex], age=AGE_EN['same'], beauty=BEAUTY[sex],
                           look=LOOK_EN[foe], hair=HAIR[foe][sex], mood=WORST_EN)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    rows, plain = [], []

    for sex in ('f', 'm'):
        for el in EL_BASE:
            for typ in ('jeong', 'pyeon'):
                for age in ('elder', 'same', 'younger'):
                    fn = 'p-%s-%s-%s-%s' % (sex, el, typ, age)
                    rows.append((fn, '%s · %s(%s) · %s · %s' % (
                        SEX_KO[sex], EL_BASE[el][2], EL_BASE[el][1], TYPE_KO[typ], AGE_KO[age]),
                        BG[el], build_best(sex, el, typ, age)))
                    plain.append((fn, build_best(sex, el, typ, age)))

    for sex in ('f', 'm'):
        for el in EL_BASE:
            foe = GEUK[el]
            fn = 'w-%s-%s' % (sex, el)
            rows.append((fn, '%s · 짝이 %s(%s)인 사람의 **멀리할 결** = %s(%s)' % (
                SEX_KO[sex], EL_BASE[el][2], EL_BASE[el][1], EL_BASE[foe][2], EL_BASE[foe][1]),
                BG[foe], build_worst(sex, el)))
            plain.append((fn, build_worst(sex, el)))

    md = ['# 「운명의 짝」 얼굴 70장 — 생성 프롬프트 (v2)',
          '',
          '> 생성기: `marketing/tools/gen_partner_prompts.py` — **손으로 고치지 말고 스크립트를 고쳐 다시 뽑을 것.**',
          '> 엔진: **ChatGPT 웹**(형님 지시 2026-08-24). 이미지는 GPT API 금지 규칙 유지.',
          '> 배치 경로: `public/products/partner/{파일명}.webp` (직녀·산군 공용 풀)',
          '',
          '## v1 앵커 3장에서 고친 것',
          '',
          '| # | 문제(실측) | 고침 |',
          '|---|---|---|',
          '| ① | 「no beauty retouching·visible pores」로 뽑아 **밋밋했다**. 상품이 「운명의 상대」인데 그러면 안 된다 | 전원 **잘생기고 예쁘게**. 단 인형처럼 매끈한 건 금지(실사 증거 레이어) |',
          '| ② | hex 를 줘도 배경색이 **안 맞았다**. 水(`#CED2E7`)와 金(`#E9E7F1`)이 둘 다 연보라로 나와 구분 불가 | **순백으로 뽑고 배경만 후처리로 치환** — 색 정확도 100% |',
          '| ③ | 「같은 스타일」을 통으로 걸었더니 **얼굴까지 복제**됐다(火·정·동갑 ≈ 水·편·연하) | 고정은 **카메라·조명·프레이밍만**. + 오행별 **머리 모양** 고정, 나이는 **숫자**로 명시 |',
          '',
          '## 오행 배경색 (후처리 합성용 — 프롬프트에는 안 들어간다)',
          '',
          '| 오행 | 진원지(EL_BG 상단) | 합성 배경색 |',
          '|---|---|---|']
    for k, (src, hanja, ko) in EL_BASE.items():
        md.append('| %s %s | `%s` | `%s` |' % (ko, hanja, src, BG[k]))
    md += ['',
           '## 공통 골격',
           '',
           '```',
           SKELETON,
           '```',
           '',
           '이어 뽑을 때 앞에 붙이는 문장:',
           '',
           '```',
           INTRO,
           '```',
           '',
           '## 오행별 머리 모양 (변별자)',
           '',
           '| 오행 | 여성 | 남성 |',
           '|---|---|---|']
    for k in EL_BASE:
        md.append('| %s | %s | %s |' % (EL_BASE[k][2], HAIR[k]['f'], HAIR[k]['m']))
    md += ['',
           '## 70장 표',
           '',
           '| # | 파일명 | 축 | 배경(합성) |',
           '|---|---|---|---|']
    for i, (fn, axis, bg, _) in enumerate(rows, 1):
        md.append('| %d | `%s` | %s | `%s` |' % (i, fn, axis, bg))
    md += ['', '전문 프롬프트는 `프롬프트_짝얼굴_70종.txt` (한 줄 = 한 장, `파일명\\t프롬프트`).']

    io.open(os.path.join(OUT_DIR, '프롬프트_짝얼굴_70종.md'), 'w', encoding='utf-8').write('\n'.join(md))
    io.open(os.path.join(OUT_DIR, '프롬프트_짝얼굴_70종.txt'), 'w', encoding='utf-8').write(
        '\n'.join('%s\t%s' % (fn, p) for fn, p in plain))
    io.open(os.path.join(OUT_DIR, '_이어뽑기_머리말.txt'), 'w', encoding='utf-8').write(INTRO)

    print('best 60 + worst 10 = %d장' % len(rows))
    print('합성 배경색:', ' '.join('%s=%s' % (EL_BASE[k][2], BG[k]) for k in EL_BASE))
    print('→', OUT_DIR)


if __name__ == '__main__':
    main()
