-- =====================================================
-- 0008_manseryeok_cache.sql
-- =====================================================
-- 만세력(luckyloveme) 분석 영속 캐시.
-- 동일 생일(생년월일·시각·성별·달력) 재방문 및 무료→결제 재조회 시
-- 6000콜 하드 한도를 다시 소모하지 않도록 분석 결과를 저장/재사용한다.
--   - birth_key: src/lib/saju/analysis-cache.ts 의 birthCacheKey() 정규화 문자열
--   - analysis : luckyloveme 16종 전체 응답(jsonb) 원본
-- 계산값(천문 기반)이라 무기한 유효 → TTL 없음.
-- service_role 로만 접근 (RLS off 유지 — saju_api_calls 와 동일 정책).

create table public.saju_analysis_cache (
  birth_key text primary key,
  analysis jsonb not null,
  created_at timestamptz not null default now()
);
