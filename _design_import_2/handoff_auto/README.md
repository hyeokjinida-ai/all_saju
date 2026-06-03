# 명운록(命運錄) 自動 — 자동결제 사주 서비스 디자인 핸드오프 (Next.js 15 + Tailwind)

## 개요
정통 만세력 + AI가 풀어주는 한국식 사주 리포트를 **온라인에서 결제하고 즉시 받아보는** 서비스. 다크 와인 + 골드 + 한국 명조체의 신비롭고 고급스러운 톤.

이 패키지는 발주서(부록 A·C) 구조를 반영한 **동작 프로토타입**입니다. `source/`의 HTML/JSX는 룩·인터랙션·흐름을 보여주는 레퍼런스이며 그대로 프로덕션 코드가 아닙니다. 작업의 본질은 이 디자인을 **Next.js 15 (App Router) + Tailwind + 토스페이먼츠 + Supabase** 스택에서 재구현하는 것입니다.

프로토타입 메인 진입: **`source/auto.html`**

## 전환 퍼널 (고정)
```
① 상페(긴 세로 스크롤 세일즈, 一~十二 한자 마커 14섹션)
   ↓ CTA "내 사주 보러 가기"
② 풀스크린 단계별 위저드 (名→生→時→性→曆→惑→확인, 7단계)
   ↓ "결제하러 가기"
③ 토스페이먼츠 결제 위젯 (iframe, 디자인 변경 불가 — 프로토타입은 placeholder)
   ↓ 결제 성공
④ AI 결과지 (사주 명식표 + AI 마크다운 해석)
```
프로토타입에서 ③은 `CheckoutStep`(wizard.jsx)의 점선 placeholder로 자리만 잡았습니다. 실제로는 토스 결제위젯 iframe을 넣으세요.

## 사주 입력 위저드 — 필드 스키마 (고정, 절대 변경 금지)
풀스크린 7단계. 한 화면에 한 항목, 하단 골드 "다음" 버튼, 상단 진행률 점(●○)+N/7, fade 전환, 검증 전 다음 비활성, 뒤로 가도 값 유지.

| 단계 | 한자 | 필드 | 타입 | 필수 | 비고 |
|---|---|---|---|---|---|
| 1 | 名 | name | text | 선택 | placeholder "홍길동", 건너뛰기 가능 |
| 2 | 生 | birthDate | date | **필수** | |
| 3 | 時 | birthTime / timeUnknown | time + check | 선택 | "시각 몰라요" 체크 시 비활성 |
| 4 | 性 | gender | 2지선다(乾남성/坤여성) | 필수 | 선택 시 자동 진행 |
| 5 | 曆 | calendar | 2지선다(陽양력/陰음력) | 필수 | 선택 시 자동 진행 |
| 6 | 惑 | concerns | 칩 복수선택 | 선택 | 연애·결혼·직장·재물·건강·학업·이직·사업 |
| 7 | 覽 | (확인) | — | — | 입력요약+각줄 수정링크 + 4기둥 블러 미리보기("결제 후 전체 공개" 뱃지) |

최종 CTA: 로그인 시 "결제하러 가기" / 비로그인 "로그인하고 결제하기" (분기 유지).

### 백엔드 연결 (디자인 불변, 연결만 교체)
최종 결제 진입 시 아래 JSON으로 `POST /api/orders/create` → `orderId` → `/checkout/[orderId]`. **필드명/타입 변경 금지**:
```json
{
  "productId": "basic | premium", "name": "", "birthDate": "YYYY-MM-DD",
  "birthTime": "HH:mm | null", "timeUnknown": false,
  "gender": "male | female", "calendar": "solar | lunar",
  "concerns": ["연애","재물"]
}
```
(프로토타입은 한글 '남성/여성','양력/음력'을 쓰므로 이식 시 male/female·solar/lunar로 매핑)

## 결과지 (고정)
- **명식표**: 時/日/月/年 4기둥 × 천간·지지, 오행 색점 (`AutoFourPillars` in auto-result.jsx)
- **오행 분포** 막대 (`AutoOhaeng`)
- **AI 마크다운 해석**: 프로토타입은 `window.claude.complete`(haiku, 1024토큰)로 생성. **프로덕션은 서버측 LLM 결과(마크다운)를 렌더만**. 긴글 타이포는 `.md-report`(service-web.css 참고) 또는 동등 스타일 유지. ⚠️ 토큰 한계로 장 많으면 뒷부분 잘림 → 더 큰 모델/분할호출 권장.
- 상단 메타: 상품명 · LLM 모델 · 생성일시

