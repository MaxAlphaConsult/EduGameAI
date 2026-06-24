-- 019: Schüler-Code-Validierung OHNE anon-Lesezugriff auf die students-Tabelle.
--
-- Sicherheits-Fix (DSGVO, High). Migration 005 hatte `students_anon_read USING (true)`
-- — die anon-Rolle (öffentlicher Key, im Browser) konnte damit ALLE Schülercodes
-- ALLER Klassen lesen (`select code, class_id from students`). Zusammen mit dem durch
-- Migration 017 reparierten Lookup wäre das ein vollständiger Abgriff der Login-Codes.
--
-- Fix: anon-Lesezugriff komplett entfernen. Die Code-Prüfung läuft stattdessen über
-- eine SECURITY-DEFINER-Funktion, die NUR ein Ergebnis für (aktives Release + exakter
-- Code) zurückgibt. Die Tabelle bleibt für anon unsichtbar; ein Abgriff ist unmöglich,
-- Brute-Force über die Funktion wird durch das Rate-Limit im Proxy gedrosselt.
--
-- Lehrkraft-Zugriff (classes-Seite) bleibt unberührt — der läuft authentifiziert über
-- students_select_own / _insert_own / _delete_own (Migration 003).

DROP POLICY IF EXISTS "students_anon_read" ON students;

CREATE OR REPLACE FUNCTION public.validate_student_code(p_flow_release_id uuid, p_code text)
RETURNS TABLE (student_id uuid, student_code text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.code
  FROM students s
  JOIN flow_releases fr ON fr.class_id = s.class_id
  WHERE fr.id = p_flow_release_id
    AND fr.status = 'aktiv'
    AND upper(s.code) = upper(trim(p_code))
  LIMIT 1
$$;

-- Direktaufruf nur über die Funktion; kein breiter Tabellenzugriff.
REVOKE ALL ON FUNCTION public.validate_student_code(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.validate_student_code(uuid, text) TO anon, authenticated;
