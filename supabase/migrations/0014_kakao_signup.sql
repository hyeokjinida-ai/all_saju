-- 0014 카카오 간편가입 — 이메일 없이 들어오는 손님을 받는다.
--
-- 왜: 카카오는 **이메일을 안 줄 수 있다**. 「카카오계정(이메일)」 동의 항목은 비즈 앱만
--   쓸 수 있고, 손님이 그 동의를 빼고 들어올 수도 있다. 그런데 0001 이 만든 구조는
--     ① profiles.email 이 not null
--     ② 가입 트리거가 new.email 을 그대로 집어넣는다
--   라서, 이메일 없는 손님이 오면 insert 가 실패하고 **트리거가 가입 트랜잭션째 되돌린다.**
--   손님 화면에는 "Database error saving new user" 만 뜨고 가입은 안 된다.
--   (같은 구조로 가입자 0명이 났던 공개 사례: github.com/chewgumiadmin-afk/chewgumi/issues/144)
--
-- 무엇을: ① email 의 not null 을 푼다 ② 이름을 카카오가 주는 여러 키에서 집는다
--         ③ 프로필 만들기가 실패해도 **가입 자체는 살린다**(경고만 남긴다).
--
-- ⚠ 기존 행은 안 건드린다 — not null 을 푸는 건 앞으로 들어올 행 얘기고,
--   지금 profiles 에 이메일 없는 행은 없다(그 칼럼이 not null 이었으니 있을 수가 없다).
--
-- 적용: Supabase 대시보드 → SQL Editor → 붙여넣기 → Run.

alter table public.profiles alter column email drop not null;

comment on column public.profiles.email is
  '카카오 가입은 비어 있을 수 있다(0014). 이름 대신 쓰는 자리가 있으니 읽는 쪽에서 null 을 막을 것.';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  -- 이메일 가입은 display_name 을 직접 넣어 준다. 카카오는 provider 에 따라 키 이름이
  -- 갈리므로(name · full_name · nickname …) 있는 것을 순서대로 집는다.
  -- ⚠ 카카오가 실제로 어떤 키를 주는지는 첫 실가입의 raw_user_meta_data 로 확인할 것.
  --   못 찾으면 이메일 앞자리, 그것도 없으면 '손님' 으로 떨어진다 — 이름이 null 이 되면
  --   후기 블록이 이름 자리를 채우려다 빈손이 된다.
  v_name := coalesce(
    nullif(new.raw_user_meta_data->>'display_name', ''),
    nullif(new.raw_user_meta_data->>'name', ''),
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'nickname', ''),
    nullif(new.raw_user_meta_data->>'preferred_username', ''),
    nullif(new.raw_user_meta_data->>'user_name', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    '손님'
  );

  -- 프로필은 **가입의 조건이 아니다.** 여기서 뭐가 잘못돼도 손님은 일단 들어와야 한다
  -- (없으면 나중에 채울 수 있지만, 가입이 막히면 그 손님은 그대로 나간다).
  begin
    insert into public.profiles (id, email, display_name)
    values (new.id, new.email, v_name)
    on conflict (id) do nothing;
  exception when others then
    raise warning 'handle_new_user: profiles 생성 실패 (user %): %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
