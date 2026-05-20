-- Migration 010: GameFlow-Architektur
--
-- Aus mehreren generierten Einzelspielen wird ein zusammenhängender GameFlow.
-- Die Lehrkraft gibt einen ganzen Flow für eine Klasse frei (FlowRelease) und
-- erhält dafür einen klassenweiten Access-Code. Schüler:innen tippen diesen
-- Code + ihren persönlichen Tier-Code und durchlaufen alle Module in einer
-- vom System sortierten Reihenfolge (leicht → schwer). Pro Modul legt das
-- System das Differenzierungsniveau fest — keine freie Auswahl mehr.
--
-- Strategie:
--   * einheiten → game_flows umbenennen (Schema-Erweiterung)
--   * class_games entfällt, ersetzt durch flow_releases
--   * student_sessions wird Flow-Session, neue Tabelle module_sessions trägt
--     die Modul-spezifischen Felder. Antworten hängen ab jetzt an module_sessions.
--
-- Diese Migration ist **idempotent** und wickelt sich in einer expliziten
-- Transaktion ab — sie kann nach einer Teil-Ausführung gefahrlos erneut
-- gestartet werden.
--
-- Verlust: alte class_games-Zuweisungen, alte student_sessions samt
-- zugehöriger answers werden verworfen (kein Produktiveinsatz bisher).

BEGIN;

-- ============================================================
-- 0. Alte abhängige Policies droppen
--    Sie referenzieren student_sessions.spiel_id bzw. answers.session_id
--    und blockieren sonst die Spalten-Drops weiter unten.
-- ============================================================
DROP POLICY IF EXISTS "lehrer_read_answers" ON answers;
DROP POLICY IF EXISTS "schueler_own_answers" ON answers;
DROP POLICY IF EXISTS "answers_anon_insert" ON answers;
DROP POLICY IF EXISTS "answers_lehrer_read" ON answers;

DROP POLICY IF EXISTS "schueler_own_session" ON student_sessions;
DROP POLICY IF EXISTS "schueler_insert_session" ON student_sessions;
DROP POLICY IF EXISTS "sessions_anon_insert" ON student_sessions;
DROP POLICY IF EXISTS "sessions_anon_select" ON student_sessions;
DROP POLICY IF EXISTS "student_sessions_anon_insert" ON student_sessions;
DROP POLICY IF EXISTS "student_sessions_anon_select" ON student_sessions;
DROP POLICY IF EXISTS "student_sessions_anon_update" ON student_sessions;
DROP POLICY IF EXISTS "student_sessions_lehrer_read" ON student_sessions;

-- ============================================================
-- 1. einheiten → game_flows umbenennen + Spalten ergänzen
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'einheiten'
  ) THEN
    ALTER TABLE einheiten RENAME TO game_flows;
  END IF;
END$$;

ALTER TABLE game_flows ADD COLUMN IF NOT EXISTS sortiert_am timestamptz;

-- ============================================================
-- 2. games.einheit_id → games.game_flow_id
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'games' AND column_name = 'einheit_id'
  ) THEN
    ALTER TABLE games RENAME COLUMN einheit_id TO game_flow_id;
  END IF;
END$$;

-- games.reihenfolge bleibt: didaktische Modul-Position (1..N) innerhalb des Flows.

-- ============================================================
-- 3. class_games entfernen — ersetzt durch flow_releases
-- ============================================================
DROP TABLE IF EXISTS class_games CASCADE;

CREATE TABLE IF NOT EXISTS flow_releases (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_flow_id  uuid NOT NULL REFERENCES game_flows(id) ON DELETE CASCADE,
  class_id      uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  access_code   text NOT NULL UNIQUE,
  status        text NOT NULL DEFAULT 'aktiv' CHECK (status IN ('aktiv', 'archiviert')),
  released_at   timestamptz NOT NULL DEFAULT now(),
  archived_at   timestamptz,
  UNIQUE(game_flow_id, class_id)
);

CREATE INDEX IF NOT EXISTS flow_releases_access_code_idx ON flow_releases(access_code);
CREATE INDEX IF NOT EXISTS flow_releases_class_id_idx ON flow_releases(class_id);

ALTER TABLE flow_releases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "flow_releases_lehrer_all" ON flow_releases;
CREATE POLICY "flow_releases_lehrer_all" ON flow_releases
  FOR ALL USING (
    class_id IN (SELECT id FROM classes WHERE lehrer_id = auth.uid())
  );

DROP POLICY IF EXISTS "flow_releases_anon_read" ON flow_releases;
CREATE POLICY "flow_releases_anon_read" ON flow_releases
  FOR SELECT USING (status = 'aktiv');

-- ============================================================
-- 4. Alte Daten weg, student_sessions Schema umbauen
--    Reihenfolge: erst TRUNCATE (RLS-frei nach Policy-Drop), dann
--    Spalten droppen, dann neue Spalten anlegen.
-- ============================================================
TRUNCATE TABLE answers CASCADE;
TRUNCATE TABLE student_sessions CASCADE;

