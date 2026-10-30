#!/usr/bin/env node
// Prüft die Zugriffsregeln der Datenbank in einem echten Postgres im Prozess
// (PGlite), ohne Docker und ohne Prod.
//
// WARUM ALLE MIGRATIONEN: Die erste Fassung dieses Skripts baute die Policies
// vor 017 von Hand nach und wendete nur 017–020 an. Dabei fehlten die offenen
// Policies aus 010 auf student_sessions/module_sessions, und das Skript war
// grün, während anon auf Prod alle Schülercodes lesen konnte (gemessen am
// 30.10.2026). Ein Modell der Datenbank prüft nur das Modell. Deshalb laufen
// hier alle Dateien aus supabase/migrations in Reihenfolge, auf einem Stub der
// Supabase-Umgebung (Rollen, Standardrechte, auth, storage).
//
// Die Standardrechte sind der Kern: Supabase gibt `anon` und `authenticated`
// ALLE Rechte auf Tabellen in `public`. Die RLS-Policies sind damit die einzige
// Grenze, und genau so ist es hier auch eingestellt.
//
//   node scripts/verify-rls.mjs              alle Migrationen, muss grün sein
//   node scripts/verify-rls.mjs --bis 021    Gegenprobe: Stand vor 022/023,
//                                            muss rot sein

import { PGlite } from '@electric-sql/pglite'
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(here, '..', 'supabase', 'migrations')

const bisArg = process.argv.indexOf('--bis')
const bis = bisArg > -1 ? Number(process.argv[bisArg + 1]) : Infinity

const dateien = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .filter((f) => Number(f.split('_')[0]) <= bis)

const db = new PGlite({ extensions: { uuid_ossp } })
let fehler = 0
let geprueft = 0
const check = (name, cond) => {
  geprueft++
  console.log(`${cond ? '✓' : '✗'} ${name}`)
  if (!cond) fehler++
}

// ── Supabase-Umgebung nachstellen ───────────────────────────────────────────
await db.exec(`
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  GRANT USAGE ON SCHEMA public TO anon, authenticated;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;

  CREATE SCHEMA auth;
  CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
  -- Die "angemeldete" UID kommt aus einer GUC; leer heißt anon.
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('app.uid', true), '')::uuid
  $$;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated;
  GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;

  CREATE SCHEMA storage;
  CREATE TABLE storage.buckets (
    id text PRIMARY KEY, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]
  );
  CREATE TABLE storage.objects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text, owner uuid
  );
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
    SELECT string_to_array(name, '/')
  $$;
`)

for (const datei of dateien) {
  try {
    await db.exec(readFileSync(join(migrationsDir, datei), 'utf-8'))
  } catch (err) {
    console.error(`✗ Migration ${datei} lässt sich nicht anwenden: ${err.message}`)
    process.exit(1)
  }
}
console.log(`${dateien.length} Migrationen angewendet (bis ${dateien.at(-1)}).\n`)

// ── Testdaten (als Superuser, ohne RLS) ─────────────────────────────────────
const LEHRER_A = '11111111-1111-1111-1111-111111111111'
const LEHRER_B = '22222222-2222-2222-2222-222222222222'
const one = async (sql, params = []) => (await db.query(sql, params)).rows[0]

await db.query(`INSERT INTO auth.users (id, email) VALUES ($1, 'a@schule.test'), ($2, 'b@schule.test')`, [LEHRER_A, LEHRER_B])

