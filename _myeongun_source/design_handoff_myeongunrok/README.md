# 명운록 (命運錄) — 디자인 핸드오프

## Overview
**명운록 (Myeongunrok)** — 전통 명리(命理, 사주) 기반의 1:1 카카오톡 상담 서비스 랜딩페이지. 모바일 우선의 상세페이지(long-scroll) 구조이며 최종 목적은 **카카오톡 채널로 상담 유도**입니다.

핵심 컨셉:
- 정통 동양(한지·먹·인장) 무드 + 시네마틱 야경(딥 와인/블랙)
- 천 년 명리 학문의 두께 + 과학적 정밀 산출이라는 두 신뢰축
- 사주는 "점이 아니라 지도"라는 브랜드 메시지

타겟: 30–40대 일반, 진로·관계·재물·시기에 대한 고민을 가진 사용자.

## About the Design Files
이 패키지의 `source/` 폴더에 있는 파일들은 **HTML로 만든 디자인 레퍼런스**입니다 — 룩과 인터랙션 의도를 보여주는 프로토타입이며, 그대로 프로덕션에 쓸 수 있는 코드가 아닙니다.

작업의 본질은 **이 HTML 디자인을 타겟 코드베이스의 환경**(예: Next.js, Nuxt, SwiftUI, Flutter 등 — 운영 중인 스택)**에서 재구현**하는 것입니다. 새 프로젝트라면 적절한 프레임워크를 선택해서 진행해주세요.

타입 시스템, 디자인 토큰, 컴포넌트 라이브러리는 기존 코드베이스의 컨벤션을 따르세요. 단, **시각적 fidelity는 그대로 유지**해주세요.

## Fidelity
**Hi-Fi (high-fidelity).** 색·타이포·간격·인터랙션 모두 의도된 최종 값입니다. 픽셀까지 동일하게 재현해주세요. 단, SVG 일러스트는 임시이며(추후 일러스트레이터 작업 예정 자리), **placeholder로 식별 가능하게 처리** 가능합니다. 폰트는 Google Fonts에서 동일 family를 로드합니다.

---

## Screens / Sections

전체는 모바일 1개 페이지(long scroll). 모든 섹션은 `data-screen-label` 속성을 가집니다.

| # | label | 한자 | Scene tone | 요약 |
|---|---|---|---|---|
| 01 | Hero | — | scene-wine | 골드프레임 命運錄 + 카톡 CTA |
| 02 | Heritage | 傳 | scene-cosmos | 산수도 풀블리드 + 命理系譜 timeline + 萬歲曆 SVG |
| 03 | Cosmos | 生 | scene-wine | Galaxy SVG + 八字 설명 |
| 04 | Precision | 精 | scene-cosmos | 28수 천문도 + 산출방법 4종 + 정확도 stats + Pipeline |
| 05 | Problem | 惑 | scene-wine | 산수+등불 풀블리드 + 4가지 페인포인트 |
| 06 | Concept | 命 | scene-cosmos | 명식 8자 골드프레임 |
| 07 | How | 行 | scene-cosmos | 3단계 + 카톡 채팅 미리보기 |
| 08 | Reviews | 證 | scene-wine | 4.96점 + 후기 3개 |
| 09 | Pricing | 受 | scene-cosmos | 簡命 ₩19,900 / 深命 ₩49,900 |
| 10 | FAQ | 問 | scene-wine | 5문항 아코디언 |
| 11 | CTA | 問命 | scene-cosmos | SunRadiant + 최종 카톡 버튼 |

