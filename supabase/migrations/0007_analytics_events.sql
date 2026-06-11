-- ─────────────────────────────────────────────────────
-- 0007_analytics_events
-- 퍼스트파티(자체) 방문/행동 분석 — 외부 도구 없이 내 DB에 직접 적재.
-- /api/track 가 적재하고 /admin/analytics 가 집계해 보여준다.
-- ⚠️ 개인정보(이름·생년월일·시각 등)는 저장하지 않는다 — 단계/상품slug/금액 등
--    퍼널 분석용 비식별 값만 props 에 담는다.
-- service_role 로만 접근(RLS off 유지) — saju_api_calls 와 동일 정책.
-- ─────────────────────────────────────────────────────

create table public.analytics_events (
  id bigint generated always as identity primary key,
  visitor_id text,                 -- localStorage 영속 ID(고유 방문자 추정)
  session_id text,                 -- sessionStorage ID(방문 1회)
  event text not null,             -- 'page_view' | 'wizard_step' | 'begin_checkout' | 'purchase' | ...
  path text,                       -- 경로(pathname)
  referrer text,                   -- 외부 유입 호스트(자사 도메인 제외 집계)
  props jsonb not null default '{}',-- { step, slug, value, total, currency } 등 비식별 값
  ua text,                         -- user-agent(봇 필터/디바이스 분류용, 서버에서 기록)
  created_at timestamptz not null default now()
);

create index analytics_events_created_idx on public.analytics_events (created_at desc);
create index analytics_events_event_idx on public.analytics_events (event);
create index analytics_events_session_idx on public.analytics_events (session_id);
create index analytics_events_visitor_idx on public.analytics_events (visitor_id);
