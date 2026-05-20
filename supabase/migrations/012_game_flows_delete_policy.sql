-- Migration 012: DELETE-Policy für game_flows
--
-- Der ursprüngliche Policy-Satz aus 009_einheiten.sql enthält nur SELECT/INSERT/UPDATE.
-- Damit eine Lehrkraft ein Lernspiel aus dem Dashboard löschen kann, brauchen wir
-- zusätzlich eine DELETE-Policy.
--
-- Cascading-Verhalten (über bestehende FKs):
--   * flow_releases.game_flow_id ON DELETE CASCADE  → Releases werden mitgelöscht
--   * student_sessions.flow_release_id ON DELETE CASCADE → Sessions weg
--   * module_sessions.student_session_id ON DELETE CASCADE → Modul-Sessions weg
--   * answers.module_session_id ON DELETE CASCADE → Antworten weg
--
-- Achtung: games.game_flow_id ist ON DELETE SET NULL. Die zugehörigen Module
-- bleiben also als verwaiste games-Zeilen liegen. Das Aufräumen passiert
-- bewusst auf API-Ebene (delete-Endpoint löscht erst die games, dann den Flow),
-- damit die Lehrkraft sehen kann, wenn etwas schiefläuft.

DROP POLICY IF EXISTS "Lehrer löscht eigene GameFlows" ON game_flows;
CREATE POLICY "Lehrer löscht eigene GameFlows"
  ON game_flows FOR DELETE
  USING (lehrer_id = auth.uid());
