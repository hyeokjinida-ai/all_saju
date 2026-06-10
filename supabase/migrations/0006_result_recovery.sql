-- ─────────────────────────────────────────────────────
-- 0006_result_recovery
-- 결과 미생성 복구용 — 백그라운드(크론) 재시도 횟수/시각 추적.
-- 결제는 됐는데 명식/LLM 장애로 결과지가 안 만들어진 주문을 복구 크론이
-- 재시도할 때, 영구 실패 주문의 무한 재시도(= luckyloveme 6000회 한도 낭비)를
-- 막기 위한 컬럼. confirm·클라 자가복구(포그라운드)는 이 카운터를 건드리지 않는다.
-- ─────────────────────────────────────────────────────

alter table public.orders
  add column if not exists result_attempts integer not null default 0,
  add column if not exists result_last_attempt_at timestamptz;

comment on column public.orders.result_attempts is
  '복구 크론의 결과지 생성 재시도 횟수(백그라운드). MAX_ATTEMPTS 도달 시 자동 복구 중단 → 어드민 수동 처리.';
