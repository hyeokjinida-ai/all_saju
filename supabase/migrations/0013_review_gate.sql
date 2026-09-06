-- 0013 후기 승인 게이트 — 손님이 쓴 후기가 광고 랜딩에 **바로** 뜨지 않게 한다.
--
-- 왜: 0010 이 `is_approved` 를 만들면서 기본값을 true 로 뒀다(그땐 노출 화면이 없었다).
--   이제 산군 티저 구매 카드 뒤에 후기 블록이 서므로, 그 기본값이면
--   별 하나짜리 후기가 **광고 유입 손님이 값을 보기 직전 화면에** 자동으로 걸린다.
--   후기를 지우자는 게 아니라, 켜는 손은 형님이어야 한다는 뜻이다(/admin/reviews).
--
-- ⚠ 기존 행은 안 건드린다 — default 는 **앞으로 들어올 행**에만 적용된다.
--   지금 reviews 는 0행이라(2026-09-06 실측) 뒤채울 것도 없다.
--   나중에 이미 승인해 둔 후기를 되돌리고 싶으면 그건 어드민에서 한 줄씩 한다.
--
-- 적용: Supabase 대시보드 → SQL Editor → 붙여넣기 → Run.

alter table public.reviews alter column is_approved set default false;

comment on column public.reviews.is_approved is
  '어드민 노출 토글. 기본 false — /admin/reviews 에서 켜야 랜딩·홈·상품페이지에 나온다 (0013).';

-- 승인 대기 목록을 어드민이 자주 훑는다 — 대기 행만 부분 색인으로 잡는다.
create index if not exists reviews_pending_idx
  on public.reviews(created_at desc) where not is_approved;
