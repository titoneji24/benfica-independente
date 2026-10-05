create type public.app_role as enum ('admin','user');
create type public.player_position as enum ('GR','DEF','MED','AV','TRE');
create type public.lineup_role as enum ('titular','suplente','treinador');

create table public.profiles (
  id uuid primary key,
  username text unique not null,
  avatar_url text,
  created_at timestamptz not null default now()
);
grant select on public.profiles to anon, authenticated;
grant update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles public read" on public.profiles for select using (true);
create policy "profiles own update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare base text; final text; n int := 0;
begin
  base := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)), '[^a-zA-Z0-9_]', '', 'g'));
  if base = '' or base is null then base := 'adepto'; end if;
  final := base;
  while exists (select 1 from public.profiles where username = final) loop
    n := n + 1; final := base || n::text;
  end loop;
  insert into public.profiles (id, username, avatar_url) values (new.id, final, new.raw_user_meta_data->>'avatar_url');
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position player_position not null,
  number int,
  photo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.players to anon, authenticated;
grant insert, update, delete on public.players to authenticated;
grant all on public.players to service_role;
alter table public.players enable row level security;
create policy "players read" on public.players for select using (true);
create policy "players admin write" on public.players for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  opponent text not null,
  competition text not null,
  round text,
  kickoff timestamptz not null,
  venue text,
  is_home boolean not null default true,
  benfica_goals int,
  opponent_goals int,
  voting_open boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.matches to anon, authenticated;
grant insert, update, delete on public.matches to authenticated;
grant all on public.matches to service_role;
alter table public.matches enable row level security;
create policy "matches read" on public.matches for select using (true);
create policy "matches admin write" on public.matches for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  role lineup_role not null default 'titular',
  sort_order int not null default 0,
  unique (match_id, player_id)
);
grant select on public.match_players to anon, authenticated;
grant insert, update, delete on public.match_players to authenticated;
grant all on public.match_players to service_role;
alter table public.match_players enable row level security;
create policy "mp read" on public.match_players for select using (true);
create policy "mp admin write" on public.match_players for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  user_id uuid not null,
  score int not null check (score between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, player_id, user_id)
);
grant select, insert, update, delete on public.ratings to authenticated;
grant all on public.ratings to service_role;
alter table public.ratings enable row level security;
create policy "ratings own read" on public.ratings for select to authenticated using (auth.uid() = user_id);
create policy "ratings own insert" on public.ratings for insert to authenticated with check (auth.uid() = user_id);
create policy "ratings own update" on public.ratings for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.motm_votes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, user_id)
);
grant select, insert, update, delete on public.motm_votes to authenticated;
grant all on public.motm_votes to service_role;
alter table public.motm_votes enable row level security;
create policy "motm own read" on public.motm_votes for select to authenticated using (auth.uid() = user_id);
create policy "motm own insert" on public.motm_votes for insert to authenticated with check (auth.uid() = user_id);
create policy "motm own update" on public.motm_votes for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "motm own delete" on public.motm_votes for delete to authenticated using (auth.uid() = user_id);

create or replace function public.validate_vote()
returns trigger language plpgsql security definer set search_path = public as $$
declare r lineup_role;
begin
  if not exists (select 1 from public.matches where id = new.match_id and voting_open) then
    raise exception 'A votação deste jogo está fechada';
  end if;
  select role into r from public.match_players where match_id = new.match_id and player_id = new.player_id;
  if r is null then raise exception 'Jogador não participou neste jogo'; end if;
  if TG_TABLE_NAME = 'motm_votes' and r = 'treinador' then
    raise exception 'O treinador não pode ser Melhor em Campo';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger ratings_validate before insert or update on public.ratings for each row execute function public.validate_vote();
create trigger motm_validate before insert or update on public.motm_votes for each row execute function public.validate_vote();

-- Results: revealed only to users who rated this match, or after voting closes
create or replace function public.get_match_results(_match_id uuid)
returns table (player_id uuid, avg_score numeric, rating_count bigint, motm_count bigint, motm_total bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (
    exists (select 1 from public.matches where id = _match_id and not voting_open)
    or exists (select 1 from public.ratings where match_id = _match_id and user_id = auth.uid())
  ) then
    return;
  end if;
  return query
  select mp.player_id,
    round(avg(r.score)::numeric, 1),
    count(r.id),
    (select count(*) from public.motm_votes m where m.match_id = _match_id and m.player_id = mp.player_id),
    (select count(*) from public.motm_votes m where m.match_id = _match_id)
  from public.match_players mp
  left join public.ratings r on r.match_id = _match_id and r.player_id = mp.player_id
  where mp.match_id = _match_id
  group by mp.player_id;
end $$;
grant execute on function public.get_match_results(uuid) to anon, authenticated;

create or replace function public.get_match_vote_counts()
returns table (match_id uuid, voters bigint)
language sql stable security definer set search_path = public as $$
  select match_id, count(distinct user_id) from public.ratings group by match_id
$$;
grant execute on function public.get_match_vote_counts() to anon, authenticated;

-- Seed squad
insert into public.players (name, position, number) values
('Anatoliy Trubin','GR',1),('Samuel Soares','GR',24),
('Amar Dedić','DEF',17),('António Silva','DEF',4),('Nicolás Otamendi','DEF',30),('Samuel Dahl','DEF',26),('Tomás Araújo','DEF',44),('Alexander Bah','DEF',6),
('Fredrik Aursnes','MED',8),('Enzo Barrenechea','MED',5),('Richard Ríos','MED',20),('Leandro Barreiro','MED',18),('Georgiy Sudakov','MED',10),('Florentino Luís','MED',61),
('Vangelis Pavlidis','AV',14),('Dodi Lukebakio','AV',11),('Andreas Schjelderup','AV',21),('Gianluca Prestianni','AV',25),('Franjo Ivanović','AV',9),
('José Mourinho','TRE',null);

insert into public.matches (slug, opponent, competition, round, kickoff, venue, is_home, benfica_goals, opponent_goals, voting_open) values
('benfica-vs-sporting-2026-10-04','Sporting CP','Liga Portugal','Jornada 7','2026-10-04 19:30+00','Estádio da Luz',true,2,1,true),
('braga-vs-benfica-2026-09-27','SC Braga','Liga Portugal','Jornada 6','2026-09-27 20:30+00','Estádio Municipal de Braga',false,0,3,false),
('benfica-vs-porto-2026-09-20','FC Porto','Liga Portugal','Jornada 5','2026-09-20 20:30+00','Estádio da Luz',true,1,1,false),
('benfica-vs-inter-2026-09-16','Inter','Liga dos Campeões','Fase de Liga · J1','2026-09-16 20:00+00','Estádio da Luz',true,2,0,false);

insert into public.match_players (match_id, player_id, role, sort_order)
select m.id, p.id,
  case when p.position = 'TRE' then 'treinador'::lineup_role
       when p.name in ('Franjo Ivanović','Gianluca Prestianni','Leandro Barreiro') then 'suplente'::lineup_role
       else 'titular'::lineup_role end,
  case p.position when 'GR' then 1 when 'DEF' then 2 when 'MED' then 3 when 'AV' then 4 else 9 end
from public.matches m
cross join public.players p
where p.name in ('Anatoliy Trubin','Amar Dedić','António Silva','Nicolás Otamendi','Samuel Dahl','Fredrik Aursnes','Enzo Barrenechea','Richard Ríos','Georgiy Sudakov','Vangelis Pavlidis','Dodi Lukebakio','Franjo Ivanović','Gianluca Prestianni','Leandro Barreiro','José Mourinho');