async function flowMitRelease(lehrer, klassenName, code, studentCode, anzahlModule) {
  const klasse = await one(
    `INSERT INTO classes (lehrer_id, name, jahrgangsstufe, fach) VALUES ($1, $2, '9', 'Bio') RETURNING id`,
    [lehrer, klassenName])
  const student = await one(`INSERT INTO students (class_id, code) VALUES ($1, $2) RETURNING id`, [klasse.id, studentCode])
  const material = await one(
    `INSERT INTO materials (lehrer_id, dateiname, extrahierter_text, fach, jahrgangsstufe, schulform)
     VALUES ($1, 'zelle.pdf', 'Text', 'Bio', '9', 'gymnasium') RETURNING id`, [lehrer])
  const analyse = await one(`INSERT INTO analyses (material_id) VALUES ($1) RETURNING id`, [material.id])
  const flow = await one(
    `INSERT INTO game_flows (lehrer_id, material_id, analyse_id, titel, zeitrahmen_minuten, anzahl_spiele)
     VALUES ($1, $2, $3, $4, 45, $5) RETURNING id`, [lehrer, material.id, analyse.id, `Flow ${klassenName}`, anzahlModule])
  const games = []
  for (let i = 0; i < anzahlModule; i++) {
    games.push(await one(
      `INSERT INTO games (analyse_id, lehrer_id, titel, status, game_flow_id, reihenfolge)
       VALUES ($1, $2, $3, 'freigegeben', $4, $5) RETURNING id`,
      [analyse.id, lehrer, `Modul ${i + 1}`, flow.id, i]))
  }
  const release = await one(
    `INSERT INTO flow_releases (game_flow_id, class_id, status, access_code) VALUES ($1, $2, 'aktiv', $3) RETURNING id`,
    [flow.id, klasse.id, code])
  return { klasse, student, flow, games, release }
}

const A = await flowMitRelease(LEHRER_A, '9A', '12345678', 'FUCHS-482193', 2)
const B = await flowMitRelease(LEHRER_B, '7C', '87654321', 'DACHS-111222', 1)

// Eine Sitzung in Klasse B anlegen, wie sie vor 022 direkt entstand.
const sitzungB = await one(
  `INSERT INTO student_sessions (flow_release_id, student_id, code, modul_anzahl) VALUES ($1, $2, 'DACHS-111222', 1) RETURNING id`,
  [B.release.id, B.student.id])
const modulSitzungB = await one(
  `INSERT INTO module_sessions (student_session_id, game_id, position, niveau) VALUES ($1, $2, 0, 'mittel') RETURNING id`,
  [sitzungB.id, B.games[0].id])

const anzahl = async (sql, params = []) => (await db.query(sql, params)).rows.length
const wirft = async (sql, params = []) => {
  try { await db.query(sql, params); return null } catch (err) { return err.code ?? err.message }
}
// Schreibversuche laufen in einer Transaktion, die immer zurückgerollt wird.
// Sonst legt ein Versuch, der auf dem alten Stand gelingt, Zeilen an, und die
// Prüfungen danach messen diese Zeilen statt der Funktionen (in der ersten
// Gegenprobe so passiert).
const versuch = async (sql, params = []) => {
  await db.exec('BEGIN')
  try {
    const { rows } = await db.query(sql, params)
    return { zeilen: rows.length }
  } catch (err) {
    return { fehler: err.code ?? err.message }
  } finally {
    await db.exec('ROLLBACK')
  }
}
const alsAnon = () => db.exec(`RESET ROLE; SET app.uid = ''; SET ROLE anon;`)
const alsLehrkraft = (uid) => db.exec(`RESET ROLE; SET app.uid = '${uid}'; SET ROLE authenticated;`)

// Funktionen gibt es erst ab 022. Davor sind die Funktions-Checks rot, nicht
// abgebrochen, damit die Gegenprobe den ganzen Befund zeigt.
const rpc = async (sql, params = []) => {
  try { return (await db.query(sql, params)).rows } catch (err) { return { fehler: err.code ?? err.message } }
}

// ── anon: direkter Tabellenzugriff ──────────────────────────────────────────
console.log('anon, direkt über PostgREST:')
await alsAnon()
for (const tabelle of ['students', 'student_sessions', 'module_sessions', 'answers', 'flow_releases', 'classes', 'game_flows', 'profiles', 'materials']) {
  check(`anon liest keine Zeile aus ${tabelle}`, await anzahl(`SELECT 1 FROM ${tabelle}`) === 0)
}
check('anon findet keinen access_code', await anzahl(`SELECT access_code FROM flow_releases WHERE status = 'aktiv'`) === 0)
check('anon ändert keine fremde Sitzung', (await versuch(
  `UPDATE student_sessions SET aktuelles_modul_index = 5 WHERE id = $1 RETURNING id`, [sitzungB.id])).zeilen === 0)
