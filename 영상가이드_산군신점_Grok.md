# 🎬 산군 신점 영상 가이드 — Grok Imagine 판 (2026-07-30)

Flow(Veo)용 프롬프트를 그록에 그대로 넣으면 안 된다. 성질이 다르다.
기존 Flow 가이드는 `영상가이드_산군신점.md` 에 그대로 둔다(비교·복귀용).

---

## 0. 그록과 Flow의 차이 — 프롬프트를 바꿔야 하는 이유

| | Flow(Veo) | Grok Imagine |
|---|---|---|
| 프롬프트 | 긴 서술형 문장 잘 따름 | **짧고 구체적인 명령**이 유리. 길면 뒤쪽이 희석됨 |
| 부정 지시 | "자막 넣지 않는다" 어느 정도 먹힘 | **부정 지시가 약함.** "글자 없음"이라 쓰면 오히려 글자가 나오기도 함 |
| 길이 | 8~10초 | **6초 안팎.** 동작을 하나만 넣어야 함 |
| 언어 | 한국어 지시 OK | **영어가 더 정확히 먹힘.** 대사만 한국어로 지정 |
| 소리 | 지시대로 생성 | 자동 생성됨. 한국어 대사는 발음이 뭉개질 때가 많음 |

**그래서 바뀐 원칙 3가지**
1. **부정문을 쓰지 않는다.** "자막 금지" 대신, 자막을 부를 단어(text, title, caption, poster, sign)를 애초에 안 쓴다.
2. **동작은 편당 하나.** 문이 열리거나 / 카메라가 다가가거나 — 둘 다 시키면 둘 다 어설퍼진다.
3. **소리는 기대하지 않는다.** 우리 사이트는 어차피 **무음 재생**이고 방울·바람은 코드가 합성한다. 광고용 V4만 소리가 필요한데, 그건 무음으로 뽑고 내가 TTS를 입히는 게 안전하다.

---

## 1. 조작 순서

1. grok.com 또는 X 앱 → **Imagine** 진입
2. **이미지 업로드**: 바탕화면 `명운록_신점` 폴더의 원본 사용
   - V1 → `m6.png` (신당 문 여는 실루엣)
   - V2 → `m1.png` (제단 앞 뒷모습)
   - V3·V4 → `m5.png` (갓 그림자 정면)
3. 업로드한 이미지에서 **Make video / 영상 만들기** → 프롬프트 입력
4. 편당 **2~3개** 뽑아서 고른다 (1개만 뽑고 판단하지 말 것)
5. 다운로드 → 같은 폴더에 `g1.mp4` ~ `g4.mp4` 로 저장 → 나한테 **"받아"**

> 업로드가 막혀 있으면 → 아래 **부록 A**의 이미지 생성 프롬프트로 그록에서 그림부터 만들고, 그 그림으로 영상화한다.

---

## 2. 공통 반려 기준 (하나라도 걸리면 다시)

- 얼굴이 갓 그림자 밖으로 드러남 → **반려** (얼굴 없는 게 이 상품의 핵심)
- 화면에 글자·자막·간판이 생김 → 반려
- 인물이 걷거나 몸을 돌림 → 반려 (미동 없음이 위엄)
- 촛불이 형광등처럼 밝아짐 → 반려 (어둠이 8할)
- 사람이 둘 이상 나옴 → 반려

---

## 3. 프롬프트 4편

### V1 — 게이트 배경 (업로드: m6)
사이트에서 **1회 재생 후 마지막 프레임에 정지**한다. 그래서 "문을 통과해 제단 앞에 도착"으로 끝나야 한다.

```
Slow cinematic push-in through a narrow gap in an old wooden shrine door. Warm candlelight glows from inside the dark hallway. A man in a traditional Korean gat hat stands perfectly still in silhouette, never moving. Camera moves forward slowly and steadily. Dark moody realistic footage, deep shadows, shallow depth of field.
```
> 뜻: 낡은 나무문 틈으로 천천히 밀고 들어간다. 안쪽에서 촛불빛이 번진다. 갓 쓴 남자는 실루엣으로 미동 없이 서 있다. 카메라만 느리게 전진.

- 동작 = **카메라 전진 하나뿐.** 문이 활짝 열리는 건 안 시킨다(6초에 둘 다 넣으면 망함)
- 끝 프레임이 제단 앞이면 성공

---

### V2 — 제단 컷 배경 (업로드: m1)
루프 재생이라 **끝과 시작이 튀지 않아야** 한다. 그래서 카메라 고정.

```
Locked-off static shot of a dim Korean shrine altar. Dozens of candle flames flicker gently. Five-colored ritual cloths sway almost imperceptibly. A man seen from behind stands completely motionless. Camera does not move. Dark reverent realistic footage, deep shadows.
```
> 뜻: 어두운 신당 제단, 카메라 완전 고정. 촛불만 일렁이고 오방색 천이 미세하게 흔들린다. 뒷모습 남자는 완전히 정지.

