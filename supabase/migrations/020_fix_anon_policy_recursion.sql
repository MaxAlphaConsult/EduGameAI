-- 020: Behebt unendliche RLS-Rekursion (Postgres 42P17) aus Migration 017.
--
-- Problem: 017 gab den `classes`/`game_flows`-anon-Policies EXISTS-Subqueries auf
-- `flow_releases`. `flow_releases` hat aber eine Policy (`flow_releases_lehrer_all`,
-- Migration 010), die ihrerseits `classes` abfragt. Für die Rolle `anon` entsteht so
-- ein Zyklus classes → flow_releases → classes (bzw. game_flows → flow_releases),
-- den Postgres mit "infinite recursion detected in policy" abbricht. Folge: der
-- Schüler-Login (anon) scheitert mit 404. (Lehrkräfte sind nicht betroffen, da die
-- `TO anon`-Policies für sie nicht greifen.)
--
-- Fix: Die "gibt es ein aktives Release?"-Prüfung läuft über SECURITY-DEFINER-
-- Funktionen, die `flow_releases` OHNE RLS lesen — damit triggert die Policy keine
-- weitere RLS-Auswertung und der Zyklus ist gebrochen. Verhalten bleibt identisch:
-- anon sieht game_flows/classes nur, wenn ein aktives Release existiert.

CREATE OR REPLACE FUNCTION public.has_active_release_for_class(p_class_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM flow_releases WHERE class_id = p_class_id AND status = 'aktiv')
$$;

CREATE OR REPLACE FUNCTION public.has_active_release_for_flow(p_flow_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM flow_releases WHERE game_flow_id = p_flow_id AND status = 'aktiv')
$$;

REVOKE ALL ON FUNCTION public.has_active_release_for_class(uuid) FROM public;
REVOKE ALL ON FUNCTION public.has_active_release_for_flow(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.has_active_release_for_class(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_release_for_flow(uuid) TO anon, authenticated;

-- Policies aus 017 rekursionsfrei neu fassen.
DROP POLICY IF EXISTS "game_flows_anon_read_released" ON game_flows;
CREATE POLICY "game_flows_anon_read_released" ON game_flows
  FOR SELECT TO anon
  USING (public.has_active_release_for_flow(id));

DROP POLICY IF EXISTS "classes_anon_read_released" ON classes;
CREATE POLICY "classes_anon_read_released" ON classes
  FOR SELECT TO anon
  USING (public.has_active_release_for_class(id));
