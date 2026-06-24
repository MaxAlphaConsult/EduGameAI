-- 017: Schmaler anonymer Lesezugriff auf game_flows & classes — NUR für Inhalte
-- mit einem AKTIVEN flow_release.
--
-- Grund: Der Schüler-Login (Stufe 1, /api/student/lookup) liest flow_releases
-- und bettet dabei game_flows(titel) + classes(...) ein. Diese beiden Tabellen
-- hatten bisher ausschließlich Lehrer-Policies (auth.uid()). Für den NICHT
-- eingeloggten Schüler (Rolle `anon`) lieferten die Embeds darum NULL, und der
-- Endpoint brach mit "Flow-Daten unvollständig" (500) ab — der gemeldete
-- Login-Fehler.
--
-- Diese Policies sind ADDITIV (RLS ist permissive → OR-verknüpft): Die
-- bestehenden Lehrer-Policies bleiben unverändert. Wir öffnen RLS NICHT
-- pauschal, sondern strikt zeilenscharf:
--   * Rolle ausschließlich `anon` (eingeloggte Lehrkräfte sehen weiterhin nur
--     ihre eigenen Zeilen über die bestehende Policy — kein Lehrer-zu-Lehrer-Leak).
--   * nur Zeilen, für die ein flow_release mit status='aktiv' existiert.
-- Damit ist anon-Sichtbarkeit exakt auf das beschränkt, was eine Lehrkraft
-- bewusst für eine Klasse freigegeben hat.

DROP POLICY IF EXISTS "game_flows_anon_read_released" ON game_flows;
CREATE POLICY "game_flows_anon_read_released" ON game_flows
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM flow_releases fr
      WHERE fr.game_flow_id = game_flows.id
        AND fr.status = 'aktiv'
    )
  );

DROP POLICY IF EXISTS "classes_anon_read_released" ON classes;
CREATE POLICY "classes_anon_read_released" ON classes
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM flow_releases fr
      WHERE fr.class_id = classes.id
        AND fr.status = 'aktiv'
    )
  );