- `Locked-off static shot` 이 핵심 — 이걸 빼면 그록이 습관적으로 카메라를 움직인다
- 인물이 조금이라도 움직이면 반려

---

### V3 — CTA 컷 배경 (업로드: m5)
루프. 아주 느린 접근 + 연기만.

```
Very slow subtle push-in toward a man in a traditional Korean gat hat. His face stays completely hidden in the shadow of the hat brim the entire time. Incense smoke drifts upward across the frame. Dark cinematic realistic footage, candlelight from below, heavy shadows.
```
> 뜻: 갓 쓴 남자 쪽으로 아주 느리게 다가간다. 얼굴은 내내 갓 그림자에 완전히 가려져 있다. 향 연기가 화면을 가로질러 위로 오른다.

- `stays completely hidden ... the entire time` — 얼굴 방어는 이 문장이 담당. 절대 빼지 말 것

---

### V4 — 메타 광고 훅 (업로드: m5) ★가장 중요
**소리는 포기하고 그림만 받는다.** 방울 소리와 "네 장부, 내가 먼저 봤다" 대사는 내가 뒤에 입힌다.

```
Fast aggressive crash zoom toward a man in a traditional Korean gat hat, stopping abruptly at chest level. His face remains completely hidden in deep shadow under the hat. Sudden stop, then total stillness. Dark cinematic realistic footage, high contrast, candlelight.
```
> 뜻: 갓 쓴 남자를 향해 카메라가 확 달려들다가 가슴 높이에서 급정지. 얼굴은 끝까지 어둠 속. 멈춘 뒤엔 정적.

- **급정지가 생명이다.** 스르륵 멈추면 훅이 안 산다. 급정지 안 되면 3개까지 다시 뽑을 것
- 대사를 그록에 시키고 싶으면: 위 프롬프트 뒤에 아래 한 줄만 추가. 발음 뭉개지면 버리고 무음본을 쓴다
  ```
  A deep male voice says in Korean: "네 장부, 내가 먼저 봤다."
  ```

---

## 4. 받은 뒤 내가 하는 후처리

- 그록 워터마크 크롭 (Flow 때는 하단 6% 잘랐음)
- H.264 / yuv420p 변환 + **오디오 트랙 제거**(사이트는 무음 재생)
- 세로 9:16 로 맞춤 (표시 규격 860×1471, object-cover)
- 파일 배치: `public/products/sangun/gate.mp4` · `altar.mp4` · `face.mp4`
  → **BgMedia 가 자동 감지**한다. 파일만 넣으면 살아나고, 없으면 webp 로 자동 폴백
- V4(광고)는 방울 SFX + 저음 TTS 합성 (틱톡공장 TTS 재활용)

---

## 5. 순서

**V4(광고 훅) → V1(게이트) → V2·V3**

V1은 이미 Flow 결과물이 라이브에 붙어 있어 급하지 않다. 지금 없는 건 광고 소재다.
V4부터 뽑아서 그록 톤이 쓸 만한지 먼저 보고, 괜찮으면 나머지로 확장하는 게 크레딧이 안 샌다.

---

## 부록 A — 업로드가 안 될 때, 그록에서 그림부터 만들기

영상화 전에 이 프롬프트로 이미지를 먼저 뽑는다. 얼굴 없는 규칙은 그대로다.

**A-1. 문 여는 실루엣 (V1용)**
```
Vertical 9:16. A narrow gap in an old wooden Korean shrine door, warm candlelight spilling from inside into a dark hallway. Silhouette of a man wearing a traditional Korean gat hat standing in the doorway, face unseen. Photorealistic, dark moody, deep shadows, cinematic.
```

**A-2. 제단 앞 뒷모습 (V2용)**
```
Vertical 9:16. Interior of a dim Korean shamanic shrine. An altar covered with dozens of lit candles, brass bowls, and five-colored ritual cloths. A man in dark traditional Korean clothing seen from behind, standing before the altar. Photorealistic, dark reverent atmosphere, candlelight only.
```

**A-3. 갓 그림자 정면 (V3·V4용)**
```
Vertical 9:16. Close portrait of a man wearing a traditional Korean gat hat, lit only by candlelight from below. The brim casts deep shadow that completely conceals his face. Dark background, incense smoke. Photorealistic, high contrast, cinematic.
```

> 세 장 모두 **얼굴이 보이면 버린다.** 이 상품이 실사로 갈 수 있는 유일한 이유가 "얼굴이 없어서"다
> (AI 얼굴 3대 리스크 회피 — 다른 상품은 전부 웹툰체로 가는 이유).
