-- 전체 순위표 표(Supabase). SQL Editor에 붙여 넣고 Run 한다.
-- 누구나 순위를 읽고 새 기록을 올릴 수 있지만, 고치거나 지울 수는 없다.
-- 닉네임은 1~8자, 점수는 게임별 상한 이하만 받는다. 기록 시각은 서버가 정한다.
create table public.scores (
  id bigint generated always as identity primary key,
  game text not null check (game in ('snack','mouse','tower','pixelmart','cattrain','yarn')),
  name text not null check (char_length(name) between 1 and 8),
  score integer not null check (score > 0 and score <= case when game in ('pixelmart','yarn') then 20000 else 3000 end),
  created_at timestamptz not null default now()
);
create index scores_rank on public.scores (game, score desc);
alter table public.scores enable row level security;
create policy "read all" on public.scores for select to anon using (true);
create policy "add score" on public.scores for insert to anon with check (true);
revoke all on public.scores from anon;
grant select on public.scores to anon;
grant insert (game, name, score) on public.scores to anon;

-- 2026-11: '냥이 꼬리기차'(cattrain) 게임 추가. 이미 표를 만든 경우 아래 두 줄만 Run 한다.
-- alter table public.scores drop constraint scores_game_check;
-- alter table public.scores add constraint scores_game_check check (game in ('snack','mouse','tower','pixelmart','cattrain'));

-- 2026-11: '냥이 털실 굴리기'(yarn) 게임 추가 (점수 = 최대 크기 cm, 상한 20000). 이미 표를 만든 경우 아래 네 줄만 Run 한다.
-- alter table public.scores drop constraint scores_game_check;
-- alter table public.scores add constraint scores_game_check check (game in ('snack','mouse','tower','pixelmart','cattrain','yarn'));
-- alter table public.scores drop constraint scores_score_check;
-- alter table public.scores add constraint scores_score_check check (score > 0 and score <= case when game in ('pixelmart','yarn') then 20000 else 3000 end);
