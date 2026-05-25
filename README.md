# 사주 사이트 보일러플레이트

> Next.js 15 + Supabase + 토스페이먼츠로 만든 **결제까지 동작하는** 사주 사이트 보일러플레이트.
> 클론 → 환경변수 → 1번 배포 = 본인 사주 사이트 완성.

## 무엇을 얻나요?

- ✅ 토스페이먼츠 위젯 v2 결제 플로우 (서버 confirm + 금액 위변조 검증)
- ✅ Supabase 기반 회원/주문/결과 데이터 모델 + RLS
- ✅ 게스트 결제 (이메일만으로 결제 가능, 추후 회원가입 시 자동 연결)
- ✅ AI 사주 해석 (OpenAI / Anthropic / Gemini 스위치)
- ✅ 마이페이지, 관리자 결제 내역, 법적 페이지(약관/개인정보/환불/사업자정보)
- ✅ shadcn/ui 기반 깔끔한 UI

## 시스템 아키텍처

```text
                          ┌────────────────────┐
                          │      Browser       │
                          │  (Next.js 페이지)   │
                          └─────────┬──────────┘
                                    │
                ┌───────────────────┼───────────────────┐
                ▼                   ▼                   ▼
        ┌──────────────┐   ┌──────────────┐   ┌────────────────┐
        │  Supabase    │   │   토스       │   │  luckyloveme   │
        │  (DB+Auth)   │   │  Payments    │   │  사주 API      │
        └──────────────┘   └──────────────┘   └────────────────┘
                                                       │
                                                       ▼
                                              ┌────────────────┐
                                              │  LLM (1 of 3)  │
                                              │  Anthropic /   │
                                              │  OpenAI /      │
                                              │  Gemini        │
                                              └────────────────┘
```

외부 의존성 4개 — Supabase, 토스, luckyloveme, LLM (3 provider 중 택1). 환경변수만 채우면 모두 동작.

## 수강생 가이드 — Fork 부터 운영까지

```text
┌─────────────────────────────────────────────────────────────────┐
│  1. Fork                                                        │
│     GitHub: cheese-mom/saju-boilerplate  ──▶  Fork              │
│                                                                 │
│  2. Clone                                                       │
│     git clone https://github.com/<본인계정>/saju-boilerplate    │
│     cd saju-boilerplate                                         │
│                                                                 │
│  3. 의존성 설치                                                 │
│     pnpm install                                                │
│                                                                 │
│  4. .env.local 채우기                                           │
│     cp .env.example .env.local                                  │
│     # 편집기로 열어서 값 입력                                    │
│     필수: NEXT_PUBLIC_SUPABASE_URL/ANON_KEY,                    │
│          SUPABASE_SERVICE_ROLE_KEY,                             │
│          NEXT_PUBLIC_TOSS_CLIENT_KEY (테스트 기본값 OK),         │
│          TOSS_SECRET_KEY (테스트 기본값 OK),                     │
│          ANTHROPIC_API_KEY (또는 OPENAI / GEMINI 키 1개)         │
│     권장: SAJU_API_KEY (luckyloveme 발급),                       │
│          ADMIN_PASSWORD (본인 임의)                              │
│                                                                 │
│  5. Supabase 마이그레이션 + 시드                                │
│     npx supabase link --project-ref <프로젝트 ref>              │
│     npx supabase db push                                        │
│     pnpm seed:products                                          │
│                                                                 │
│  6. 로컬 확인                                                   │
│     pnpm dev                                                    │
│     ▶ http://localhost:3000                                     │
│     ▶ /demo 로 명식 + 해석 동작 확인                            │
│     ▶ /admin/login 비밀번호 입력 → /admin/orders                │
│                                                                 │
│  7. 사이트 정보 본인 것으로 교체                                │
│     src/config/site.ts                                          │
│       siteConfig.name, businessInfo.* 모두 수정                  │
│       → 푸터 / 약관 / 개인정보처리방침 자동 반영                  │
│                                                                 │
│  8. Vercel 배포                                                 │
│     vercel.com → Import → 본인 GitHub repo                       │
│     Settings → Environment Variables → .env.local 값 그대로     │
│     Deploy                                                      │
│     Toss 콘솔: 콜백 URL 등록                                     │
│       성공: https://<도메인>/checkout/success                    │
│       실패: https://<도메인>/checkout/fail                       │
│                                                                 │
│  9. 이후 수정 사이클                                            │
│     git add <변경 파일>                                          │
│     git commit -m "메시지"                                       │
│     git push                                                    │
│     ▶ Vercel 자동 재배포 (1~2분)                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Fork vs Clone**

```text
Fork  = GitHub 서버에서 내 카피본 생성 (Vercel 연동·내 commit·내 도메인 가능)
Clone = 단순 로컬 다운로드 (원본 repo 에 push 권한 없으면 막다른 길)
수강생은 반드시 Fork → 그 다음 본인 fork 를 Clone.
```

## 데모 모드 (.env 비워두고 둘러보기)

`.env.local` 의 환경변수 키 조합에 따라 어떤 기능이 동작하는지 매트릭스:

```text
                    SUPABASE_*   TOSS_*    SAJU_API_KEY   LLM 키 1개
                    ─────────────────────────────────────────────────
