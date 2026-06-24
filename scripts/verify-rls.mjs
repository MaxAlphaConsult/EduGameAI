#!/usr/bin/env node
// Verifiziert die sicherheitskritischen Migrationen 017/018/019 in einem echten
// In-Process-Postgres (PGlite) — als `anon`-Rolle, mit aktivierter RLS. Beweist:
//   * 017: anon liest game_flows/classes NUR bei aktivem Release.
//   * 019: anon kann students NICHT mehr lesen (DSGVO-Leak geschlossen);
//          validate_student_code prüft korrekt (SECURITY DEFINER, kein Tabellen-Abgriff).
//   * 018: games.grounding existiert.
// Läuft ohne Docker/Prod. `node scripts/verify-rls.mjs`.

import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const mig = (n) => readFileSync(join(here, '..', 'supabase', 'migrations', n), 'utf-8')

const db = new PGlite()
let failures = 0
const check = (name, cond) => {
  console.log(`${cond ? '✓' : '✗'} ${name}`)
  if (!cond) failures++
}

// ── Minimaler Supabase-kompatibler Bootstrap ────────────────────────────────
await db.exec(`
  CREATE ROLE anon;
  CREATE ROLE authenticated;
  GRANT USAGE ON SCHEMA public TO anon, authenticated;

  CREATE SCHEMA IF NOT EXISTS auth;
  -- Stub: liest die "eingeloggte" UID aus einer GUC (NULL = anon).
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('app.uid', true), '')::uuid
  $$;

  CREATE TABLE classes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lehrer_id uuid, name text, jahrgangsstufe text, fach text
  );
  CREATE TABLE game_flows (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lehrer_id uuid, titel text
  );
  CREATE TABLE students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id uuid, code text
  );
  CREATE TABLE flow_releases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    game_flow_id uuid, class_id uuid, status text, access_code text
  );
  CREATE TABLE games (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lehrer_id uuid, status text
  );

  ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE game_flows ENABLE ROW LEVEL SECURITY;
  ALTER TABLE students ENABLE ROW LEVEL SECURITY;
  ALTER TABLE flow_releases ENABLE ROW LEVEL SECURITY;
  ALTER TABLE games ENABLE ROW LEVEL SECURITY;

  -- Bestehende Policies (vor unseren Migrationen)
  CREATE POLICY "lehrer_own_classes" ON classes FOR ALL USING (lehrer_id = auth.uid());
  CREATE POLICY "Lehrer sieht eigene Einheiten" ON game_flows FOR SELECT USING (lehrer_id = auth.uid());
  CREATE POLICY "students_select_own" ON students FOR SELECT USING (
    class_id IN (SELECT id FROM classes WHERE lehrer_id = auth.uid()));
  -- DER LEAK aus Migration 005, den 019 schließen muss:
  CREATE POLICY "students_anon_read" ON students FOR SELECT USING (true);
  CREATE POLICY "flow_releases_anon_read" ON flow_releases FOR SELECT USING (status = 'aktiv');
  -- WICHTIG: diese Policy (Mig. 010) bildet mit den 017-Policies den Rekursions-Zyklus.
  CREATE POLICY "flow_releases_lehrer_all" ON flow_releases FOR ALL USING (
    class_id IN (SELECT id FROM classes WHERE lehrer_id = auth.uid()));
  CREATE POLICY "lehrer_own_games" ON games FOR ALL USING (lehrer_id = auth.uid());

  -- Supabase gewährt anon SELECT auf public-Tabellen; RLS filtert dann die Zeilen.
  GRANT SELECT ON classes, game_flows, students, flow_releases, games TO anon, authenticated;
`)

// ── Die ECHTEN Migrationen anwenden ─────────────────────────────────────────
await db.exec(mig('017_student_anon_flow_class_read.sql'))
await db.exec(mig('018_games_grounding.sql'))
await db.exec(mig('019_student_code_validation.sql'))
await db.exec(mig('020_fix_anon_policy_recursion.sql')) // behebt die 017-Rekursion

// ── Seed (als Superuser, RLS-frei) ──────────────────────────────────────────
const teacher = '11111111-1111-1111-1111-111111111111'
const { rows: [cls] } = await db.query(
  `INSERT INTO classes (lehrer_id, name, jahrgangsstufe, fach) VALUES ($1,'9A','9','Bio') RETURNING id`, [teacher])
const { rows: [flowR] } = await db.query(
  `INSERT INTO game_flows (lehrer_id, titel) VALUES ($1,'Zelle (freigegeben)') RETURNING id`, [teacher])
const { rows: [flowU] } = await db.query(
  `INSERT INTO game_flows (lehrer_id, titel) VALUES ($1,'Entwurf (nicht freigegeben)') RETURNING id`, [teacher])
await db.query(`INSERT INTO students (class_id, code) VALUES ($1,'FUCHS-482193')`, [cls.id])
const { rows: [rel] } = await db.query(
  `INSERT INTO flow_releases (game_flow_id, class_id, status, access_code) VALUES ($1,$2,'aktiv','12345678') RETURNING id`,
  [flowR.id, cls.id])

// ── Als anon prüfen ─────────────────────────────────────────────────────────
await db.exec(`SET ROLE anon`)

const seen = async (sql, params) => (await db.query(sql, params)).rows.length

check('017: anon liest freigegebenen game_flow',
  await seen('SELECT id FROM game_flows WHERE id=$1', [flowR.id]) === 1)
check('017: anon liest NICHT den unveröffentlichten game_flow',
  await seen('SELECT id FROM game_flows WHERE id=$1', [flowU.id]) === 0)
check('017: anon liest die freigegebene Klasse',
  await seen('SELECT id FROM classes WHERE id=$1', [cls.id]) === 1)
check('020: anon liest das aktive flow_release OHNE Rekursion (42P17)',
  await seen('SELECT id FROM flow_releases WHERE access_code=$1', ['12345678']) === 1)

check('019: anon kann KEINE students lesen (Leak geschlossen)',
  await seen('SELECT id FROM students') === 0)

const { rows: okRows } = await db.query('SELECT * FROM validate_student_code($1,$2)', [rel.id, 'fuchs-482193'])
check('019: validate_student_code akzeptiert korrekten Code (case-insensitiv)',
  okRows.length === 1 && okRows[0].student_code === 'FUCHS-482193')
check('019: validate_student_code lehnt falschen Code ab',
  (await db.query('SELECT * FROM validate_student_code($1,$2)', [rel.id, 'FALSCH-000000'])).rows.length === 0)

await db.exec(`RESET ROLE`)
const { rows: col } = await db.query(
  `SELECT 1 FROM information_schema.columns WHERE table_name='games' AND column_name='grounding'`)
check('018: games.grounding existiert', col.length === 1)

console.log(failures === 0 ? '\n✓ ALLE RLS/RPC-Checks bestanden.' : `\n✗ ${failures} Check(s) fehlgeschlagen.`)
process.exit(failures === 0 ? 0 : 1)
