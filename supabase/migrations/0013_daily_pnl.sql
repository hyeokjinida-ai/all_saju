-- 0013 일별 손익 트래커
--
-- 왜: 매출·결과지·만세력 호출은 이미 DB 에 있는데 **광고비만 밖에 있어서** 손익을 매일 손으로
--   계산했다(2026-09-12 실측: 3일 손익 −6천~+1.3만, 광고비가 원가의 91%). 광고비를 날마다
--   한 줄로 받아 두면 나머지는 전부 이 DB 안에서 계산된다.
--
-- 설계 원칙 3가지 (계획서 §0-B 자체 피드백에서 나온 것):
--   ① **광고비 0 과 「못 받음」은 다르다.** ad_spend 가 null 이면 미수신이다. 0 으로 저장하면
--      그날 손익이 흑자로 보인다 — 트래커가 거짓말하는 최악의 경로라 컬럼을 nullable 로 둔다.
--   ② **파생값은 저장하지 않는다.** 부가세·PG 수수료율·순손익은 과세유형(env)이 바뀌면 전부
--      달라진다. 사실(매출·광고비·토큰)만 쌓고 읽을 때 계산한다.
--   ③ **날짜는 KST 기준 date.** 앱이 KST 로 잘라서 넣는다.
--
-- 적용: Supabase 대시보드 → SQL Editor → 붙여넣기 → Run.
--   ⚠ 0007_analytics_events.sql 이 아직 운영에 없다면 그것도 같이 Run 할 것
--     (어드민 방문자 페이지가 그 테이블을 읽는다).

-- ── 1. 일별 스냅샷 ──────────────────────────────────
create table if not exists public.daily_pnl (
  day date primary key,                       -- KST 기준 날짜

  -- 매출 쪽 (사실)
  orders_count integer not null default 0,    -- 손익에 잡은 결제 건수
  revenue integer not null default 0,         -- 결제 합계(부가세 포함 표시가)
  refund_count integer not null default 0,
  refund_amount integer not null default 0,

  -- 원가 쪽 (사실)
  results_count integer not null default 0,   -- 그날 만든 결과지 장수
  llm_cost numeric(12,2) not null default 0,  -- 실토큰 기반 원가(원). 토큰이 없으면 상품별 상수로 추정
  llm_cost_estimated boolean not null default false, -- 토큰 로깅 전 데이터면 true
  manseryeok_calls integer not null default 0,

  -- 광고비 — **null = 미수신**. 0 으로 채우지 말 것(위 원칙 ①)
  ad_spend numeric(12,2),                     -- 자동 수신분(메타 API)
  ad_spend_source text,                       -- 'meta' | 'manual' | null(미수신)
  ad_spend_manual numeric(12,2),              -- 형님이 손으로 넣은 값(있으면 이게 이긴다)
  ad_spend_other numeric(12,2),               -- 캠페인 필터 밖 지출(다른 사업 캠페인)
  meta_purchases integer,                     -- 메타가 잡은 구매 수(픽셀 누수 측정기)

  -- PG — 정산 API 가 오기 전엔 null(요율로 추정)
  pg_fee numeric(12,2),
  pg_fee_source text,                         -- 'toss' | null(추정)

  note text,
  updated_at timestamptz not null default now()
);

comment on column public.daily_pnl.ad_spend is '메타에서 받은 광고비. null 은 0 이 아니라 미수신이다.';

-- ── 2. 주문 — 환불·손익제외 ─────────────────────────
-- 환불: 정산 API 는 D+n 이라 늦다. 결제 조회의 취소 내역으로 매일 채운다.
-- 손익제외: 형님 테스트 결제(9/6 2건 등)가 매출·ROAS 를 부풀린다.
alter table public.orders
  add column if not exists refunded_amount integer not null default 0,
  add column if not exists refunded_at timestamptz,
  add column if not exists exclude_from_pnl boolean not null default false;

create index if not exists orders_paid_at_idx on public.orders(paid_at desc) where status = 'paid';

-- ── 3. 결과지 — 실제 토큰 ───────────────────────────
-- LLM 단가 상수는 프롬프트가 바뀔 때마다 틀어진다. 실토큰을 남겨 원가를 사실로 만든다.
-- (2026-09-12 실측: 산군 11장 = 입력 19.8만·캐시 4.1만·출력 1.5만 토큰 ≈ ₩70)
alter table public.saju_results
  add column if not exists prompt_tokens integer,
  add column if not exists cached_tokens integer,
  add column if not exists completion_tokens integer;

-- 본 테이블들은 service_role 로만 접근한다(어드민 화면이 서버에서 읽는다).
alter table public.daily_pnl enable row level security;
