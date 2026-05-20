-- EduGame AI — Initial Database Schema
-- Ausführen in: Supabase Dashboard → SQL Editor

-- UUID Extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- MATERIALS — Hochgeladene Unterrichtsmaterialien
-- ============================================================
create table materials (
  id uuid primary key default uuid_generate_v4(),
  lehrer_id uuid references auth.users(id) on delete cascade not null,
  dateiname text not null,
  datei_url text,
  extrahierter_text text not null,
  abschnitte jsonb not null default '[]',
  fach text not null,
  jahrgangsstufe text not null,
  schulform text not null,
  erstellt_am timestamptz default now()
);

-- ============================================================
-- ANALYSES — Ergebnisse der 21-Schritt-Pipeline (Schritte 1–10)
-- ============================================================
create table analyses (
  id uuid primary key default uuid_generate_v4(),
  material_id uuid references materials(id) on delete cascade not null,
  zusammenfassung text,
  kernaussagen jsonb default '[]',
  wissensform_primaer text,
  wissensform_sekundaer jsonb default '[]',
  lernform_primaer text,
  lernform_sekundaer text,
  wissensstruktur text,
  denkhandlungen jsonb default '[]',
  komplexitaetsstufe int,
  lernziel_original text,
  lernziel_mvp_variante text,
  spielbarkeit_ampel text check (spielbarkeit_ampel in ('gruen', 'gelb', 'rot')),
  spielbarer_anteil text,
  nicht_spielbarer_anteil text,
  antwortformat_primaer text,
  antwortformat_sekundaer text,
  spielfunktion text,
  abdeckung jsonb default '{"vollstaendig":[],"teilweise":[],"nicht_abgedeckt":[]}',
  raw_output jsonb,
  erstellt_am timestamptz default now()
);

-- ============================================================
-- GAMES — Generierte Spielmodule (Schritte 11–16)
-- ============================================================
create table games (
  id uuid primary key default uuid_generate_v4(),
  analyse_id uuid references analyses(id) on delete cascade not null,
  lehrer_id uuid references auth.users(id) on delete cascade not null,
  titel text,
  spieltyp_didaktisch text,
  game_engine text,
  game_skin text,
  aufgaben jsonb default '[]',
  zeitregelung_sekunden int,
  zeitdruck_aktiv boolean default false,
  status text default 'entwurf' check (status in ('entwurf', 'geprueft', 'freigegeben')),
  erstellt_am timestamptz default now()
);

-- ============================================================
-- LEHRKRAFT_CHECKS — Ampellogik-Ausgabe (Schritt 21)
-- ============================================================
create table lehrkraft_checks (
  id uuid primary key default uuid_generate_v4(),
  spiel_id uuid references games(id) on delete cascade not null,
  gesamtampel text check (gesamtampel in ('gruen', 'gelb', 'rot')),
  lernziel_original text,
  lernziel_mvp_variante text,
  dimensionen jsonb,
  lernzielanteile jsonb,
  spielfunktion text,
  hinweise_fuer_lehrkraft jsonb default '[]',
  begruendung_anpassungen text,
  signoff_lehrkraft boolean default false,
  raw_output jsonb,
  erstellt_am timestamptz default now()
);

-- ============================================================
-- CLASSES — Lehrerklassen
-- ============================================================
create table classes (
  id uuid primary key default uuid_generate_v4(),
  lehrer_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  jahrgangsstufe text,
  fach text,
  erstellt_am timestamptz default now()
);

-- ============================================================
-- STUDENT_SESSIONS — Schüler-Sessions (kein Login, nur Code)
-- ============================================================
create table student_sessions (
  id uuid primary key default uuid_generate_v4(),
  spiel_id uuid references games(id) on delete cascade not null,
  klasse_id uuid references classes(id) on delete set null,
  code text not null,                    -- Tiername + Zufallscode, kein Klarname
  differenzierungsniveau text default 'standard' check (differenzierungsniveau in ('basis', 'standard', 'schwer')),
  lernpfad_abgeschlossen boolean default false,
  gestartet_am timestamptz default now(),
  abgeschlossen_am timestamptz
);

-- ============================================================
-- ANSWERS — Schülerantworten
-- ============================================================
create table answers (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references student_sessions(id) on delete cascade not null,
  aufgabe_id text not null,              -- z.B. "Q1"
  antwort_wert text,
  status text check (status in ('korrekt', 'teilweise_korrekt', 'falsch', 'nicht_bearbeitet')),
  versuche int default 1,
  hilfen_genutzt int default 0,
  bearbeitungszeit_sekunden int,
  ausgeloestes_feedback text,
  abgebrochen boolean default false,
  erstellt_am timestamptz default now()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

alter table materials enable row level security;
alter table analyses enable row level security;
alter table games enable row level security;
alter table lehrkraft_checks enable row level security;
alter table classes enable row level security;
alter table student_sessions enable row level security;
alter table answers enable row level security;

-- Lehrer sieht nur seine eigenen Daten
create policy "lehrer_own_materials" on materials for all using (auth.uid() = lehrer_id);
create policy "lehrer_own_analyses" on analyses for all using (
  exists (select 1 from materials where id = analyses.material_id and lehrer_id = auth.uid())
);
create policy "lehrer_own_games" on games for all using (auth.uid() = lehrer_id);
create policy "lehrer_own_checks" on lehrkraft_checks for all using (
  exists (select 1 from games where id = lehrkraft_checks.spiel_id and lehrer_id = auth.uid())
);
create policy "lehrer_own_classes" on classes for all using (auth.uid() = lehrer_id);

-- Schüler können ihre eigene Session lesen/schreiben (nur mit korrektem Code)
create policy "schueler_own_session" on student_sessions for select using (true);
create policy "schueler_insert_session" on student_sessions for insert with check (true);
create policy "schueler_own_answers" on answers for insert with check (true);
create policy "lehrer_read_answers" on answers for select using (
  exists (
    select 1 from student_sessions s
    join games g on g.id = s.spiel_id
    where s.id = answers.session_id and g.lehrer_id = auth.uid()
  )
);

-- Freigegebene Spiele sind ohne Login spielbar
create policy "public_play_freigegeben" on games for select using (status = 'freigegeben');
