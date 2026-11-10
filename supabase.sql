-- 전체 순위표 표(Supabase). SQL Editor에 붙여 넣고 Run 한다.
-- 누구나 순위를 읽고 새 기록을 올릴 수 있지만, 고치거나 지울 수는 없다.
-- 닉네임은 1~8자, 점수는 게임별 상한 이하만 받는다. 기록 시각은 서버가 정한다.
create table public.scores (
  id bigint generated always as identity primary key,
  game text not null check (game in ('snack','mouse','tower','pixelmart')),
  name text not null check (char_length(name) between 1 and 8),
  score integer not null check (score > 0 and score <= case when game = 'pixelmart' then 20000 else 3000 end),
  created_at timestamptz not null default now()
);
create index scores_rank on public.scores (game, score desc);
alter table public.scores enable row level security;
create policy "read all" on public.scores for select to anon using (true);
create policy "add score" on public.scores for insert to anon with check (true);
revoke all on public.scores from anon;
grant select on public.scores to anon;
grant insert (game, name, score) on public.scores to anon;
