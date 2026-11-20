-- =============================================================
--  GARA PATATINE — schema Supabase
--  Tutti gli oggetti hanno il prefisso gp_ per convivere con
--  tabelle già esistenti nel database, senza toccarle.
--  Esecuzione: Supabase → SQL Editor → New query → Run (rieseguibile)
--  La password admin vive SOLO qui (lato server), non nel codice del sito.
-- =============================================================

-- ---------- TABELLE ----------
create table if not exists public.gp_chips (
  player_id  text primary key,
  name       text,
  image      text,               -- immagine come data URL (jpeg ridimensionato)
  updated_at timestamptz not null default now()
);

create table if not exists public.gp_votes (
  voter      text not null,
  target     text not null,
  crunch     smallint not null check (crunch    between 1 and 10),
  gusto      smallint not null check (gusto     between 1 and 10),
  una_tira   smallint not null check (una_tira  between 1 and 10),
  wow        smallint not null check (wow       between 1 and 10),
  formato    smallint not null check (formato   between 1 and 10),
  packaging  smallint not null check (packaging between 1 and 10),
  prezzo     smallint not null check (prezzo    between 1 and 10),
  party      smallint not null check (party     between 1 and 10),
  updated_at timestamptz not null default now(),
  primary key (voter, target),
  check (voter <> target)
);

-- Bonus segreto: NESSUNO può leggerlo direttamente (solo tramite funzioni)
create table if not exists public.gp_bonus (
  voter      text primary key,
  target     text not null,
  created_at timestamptz not null default now(),
  check (voter <> target)
);

create table if not exists public.gp_settings (
  id           int primary key default 1 check (id = 1),
  reveal_bonus boolean not null default false,
  bonus_count  int not null default 0,   -- quanti bonus assegnati (per il realtime)
  updated_at   timestamptz not null default now()
);
insert into public.gp_settings (id) values (1) on conflict (id) do nothing;

-- ---------- RLS ----------
alter table public.gp_chips    enable row level security;
alter table public.gp_votes    enable row level security;
alter table public.gp_bonus    enable row level security;
alter table public.gp_settings enable row level security;

drop policy if exists gp_chips_read    on public.gp_chips;
drop policy if exists gp_votes_read    on public.gp_votes;
drop policy if exists gp_votes_insert  on public.gp_votes;
drop policy if exists gp_votes_update  on public.gp_votes;
drop policy if exists gp_settings_read on public.gp_settings;

create policy gp_chips_read    on public.gp_chips    for select to anon, authenticated using (true);
create policy gp_votes_read    on public.gp_votes    for select to anon, authenticated using (true);
create policy gp_votes_insert  on public.gp_votes    for insert to anon, authenticated with check (true);
create policy gp_votes_update  on public.gp_votes    for update to anon, authenticated using (true) with check (true);
create policy gp_settings_read on public.gp_settings for select to anon, authenticated using (true);
-- gp_bonus: nessuna policy → accesso diretto negato

-- ---------- FUNZIONI ----------
create or replace function public.gp_check_pwd(pwd text)
returns void language plpgsql as $$
begin
  if pwd is distinct from 'Patatine4ever' then
    raise exception 'Password admin errata';
  end if;
end $$;
revoke all on function public.gp_check_pwd(text) from public, anon, authenticated;

create or replace function public.gp_admin_check(pwd text)
returns boolean language sql security definer set search_path = public as $$
  select pwd = 'Patatine4ever';
$$;

create or replace function public.gp_admin_set_chip(pwd text, p_player text, p_name text, p_image text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.gp_check_pwd(pwd);
  insert into public.gp_chips (player_id, name, image, updated_at)
  values (p_player, p_name, p_image, now())
  on conflict (player_id) do update
    set name = excluded.name, image = excluded.image, updated_at = now();
end $$;

create or replace function public.gp_admin_set_reveal(pwd text, p_reveal boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.gp_check_pwd(pwd);
  update public.gp_settings set reveal_bonus = p_reveal, updated_at = now() where id = 1;
end $$;

create or replace function public.gp_admin_reset(pwd text, what text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.gp_check_pwd(pwd);
  if what in ('votes', 'all') then delete from public.gp_votes where true; end if;
  if what in ('bonus', 'all') then
    delete from public.gp_bonus where true;
    update public.gp_settings set bonus_count = 0, reveal_bonus = false, updated_at = now() where id = 1;
  end if;
  if what = 'all' then delete from public.gp_chips where true; end if;
end $$;

create or replace function public.gp_cast_bonus(p_voter text, p_target text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if (select reveal_bonus from public.gp_settings where id = 1) then
    raise exception 'I bonus sono già stati rivelati';
  end if;
  insert into public.gp_bonus (voter, target) values (p_voter, p_target)
  on conflict (voter) do update set target = excluded.target, created_at = now();
  update public.gp_settings set bonus_count = (select count(*) from public.gp_bonus), updated_at = now() where id = 1;
end $$;

-- Chi ha già assegnato il bonus (senza dire a chi)
create or replace function public.gp_bonus_status()
returns table (voter text) language sql security definer set search_path = public as $$
  select b.voter from public.gp_bonus b;
$$;

-- Risultati: vuoti finché l'admin non rivela
create or replace function public.gp_bonus_results()
returns table (voter text, target text) language sql security definer set search_path = public as $$
  select b.voter, b.target from public.gp_bonus b
  where (select reveal_bonus from public.gp_settings where id = 1);
$$;

grant execute on function public.gp_admin_check(text)                      to anon, authenticated;
grant execute on function public.gp_admin_set_chip(text, text, text, text) to anon, authenticated;
grant execute on function public.gp_admin_set_reveal(text, boolean)        to anon, authenticated;
grant execute on function public.gp_admin_reset(text, text)                to anon, authenticated;
grant execute on function public.gp_cast_bonus(text, text)                 to anon, authenticated;
grant execute on function public.gp_bonus_status()                         to anon, authenticated;
grant execute on function public.gp_bonus_results()                        to anon, authenticated;

-- ---------- REALTIME (aggiunge solo le tabelle gp_) ----------
do $$
begin
  begin alter publication supabase_realtime add table public.gp_votes;    exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.gp_chips;    exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.gp_settings; exception when duplicate_object then null; end;
end $$;

-- Per vedere subito le nuove tabelle nelle API
notify pgrst, 'reload schema';