---

## 🎨 디자인 토큰 → Tailwind 매핑

`tailwind.config.js`:
```js
module.exports = {
  theme: { extend: {
    colors: {
      wine:'#3a0d18', 'wine-2':'#4a0e1a', 'wine-deep':'#2a0a12', 'wine-soft':'#5a1822',
      night:'#0d0608', 'night-2':'#1a0810', 'night-edge':'#050204',
      bone:'#f0e6d2', 'bone-soft':'rgba(240,230,210,0.72)', 'bone-faint':'rgba(240,230,210,0.40)',
      gold:'#d4af6a', 'gold-bright':'#e8c878', 'gold-soft':'#a88b53',
      seal:'#8b1e1e',
      'o-wood':'#4a6b3a','o-fire':'#8b1e1e','o-earth':'#a8896b','o-metal':'#c9b896','o-water':'#1f2937',
      kakao:'#FEE500','kakao-text':'#191919',
    },
    fontFamily: {
      myeongjo:['Nanum Myeongjo','Noto Serif KR','serif'],
      serifkr:['Noto Serif KR','serif'],
      brush:['Ma Shan Zheng','Nanum Myeongjo','serif'],
      mono:['JetBrains Mono','ui-monospace','monospace'],
    },
  }},
};
```
- `--gold-line` = `gold/40`, `--gold-pale` = `gold/[0.18]`
- 제목/본문 `font-myeongjo`·`font-serifkr`, 한자라벨 `font-brush`, 숫자/메타 `font-mono`
- 자간 tracking 0.04em~ (고급감). 한글 본문 `text-wrap: pretty`.
- 폰트 로드: Nanum Myeongjo(400/700/800) · Noto Serif KR(400/500/600/700) · Ma Shan Zheng · JetBrains Mono(400/500)

---

## 상페 14섹션 (一~十二 한자 마커 / scene-wine ↔ scene-cosmos 교차)
| # | 마커 | 섹션 | 컴포넌트 |
|---|---|---|---|
| 1 | — | Hero (갤럭시 + 헤드라인 + CTA) | HeroSection (landing-1) |
| 2 | 一傳 | 천 년의 계보 (산수도 + 命理系譜 + 만세력) | HeritageSection (landing-1) |
| 3 | 二生 | 八字 (갤럭시 + 네 기둥 설명) | CosmosSection (landing-1) |
| 4 | 三異 | 자동 사주의 한계 (60개 vs 8글자) | LimitLandingSection (landing-5) |
| 5 | 四惑 | 고민 4가지 (業緣財時) | ProblemSection (landing-1) |
| 6 | 五命 | 명식 8자판 | ConceptSection (landing-2) |
| 7 | 六精 | 정밀 산출 (28수 천문도 + 분석원리 5단계 命行星合運 + 검증지표 + Pipeline) | PrecisionSection (landing-1) |
| 8 | 七章 | 다섯 개의 장 (Chapter 1~5) | ChaptersLandingSection (landing-5) |
| 9 | 八行 | 진행 4단계(상품→입력→토스→AI 즉시) | HowItWorksSection (landing-2) |
| 10 | 九覽 | 내 기록 미리보기 (PDF 목업 PART 1~4) | PreviewLandingSection (landing-5) |
| 11 | 十證 | 후기 (4.96★) | ReviewsSection (landing-3) |
| 12 | 十一受 | 가격/상품 (簡命/深命) | PricingSection (landing-3) |
| 13 | 十二問 | FAQ 아코디언 | FAQSection (landing-3) |
| 14 | 問命 | 마무리 CTA (태양광) | FinalCTASection (landing-3) |
| — | — | Sticky CTA 바 (스크롤 400px 후) | StickyKakaoBar (landing-3) |

