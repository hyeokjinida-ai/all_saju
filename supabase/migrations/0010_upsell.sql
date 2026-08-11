-- =====================================================
-- 0010 업셀 — 정가 앵커 · 패키지(번들) · 추가질문권 · 게스트 리뷰
-- =====================================================
-- 형님이 Supabase SQL Editor 에 통째로 붙여넣고 Run 하면 된다.
-- 전 구간 재실행 안전(idempotent) — 여러 번 돌려도 같은 상태가 된다.

-- ─── A. 상품 확장: 정가 앵커 · 번들 · 애드온 ──────────
alter table public.products add column if not exists compare_at_price integer;
alter table public.products add column if not exists bundle_slugs text[];
alter table public.products add column if not exists is_addon boolean not null default false;

comment on column public.products.compare_at_price is
  '취소선 정가(앵커). null 이면 할인 표기를 안 한다. 판매가(price) 이상이어야 한다.';
comment on column public.products.bundle_slugs is
  '패키지 구성품 slug 배열. 비어 있으면 단품. 결제 1건 → 결과지 N장.';
comment on column public.products.is_addon is
  '홈·상품목록·사이트맵·크로스셀에서 감춘다(번들/추가질문권처럼 퍼널 안에서만 파는 상품).';

-- 취소선이 판매가보다 싸면 앵커가 거꾸로 선다 — DB 에서 막는다.
do $$ begin
  alter table public.products add constraint products_compare_at_gte_price
    check (compare_at_price is null or compare_at_price >= price);
exception when duplicate_object then null; end $$;

-- ─── B. 한 주문에 결과지 여러 장 (패키지의 핵심) ──────
-- 기존: saju_results.order_id UNIQUE  →  주문 1건에 결과지 1장만 가능했다.
-- 변경: UNIQUE (order_id, product_slug) → 패키지 주문 1건에 구성품별 결과지 N장.
alter table public.saju_results add column if not exists product_slug text;

-- 기존 행 백필 — 주문의 상품 slug 를 그대로 적어 넣는다.
update public.saju_results r
   set product_slug = p.slug
  from public.orders o
  join public.products p on p.id = o.product_id
 where r.order_id = o.id
   and r.product_slug is null;

-- 상품이 삭제된 고아 행이 있어도 not null 전환이 막히지 않게.
update public.saju_results set product_slug = '' where product_slug is null;

alter table public.saju_results alter column product_slug set not null;

-- 옛 UNIQUE(order_id) 제거 — 제약 이름이 환경마다 다를 수 있어 정의로 찾아서 지운다.
do $$
declare c text;
begin
  select conname into c
    from pg_constraint
   where conrelid = 'public.saju_results'::regclass
     and contype = 'u'
     and pg_get_constraintdef(oid) = 'UNIQUE (order_id)';
  if c is not null then
    execute format('alter table public.saju_results drop constraint %I', c);
  end if;
end $$;

do $$ begin
  alter table public.saju_results
    add constraint saju_results_order_slug_key unique (order_id, product_slug);
exception when duplicate_object then null; end $$;

comment on column public.saju_results.product_slug is
  '이 결과지가 어느 상품의 것인지. 패키지 주문은 한 order_id 에 구성품 수만큼 행이 생긴다.';

-- ─── C. 추가질문권 ───────────────────────────────────
-- 유료(5,000원 결제)와 보상(리뷰 작성 시 무료 1회)을 한 테이블로 처리한다.
create table if not exists public.extra_questions (
  id uuid primary key default gen_random_uuid(),
  -- 어느 결과지에 붙는 질문인가 (원 주문)
  parent_order_id uuid not null references public.orders(id) on delete cascade,
  -- 유료 질문의 결제 주문. 보상(무료) 질문은 null.
  order_id uuid unique references public.orders(id) on delete set null,
  source text not null check (source in ('paid', 'review_reward')),
  -- credited: 쓸 수 있는 권리만 있음(질문 미작성) / pending: 질문 접수·답변 대기 / answered: 완료
  status text not null default 'credited' check (status in ('credited', 'pending', 'answered', 'failed')),
  question text,
  answer_md text,
  created_at timestamptz not null default now(),
  answered_at timestamptz
);

create index if not exists extra_questions_parent_idx on public.extra_questions(parent_order_id);
create index if not exists extra_questions_status_idx on public.extra_questions(status);

-- 쓰기·읽기 모두 service_role 라우트만 (webtoon_pages 와 같은 방침 — 정책 0개 = anon 접근 0)
alter table public.extra_questions enable row level security;

-- ─── D. 게스트 리뷰 개통 ─────────────────────────────
-- 지금 주 결제 경로가 비회원이라, 회원 전용 리뷰로는 후기가 쌓이지 않는다.
-- (본인 확인은 라우트에서 toss_payment_key capability 로 한다 — orders/generate 와 같은 패턴)
alter table public.reviews alter column user_id drop not null;
alter table public.reviews add column if not exists guest_email text;
alter table public.reviews add column if not exists is_approved boolean not null default true;

do $$ begin
  alter table public.reviews add constraint reviews_owner_present
    check (user_id is not null or guest_email is not null);
exception when duplicate_object then null; end $$;

comment on column public.reviews.is_approved is
  '어드민 노출 토글. false 면 랜딩·상품페이지 후기 목록에서 감춘다.';