check('anon legt keine Sitzung direkt an', (await versuch(
  `INSERT INTO student_sessions (flow_release_id, student_id, code) VALUES ($1, $2, 'X') RETURNING id`,
  [A.release.id, A.student.id])).fehler !== undefined)
check('anon schreibt keine Antwort direkt', (await versuch(
  `INSERT INTO answers (module_session_id, aufgabe_id) VALUES ($1, 'Q1') RETURNING id`,
  [modulSitzungB.id])).fehler !== undefined)
check('anon liest weiterhin freigegebene Spiele (Inhalte)', await anzahl(`SELECT 1 FROM games WHERE status = 'freigegeben'`) === 3)

// ── anon: Schüler-Ablauf über die Funktionen ────────────────────────────────
console.log('\nanon, Schüler-Ablauf über die Funktionen:')
const suche = await rpc(`SELECT * FROM schueler_flow_suchen($1)`, ['12345678'])
check('Login Stufe 1: Code findet genau den Flow', Array.isArray(suche) && suche.length === 1
  && suche[0].flow_titel === 'Flow 9A' && suche[0].modul_anzahl === 2 && suche[0].klasse_name === '9A')
check('Login Stufe 1: falscher Code findet nichts',
  Array.isArray(await rpc(`SELECT * FROM schueler_flow_suchen($1)`, ['00000000']))
  && (await rpc(`SELECT * FROM schueler_flow_suchen($1)`, ['00000000'])).length === 0)

const oeffnen = (code, gameId) => rpc(
  `SELECT * FROM schueler_sitzung_oeffnen($1, $2, 2, $3, 'leichter')`, [A.release.id, code, gameId])
const falsch = await oeffnen('FALSCH-000000', A.games[0].id)
check('Login Stufe 2: falscher Schülercode öffnet keine Sitzung', Array.isArray(falsch) && falsch.length === 0)
const fremdesSpiel = await oeffnen('fuchs-482193', B.games[0].id)
check('Login Stufe 2: Modul aus fremdem Flow wird abgewiesen', !Array.isArray(fremdesSpiel))
const erste = await oeffnen('fuchs-482193', A.games[0].id)
const sitzungA = Array.isArray(erste) ? erste[0] : null
check('Login Stufe 2: richtiger Code öffnet Sitzung mit erstem Modul',
  !!sitzungA && sitzungA.aktuelles_modul_index === 0 && !!sitzungA.modul_sitzung_id)
const zweite = await oeffnen('FUCHS-482193', A.games[0].id)
check('Login Stufe 2: zweiter Login setzt dieselbe Sitzung fort',
  Array.isArray(zweite) && zweite[0]?.student_session_id === sitzungA?.student_session_id)

const gelesen = await rpc(`SELECT * FROM schueler_sitzung_lesen($1)`, [sitzungA?.student_session_id ?? null])
check('Sitzung lesen über ihre ID', Array.isArray(gelesen) && gelesen.length === 1 && gelesen[0].release_status === 'aktiv')
check('Sitzung lesen liefert keinen Schülercode', Array.isArray(gelesen) && gelesen[0] && !('code' in gelesen[0]) && !('student_code' in gelesen[0]))
check('Unbekannte Sitzungs-ID liefert nichts',
  (await rpc(`SELECT * FROM schueler_sitzung_lesen(gen_random_uuid())`)).length === 0)

const ms0 = sitzungA?.modul_sitzung_id ?? null
const antwort = await rpc(`SELECT schueler_antwort_speichern($1, 'Q1', '"a"', 'korrekt', 1, 0, 12, 'Gut', false) AS id`, [ms0])
check('Antwort speichern über die Modul-Sitzung', Array.isArray(antwort) && !!antwort[0]?.id)
check('anon kann die gespeicherte Antwort nicht lesen', await anzahl(`SELECT 1 FROM answers`) === 0)

const weiter = await rpc(`SELECT schueler_modul_weiter($1, $2, $3, 'schwer') AS id`,
  [sitzungA?.student_session_id ?? null, ms0, A.games[1].id])
const ms1 = Array.isArray(weiter) ? weiter[0]?.id : null
check('Weiter: nächstes Modul wird angelegt', !!ms1)
const doppelt = await rpc(`SELECT schueler_modul_weiter($1, $2, $3, 'schwer') AS id`,
  [sitzungA?.student_session_id ?? null, ms0, A.games[1].id])
