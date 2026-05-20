-- Migration 013: Flow-weiter Lehrkraft-Check
--
-- Bisher: pro game (Modul) ein lehrkraft_checks-Eintrag mit Ampel + Hinweisen.
-- Das hat die Module isoliert bewertet — Wissen, das ein Modul aufbaut und
-- ein anderes prüft, wurde im prüfenden Modul oft als „fehlend" markiert.
--
-- Jetzt: ein Check pro Flow (game_flows). Bewertet alle Module gemeinsam
-- gegen das eine Lernziel des Flows. Lückenfindung, Modulrollen, Redundanzen
-- werden Flow-übergreifend bestimmt.
--
-- Wir speichern das Ergebnis direkt als jsonb auf game_flows, damit kein
-- separater Polling-Endpoint mit join nötig ist und ein Force-Recompute
-- einfach durch Spalten-Update funktioniert.

ALTER TABLE game_flows
  ADD COLUMN IF NOT EXISTS flow_check jsonb,
  ADD COLUMN IF NOT EXISTS flow_check_status text DEFAULT 'idle'
    CHECK (flow_check_status IN ('idle', 'pending', 'fertig', 'fehler')),
  ADD COLUMN IF NOT EXISTS flow_check_aktualisiert_am timestamptz;
