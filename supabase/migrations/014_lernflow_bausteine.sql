-- Migration 014: LernFlow-Bausteine
--
-- Schwenk von „GameFlow" (jedes Modul = Spiel) zu „LernFlow": ein Modul ist
-- ein typisierter Baustein. Spiel ist nur EIN Typ unter mehreren; daneben gibt
-- es Erklär-/Input-Bausteine (Wissen vermitteln) und Vorwissens-/Post-Checks.
--
-- Ein Baustein bleibt eine `games`-Zeile — wir ergänzen nur zwei Spalten.
-- Bestehende Flows bleiben gültig: alle Alt-Module sind per DEFAULT 'spiel'.

ALTER TABLE games
  ADD COLUMN IF NOT EXISTS baustein_typ text NOT NULL DEFAULT 'spiel'
    CHECK (baustein_typ IN (
      'einstieg',
      'vorwissen_check',
      'input',
      'erarbeitung',
      'spiel',
      'sicherung',
      'transfer',
      'post_check'
    )),
  -- Inhalt für Nicht-Spiel-Bausteine (Erklärtext etc.). Bei 'spiel' = NULL.
  -- Form: { "markdown": string, "kernaussagen": string[], "didaktische_hinweise"?: string[] }
  ADD COLUMN IF NOT EXISTS baustein_inhalt jsonb;
