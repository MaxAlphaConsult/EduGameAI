-- Migration 011: Pipeline-Outputs persistieren für asynchrone Validierung
--
-- Bisher lief der Lehrkraft-Check synchron im selben Lambda wie die
-- Spiel-Generierung. Bei 4-6 Spielen führte das zu 4-6 zusätzlichen
-- LLM-Calls in Reihe — die Pipeline kratzte regelmäßig am Vercel-300s-Limit
-- und blockierte auch dann, wenn nur EIN Validate-Call hing.
--
-- Lösung: Pipeline schreibt ihre Outputs in die DB, Validierung läuft als
-- separate, fire-and-forget aufgerufene Serverless-Function. Pro Spiel
-- ein eigenes Lambda mit eigenem Timeout — keine gegenseitige Blockade mehr.

BEGIN;

-- analyses.raw_output enthält jetzt die rohen Pipeline-Outputs als JSON-Blob
-- { analyse, lernziel, lernpfad, spielmapping }. Spalte existiert bereits in
-- Migration 001, war aber bisher ungenutzt.
COMMENT ON COLUMN analyses.raw_output IS
  'Rohe Pipeline-Outputs der Schritte 1–13 als JSON-Blob: { analyse, lernziel, lernpfad, spielmapping }. Wird für asynchrone Validierung benötigt.';

-- games.spiel_output: rohes SpielOutput aus generateGame (Schritte 11–16) —
-- wird zur asynchronen Validierung benötigt.
ALTER TABLE games ADD COLUMN IF NOT EXISTS spiel_output jsonb;

COMMENT ON COLUMN games.spiel_output IS
  'Rohes SpielOutput aus der Pipeline (Schritte 11–16). Wird zur asynchronen Lehrkraft-Validierung benötigt.';

COMMIT;
