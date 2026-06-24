#!/usr/bin/env node
// Prüft die Supabase-Migrationen auf doppelte Nummern-Präfixe.
//
// Hintergrund: Supabase wendet Migrationen in lexikografischer Dateinamen-
// Reihenfolge an. Zwei Dateien mit gleichem Präfix (z. B. zwei `010_*`) machen
// die Reihenfolge vom Alphabet des Resttitels abhängig — fragil und schwer
// nachvollziehbar. Dieser Check fängt NEUE Kollisionen im CI ab.
//
// Die bereits in Produktion angewandten Doppel-Nummern 010/011 sind bewusst
// „grandfathered": Angewandte Migrationen dürfen NICHT umbenannt werden (sonst
// hält die CLI sie für neu und führt sie erneut aus). Neue Migrationen müssen
// eindeutige, monoton steigende Präfixe verwenden (Konvention künftig:
// `YYYYMMDDHHMMSS_name.sql`).

import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(here, '..', 'supabase', 'migrations')

// Bereits angewandte, nicht umbenennbare Doppel-Präfixe.
const GRANDFATHERED = new Set(['010', '011'])

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort()

const byPrefix = new Map()
for (const file of files) {
  const match = file.match(/^(\d+)[_-]/)
  if (!match) {
    console.error(`✗ Migration ohne Nummern-Präfix: ${file}`)
    process.exit(1)
  }
  const prefix = match[1]
  if (!byPrefix.has(prefix)) byPrefix.set(prefix, [])
  byPrefix.get(prefix).push(file)
}

let hasNewCollision = false
for (const [prefix, group] of byPrefix) {
  if (group.length > 1) {
    const grandfathered = GRANDFATHERED.has(prefix)
    const label = grandfathered ? 'bekannt (grandfathered)' : 'NEUE KOLLISION'
    console[grandfathered ? 'warn' : 'error'](
      `${grandfathered ? '⚠' : '✗'} Präfix ${prefix} mehrfach vergeben [${label}]: ${group.join(', ')}`,
    )
    if (!grandfathered) hasNewCollision = true
  }
}

if (hasNewCollision) {
  console.error('\nNeue Migration mit kollidierendem Präfix gefunden. Bitte ein eindeutiges, höheres Präfix verwenden (Konvention: YYYYMMDDHHMMSS_name.sql).')
  process.exit(1)
}

console.log(`✓ ${files.length} Migrationen geprüft — keine neuen Nummern-Kollisionen.`)
