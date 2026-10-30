-- 024: schueler_modul_weiter meldet „Modul ist nicht das aktuelle" mit PT409.
--
-- Problem: 022 meldete den Fall mit SQLSTATE 40001 (serialization_failure).
-- PostgREST wiederholt Transaktionen, die mit 40001 oder 40P01 enden,
-- automatisch, bis die Anfrage abläuft. Gemessen am 30.10.2026 auf Prod: Der
-- zweite Klick auf „Weiter" mit der alten Modul-ID hing 125 Sekunden und kam
-- als 500 („upstream request timeout") zurück. PGlite hat kein PostgREST
-- dazwischen und zeigte das nicht.
--
-- Lösung: PTxyz ist der von PostgREST vorgesehene Weg für eigene Fehler; die
-- Antwort kommt sofort mit HTTP-Status xyz, hier 409, und wird nicht
-- wiederholt. Sonst ist die Funktion unverändert.
--
-- Die Funktion bricht in diesem Fall vor jeder Änderung ab. Durch die
-- Wiederholungen ist deshalb nichts geschrieben worden.
--
-- Ersetzt nur den Funktionskörper. Additiv, kein Datenverlust, kann vor
-- oder nach dem Code-Deploy angewendet werden (die Route erkennt beide Codes).

CREATE OR REPLACE FUNCTION public.schueler_modul_weiter(
  p_student_session_id uuid,
  p_modul_sitzung_id uuid,
  p_naechstes_game_id uuid,
  p_niveau text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_session student_sessions%ROWTYPE;
  v_release_status text;
  v_game_flow_id uuid;
  v_naechster int;
  v_neu uuid;
BEGIN
  SELECT * INTO v_session FROM student_sessions WHERE id = p_student_session_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sitzung nicht gefunden' USING ERRCODE = 'P0002';
  END IF;
  IF v_session.lernpfad_abgeschlossen THEN
    RETURN NULL;
  END IF;

  SELECT fr.status, fr.game_flow_id INTO v_release_status, v_game_flow_id
  FROM flow_releases fr WHERE fr.id = v_session.flow_release_id;
  IF v_release_status IS DISTINCT FROM 'aktiv' THEN
    RAISE EXCEPTION 'Flow ist nicht mehr aktiv' USING ERRCODE = '55000';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM module_sessions ms
    WHERE ms.id = p_modul_sitzung_id
      AND ms.student_session_id = v_session.id
      AND ms.position = v_session.aktuelles_modul_index
  ) THEN
    RAISE EXCEPTION 'Modul ist nicht das aktuelle' USING ERRCODE = 'PT409';
  END IF;

  UPDATE module_sessions
     SET status = 'abgeschlossen', abgeschlossen_am = now()
   WHERE id = p_modul_sitzung_id;

  v_naechster := v_session.aktuelles_modul_index + 1;

  IF v_naechster >= v_session.modul_anzahl OR p_naechstes_game_id IS NULL THEN
    UPDATE student_sessions
       SET aktuelles_modul_index = v_session.modul_anzahl,
           lernpfad_abgeschlossen = true,
           abgeschlossen_am = now()
     WHERE id = v_session.id;
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM games g
    WHERE g.id = p_naechstes_game_id AND g.game_flow_id = v_game_flow_id AND g.status = 'freigegeben'
  ) THEN
    RAISE EXCEPTION 'naechstes Modul gehoert nicht zum Flow' USING ERRCODE = '22023';
  END IF;

  INSERT INTO module_sessions (student_session_id, game_id, position, niveau, status)
  VALUES (v_session.id, p_naechstes_game_id, v_naechster, p_niveau, 'laufend')
  RETURNING id INTO v_neu;

  UPDATE student_sessions SET aktuelles_modul_index = v_naechster WHERE id = v_session.id;
  RETURN v_neu;
END;
$$;
