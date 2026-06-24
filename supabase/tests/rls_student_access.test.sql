-- pgTAP-Test für Migration 017: anonymer Schüler-Lesezugriff.
--
-- Ausführen mit:  supabase test db
--
-- Prüft die sicherheitskritischen Eigenschaften der anon-RLS-Policies auf
-- game_flows & classes:
--   1. RLS ist auf beiden Tabellen aktiv.
--   2. Es gibt je eine SELECT-Policy für die Rolle `anon`.
--   3. Diese Policies sind strikt auf Zeilen mit einem AKTIVEN flow_release
--      begrenzt (Definition referenziert flow_releases + 'aktiv').
--   4. Die bestehenden Lehrer-Policies sind weiterhin vorhanden — die anon-
--      Policies sind ADDITIV und weichen RLS nicht pauschal auf.
--
-- Bewusst introspektiv (über pg_policies/pg_class) statt seed-basiert: läuft
-- ohne aufwändiges Anlegen von auth.users/materials/… deterministisch durch und
-- guardet genau das, was Migration 017 garantieren muss. Ein behavioraler
-- Seed-Test kann später ergänzt werden.

begin;
select plan(8);

-- 1. RLS aktiv
select ok(
  (select relrowsecurity from pg_class where oid = 'public.game_flows'::regclass),
  'RLS ist auf game_flows aktiv'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.classes'::regclass),
  'RLS ist auf classes aktiv'
);

-- 2./3. anon-SELECT-Policy auf game_flows, begrenzt auf aktive Releases
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'game_flows'
      and policyname = 'game_flows_anon_read_released'
      and cmd = 'SELECT' and 'anon' = any(roles)
  ),
  'anon-SELECT-Policy auf game_flows existiert (Rolle anon)'
);
select ok(
  exists (
    select 1 from pg_policies
    where tablename = 'game_flows' and policyname = 'game_flows_anon_read_released'
      and qual ilike '%flow_releases%' and qual ilike '%aktiv%'
  ),
  'game_flows-Policy ist auf aktive Releases begrenzt'
);

-- 2./3. dasselbe für classes
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'classes'
      and policyname = 'classes_anon_read_released'
      and cmd = 'SELECT' and 'anon' = any(roles)
  ),
  'anon-SELECT-Policy auf classes existiert (Rolle anon)'
);
select ok(
  exists (
    select 1 from pg_policies
    where tablename = 'classes' and policyname = 'classes_anon_read_released'
      and qual ilike '%flow_releases%' and qual ilike '%aktiv%'
  ),
  'classes-Policy ist auf aktive Releases begrenzt'
);

-- 4. Bestehende Lehrer-Policies bleiben erhalten (additiv, nicht aufgeweicht)
select ok(
  exists (select 1 from pg_policies where tablename = 'classes' and policyname = 'lehrer_own_classes'),
  'Lehrer-Policy auf classes existiert weiterhin'
);
select ok(
  exists (select 1 from pg_policies where tablename = 'game_flows' and policyname = 'Lehrer sieht eigene Einheiten'),
  'Lehrer-SELECT-Policy auf game_flows existiert weiterhin'
);

select * from finish();
rollback;
