-- 0012 결제 화면 연락처 · 마케팅 수신 동의
--
-- 왜: 경쟁사 결제 시트에는 있는데 우리에게 없던 두 가지다.
--   · 휴대폰 번호 — 청월당은 **필수**로 받는다("사주 결과 확인 및 안내메시지 발송에 이용")
--   · 마케팅 수신 동의 — 타이트는 **기본 체크**로 받는다
-- 우리는 알림톡 채널이 아직 없어 휴대폰을 **선택**으로, 동의는 **기본 해제**로 받는다
-- (형님 결정 D3·D4). 채널이 열리면 필수로 올린다.
--
-- ⚠ 왜 profiles 가 아니라 orders 인가: 동의는 **그때 그 주문에서** 받은 것이다.
--    언제 무엇에 동의했는지 주문 단위로 남아야 나중에 증빙이 된다.
--    profiles.phone 은 그대로 두고 "미리 채우기" 용으로만 쓴다.
--
-- 적용: Supabase 대시보드 → SQL Editor → 붙여넣기 → Run.

alter table public.orders
  add column if not exists phone text,
  add column if not exists marketing_opt_in boolean not null default false,
  add column if not exists marketing_opt_in_at timestamptz;

-- 마케팅 동의자만 뽑을 때 (동의 시각이 있는 행 = 실제로 체크한 행)
create index if not exists orders_marketing_opt_in_idx
  on public.orders(marketing_opt_in) where marketing_opt_in;
