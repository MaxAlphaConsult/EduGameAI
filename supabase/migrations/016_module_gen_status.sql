-- 016: Per-Modul-Generierungs-Lifecycle.
--
-- Grund: /api/analyze plant nur noch (Analyse + Sequenz) und legt PLATZHALTER-
-- Module an; jedes Modul wird danach in einem EIGENEN Lambda generiert
-- (/api/games/[id]/generate). gen_status verfolgt diesen Lebenszyklus pro Modul.
--
-- Bewusst getrennt von games.status (entwurf/geprueft/freigegeben = redaktioneller
-- Freigabe-Status) — das ist orthogonal zur Generierung.
alter table games add column if not exists gen_status text not null default 'ready'
  check (gen_status in ('pending', 'generating', 'ready', 'gen_error'));
alter table games add column if not exists gen_error text;

-- DEFAULT 'ready' hält alle bereits existierenden Module gültig (sie sind fertig);
-- nur neue Platzhalter setzen explizit 'pending'.
create index if not exists idx_games_flow_gen on games (game_flow_id, gen_status);