check('Weiter: zweiter Klick mit alter Modul-ID wird abgewiesen (PT409)', doppelt?.fehler === 'PT409')
const fertig = await rpc(`SELECT schueler_modul_weiter($1, $2, NULL, NULL) AS id`, [sitzungA?.student_session_id ?? null, ms1])
const nachher = await rpc(`SELECT * FROM schueler_sitzung_lesen($1)`, [sitzungA?.student_session_id ?? null])
check('Weiter: letztes Modul schließt den Lernpfad ab',
  Array.isArray(fertig) && fertig[0]?.id === null && nachher[0]?.lernpfad_abgeschlossen === true)

// ── Lehrkräfte untereinander ────────────────────────────────────────────────
console.log('\nLehrkräfte:')
await alsLehrkraft(LEHRER_A)
check('Lehrkraft A sieht die Sitzung ihrer Klasse', await anzahl(`SELECT 1 FROM student_sessions`) === 1)
check('Lehrkraft A sieht keine Sitzung aus Klasse B', await anzahl(`SELECT 1 FROM student_sessions WHERE id = $1`, [sitzungB.id]) === 0)
check('Lehrkraft A sieht keine Modul-Sitzung aus Klasse B',
  await anzahl(`SELECT 1 FROM module_sessions WHERE student_session_id = $1`, [sitzungB.id]) === 0)
check('Lehrkraft A sieht die Antworten ihrer Klasse', await anzahl(`SELECT 1 FROM answers`) === 1)
// Vor 023 sah Lehrkraft A hier 2 Releases: flow_releases_anon_read stand
// ohne `TO anon` und galt auch für Lehrkräfte, samt access_code.
check('Lehrkraft A liest nur ihr eigenes Release, ohne Rekursion (42P17)',
  await wirft(`SELECT id FROM flow_releases`) === null && await anzahl(`SELECT 1 FROM flow_releases`) === 1)
check('Lehrkraft A sieht keine Klasse von B', await anzahl(`SELECT 1 FROM classes WHERE lehrer_id = $1`, [LEHRER_B]) === 0)
await alsLehrkraft(LEHRER_B)
check('Lehrkraft B sieht keine Sitzung aus Klasse A',
  await anzahl(`SELECT 1 FROM student_sessions WHERE id = $1`, [sitzungA?.student_session_id ?? LEHRER_A]) === 0)
check('Lehrkraft B sieht keine Schüler aus Klasse A', await anzahl(`SELECT 1 FROM students WHERE class_id = $1`, [A.klasse.id]) === 0)

// ── Aus den früheren Fassungen ──────────────────────────────────────────────
await alsAnon()
const ok = await rpc(`SELECT * FROM validate_student_code($1, $2)`, [A.release.id, 'fuchs-482193'])
check('019: validate_student_code prüft weiterhin (case-insensitiv)', Array.isArray(ok) && ok.length === 1)
await db.exec(`RESET ROLE`)
check('018: games.grounding existiert', await anzahl(
  `SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'grounding'`) === 1)

// PostgREST wiederholt Transaktionen, die mit 40001 (serialization_failure)
// oder 40P01 (deadlock_detected) enden, bis die Anfrage abläuft. Eine Funktion,
// die einen dieser Codes selbst auslöst, hängt deshalb auf Prod ~2 Minuten
// (gemessen am 30.10.2026 mit 022). PGlite zeigt das nicht, also hier über den
// Quelltext. Eigene Fehler nehmen PTxyz (HTTP-Status xyz).
const wiederholt = (await db.query(
  `SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND (p.prosrc LIKE '%''40001''%' OR p.prosrc LIKE '%''40P01''%')`)).rows
check(`keine Funktion löst 40001/40P01 aus${wiederholt.length ? ` (${wiederholt.map((r) => r.proname).join(', ')})` : ''}`,
  wiederholt.length === 0)

console.log(fehler === 0
  ? `\n✓ Alle ${geprueft} Prüfungen bestanden.`
  : `\n✗ ${fehler} von ${geprueft} Prüfungen fehlgeschlagen.`)
process.exit(fehler === 0 ? 0 : 1)
