-- =====================================================
-- 통합 마이그레이션 (0001 + 0002 + 0003 + 0004)
-- Supabase 대시보드 → SQL Editor 에 전체 붙여넣고 Run
-- =====================================================


-- =====================================================
-- 0001_init.sql — 초기 스키마 (테이블 6개 + trigger)
-- =====================================================

create extension if not exists "pgcrypto";

-- ─── profiles ────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  phone text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── products ────────────────────────────────────────
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  price integer not null check (price >= 0),
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index products_active_order_idx on public.products(is_active, display_order);

-- ─── orders ──────────────────────────────────────────
create type public.order_status as enum ('pending', 'paid', 'failed');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_id text not null unique,                       -- 토스 orderId
  user_id uuid references auth.users(id) on delete set null,
  guest_email text,
  product_id uuid not null references public.products(id),
  amount integer not null check (amount >= 0),
  status public.order_status not null default 'pending',
  toss_payment_key text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  constraint orders_user_or_guest check (user_id is not null or guest_email is not null)
);

create index orders_user_idx on public.orders(user_id);
create index orders_guest_email_idx on public.orders(guest_email);
create index orders_status_idx on public.orders(status);
create index orders_created_idx on public.orders(created_at desc);

-- ─── saju_inputs ─────────────────────────────────────
create type public.calendar_kind as enum ('solar', 'lunar');
create type public.gender_kind as enum ('male', 'female');

create table public.saju_inputs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  name text,
  birth_date date not null,
  birth_time time,
  time_unknown boolean not null default false,
  gender public.gender_kind not null,
  calendar public.calendar_kind not null default 'solar',
  concerns text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ─── saju_results ────────────────────────────────────
create table public.saju_results (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  myeongsik jsonb not null,                            -- 4기둥 (년월일시 천간/지지)
  interpretation_md text not null,
  llm_provider text not null,
  llm_model text not null,
  created_at timestamptz not null default now()
);

create index saju_results_order_idx on public.saju_results(order_id);

-- ─── reviews ─────────────────────────────────────────
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  rating smallint not null check (rating between 1 and 5),
  content text not null,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create index reviews_product_idx on public.reviews(product_id, is_public);


-- =====================================================
-- 0002_rls.sql — Row Level Security 정책
-- =====================================================

-- ─── profiles ────────────────────────────────────────
alter table public.profiles enable row level security;

create policy "profiles self select"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles self update"
  on public.profiles for update
  using (auth.uid() = id);

-- ─── products ────────────────────────────────────────
alter table public.products enable row level security;

create policy "products public read"
  on public.products for select
  using (is_active = true);

-- ─── orders ──────────────────────────────────────────
alter table public.orders enable row level security;

create policy "orders self select"
  on public.orders for select
  using (auth.uid() = user_id);

-- ─── saju_inputs ─────────────────────────────────────
alter table public.saju_inputs enable row level security;

create policy "saju_inputs via own order"
  on public.saju_inputs for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = saju_inputs.order_id and o.user_id = auth.uid()
    )
  );

-- ─── saju_results ────────────────────────────────────
alter table public.saju_results enable row level security;

create policy "saju_results via own order"
  on public.saju_results for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = saju_results.order_id and o.user_id = auth.uid()
    )
  );

-- ─── reviews ─────────────────────────────────────────
alter table public.reviews enable row level security;

create policy "reviews public read"
  on public.reviews for select
  using (is_public = true);

create policy "reviews self insert"
  on public.reviews for insert
  with check (auth.uid() = user_id);

create policy "reviews self update"
  on public.reviews for update
  using (auth.uid() = user_id);

create policy "reviews self delete"
  on public.reviews for delete
  using (auth.uid() = user_id);


-- =====================================================
-- 0003_seed_products.sql — 상품 시드 4개
-- =====================================================

insert into public.products (slug, name, description, price, display_order, is_active)
values
  ('today-fortune', '오늘의 운세 한 줄', '아침에 가볍게 보는 오늘 하루 흐름 한 문장', 4900, 10, true),
  ('basic-saju', '기본 사주 풀이', '사주 4기둥 기반 종합 성향 / 운의 흐름 리포트', 9900, 20, true),
  ('love-saju', '연애·궁합 리포트', '내 연애 패턴과 잘 맞는 사람 유형 분석', 19900, 30, true),
  ('premium-saju', '프리미엄 종합 풀이', '대운 / 세운 / 직업운 / 재물운 / 건강운 통합 리포트', 49900, 40, true)
on conflict (slug) do nothing;


-- =====================================================
-- 0004_api_usage.sql — 사주 API 누적 카운터 (RLS off)
-- =====================================================

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


-- =====================================================
-- 0005_raw_analysis.sql — 자체 만세력 검증용 16종 원본 보관
-- =====================================================

alter table public.saju_results
  add column if not exists raw_analysis jsonb;

comment on column public.saju_results.raw_analysis is
  '루키러브미 16종 원본 분석 JSON. 자체 만세력 엔진 검증용 데이터 축적.';