### ⚙️ 모드 분기 (중요)
공유 랜딩 컴포넌트는 전역 플래그로 두 모드를 분기합니다:
- `window.__autoMode = true` (auto.html) → CTA가 **골드 "내 사주 바로 보기"**, 八行이 **자동/결제 4단계**, 카톡 챗 미리보기 숨김
- 미설정 (index.html) → CTA가 **노란 "카톡으로 상담받기"** → apply.html, 八行 카톡 3단계
- CTA 동작: `onKakao()` → `window.__autoFlowStart`가 있으면 위저드 시작, 없으면 신청/카톡

Next.js 이식 시: 이 분기를 **라우트/프롭**으로 대체하세요 (예: 결제형 페이지 컴포넌트는 `mode="auto"` 프롭 전달).

---

## 인터랙션
- **상페 스크롤 fade-up**: `.svc-fade` / `fadeUp` 애니메이션, 섹션마다 등장
- **위저드**: step state(0~6), 검증 통과 시 다음 활성, Enter 키 진행, 성별/달력 선택 시 자동 진행(setTimeout 220ms), 뒤로 값 유지
- **4기둥 블러 미리보기**: `.svc-blur`(filter blur) + 골드 "결제 후 전체 공개" 뱃지
- **토스 결제**: placeholder → 실제 위젯 iframe 교체
- **AI 생성**: 산출 애니메이션(28수 회전) → 결과 렌더. 프로덕션은 서버 생성 후 결과 페이지.

---

## source/ 파일
| 파일 | 내용 |
|---|---|
| `auto.html` | 진입(폰트·스크립트 로드, `window.__autoMode=true`) |
| `styles.css` | 디자인 토큰(:root) + scene-wine/cosmos 배경·텍스처·애니메이션 |
| `saju.js` | 만세력 계산(데모 근사 — 프로덕션은 정밀 만세력으로 교체) |
| `ohaeng.jsx` | 오행 색/한자 |
| `scenery.jsx` | SVG 시너리(갤럭시/28수 천문도/산수/태양/만세력 페이지) |
| `landing-1.jsx` | Hero/Heritage/Cosmos/Problem/Precision + 공통 atoms(SectionLabel,GoldDivider,KakaoButton,onKakao) |
| `landing-2.jsx` | Concept/HowItWorks(八行, 모드분기)/ChatBubble |
| `landing-3.jsx` | Reviews/Pricing/FAQ/FinalCTA/StickyKakaoBar |
| `landing-5.jsx` | Limit(三異)/Chapters(七章)/Preview(九覽) |
| `wizard.jsx` | **풀스크린 7단계 위저드 + 확인(4기둥 블러) + 토스 결제 자리(CheckoutStep)** |
| `auto-screens.jsx` | AutoComputing(산출 애니메이션) 등 |
| `auto-result.jsx` | AI 결과지(명식판 AutoFourPillars + 오행 AutoOhaeng + AIReading) |
| `auto-app.jsx` | 상태머신: landing→wizard→checkout→computing→result + 상품 정의 |

## 카피 가이드 (PG 심사)
- ✗ 100% 적중 / 미래 예언 / 운명을 바꾼다 / 점·점술 / 부적·굿
- ✓ 시기별 흐름 참고 / 성향 분석 / 사주 분석 리포트
- 감성 헤드라인 OK("운명을 기록하다") — 단정·보장 금지
- 면책 1줄(위저드 결제/푸터): "본 서비스는 자기 이해를 돕는 참고 자료이며, 의학적·법률적·재정적 결정의 근거가 아닙니다."
- 푸터 사업자 정보(상호·대표·사업자번호·통신판매번호·주소·연락처)

## 구현 체크리스트
- [ ] tailwind.config 토큰/폰트 등록 + 폰트 4종 로드
- [ ] 상페 14섹션(一~十二 마커, scene-wine/cosmos 교차, fade-up)
- [ ] 풀스크린 7단계 위저드(필드 스키마 고정, 진행률, 검증, 자동진행, 값 유지)
- [ ] 확인단계 4기둥 블러 미리보기 + "결제 후 공개" 뱃지
- [ ] 토스페이먼츠 위젯 연결(CheckoutStep 자리)
- [ ] 결과지: 명식표 + AI 마크다운(서버 생성) + 챕터 네비
- [ ] orders/create JSON 스키마 그대로
- [ ] PG 카피 + 면책 + 사업자정보
- [ ] mobile-first (max-w-600 중앙 컬럼)
