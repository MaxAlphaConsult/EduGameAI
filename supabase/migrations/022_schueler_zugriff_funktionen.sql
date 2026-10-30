-- 022: Schüler-Zugriffe über eng geschnittene SECURITY-DEFINER-Funktionen.
--
-- Problem: Die Schüler-Routen laufen als Rolle `anon` und brauchten dafür
-- Policies mit `USING (true)` auf student_sessions und module_sessions (010)
-- sowie anon-Lesezugriff auf flow_releases, classes und game_flows (010, 017,
-- 020). Weil der anon-Schlüssel im Browser-Bundle steht, konnte jede:r direkt
-- über PostgREST alle aktiven Zugangscodes (flow_releases.access_code) und alle
-- Schülercodes (student_sessions.code) lesen und fremde Sitzungen ändern. Am
-- 30.10.2026 auf Prod gemessen: anon sah 15 student_sessions, 66
-- module_sessions und 4 flow_releases samt access_code. Damit war der Fix aus
-- 019 (students nicht lesbar) umgangen. Die Policies standen ohne `TO anon`,
-- galten also auch für angemeldete Lehrkräfte untereinander.
--
-- Lösung in zwei Schritten:
--   022 (diese Datei): Funktionen anlegen. Rein additiv, ändert kein
--       bestehendes Verhalten. Muss VOR dem Merge auf Prod stehen, weil der
--       neue Code sie aufruft.
--   023: die offenen Policies entfernen. Erst NACH dem Ausrollen des neuen
--       Codes anwenden, sonst bricht der Schüler-Login der laufenden Version.
--
-- Zugriffsmodell: Jede Funktion arbeitet nur auf einer Zeile, deren ID oder
-- Code der Aufrufer schon kennt. Die ID einer Sitzung ist eine zufällige UUID,
-- die nur die Schüler:in nach dem Login erhält; sie wirkt wie ein Schlüssel zu
-- genau dieser Sitzung. Keine Funktion liefert eine Liste, keine liefert
-- access_code oder einen Schülercode an jemanden, der ihn nicht schon kennt.
--
-- Bewusst kein Service-Key in der App: Die Datenbank bleibt die einzige
-- Sicherheitsgrenze (siehe Leitplan, Teil 1).
--
-- Additiv, kein Datenverlust.

