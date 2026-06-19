-- ============================================================
-- Application Barbu — Schéma Supabase
-- Exécuter dans l'éditeur SQL de Supabase
-- ============================================================

-- Sessions de jeu
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  player_count int not null check (player_count between 3 and 6),
  status text not null default 'active' check (status in ('active', 'paused', 'completed')),
  -- 'sequential' = un joueur fait tous ses contrats d'un coup
  -- 'interleaved' = chaque joueur choisit un contrat à son tour
  contract_mode text not null default 'sequential' check (contract_mode in ('sequential', 'interleaved')),
  -- Joueur tiré au sort pour la première donne
  first_drawer_position int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Joueurs dans une session
create table public.session_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  name text not null,
  position int not null, -- index 0-based (CCW autour de la table)
  created_at timestamptz not null default now(),
  unique(session_id, position)
);

-- Tours (un tour = un meneur + un contrat joué)
-- En mode 'interleaved', contract peut être null jusqu'à ce que le meneur choisisse
create table public.rounds (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  round_index int not null,       -- 0-based, ordre global
  meneur_position int not null,   -- position du meneur (0..n-1)
  contract text check (            -- null en mode interleaved jusqu'au choix
    contract in ('barbu','coeurs','dames','plis','dernier','salade','reussite')
  ),
  completed_at timestamptz,       -- null = pas encore joué
  unique(session_id, round_index)
);

-- Scores par joueur par tour
create table public.round_scores (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  player_position int not null,
  score int not null default 0,   -- score déjà avec double meneur appliqué
  unique(round_id, player_position)
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.sessions enable row level security;
alter table public.session_players enable row level security;
alter table public.rounds enable row level security;
alter table public.round_scores enable row level security;

create policy "owner_all_sessions" on public.sessions
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "owner_all_players" on public.session_players
  for all using (
    exists (select 1 from public.sessions s where s.id = session_id and s.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.sessions s where s.id = session_id and s.owner_id = auth.uid())
  );

create policy "owner_all_rounds" on public.rounds
  for all using (
    exists (select 1 from public.sessions s where s.id = session_id and s.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.sessions s where s.id = session_id and s.owner_id = auth.uid())
  );

create policy "owner_all_scores" on public.round_scores
  for all using (
    exists (
      select 1 from public.rounds r
      join public.sessions s on s.id = r.session_id
      where r.id = round_id and s.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.rounds r
      join public.sessions s on s.id = r.session_id
      where r.id = round_id and s.owner_id = auth.uid()
    )
  );

-- ============================================================
-- Trigger updated_at sur sessions
-- ============================================================

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger sessions_updated_at
  before update on public.sessions
  for each row execute function public.handle_updated_at();