ALTER TABLE student_sessions DROP COLUMN IF EXISTS spiel_id;
ALTER TABLE student_sessions DROP COLUMN IF EXISTS differenzierungsniveau;
ALTER TABLE student_sessions DROP COLUMN IF EXISTS klasse_id;

-- Check-Constraint aus Migration 002 hängt an differenzierungsniveau — sicher entfernen
ALTER TABLE student_sessions
  DROP CONSTRAINT IF EXISTS student_sessions_differenzierungsniveau_check;

ALTER TABLE student_sessions
  ADD COLUMN IF NOT EXISTS flow_release_id uuid REFERENCES flow_releases(id) ON DELETE CASCADE;
ALTER TABLE student_sessions
  ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES students(id) ON DELETE SET NULL;
ALTER TABLE student_sessions
  ADD COLUMN IF NOT EXISTS aktuelles_modul_index int NOT NULL DEFAULT 0;
ALTER TABLE student_sessions
  ADD COLUMN IF NOT EXISTS modul_anzahl int NOT NULL DEFAULT 0;

-- NOT NULL für flow_release_id (sicher, da TRUNCATE darüber)
ALTER TABLE student_sessions ALTER COLUMN flow_release_id SET NOT NULL;

COMMENT ON COLUMN student_sessions.code IS 'Persönlicher Tier-Code der Schüler:in (FUCHS-1234)';
COMMENT ON COLUMN student_sessions.aktuelles_modul_index IS '0-basierter Index des aktuell laufenden Moduls';

-- Unique: gleiche/r Schüler:in startet pro Release maximal eine Session
CREATE UNIQUE INDEX IF NOT EXISTS student_sessions_release_student_idx
  ON student_sessions(flow_release_id, student_id)
  WHERE student_id IS NOT NULL;

-- ============================================================
-- 5. module_sessions: pro Modul-Durchlauf ein Eintrag
-- ============================================================
CREATE TABLE IF NOT EXISTS module_sessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_session_id  uuid NOT NULL REFERENCES student_sessions(id) ON DELETE CASCADE,
  game_id             uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  position            int NOT NULL,
  niveau              text NOT NULL CHECK (niveau IN ('leichter', 'mittel', 'schwer', 'sehr_schwer')),
  status              text NOT NULL DEFAULT 'laufend' CHECK (status IN ('laufend', 'abgeschlossen')),
  gestartet_am        timestamptz NOT NULL DEFAULT now(),
  abgeschlossen_am    timestamptz,
  UNIQUE(student_session_id, position)
);

CREATE INDEX IF NOT EXISTS module_sessions_student_session_idx ON module_sessions(student_session_id);
CREATE INDEX IF NOT EXISTS module_sessions_game_idx ON module_sessions(game_id);

ALTER TABLE module_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "module_sessions_lehrer_read" ON module_sessions;
CREATE POLICY "module_sessions_lehrer_read" ON module_sessions
  FOR SELECT USING (
    game_id IN (SELECT id FROM games WHERE lehrer_id = auth.uid())
  );

DROP POLICY IF EXISTS "module_sessions_anon_insert" ON module_sessions;
CREATE POLICY "module_sessions_anon_insert" ON module_sessions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "module_sessions_anon_select" ON module_sessions;
CREATE POLICY "module_sessions_anon_select" ON module_sessions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "module_sessions_anon_update" ON module_sessions;
CREATE POLICY "module_sessions_anon_update" ON module_sessions
  FOR UPDATE USING (true);

-- ============================================================
-- 6. answers: session_id → module_session_id
-- ============================================================
ALTER TABLE answers DROP COLUMN IF EXISTS session_id;
ALTER TABLE answers
  ADD COLUMN IF NOT EXISTS module_session_id uuid REFERENCES module_sessions(id) ON DELETE CASCADE;

-- NOT NULL für module_session_id (sicher, da TRUNCATE darüber)
ALTER TABLE answers ALTER COLUMN module_session_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS answers_module_session_idx ON answers(module_session_id);

CREATE POLICY "answers_anon_insert" ON answers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "answers_lehrer_read" ON answers
  FOR SELECT USING (
    module_session_id IN (
      SELECT ms.id FROM module_sessions ms
      JOIN games g ON g.id = ms.game_id
      WHERE g.lehrer_id = auth.uid()
    )
  );

-- ============================================================
-- 7. Neue student_sessions-Policies
-- ============================================================
CREATE POLICY "student_sessions_anon_insert" ON student_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "student_sessions_anon_select" ON student_sessions
  FOR SELECT USING (true);

CREATE POLICY "student_sessions_anon_update" ON student_sessions
  FOR UPDATE USING (true);

CREATE POLICY "student_sessions_lehrer_read" ON student_sessions
  FOR SELECT USING (
    flow_release_id IN (
      SELECT fr.id FROM flow_releases fr
      JOIN classes c ON c.id = fr.class_id
      WHERE c.lehrer_id = auth.uid()
    )
  );

COMMIT;