랜딩 / 상품              ─          ─            ─            ─
/demo 명식               ─          ─            ●            ─
/demo AI 해석            ─          ─            ●            ●
/admin/orders            ─          ─            ─            ─
결제 시작                ●          ●            ─            ─
결제 confirm + 결과지     ●          ●            ●            ●
마이페이지                ●          ─            ─            ─

● = 필수,  ─ = 없어도 동작
```

| 기능 | 데모 (env 빈 상태) | 운영 (env 채움) |
|---|---|---|
| 랜딩 / 상품 리스트 / 상품 상세 | ✅ seed 데이터 fallback | ✅ Supabase 실데이터 |
| `/demo` 페이지 (명식 + 풀 텍스트) | ✅ SAJU_API_KEY 있으면 | ✅ |
| `/demo` 의 AI 해석 | ⚠️ LLM 키 있어야 표시 | ✅ |
| Toss 위젯 v2 결제 시작 | ⚠️ Supabase 필요 | ✅ |
| 결과지 생성 `/results/[id]` | ❌ Supabase 필요 | ✅ |
| 마이페이지 / 후기 작성 | ❌ Supabase 필요 | ✅ |
| `/admin/orders` | ✅ 빈 목록 + 안내 배너 | ✅ 실 결제 내역 |
| `/api/generate-manseryeok` | SAJU_API_KEY 있으면 ✅ | ✅ |
| `/api/orders/create` | ❌ Supabase 필요 | ✅ |

**/demo 페이지** — DB 없이 명식 → 결과지 흐름을 확인하는 강의용 페이지. URL 쿼리로 입력 변경:
```
http://localhost:3000/demo?y=1990&m=5&d=15&h=14&min=30&cal=양력&g=male
```

명식 API 응답 시간, LLM 키 상태가 배지로 표시되고, MyeongsikTable + ResultBody (실제 결과지와 동일 컴포넌트) 로 렌더됩니다.

## 사이트 맵

```text
/                         랜딩 (Hero / HowItWorks / ProductLineup / CTA)
├─ /products              상품 리스트
│  └─ /products/[slug]    상품 상세 + SajuForm
├─ /checkout/[orderId]    Toss 위젯 v2
├─ /checkout/success      confirm → /results/[id] 리다이렉트
├─ /checkout/fail         실패 안내
├─ /results/[resultId]    결과지 (명식표 + 마크다운)
├─ /demo                  DB 없이 명식 + 해석 미리보기 (강의용)
│
├─ (auth)                 Supabase Auth
│  ├─ /login              이메일/비밀번호 로그인
│  ├─ /signup             회원가입
│  └─ /reset              비밀번호 재설정
│
├─ /mypage                마이페이지 홈
│  ├─ /mypage/orders      결제 내역
│  ├─ /mypage/orders/[orderId]/review   후기 작성
│  └─ /mypage/reviews     내 후기 목록
│
├─ /admin                 어드민 홈 (ADMIN_PASSWORD)
│  ├─ /admin/login        비밀번호 입력
│  ├─ /admin/orders       결제 내역
│  └─ /admin/logout       쿠키 삭제
│
├─ /legal/terms           이용약관
├─ /legal/privacy         개인정보처리방침
└─ /legal/refund-policy   환불정책
```

## 결제 → 결과지 흐름

```text
사용자                Next.js                 토스           Supabase      luckyloveme    LLM
  │                      │                      │              │              │           │
  ├─ 상품 상세 진입 ────▶│                      │              │              │           │
  │   /products/[slug]   │                      │              │              │           │
  │◀─ 사주 입력 폼 ──────│                      │              │              │           │
  │                      │                      │              │              │           │
  ├─ 폼 제출 ───────────▶│                      │              │              │           │
  │                      ├─ POST /api/orders/create ──────────▶│              │           │
  │                      │◀─── orderId, amount ────────────────│              │           │
  │                      │                      │              │              │           │
  │◀─ /checkout/[id] ───│                      │              │              │           │
  │   (Toss 위젯 v2)     │                      │              │              │           │
  ├─ 결제 ──────────────────────────────────▶│              │              │           │
  │◀─ /checkout/success?paymentKey=... ───────│              │              │           │
  │                      │                      │              │              │           │
  ├─ 자동 호출 ─────────▶│                      │              │              │           │
  │                      ├─ POST /api/orders/confirm ──────────────────────────▶            │
  │                      │   1) Toss confirm + 금액 검증       │              │           │
  │                      │   2) orders.status = "paid"         │              │           │
  │                      │   3) luckyloveme 호출 ─────────────────────────────▶            │
  │                      │   4) 만세력 텍스트 + 4기둥 변환     │◀────────────────           │
  │                      │   5) LLM 해석 ──────────────────────────────────────────────▶  │
  │                      │   6) saju_results insert            │◀──── 마크다운 ───────────  │
  │                      │◀─── resultId ────────                │              │           │
  │                      │                      │              │              │           │
  │◀─ /results/[resultId] ──────────────────│              │              │           │
  │   (명식표 + 마크다운 해석)                                                              │
