-- 023: Offene anon-Policies auf Schülerdaten entfernen.
--
-- Erst anwenden, wenn der Code mit den Funktionen aus 022 auf Prod läuft.
-- Vorher würde der Schüler-Login der laufenden Version brechen, weil sie noch
-- direkt auf die Tabellen zugreift.
--
-- Was danach gilt:
--   * student_sessions, module_sessions: anon sieht und ändert nichts mehr.
--     Lehrkräfte sehen nur noch die Sitzungen ihrer eigenen Klassen
--     (student_sessions_lehrer_read, module_sessions_lehrer_read aus 010).
--     Die entfernten Policies standen ohne `TO anon` und galten deshalb auch
--     zwischen Lehrkräften.
--   * answers: anon schreibt nur noch über schueler_antwort_speichern.
--   * flow_releases: anon liest keine Zeile und keinen access_code mehr; der
--     Login läuft über schueler_flow_suchen.
--   * classes, game_flows: die anon-Lesepolicies aus 017/020 werden nicht
--     mehr gebraucht, weil schueler_flow_suchen die Einbettung ersetzt. Damit
--     sieht anon auch Klassennamen und lehrer_id nicht mehr.
--
-- Unverändert: games bleibt für anon lesbar, solange status = 'freigegeben'
-- (Spielinhalte, keine personenbezogenen Daten). has_active_release_for_*
-- (020) bleiben bestehen, werden aber von keiner Policy mehr benutzt.
--
-- Die Namen decken auch ältere Fassungen aus 001/005 ab, falls auf Prod noch
-- eine davon steht (DROP IF EXISTS schadet sonst nicht).
--
-- Nicht additiv: entfernt Zugriffsrechte. Kein Datenverlust.

-- student_sessions
DROP POLICY IF EXISTS "schueler_own_session" ON student_sessions;
DROP POLICY IF EXISTS "schueler_insert_session" ON student_sessions;
DROP POLICY IF EXISTS "sessions_anon_insert" ON student_sessions;
DROP POLICY IF EXISTS "sessions_anon_select" ON student_sessions;
DROP POLICY IF EXISTS "student_sessions_anon_insert" ON student_sessions;
DROP POLICY IF EXISTS "student_sessions_anon_select" ON student_sessions;
DROP POLICY IF EXISTS "student_sessions_anon_update" ON student_sessions;

-- module_sessions
DROP POLICY IF EXISTS "module_sessions_anon_insert" ON module_sessions;
DROP POLICY IF EXISTS "module_sessions_anon_select" ON module_sessions;
DROP POLICY IF EXISTS "module_sessions_anon_update" ON module_sessions;

-- answers
DROP POLICY IF EXISTS "schueler_own_answers" ON answers;
DROP POLICY IF EXISTS "answers_anon_insert" ON answers;

-- flow_releases, classes, game_flows
DROP POLICY IF EXISTS "flow_releases_anon_read" ON flow_releases;
DROP POLICY IF EXISTS "classes_anon_read_released" ON classes;
DROP POLICY IF EXISTS "game_flows_anon_read_released" ON game_flows;
