-- =====================================================
-- 0008_manseryeok_cache.sql
-- =====================================================
-- 만세력(luckyloveme) 분석 영속 캐시.
-- 동일 생일(생년월일·시각·성별·달력) 재방문 및 무료→결제 재조회 시
-- 6000콜 하드 한도를 다시 소모하지 않도록 분석 결과를 저장/재사용한다.
--   - birth_key: src/lib/saju/analysis-cache.ts 의 birthCacheKey() 정규화 문자열.
--     응답에 시점 의존 값(세운·월운·현재나이)이 섞여 있어 키에 연-월(YYYY-MM)을 포함 →
--     사실상 월 단위 신선도(무기한 아님).
--   - analysis : luckyloveme 16종 전체 응답(jsonb) 원본. ganji 있는 정상 응답만 저장.
-- RLS 활성화(정책 0개) → service_role(secret 키, RLS 우회)만 접근. anon/publishable 키로는
-- 읽기·쓰기 불가 — 캐시 포이즈닝(유료 결과 오염) 방지. 앱 코드는 createServiceClient 사용.

create table public.saju_analysis_cache (
  birth_key text primary key,
  analysis jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.saju_analysis_cache enable row level security;
