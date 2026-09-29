-- 먹은 사과 기록. 플레이어가 사과를 먹을 때마다 한 줄 추가된다.
create table if not exists public.apples (
  id uuid primary key default gen_random_uuid(),
  -- 로그인 없이 브라우저마다 만든 id (localStorage 'sokoban:player-id:v1')
  user_id uuid not null,
  eaten_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists apples_user_id_idx on public.apples (user_id);

alter table public.apples enable row level security;

-- 로그인 없이 anon 키로 바로 쓰는 단계라 추가와 조회는 누구나 가능하다.
-- 수정·삭제 정책은 없으므로 막혀 있다.
-- 나중에 로그인을 붙이면 user_id 를 auth.uid() 로 바꾸고 정책을 본인 행으로 좁힌다.
revoke all on public.apples from anon, authenticated;
grant select, insert on public.apples to anon, authenticated;

drop policy if exists "apples: read" on public.apples;
create policy "apples: read" on public.apples
  for select to anon, authenticated
  using (true);

drop policy if exists "apples: insert" on public.apples;
create policy "apples: insert" on public.apples
  for insert to anon, authenticated
  with check (true);
