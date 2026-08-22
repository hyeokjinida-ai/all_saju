-- 0011 상품 빌더 — 상품을 코드가 아니라 어드민에서 추가/관리한다.
--
-- 지금까지 새 상품을 하나 붙이려면 코드 네 군데를 고쳐야 했다:
--   products.seed.ts(카탈로그) · product-pitch.ts(랜딩 카피) · prompt.ts(결과지 목차) ·
--   home.ts(홈 카드). 이 마이그레이션은 그 네 가지를 전부 DB 로 옮긴다.
--
-- ⚠ 전부 nullable 이거나 default 가 있다. 이 파일을 적용하기 전에도 화면은 그대로 돌고,
--    적용한 뒤에도 값을 안 채우면 기존 코드 폴백이 그대로 답한다.
--
-- 적용: Supabase 대시보드 → SQL Editor → 붙여넣기 → Run.

-- ─── 홈 카드 · 카탈로그 (공개 읽기여도 되는 값) ──────────────────────────
alter table public.products
  add column if not exists category text,                -- love | sinjeom | wealth | life | family | career
  add column if not exists character_name text,          -- 카드 위 캐릭터 줄 ("직녀")
  add column if not exists card_title text,              -- 카드 레터링 ("연애예보"). 비면 name
  add column if not exists tagline text,                 -- 카드 한 줄. 비면 description 앞부분
  add column if not exists hero_rank integer,            -- null = 히어로 제외, 1..n
  add column if not exists art jsonb not null default '{}'::jsonb,
      -- {hero:{url,pos:{x,y}}, big:{...}, row:{...}}
  add column if not exists pitch jsonb,
      -- 랜딩에 그대로 찍히는 공개 카피 {eyebrow, headline[], pains[], includes[], forWhom, hasCharts}
  add column if not exists updated_at timestamptz not null default now();

-- 히어로 자리는 상품 하나가 하나씩만 — 두 상품이 같은 TOP 번호를 못 갖는다
create unique index if not exists products_hero_rank_uidx
  on public.products(hero_rank) where hero_rank is not null;

-- ─── 결과지 설계 (프롬프트) — 비공개 ────────────────────────────────────
-- ⚠ products 는 "public read" 정책이라 anon 키로 전부 읽힌다. 결과지 목차·말투는
--    우리가 무엇을 어떻게 쓰는지 그 자체라 거기 두면 안 된다. 별도 테이블 + RLS on +
--    **정책 없음** = 서비스 키(서버)만 읽고 쓴다.
create table if not exists public.product_styles (
  product_id uuid primary key references public.products(id) on delete cascade,
  style jsonb not null,   -- {title, length, outline[], voice, banmal}
  updated_at timestamptz not null default now()
);

alter table public.product_styles enable row level security;

-- ─── 카드 그림 버킷 (0009 webtoon 과 같은 방식) ─────────────────────────
insert into storage.buckets (id, name, public)
values ('product-art', 'product-art', true)
on conflict (id) do nothing;

drop policy if exists "product-art public read" on storage.objects;
create policy "product-art public read"
  on storage.objects for select
  using (bucket_id = 'product-art');
