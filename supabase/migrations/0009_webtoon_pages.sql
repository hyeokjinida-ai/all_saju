-- =====================================================
-- 웹툰 페이지 — 상품별 컷 구성을 어드민에서 저장/수정
-- =====================================================
-- 컷 배치(그림 경로 + 말풍선 좌표/대사)를 JSON으로 들고 있다가 렌더할 때 손님 데이터로 채운다.
-- 읽기는 공개(상품 페이지가 anon으로 읽음), 쓰기는 어드민 route(secret 키)만.
-- 어드민은 Supabase auth가 아니라 ADMIN_PASSWORD 쿠키 게이트라서 RLS로 쓰기를 열지 않는다.

create table if not exists public.webtoon_pages (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  kind text not null default 'teaser',              -- teaser | landing | result
  slug text not null unique,                        -- 예: sangun-sinjeom-teaser
  name text not null default '',
  cuts jsonb not null default '[]'::jsonb,
  is_published boolean not null default false,      -- 손님에게 보일지. 기본 꺼짐(만들다 만 게 나가면 안 되니까)
  updated_at timestamptz not null default now(),
  unique (product_id, kind)
);

-- 위 create 가 이미 돌아간 뒤에 이 파일을 다시 실행해도 컬럼이 붙도록(= 몇 번 돌려도 안전)
alter table public.webtoon_pages add column if not exists is_published boolean not null default false;

create index if not exists webtoon_pages_product_idx on public.webtoon_pages(product_id, kind);

-- 되돌리기용 — 저장할 때마다 직전 내용을 쌓고 최근 3개만 남긴다(정리는 어드민 route에서)
create table if not exists public.webtoon_page_versions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.webtoon_pages(id) on delete cascade,
  cuts jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists webtoon_page_versions_page_idx
  on public.webtoon_page_versions(page_id, created_at desc);

-- ─── RLS ─────────────────────────────────────────────
alter table public.webtoon_pages enable row level security;
drop policy if exists "webtoon_pages public read" on public.webtoon_pages;
create policy "webtoon_pages public read"
  on public.webtoon_pages for select
  using (true);
-- insert/update/delete 정책 없음 = secret 키(어드민 route)로만 가능

alter table public.webtoon_page_versions enable row level security;
-- 정책 없음 = secret 키로만 접근

-- ─── Storage ─────────────────────────────────────────
-- 컷 이미지 버킷. 업로드는 어드민 route(secret 키), 읽기는 공개.
insert into storage.buckets (id, name, public)
values ('webtoon', 'webtoon', true)
on conflict (id) do nothing;

drop policy if exists "webtoon bucket public read" on storage.objects;
create policy "webtoon bucket public read"
  on storage.objects for select
  using (bucket_id = 'webtoon');