-- ── Stufe 1 des Logins: Flow über den 8-stelligen Zugangscode finden ────────
CREATE OR REPLACE FUNCTION public.schueler_flow_suchen(p_access_code text)
RETURNS TABLE (
  flow_release_id uuid,
  flow_id uuid,
  flow_titel text,
  klasse_id uuid,
  klasse_name text,
  jahrgangsstufe text,
  fach text,
  modul_anzahl int,
  spiel_anzahl int
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT fr.id, gf.id, gf.titel, c.id, c.name, c.jahrgangsstufe, c.fach,
    (SELECT count(*)::int FROM games g
      WHERE g.game_flow_id = gf.id AND g.status = 'freigegeben'),
    (SELECT count(*)::int FROM games g
      WHERE g.game_flow_id = gf.id AND g.status = 'freigegeben' AND g.baustein_typ = 'spiel')
  FROM flow_releases fr
  JOIN game_flows gf ON gf.id = fr.game_flow_id
  JOIN classes c ON c.id = fr.class_id
  WHERE fr.access_code = p_access_code
    AND fr.status = 'aktiv'
  LIMIT 1
$$;

-- ── Release lesen, dessen ID der Aufrufer aus Stufe 1 kennt ────────────────
CREATE OR REPLACE FUNCTION public.schueler_release_lesen(p_flow_release_id uuid)
RETURNS TABLE (status text, game_flow_id uuid)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT fr.status, fr.game_flow_id
  FROM flow_releases fr
  WHERE fr.id = p_flow_release_id
$$;

-- ── Stufe 2: Sitzung öffnen (bestehende fortsetzen oder neu anlegen) ────────
-- Prüft den Schülercode selbst noch einmal, damit die Funktion auch bei
-- direktem Aufruf nur mit gültigem Code eine Sitzung liefert. Das Niveau des
-- ersten Moduls rechnet die App (niveauFuerPosition) und gibt es mit.
CREATE OR REPLACE FUNCTION public.schueler_sitzung_oeffnen(
  p_flow_release_id uuid,
  p_code text,
  p_modul_anzahl int,
  p_erstes_game_id uuid,
  p_erstes_niveau text
)
RETURNS TABLE (
  student_session_id uuid,
  student_id uuid,
  student_code text,
  aktuelles_modul_index int,
  modul_anzahl int,
  lernpfad_abgeschlossen boolean,
  modul_sitzung_id uuid,
  modul_niveau text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
-- Die Ausgabespalten heißen wie Tabellenspalten (student_id, modul_anzahl …).
-- Ohne diese Zeile wäre etwa das WHERE im ON CONFLICT mehrdeutig.
#variable_conflict use_column
DECLARE
  v_student_id uuid;
  v_student_code text;
  v_game_flow_id uuid;
  v_session_id uuid;
BEGIN
  SELECT s.id, s.code, fr.game_flow_id
    INTO v_student_id, v_student_code, v_game_flow_id
  FROM students s
  JOIN flow_releases fr ON fr.class_id = s.class_id
  WHERE fr.id = p_flow_release_id
    AND fr.status = 'aktiv'
    AND upper(s.code) = upper(trim(p_code))
  LIMIT 1;

  IF v_student_id IS NULL THEN
    RETURN;  -- falscher Code oder Release nicht aktiv: leeres Ergebnis
  END IF;

  SELECT ss.id INTO v_session_id
  FROM student_sessions ss
  WHERE ss.flow_release_id = p_flow_release_id AND ss.student_id = v_student_id;

  IF v_session_id IS NULL THEN
    -- Das erste Modul muss zu diesem Flow gehören und freigegeben sein.
    IF NOT EXISTS (
      SELECT 1 FROM games g
      WHERE g.id = p_erstes_game_id AND g.game_flow_id = v_game_flow_id AND g.status = 'freigegeben'
    ) THEN
      RAISE EXCEPTION 'erstes Modul gehoert nicht zum Flow' USING ERRCODE = '22023';
    END IF;

    INSERT INTO student_sessions (flow_release_id, student_id, code, aktuelles_modul_index, modul_anzahl)
    VALUES (p_flow_release_id, v_student_id, v_student_code, 0, p_modul_anzahl)
    ON CONFLICT (flow_release_id, student_id) WHERE student_id IS NOT NULL DO NOTHING
    RETURNING id INTO v_session_id;

    IF v_session_id IS NOT NULL THEN
      INSERT INTO module_sessions (student_session_id, game_id, position, niveau, status)
      VALUES (v_session_id, p_erstes_game_id, 0, p_erstes_niveau, 'laufend');
    ELSE
      -- Gleichzeitiger zweiter Aufruf: die Sitzung hat der andere angelegt.
      SELECT ss.id INTO v_session_id
      FROM student_sessions ss
      WHERE ss.flow_release_id = p_flow_release_id AND ss.student_id = v_student_id;
    END IF;
  END IF;

  RETURN QUERY
  SELECT ss.id, v_student_id, v_student_code, ss.aktuelles_modul_index, ss.modul_anzahl,
         ss.lernpfad_abgeschlossen, ms.id, ms.niveau
  FROM student_sessions ss
  LEFT JOIN module_sessions ms
    ON ms.student_session_id = ss.id AND ms.position = ss.aktuelles_modul_index
  WHERE ss.id = v_session_id;
END;
$$;

-- ── Sitzung lesen, deren ID die Schüler:in kennt ────────────────────────────
-- Liefert keinen Schülercode. Das laufende Modul kommt gleich mit.
CREATE OR REPLACE FUNCTION public.schueler_sitzung_lesen(p_student_session_id uuid)
RETURNS TABLE (
  student_session_id uuid,
  flow_release_id uuid,
  release_status text,
  game_flow_id uuid,
  aktuelles_modul_index int,
  modul_anzahl int,
  lernpfad_abgeschlossen boolean,
  modul_sitzung_id uuid,
  modul_niveau text
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT ss.id, ss.flow_release_id, fr.status, fr.game_flow_id,
         ss.aktuelles_modul_index, ss.modul_anzahl, ss.lernpfad_abgeschlossen,
         ms.id, ms.niveau
  FROM student_sessions ss
  JOIN flow_releases fr ON fr.id = ss.flow_release_id
  LEFT JOIN module_sessions ms
    ON ms.student_session_id = ss.id AND ms.position = ss.aktuelles_modul_index
  WHERE ss.id = p_student_session_id
$$;

-- ── Modul-Sitzung lesen, deren ID die Schüler:in kennt ──────────────────────
CREATE OR REPLACE FUNCTION public.schueler_modul_lesen(p_modul_sitzung_id uuid)
RETURNS TABLE (
  modul_sitzung_id uuid,
  game_id uuid,
  "position" int,
  niveau text,
  status text
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT ms.id, ms.game_id, ms.position, ms.niveau, ms.status
  FROM module_sessions ms
  WHERE ms.id = p_modul_sitzung_id
$$;

-- ── Aktuelles Modul abschließen und das nächste starten ─────────────────────
-- p_naechstes_game_id NULL heißt: kein weiteres Modul, Lernpfad ist fertig.
-- Gibt die ID der neuen Modul-Sitzung zurück, oder NULL, wenn der Lernpfad
-- damit abgeschlossen ist.
--
-- Nur das Modul an der aktuellen Position darf abgeschlossen werden. Ein
-- zweiter Klick auf „Weiter" mit der alten Modul-ID wird abgewiesen statt
-- ein Modul zu überspringen.
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
    RAISE EXCEPTION 'Modul ist nicht das aktuelle' USING ERRCODE = '40001';
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

-- ── Antwort zu einer Modul-Sitzung speichern ────────────────────────────────
-- Die Auswertung (status, feedback) rechnet die Route. Wer die Funktion direkt
-- aufruft, kann damit nur die eigene Sitzung verfälschen, deren ID er kennt;
-- das war vor 022 genauso.
CREATE OR REPLACE FUNCTION public.schueler_antwort_speichern(
  p_modul_sitzung_id uuid,
  p_aufgabe_id text,
  p_antwort_wert text,
  p_status text,
  p_versuche int,
  p_hilfen_genutzt int,
  p_bearbeitungszeit_sekunden int,
  p_ausgeloestes_feedback text,
  p_abgebrochen boolean
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM module_sessions WHERE id = p_modul_sitzung_id) THEN
    RAISE EXCEPTION 'Modul-Sitzung nicht gefunden' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO answers (
    module_session_id, aufgabe_id, antwort_wert, status, versuche, hilfen_genutzt,
    bearbeitungszeit_sekunden, ausgeloestes_feedback, abgebrochen
  ) VALUES (
    p_modul_sitzung_id, p_aufgabe_id, p_antwort_wert, p_status, p_versuche, p_hilfen_genutzt,
    p_bearbeitungszeit_sekunden, p_ausgeloestes_feedback, p_abgebrochen
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ── Rechte: nur Ausführen, nur für die beiden App-Rollen ────────────────────
REVOKE ALL ON FUNCTION public.schueler_flow_suchen(text) FROM public;
REVOKE ALL ON FUNCTION public.schueler_release_lesen(uuid) FROM public;
REVOKE ALL ON FUNCTION public.schueler_sitzung_oeffnen(uuid, text, int, uuid, text) FROM public;
REVOKE ALL ON FUNCTION public.schueler_sitzung_lesen(uuid) FROM public;
REVOKE ALL ON FUNCTION public.schueler_modul_lesen(uuid) FROM public;
REVOKE ALL ON FUNCTION public.schueler_modul_weiter(uuid, uuid, uuid, text) FROM public;
REVOKE ALL ON FUNCTION public.schueler_antwort_speichern(uuid, text, text, text, int, int, int, text, boolean) FROM public;

GRANT EXECUTE ON FUNCTION public.schueler_flow_suchen(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.schueler_release_lesen(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.schueler_sitzung_oeffnen(uuid, text, int, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.schueler_sitzung_lesen(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.schueler_modul_lesen(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.schueler_modul_weiter(uuid, uuid, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.schueler_antwort_speichern(uuid, text, text, text, int, int, int, text, boolean) TO anon, authenticated;
