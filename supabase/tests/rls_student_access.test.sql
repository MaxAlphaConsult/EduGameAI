-- pgTAP-Test: anonymer Schüler-Zugriff nach Migration 022/023.
--
-- Ausführen mit:  supabase test db
--
-- Bis 023 sicherte dieser Test die anon-Lesepolicies aus 017 auf game_flows und
-- classes ab. Die gibt es nicht mehr: Der Schüler-Login läuft über
-- SECURITY-DEFINER-Funktionen (022), und anon liest keine Tabelle mit
-- Schülerdaten mehr direkt (023). Der Test prüft jetzt genau das:
--   1. RLS ist auf allen Tabellen mit Schülerdaten aktiv.
--   2. Keine Policy auf diesen Tabellen gilt für anon oder für alle Rollen
--      (roles = {public}) mit einer Bedingung, die immer wahr ist.
--   3. Die Schüler-Funktionen existieren und sind SECURITY DEFINER.
--   4. Die Lehrer-Policies sind weiterhin vorhanden.
--
-- Bewusst introspektiv. Das Verhalten (wer welche Zeile sieht) prüft
-- `npm run verify:rls` mit Testdaten über alle Migrationen.

begin;
select plan(14);

-- 1. RLS aktiv
select ok((select relrowsecurity from pg_class where oid = 'public.students'::regclass), 'RLS auf students aktiv');
select ok((select relrowsecurity from pg_class where oid = 'public.student_sessions'::regclass), 'RLS auf student_sessions aktiv');
select ok((select relrowsecurity from pg_class where oid = 'public.module_sessions'::regclass), 'RLS auf module_sessions aktiv');
select ok((select relrowsecurity from pg_class where oid = 'public.answers'::regclass), 'RLS auf answers aktiv');
select ok((select relrowsecurity from pg_class where oid = 'public.flow_releases'::regclass), 'RLS auf flow_releases aktiv');

-- 2. Keine offene Policy auf Tabellen mit Schülerdaten oder Zugangscodes
select is(
  (select count(*)::int from pg_policies
    where schemaname = 'public'
      and tablename in ('students', 'student_sessions', 'module_sessions', 'answers', 'flow_releases', 'classes', 'game_flows')
      and ('anon' = any(roles) or 'public' = any(roles))
      and (coalesce(qual, '') = 'true' or coalesce(with_check, '') = 'true')),
  0,
  'keine Policy mit USING/WITH CHECK (true) für anon oder alle Rollen'
);
select is(
  (select count(*)::int from pg_policies
    where schemaname = 'public'
      and tablename in ('students', 'student_sessions', 'module_sessions', 'answers', 'flow_releases', 'classes', 'game_flows')
      and 'anon' = any(roles)),
  0,
  'keine Policy für die Rolle anon auf diesen Tabellen'
);

-- 3. Schüler-Funktionen
select ok(
  (select prosecdef from pg_proc where proname = 'schueler_flow_suchen'),
  'schueler_flow_suchen ist SECURITY DEFINER'
);
select ok(
  (select prosecdef from pg_proc where proname = 'schueler_sitzung_oeffnen'),
  'schueler_sitzung_oeffnen ist SECURITY DEFINER'
);
select ok(
  (select prosecdef from pg_proc where proname = 'schueler_modul_weiter'),
  'schueler_modul_weiter ist SECURITY DEFINER'
);
select ok(
  (select prosecdef from pg_proc where proname = 'schueler_antwort_speichern'),
  'schueler_antwort_speichern ist SECURITY DEFINER'
);
select ok(
  (select prosecdef from pg_proc where proname = 'validate_student_code'),
  'validate_student_code ist SECURITY DEFINER'
);

-- 4. Lehrer-Policies bleiben
select ok(
  exists (select 1 from pg_policies where tablename = 'student_sessions' and policyname = 'student_sessions_lehrer_read'),
  'Lehrer-Policy auf student_sessions existiert'
);
select ok(
  exists (select 1 from pg_policies where tablename = 'classes' and policyname = 'lehrer_own_classes'),
  'Lehrer-Policy auf classes existiert'
);

select * from finish();
rollback;
