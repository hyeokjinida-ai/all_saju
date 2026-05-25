-- =====================================================
-- 0004_api_usage.sql
-- =====================================================
-- 사주 API (luckyloveme) 누적 호출 카운터 — /admin 홈에서 N/6000회 표시.
-- 누적 한도 6000회 (TOTAL_LIMIT) 는 src/lib/saju/usage.ts 에 상수로 정의.
-- 본 테이블은 service_role 로만 접근 (RLS off 유지).

create table public.saju_api_calls (
  id uuid primary key default gen_random_uuid(),
  called_at timestamptz not null default now(),
  success boolean not null,
  source text -- 'confirm' | 'demo' | 'manual'
);

create index saju_api_calls_called_at_idx
  on public.saju_api_calls (called_at desc);

create index saju_api_calls_source_idx
  on public.saju_api_calls (source);