```

## 인증 모델

두 가지 인증이 분리되어 있습니다.

```text
┌───────────────────────────────────────────────────────────────────┐
│ 사용자 영역 (/mypage, /products, /checkout, /results, ...)        │
│                                                                   │
│   middleware.ts ──▶ supabase/middleware.ts                        │
│                       └ /mypage 비로그인 → /login                 │
│                                                                   │
│   Supabase Auth (이메일·비밀번호 / OAuth)                          │
│   ─ profiles 테이블 (auth.users 연결)                              │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ 관리자 영역 (/admin/*)                                            │
│                                                                   │
│   각 페이지 상단: await requireAdminPassword(redirectFrom)        │
│                       └ 쿠키 admin_session != ADMIN_PASSWORD      │
│                             → /admin/login 리다이렉트              │
│                                                                   │
│   .env.local 의 ADMIN_PASSWORD 한 줄만 설정하면 됨                 │
│   (회원가입 / pnpm create:admin 불필요)                            │
└───────────────────────────────────────────────────────────────────┘
```

middleware 는 `/mypage` 만 검사하고 `/admin` 은 통과시킵니다. `/admin` 은 페이지 단위에서 `requireAdminPassword()` 로 보호됩니다.

## 빠른 시작

### 1. 사전 준비물

| 항목 | 비고 |
|---|---|
| Node.js 22+ | pnpm 권장 |
| Supabase 계정 | 무료 플랜 OK |
| 토스페이먼츠 가입 | 테스트 키는 즉시 발급, 라이브 키는 PG 심사 필요 |
| LLM API 키 | OpenAI / Anthropic / Gemini 중 **하나면 됨** |
| 만세력 API | 선택. 없으면 mock 모드로 데모 동작 |

### 2. 로컬 실행

```bash
git clone <this-repo> saju-site && cd saju-site
pnpm install
cp .env.example .env.local
# .env.local 열어서 채우기 (아래 § 환경변수 참고)
pnpm dev
```

### 3. Supabase 세팅

1. https://supabase.com 에서 새 프로젝트 생성
2. **Settings → API** 에서 `URL`, `anon`, `service_role` 키 복사 → `.env.local`
3. 마이그레이션 적용 (택1):
   - **CLI**: `npx supabase link --project-ref <ref> && npx supabase db push`
   - **수동**: Supabase Studio → SQL Editor 에서 `supabase/migrations/` 의 SQL 3개를 차례로 실행
4. 상품 시드: `pnpm seed:products`
5. 관리자 지정: 회원가입 후 `pnpm create:admin <your-email>`

### 4. 토스페이먼츠

1. https://developers.tosspayments.com 에서 가입
2. **테스트 키**는 `.env.example` 의 기본값(`test_gck_docs_*` / `test_gsk_docs_*`) 그대로 두면 즉시 결제 테스트 가능 — **회원가입·사업자번호 없이도** 작동
   - 가이드: [회원가입/사업자번호 없이 결제 테스트하기](https://docs.tosspayments.com/blog/how-to-test-toss-payments#회원가입-사업자번호-없이-결제-테스트하기)
3. 실 결제용 라이브 키는 PG 심사 통과 후 발급 — **[PG_심사_가이드.md](./PG_심사_가이드.md)** 참고
4. 토스 콘솔에서 콜백 URL 등록:
   - 성공: `https://<your-domain>/checkout/success`
   - 실패: `https://<your-domain>/checkout/fail`

**구현 위치**
- 위젯(클라): [`src/components/checkout/TossWidget.tsx`](./src/components/checkout/TossWidget.tsx) — Toss 위젯 v2 SDK
- 주문 생성: [`src/app/api/orders/create/route.ts`](./src/app/api/orders/create/route.ts)
- 서버 confirm + 금액 위변조 검증: [`src/app/api/orders/confirm/route.ts`](./src/app/api/orders/confirm/route.ts) + [`src/lib/toss/confirm.ts`](./src/lib/toss/confirm.ts)

**테스트 결제 카드** (실제 청구 안 됨)
- 토스 공식 테스트 카드: 4330-1234-1234-1234 / CVC 임의 / 유효기간 미래 / 비밀번호 앞 2자리 00

**연동 공식 가이드**: [결제위젯 v2 통합 가이드](https://docs.tosspayments.com/guides/v2/payment-widget/integration)

### 5. Vercel 배포

자세한 내용은 [DEPLOY.md](./DEPLOY.md) 참고.

요약: GitHub repo 연결 → 환경변수 입력 → Deploy.

## 환경변수

`.env.example` 참고. 핵심:

```bash
NEXT_PUBLIC_SITE_URL=                 # 배포 도메인 (로컬은 http://localhost:3000)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=            # 절대 클라이언트에 노출 금지
NEXT_PUBLIC_TOSS_CLIENT_KEY=
TOSS_SECRET_KEY=
LLM_PROVIDER=anthropic                # openai | anthropic | gemini
LLM_MODEL=claude-sonnet-4-6
ANTHROPIC_API_KEY=                    # 선택한 provider 키만 채우면 됨
SAJU_API_URL=https://luckyloveme.com/api/saju-full-analysis
SAJU_API_KEY=                         # 운세위키 API 발급키 (https://luckyloveme.com/api-service)
ADMIN_PASSWORD=                       # /admin 진입 비밀번호
```

## 사주 명식표 API (luckyloveme)

운세위키 사주 풀 분석 API를 그대로 붙여놓았습니다. 키 발급 → `.env.local` 에 넣으면 즉시 동작합니다.

- 발급: https://luckyloveme.com/api-service
- 가이드 (필수): [`./운세위키_API_가이드.md`](./운세위키_API_가이드.md)
- 어댑터: [`src/lib/saju/saju-api.ts`](./src/lib/saju/saju-api.ts)
- 라우트: [`src/app/api/generate-manseryeok/route.ts`](./src/app/api/generate-manseryeok/route.ts)
- 헤더: `X-SAJU-BOOK-API-KEY` + `User-Agent: SajuBookClient/1.0` (어댑터가 자동 처리)
- Rate Limit: 분당 500회 / 누적 6,000회 (어드민에서 누적 카운터 확인 가능)

**명식 생성 파이프라인** (결제 confirm 안에서 동일하게 호출됨)

```text
saju_inputs row
  ├─ birth_date "1990-05-15"
  ├─ birth_time "14:30"
  ├─ calendar   "solar"
  └─ gender     "male"
        │
        │  toBirthInfo()
        ▼
BirthInfo
  ├─ birthYear "1990"
  ├─ birthMonth "5"
  ├─ birthDay "15"
  ├─ birthHour "14"
  ├─ birthMinute "30"
  ├─ calendarType "양력"
  └─ gender "male"
        │
        │  fetchSajuAnalysis(birthInfo, [], { source })
        ▼
SajuAnalysisResponse (16종)
  ├─ ganji          ─────┐
  ├─ sipseong             │
  ├─ sinStrength          │
  ├─ daeun                ├─ formatSajuToManseryeok() ─▶ manseryeokText
  ├─ seun                 │                              (LLM 프롬프트용)
  ├─ ... (총 16개)        │
        │                 │
        │  ganjiToMyeongsik()
        ▼
Myeongsik (4기둥)
        │
        ├──▶ MyeongsikTable (UI)
        │
        └──▶ saju_results.myeongsik (JSONB 저장)

buildSajuPrompt({ myeongsik, manseryeokText, ... })
        │
        ▼
generateInterpretation({ system, user }) ─▶ LLM
        │
        ▼
saju_results.interpretation_md (마크다운)
```

**호출 예시**

```bash
curl -X POST http://localhost:3000/api/generate-manseryeok \
  -H "Content-Type: application/json" \
  -d '{
    "birthInfo": {
      "birthYear": "1990",
      "birthMonth": "5",
      "birthDay": "15",
      "birthHour": "14",
      "birthMinute": "30",
      "calendarType": "양력",
      "gender": "male"
    }
  }'
```

**응답**

```json
{ "status": "success", "manseryeok": "[명식 기본 정보]\n생년월일: ..." }
```

**TS 에서 직접 호출**

```ts
import { generateManseryeok } from "@/lib/saju/saju-api";

const text = await generateManseryeok({
  birthYear: "1990",
  birthMonth: "5",
  birthDay: "15",
  birthHour: "14",
  birthMinute: "30",
  calendarType: "양력",
  gender: "male",
});
// → LLM 프롬프트에 그대로 꽂으면 됩니다 (src/lib/saju/prompt.ts 참고)
```

**특징**
- 30초 타임아웃 + 5xx/네트워크 오류 시 최대 3회 재시도 (500ms → 1.5s → 3.5s 백오프)
- 4xx 는 즉시 실패 (입력 검증 오류)
- `fields: []` = 전체 분석 자동 요청. 일부만 필요하면 배열로 지정 (예: `["ganji", "sipseong"]`)
- 응답을 `formatSajuToManseryeok()` 가 LLM 프롬프트용 한국어 텍스트로 변환

**가능한 fields (16종)**
`ganji`, `sipseong`, `sinStrength`, `gyeokguk`, `gyeokgukYongsin`★, `twelveFortune`, `daeun`, `seun`, `weolun`, `guiin`, `hongyeom`, `dohwa`, `hwagae`, `sibisinsals`, `bigyeonGeobjae`, `hapchung`

★ `gyeokgukYongsin` (격국용신, 자평진전 체계) 은 `fields` 에 명시적으로 포함해야 반환됩니다. 전체 요청(`[]`) 시에는 15종만 반환.

**키가 없는 상태로 호출하면** `/api/generate-manseryeok` 는 503 을 반환합니다 — 데모 모드에서는 호출하지 마세요.

**401 에러가 떨어질 때**
- `Invalid B2B API key` → 키 오타/만료
- `Client account is deactivated` → 계정 비활성화 (관리자 문의)
- `Test API key expired on ...` → 테스트 키 만료
- `Daily test limit exceeded` → 일일 한도 초과 (다음 날 재시도)

자세한 에러 코드는 [`./운세위키_API_가이드.md`](./운세위키_API_가이드.md) §6 참고.

## AI 해석 (LLM)

결과지의 마크다운 해석을 만드는 LLM. **3개 provider 지원** — `.env.local` 의 `LLM_PROVIDER` 한 줄로 스위치.

| Provider | `LLM_PROVIDER` 값 | 필요한 키 | 예시 모델 (`LLM_MODEL`) |
|---|---|---|---|
| **Anthropic Claude** | `anthropic` (기본) | `ANTHROPIC_API_KEY` | `claude-sonnet-4-6` |
| **OpenAI** | `openai` | `OPENAI_API_KEY` | `gpt-4o`, `gpt-4o-mini` |
| **Google Gemini** | `gemini` | `GOOGLE_GENERATIVE_AI_API_KEY` | `gemini-1.5-pro`, `gemini-1.5-flash` |

선택한 provider 의 키만 채우면 됩니다. 안 쓰는 SDK 는 lazy import 라 init 비용 0.

**바꾸는 법** — `.env.local` 두 줄만:
```bash
LLM_PROVIDER=openai          # anthropic | openai | gemini
LLM_MODEL=gpt-4o             # 위 표의 모델명 중 하나
OPENAI_API_KEY=sk-...        # 해당 provider 키
```

**구현 위치**: [`src/lib/saju/llm.ts`](./src/lib/saju/llm.ts) — `generateInterpretation({system, user})` 한 함수가 provider 분기.

**프롬프트 위치**: [`src/lib/saju/prompt.ts`](./src/lib/saju/prompt.ts)
- `system`: 톤·원칙 공통 (단정적 운명론 금지 / 행동 조언으로 마무리 / 한국어 존댓말 / 마크다운)
- `user`: 상품 slug 별로 분량·포커스 다르게
  - `today-fortune` → 2-3문장
  - `basic-saju` → 600-900자
  - `love-saju` → 900-1200자
  - `premium-saju` → 1500-2000자

`saju-api.ts` 가 만든 16종 풀 명식 텍스트가 자동으로 `user` 프롬프트에 들어갑니다. provider 를 바꿔도 결과지 톤은 동일.

## 커스터마이징

| 바꾸고 싶은 것 | 파일 |
|---|---|
| 사이트 이름·설명·이메일 | `src/config/site.ts` |
| 사업자 정보 (법적 페이지에 노출) | `src/config/site.ts` `businessInfo` |
| 상품 라인업 (이름/가격/설명) | `src/config/products.seed.ts` 수정 → `pnpm seed:products` |
| 사주 해석 톤·분량 | `src/lib/saju/prompt.ts` |
| LLM provider 전환 | `.env` 의 `LLM_PROVIDER` (anthropic/openai/gemini) + 해당 키 |
| 만세력 API 연동 | `src/lib/saju/manseryeok.ts` `callExternalManseryeok` |
| 사주 풀 분석 API (luckyloveme) | `src/lib/saju/saju-api.ts` + `.env` 의 `SAJU_API_KEY` |
| 컬러 테마 | `src/app/globals.css` (HSL 변수) + `tailwind.config.ts` 팔레트 |
| 랜딩 카피 | `src/components/landing/Hero.tsx` |
| 디자인 시스템 가이드 | `DESIGN.md` (현재 Ollama 스타일 — 페이퍼 화이트 + pill geometry + flat). 다른 스타일로 갈아끼우려면 `npx getdesign@latest add <brand>` |

## 폴더 구조

```
src/
├── app/                # Next.js App Router 페이지 및 API
│   ├── (auth)/         # 로그인/회원가입/리셋
│   ├── products/       # 상품 리스트 + 상세
│   ├── checkout/       # 토스 위젯 + success/fail
│   ├── results/        # 결과지
│   ├── mypage/         # 마이페이지
│   ├── admin/          # 관리자 (ADMIN_PASSWORD 가드)
│   ├── demo/           # DB 없이 명식 + 해석 미리보기
│   ├── legal/          # 약관/개인정보/환불
│   └── api/            # 서버 라우트 핸들러
├── components/         # UI 컴포넌트 (shadcn 기반)
├── lib/                # supabase / toss / saju / env / admin-auth 헬퍼
├── config/             # 사이트 설정 + 상품 시드
└── types/              # DB / 도메인 타입
supabase/migrations/    # 초기 스키마 / RLS / 시드 / API usage
scripts/                # seed-products, create-admin
```

## 데이터 모델 & RLS

```text
┌─────────────────────────┐
│  auth.users  (Supabase) │
│  ─ id  (uuid, PK)        │
│  ─ email                │
└───────────┬─────────────┘
            │ 1:1 (trigger 자동 생성)
            ▼
┌─────────────────────────┐         ┌─────────────────────────┐
│   profiles              │         │   products              │
│   ─ id (PK = users.id)   │         │   ─ id (uuid, PK)        │
│   ─ display_name         │         │   ─ slug (unique)        │
│   ─ is_admin (bool)      │         │   ─ name                │
└───────────┬─────────────┘         │   ─ price                │
            │                       │   ─ description         │
            │ user_id (nullable)    │   ─ is_active            │
            │                       │   ─ display_order        │
            ▼                       └────────────┬────────────┘
┌─────────────────────────┐                      │
│   orders                │                      │
│   ─ id (uuid, PK)        │                      │
│   ─ order_id (Toss용)    │                      │
│   ─ user_id  ─────────── 둘 중 하나 not null    │
│   ─ guest_email ─────────                       │
│   ─ product_id  ─────────────────────────────────┘
│   ─ amount (서버에서만 결정)                     │
│   ─ status (pending|paid|failed)                │
│   ─ toss_payment_key (paid 시)                   │
└─────────┬───────────────┘
          │ 1:1
          ├───────────────────────┬──────────────────────┐
          ▼                       ▼                      ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│  saju_inputs        │ │  saju_results       │ │  reviews            │
│  ─ order_id (FK)    │ │  ─ order_id (FK)    │ │  ─ user_id          │
│  ─ name             │ │  ─ myeongsik jsonb  │ │  ─ product_id       │
│  ─ birth_date        │ │  ─ interpretation_md │ │  ─ order_id        │
│  ─ birth_time        │ │  ─ llm_provider     │ │  ─ rating (1~5)     │
│  ─ time_unknown     │ │  ─ llm_model        │ │  ─ content          │
│  ─ gender            │ └─────────────────────┘ │  ─ is_public         │
│  ─ calendar          │                         └─────────────────────┘
│  ─ concerns (text[]) │
└─────────────────────┘

┌─────────────────────────┐
│  saju_api_calls         │  ← 어드민 누적 카운터용 (RLS off, service_role 만)
│  ─ id, called_at         │
│  ─ success, source       │
└─────────────────────────┘
```

**RLS 정책 핵심**

```text
profiles / orders / saju_inputs / saju_results
  └ select : auth.uid() = user_id      (본인 데이터만)
  └ guest 주문 (user_id = null) 은 RLS 통과 X
       → 결제 confirm / admin 조회 는 서버에서 createServiceClient() 로만 접근

products
  └ select : is_active = true          (공개)

reviews
  └ select : is_public = true          (공개)
  └ insert : auth.uid() = user_id 만   (본인 작성)

saju_api_calls
  └ RLS off — service_role 만 (어드민용)
```

**마이그레이션 적용 순서** (자동 정렬되지만 수동 시 주의):

```text
0001_init.sql          ← 6 개 테이블 + trigger
0002_rls.sql           ← RLS 정책 + 권한
0003_seed_products.sql ← 4 개 상품
0004_api_usage.sql     ← saju_api_calls 카운터 테이블
```

## API 누적 사용량 카운터

luckyloveme 누적 한도 6,000회. 어드민 홈에서 `/admin` 상단 카드로 표시.

```text
fetchSajuAnalysis(birthInfo, fields, { source })
        │
        ├─ luckyloveme API 호출 (재시도 포함)
        │
        ├─ 성공 ─▶ recordSajuApiCall(true,  source)  ─┐
        │                                              │
        └─ 실패 ─▶ recordSajuApiCall(false, source)  ─┤
                                                       │
                                              service_role 로
                                              saju_api_calls 테이블에 1행 insert
                                              (called_at, success, source)
                                                       │
                                                       ▼
                                            ┌────────────────────────────┐
                                            │  /admin 홈에서 누적 집계   │
                                            │  SELECT count(*)           │
                                            │    FROM saju_api_calls     │
                                            │  (시작일 필터 없음 — 전체) │
                                            │                            │
                                            │  → 1,234 / 6,000 회 표시    │
                                            └────────────────────────────┘
```

- `source` = `confirm` (결제 후 결과지) / `demo` (/demo 페이지) / `manual` (/api/generate-manseryeok)
- 80% 도달 시 amber, 100% 도달 시 red 로 카드 강조
- 한도 변경: [`src/lib/saju/usage.ts`](./src/lib/saju/usage.ts) 의 `TOTAL_LIMIT` 상수
- Supabase 미설정(데모 모드) 에서는 카운터 표시 안 됨

## 검증 체크리스트

- [ ] `pnpm dev` 가 정상 부팅됨
- [ ] `pnpm typecheck` 통과
- [ ] `/products` 에서 시드 상품 4개가 보임 (데모 모드면 seed fallback)
- [ ] `/demo` 진입 → 명식 + 풀 텍스트 표시 (SAJU_API_KEY 필요)
- [ ] `/admin/login` 에서 `ADMIN_PASSWORD` 입력 → `/admin` 진입
- [ ] (운영 모드) 회원가입 → 결제 → `/results/...` 로 이동, 결과지 표시
- [ ] (운영 모드) 마이페이지 결제 내역 / 후기 작성 동작
- [ ] (운영 모드) `/admin` 누적 카운터 카드가 실 숫자 표시

## 트러블슈팅

- **결제 위젯이 안 보여요** → `NEXT_PUBLIC_TOSS_CLIENT_KEY` 확인, 콘솔에서 도메인 등록 확인
- **결제 후 결과지가 안 떠요** → `LLM_PROVIDER` 와 해당 API 키 확인. 토스 결제는 승인됐으나 결과 생성만 실패한 경우 `/admin/orders` 에서 토스 대시보드로 환불 처리
- **`/admin` 진입이 안 돼요** → `.env.local` 의 `ADMIN_PASSWORD` 설정 + 서버 재시작 → `/admin/login` 에서 입력
- **Supabase RLS 에러** → service_role 키가 빠져있을 가능성. 서버 라우트에서만 `createServiceClient()` 사용
- **사주 API 401** → 키 오타/만료. [`./운세위키_API_가이드.md`](./운세위키_API_가이드.md) §6 의 401 에러 메시지별 진단 참고
- **데모 모드에서 결제가 안 돼요** → 정상. 결제 흐름은 Supabase 가 필요합니다. 명식·결과지 미리보기는 `/demo` 페이지에서 확인 가능

## 라이선스

MIT. 자유롭게 클론·수정·재배포 가능합니다.
