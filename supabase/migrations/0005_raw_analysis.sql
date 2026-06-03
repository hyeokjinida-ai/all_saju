-- ─────────────────────────────────────────────────────
-- 0005_raw_analysis
-- 자체 만세력 전환 대비: luckyloveme 16종 원본 분석을 보관.
-- 나중에 자체 계산 엔진을 검증할 "정답 데이터셋"으로 사용한다.
-- (해석 문구가 아니라 명식/십성/대운 등 계산값 — 천문 계산이라 자체화해도 무방)
-- ─────────────────────────────────────────────────────

alter table public.saju_results
  add column if not exists raw_analysis jsonb;

comment on column public.saju_results.raw_analysis is
  'luckyloveme 16종 원본 분석 JSON. 자체 만세력 엔진 검증용 데이터 축적.';
