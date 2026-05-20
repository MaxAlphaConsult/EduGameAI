-- Migration 010: Sourcemapping (Schritt 20) und Reduktionen (Schritt 17) persistieren
--
-- Beide Pipeline-Schritte wurden bisher generiert, aber nicht gespeichert.
-- Für die Sourcemapping-UI brauchen wir die strukturierten Daten in der DB.

ALTER TABLE lehrkraft_checks
  ADD COLUMN IF NOT EXISTS sourcemapping jsonb,
  ADD COLUMN IF NOT EXISTS reduktionen   jsonb;

COMMENT ON COLUMN lehrkraft_checks.sourcemapping IS
  'Schritt 20: abdeckung_lernziel, spielfunktion, elemente[{aufgabe_id, abschnitt_ref, ursprung, hinweis?}]';

COMMENT ON COLUMN lehrkraft_checks.reduktionen IS
  'Schritt 17: reduktion_vorhanden, reduktionen[{element, original_aussage, reduzierte_form, status, begruendung, transparent_markiert}]';