씬은 `scene-wine`(딥 와인 #3a0d18)과 `scene-cosmos`(거의 검정 #060306) 두 톤이 alternate 됩니다.

### 01 Hero
- **Layout:** 풀스크린(최소 800px 높이) 가운데 정렬. 골드 프레임 안에 큰 한자 브랜드.
- **Components:**
  - 상단 미니 헤더: 골드 라인 + `EST · 2026` (mono, 9px, letter-spacing 0.4em)
  - **메인 타이틀 카드** (`.gold-frame`):
    - 한자 브랜드 `命運錄` — Ma Shan Zheng 64px, gold-bright (#e8c878), text-shadow glow
    - 한글 `명 · 운 · 록` — Nanum Myeongjo 14px, bone, letter-spacing 0.5em
    - 골드 룰 디바이더
    - 부 카피 `四柱 · 命理 · 諮問` — 11px, bone-soft, letter-spacing 0.25em
  - **히어로 카피:** 28px Nanum Myeongjo 700 weight
    - "타고난 흐름이 / 어디로 가는지 / **읽어드립니다.**" (마지막 줄 gold-bright)
  - **CTA 버튼** `<KakaoButton>`: 풀 너비, 카카오 노란색 #FEE500, 카카오톡 말풍선 아이콘, "카톡으로 상담받기" + sub "· 첫상담 50%"
  - 하단: `누적 11,300건` (mono, bone-faint)
  - 절대위치 스크롤 힌트 `SCROLL` + 세로 라인

### 02 Heritage — 천 년의 계보
- **Layout:** 상단 320px 풀블리드 산수도, 그 위 -40px 마진으로 본문이 겹침
- **Components:**
  - `<BigLandscape>` SVG (320px) — 다층 산, 달, 정자, 외로운 소나무, 학자 실루엣
  - 산수도 우측 상단에 세로 한자 `千年 한줄기` (gold-bright, 28px, text-shadow glow)
  - 섹션 라벨 `一 · 傳 · 천 년의 계보`
  - 메인 카피: "명운록은 / **천 년**을 거쳐 온 / 명리의 줄기 끝에 있습니다."
  - **계보 타임라인** (좌측 vertical line + node) 6단계:
    - 周 (B.C. 1000) — 周易
    - 漢 (A.D. 100) — 太初曆
    - 唐 — 三柱命理 (李虚中)
    - 宋 — 子平命理 (徐子平)
    - 明清 — 萬歲曆
    - 今 (2026) — **命運錄** ← highlighted (gold-bright, glow)
  - `<AlmanacPage>` SVG (260×300) — 만세력 페이지 mock + 古 인장

### 03 Cosmos — 八字
- **Components:**
  - `<GalaxyScene>` SVG (300px) — 나선은하, 골드 더스트, 발광 코어
  - 메인 카피: "당신이 태어난 그 순간, / **하늘과 땅**이 / 여덟 글자를 새겼습니다."
  - 큰 한자 `八字` — gold-bright, 64px brush, glow
  - 부 카피: 年·月·日·時 / 天干 4 + 地支 4

### 04 Precision — 정밀한 산출
- **Components:**
  - 섹션 라벨 `三 · 精`
  - 메인 카피: "전통의 학문을 / **과학적 정밀함**으로 / 풀어냅니다."
  - `<LunarMansionChart>` SVG (280px) — 28수 천문도:
    - 외곽 링 + 56 tick + 28 한자 별자리 (角亢氐房心尾箕…)
    - 4방위 守護 (青龍·玄武·白虎·朱雀)
    - 중앙 코어에 `太` 한자 + radial glow
  - **산출 방법 4종 카드** (44px 정사각 한자 아이콘 + 텍스트):
    - 曆 · 만세력 정밀계산
    - 時 · 진태양시 자동 보정
    - 節 · 절기 입절시각 적용
    - 子 · 子時 경계 일주 처리
  - **검증 stats 2×2 grid**:
    - 99.7% · 명식 산출 정확도 · 11,300건 검증
    - 87.2% · 일주 본질 적중률 · 자체 추적 데이터
    - 11,300+ · 검증 케이스 · 6년 누적
    - 1,000+년 · 학문의 두께 · 子平命理 정립 이래
  - **Pipeline 다이어그램**: 生 › 曆 › 時 › 式 › 解

### 05 Problem — 4가지 고민
- **Components:**
  - 상단 260px 풀블리드 `<MountainScene withLantern>` SVG (안개 산수 + 등불 글로우)
  - 메인 카피: "혹시, / 이런 마음에 / **막혀 계신가요.**"
  - 4개 카드 (좌측 48px 한자 아이콘 박스 + 라벨 + 본문):
    - 業 · 진로 — 지금 일을 계속해야 할지 한 해째 갈피가 잡히지 않으세요?
    - 緣 · 인연 — 맞지 않는 사람만 자꾸 만난다 느끼시나요?
    - 財 · 재물 — 돈은 들어오는데 머물지 않고 흩어지나요?
    - 時 · 시기 — 지금이 움직일 때인지, 기다릴 때인지 모르시겠나요?
  - 마무리 카피: "답이 보이지 않을 때 / **먼저 길을 본 사람**의 / 말을 들어야 합니다."

### 06 Concept — 命式 (네 기둥 여덟 글자)
- **Components:**
  - 메인 카피: "사주는 **점**이 아니라 / 당신의 **지도**입니다."
  - **사주 명식 8자판** (gold-frame):
    - 상단 한자 헤더: 時 · 日 · 月 · 年 (4열, 日 column highlighted gold)
    - 골드 룰
    - 각 셀에 천간(위)·지지(아래) 2개 한자 + 역할 라벨 (말년/자신/청년/초년)
    - 일주(日柱)는 gold-bright + box border
  - 마무리: "명운록은 이 여덟 글자를 / **당신의 언어**로 / 풀어드립니다."

### 07 How — 진행 방식
- **Components:**
  - 3단계 카드 (한자 一·二·三 + STEP 01-03 라벨):
    - 一 · 카톡으로 문을 두드리세요 (叩)
    - 二 · 여덟 글자를 적어주세요 (記)
    - 三 · 맞춤 풀이를 받으세요 (解)
  - **카카오톡 미리보기 카드** (`rgba(254,229,0,0.08)` 배경):
    - 좌측 말풍선 (paper-warm): "안녕하세요. 명식 잘 받았습니다. 일주가 己巳(기사)일이시군요."
    - 우측 말풍선 (kakao yellow): "저 올해 이직해도 괜찮을까요?"
    - 좌측 말풍선: "올해 흐름이 庚午(경오)로 움직이는 해입니다. 하반기가 결단에 유리합니다."
  - KakaoButton sub "· 무료 친구추가"

### 08 Reviews — 후기
- **Components:**
  - 큰 평점 `4.96` (brush gold glow) + ★★★★★ + `누적 1,247 건`
  - 3개 후기 카드:
    - 진로 · 32 여 · 己巳 — 이직 결정 후기
    - 인연 · 29 여 · 丁未 — 관계 패턴 후기
    - 재물 · 41 남 · 甲子 — 재물 시기 후기
  - 각 카드: gold tag + 나이/성별 + 일주 한자(우상단 brush) + 후기 본문 + ★★★★★

### 09 Pricing
- **Components:**
  - 메인 카피: "지금 시작하시면 / **첫 상담 50%**"
  - 부 카피: `· 6월 한정 · 신규 1회 ·`
  - **2개 가격 카드**:
    - **簡命** (간명) — ₩**19,900** (정가 ₩29,900)
      - 일주 중심 풀이 / 올해 흐름 (歲運) / 질문 2개까지 / 24h 이내 답변
    - **深命** (심명) — ₩**49,900** (정가 ₩79,900) ← featured
      - 사주 8자 전체 풀이 / 대운 60년 흐름 / 질문 무제한 (3일) / 48h 이내 답변
      - 좌측 상단 회전 인장 `推` (rotate -8deg)
      - 골드 박스 그림자 glow
  - **환불 보증** (dashed gold border):
    - `· 不滿足 · 全額 還拂 ·` — 만족하지 못하셨다면 전액 환불해드립니다

### 10 FAQ
- 5문항 아코디언, 첫 번째 기본 열림:
  1. 태어난 시각을 모르면 상담이 어려운가요?
  2. 음력만 알고 있는데 괜찮나요?
  3. 카톡으로만 진행되나요? 전화 상담은 안 되나요?
  4. 풀이는 언제 도착하나요?
  5. 같은 질문을 여러 번 해도 되나요?
- 각 항목 좌측에 brush `問` (gold-bright glow), 답변 영역 좌측에 `答` (gold-soft)
- 토글 아이콘 `⌄` 0.3s 회전

### 11 Final CTA
- **Components:**
  - 배경에 `<SunRadiant>` SVG (320px, 36개 광선 + golden core)
  - 큰 한자 `問命` (52px brush gold-bright)
  - 부제 `· 명을 묻다 ·`
  - 메인 카피: "당신의 흐름은 / 이미 정해진 것이 아닙니다."
  - 보조: "어떻게 흐를지 / **지금** 함께 헤아립시다."
  - KakaoButton sub "· 첫 상담 50% 마감 임박"
  - 하단 mono: `· 24h 이내 답변 ·`
  - Footer legal (작은 텍스트)

### Sticky 카카오 바
- iframe 하단 fixed (iOS 홈인디케이터 위)
- 400px 스크롤 후 등장 (transform translateY(120%) → 0)
- 배경 `rgba(13,6,8,0.92)` + backdrop-blur(14px) + 골드 보더
- 좌측: "첫 상담 50%" (gold-bright bold) + "지금만 — ₩19,900부터"
- 우측: 카카오 노란 둥근 버튼 + 채팅 아이콘 + "상담받기"

---

## Interactions & Behavior

### 카카오 라우팅
- 모든 카카오 CTA는 `KAKAO_URL` 상수(현재 placeholder `https://pf.kakao.com/_xxxxxx`)를 `window.open(url, '_blank')`로 열기. **실제 카카오톡 채널 URL로 교체 필요**.

### FAQ
- 클릭 시 `open` state toggle
- 화살표 `transform: rotate(180deg)`, transition 0.3s

### Sticky 카카오 바
- `scrollTop > 400`에서 transform 슬라이드업
- transition `0.35s cubic-bezier(0.2, 0.8, 0.2, 1)`

### Fade Up
- 모든 주요 블록 `animation: fadeUp 0.8s ease-out both`
- `from { opacity: 0; transform: translateY(14px); }`
- delay variants `.ink-fade-d1` … `.ink-fade-d5` (0.08s … 0.56s)

### Twinkle (별)
- `.starfield::after`에 `animation: twinkle 4.5s ease-in-out infinite alternate`

### Drift (달, 천천히 위아래)
- `animation: drift 6s ease-in-out infinite alternate`

### Hover
- `.btn-kakao:hover { filter: brightness(0.97); }`

### 반응형
- 모바일 기준 폭 360–402px. 디자인은 iOS 402px 프레임 안에 만들어졌으나 실제 사이트는 자유 너비(모바일 우선).
- 데스크탑은 별도 가이드 없음 — 중앙 정렬 + max-width ~440px로 휴대폰처럼 보이게 하거나, 별도 데스크탑 디자인 필요.

---

## State Management

매우 단순:
- `faqOpen[i]` — FAQ 아코디언 상태
- `stickyVisible` — sticky 바 표시 (scrollTop 기반 derived)

대부분 정적. 입력 폼/사주 계산 화면(`InputScreen`, `ResultScreen`)은 별도 데모 모드용이며 **이번 랜딩 핸드오프 범위에는 포함되지 않습니다** (참고용으로만 source에 포함됨).

---

## Design Tokens

CSS variables in `styles.css` (`:root`):

### Colors
```css
/* Hanji (한지) — 보조 톤 */
--paper: #e8dfd0;
--paper-warm: #ede4d4;
--paper-deep: #d4c8af;
--ink: #14110d;
--ink-soft: #3a2a1a;
--brown: #7d5a3a;

/* Night — Wine / Cosmos 메인 */
--night: #0d0608;
--wine: #3a0d18;
--wine-2: #4a0e1a;
--wine-deep: #2a0a12;
--wine-soft: #5a1822;
--night-edge: #050204;

--bone: #f0e6d2;            /* 본문 텍스트 */
--bone-soft: rgba(240,230,210,0.72);
--bone-faint: rgba(240,230,210,0.40);

--gold: #d4af6a;            /* 액센트 */
--gold-bright: #e8c878;     /* 강조 */
--gold-soft: #a88b53;
--gold-pale: rgba(212,175,106,0.18);
--gold-line: rgba(212,175,106,0.4);

--seal: #8b1e1e;            /* 인장 적색 */

/* Kakao 브랜드 */
--kakao: #FEE500;
--kakao-text: #191919;

/* 오행 */
--o-wood:  #4a6b3a;
--o-fire:  #8b1e1e;
--o-earth: #a8896b;
--o-metal: #c9b896;
--o-water: #1f2937;
```

### Typography
Google Fonts:
- **Noto Serif KR** (300/400/500/600/700/900) — 본문 기본
- **Nanum Myeongjo** (400/700/800) — 본문 강조용
- **Gowun Batang** (400/700) — 가끔
- **Ma Shan Zheng** — 한자 brush 헤딩
- **JetBrains Mono** (400/500) — 영문/숫자 라벨

스케일 (자주 쓰는 값):
- Hanja 메인 헤딩: 52–96px
- 메인 카피: 22–28px / weight 700 / line-height 1.5 / letter-spacing 0.04em
- 부 카피: 12–14px / line-height 1.85–2 / letter-spacing 0.04–0.2em
- 작은 라벨/mono: 9–11px / letter-spacing 0.25–0.4em
- 미니 텍스트: 8.5–9px / letter-spacing 0.3em+

모든 한국어 본문은 `text-wrap: pretty` 사용.

### Spacing
- 섹션 padding: `70–90px top / 24–26px sides / 60–70px bottom`
- 카드 padding: `18–22px`
- 그리드 gap: 카드 간 12–14px, stats grid 8px

### Border / Shadow
- 둥근 모서리 거의 없음 (날카로운 정통 느낌). Kakao 버튼만 약간(10–14px).
- 보더: 1px solid `var(--gold-pale)` 또는 `var(--gold-line)`
- 그림자는 거의 안 씀. featured tier만 `0 0 24px rgba(212,175,106,0.15)` 글로우
- 텍스트 글로우: `text-shadow: 0 0 18px rgba(240,230,210,0.35), 0 0 2px rgba(240,230,210,0.6)` (`.glow-bone`), gold도 동일 패턴

### Hanji 텍스처
- SVG `feTurbulence` 노이즈를 data-URI로 background-image. multiply blend mode.
- 모바일에서 무겁다면 `image-set()` 으로 PNG 폴백 권장.

### 골드 프레임 ornaments
- `.gold-frame` — 1px gold border + 좌상/우하 코너에 10px L자 마크 (pseudo)
- `.gold-rule` — 가로 그라디언트 라인 (양끝 fade)
- `.gold-diamond` — 6px 회전 사각형
- `.ornament` — line · lozenge · line 가운데 정렬 장식

### 인장 (`.seal`)
- 적색 정사각, 내부에 흰 보더 inset, Ma Shan Zheng 폰트, 미세 노이즈 overlay (mix-blend-mode: screen)
- 회전 -6 ~ -8deg

---

## Assets

**SVG 일러스트 (현재 코드 내 인라인 SVG, placeholder 수준)**
- `<MountainScene>` — 다층 안개 산 + 등불
- `<GalaxyScene>` — 나선은하 + 골드 더스트
- `<SmokeBand>` — 연무 밴드
- `<SunRadiant>` — 방사선 태양
- `<LunarMansionChart>` — 28수 천문도
- `<AlmanacPage>` — 만세력 페이지 mock
- `<BigLandscape>` — 동양 산수도 (정자/소나무/학자/달)

이 SVG들은 **placeholder**이며 실제 출시 시 일러스트레이터/사진으로 교체 권장. 위치와 분위기는 그대로 유지.

**아이콘**
- 카카오톡 말풍선: 인라인 SVG mask (CSS variable로 색 컨트롤)
- 화살표(›, ⌄): 텍스트 그대로

**필요한 외부 자산 (없음)**: 모든 시각 요소가 SVG + CSS로 구성됨. 한글/한자 폰트는 Google Fonts.

---

## 카피 (Final)

브랜드 톤 가이드:
- ✅ 권장: "태어난 순간의 네 기둥", "원국 기록", "오행의 기울기", "십성의 흐름", "성격·관계·재물·애정의 반복 흐름"
- ❌ 금지: "궁중 비법", "비밀 전수", "100% 적중", "운명을 바꾼다", "불운을 막는다", "상위 1%", "소름 돋게 맞는다"

전체 카피는 위 각 섹션 설명 안에 명시되어 있습니다.

---

## Files

`source/` 폴더:
- `index.html` — 엔트리. Google Fonts + React/Babel CDN + 모든 script 로드
- `styles.css` — 디자인 토큰 + 텍스처 + 유틸리티 클래스
- `app.jsx` — 메인 LandingPage 컴포넌트 + Tweaks 패널
- `landing-1.jsx` — Hero / Cosmos / Problem / Heritage / Precision + 공통 atoms (`VerticalHanja`, `GoldDivider`, `SectionLabel`, `KakaoButton`, `Ornament`)
- `landing-2.jsx` — Concept / How / ChatBubble
- `landing-3.jsx` — Reviews / Pricing / FAQ / FinalCTA / StickyKakaoBar
- `scenery.jsx` — 모든 SVG scene 컴포넌트
- (기타 참고용) `saju.js`, `ohaeng.jsx`, `screens.jsx`, `result-parts.jsx`, `ios-frame.jsx`, `tweaks-panel.jsx` — 명식 계산 데모 (랜딩 외 부분)

`KAKAO_URL` 상수: `landing-1.jsx` 상단. **실제 채널 URL로 교체 필요.**

---

## 구현 체크리스트

- [ ] 폰트 5종 로드 (Noto Serif KR / Nanum Myeongjo / Gowun Batang / Ma Shan Zheng / JetBrains Mono)
- [ ] CSS 변수로 디자인 토큰 정의
- [ ] Hanji 텍스처 SVG noise 적용 (혹은 가벼운 PNG 폴백)
- [ ] 11개 섹션 alternate (wine / cosmos)
- [ ] SVG 일러스트 7종 (또는 실제 일러스트로 교체)
- [ ] FAQ 아코디언 인터랙션
- [ ] Sticky 카톡 바 (scrollTop 400 트리거)
- [ ] 모든 카카오 CTA를 실 채널 URL로 연결
- [ ] 모바일 360–414px에서 가독성 확인
- [ ] 한자 글로우 / 별 twinkle / 달 drift 애니메이션
- [ ] `text-wrap: pretty` 한글 본문 전체 적용
