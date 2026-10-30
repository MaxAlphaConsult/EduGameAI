# EduGame AI

Lernplattform für Lehrkräfte: Aus hochgeladenem Unterrichtsmaterial erzeugt
Claude einen LernFlow aus Lern-Einheiten und Spielen. Die Lehrkraft prüft und
gibt ihn für eine Klasse frei. Schülerinnen und Schüler melden sich ohne Konto
mit einem 8-stelligen Spielcode und ihrem persönlichen Tier-Code an.

## Aufbau

| Teil | Technik |
|---|---|
| Anwendung | Next.js 16 (App Router), React 19, Tailwind 4 |
| Datenbank, Anmeldung, Dateiablage | Supabase (EU), Projekt `yttcljtkydirlkibqpgy` |
| KI | Anthropic SDK, Prompts in `prompts/` |
| Betrieb | Railway, Docker-Image aus `Dockerfile`, Auto-Deploy von `main` |
| Rate-Limit | Upstash Redis, ohne Variablen im Speicher (`src/lib/rate-limit*.ts`) |

Die Zugriffskontrolle liegt in der Datenbank (RLS). Die App nutzt keinen
Service-Key. Schüler laufen als Rolle `anon` und greifen nur über die
`schueler_*`-Funktionen (Migration 022) auf ihre Sitzung zu.

## Lokal starten

```bash
npm ci
cp .env.example .env.local   # Werte eintragen, nie committen
npm run dev
```

## Prüfen

```bash
npx tsc --noEmit
npm run lint
npm test                     # Vitest
npm run verify:rls           # alle Migrationen in PGlite, RLS als anon/Lehrkraft
npm run check:migrations     # Nummernkollisionen
npm run build
```

`npm run verify:rls -- --bis 021` spielt die Migrationen nur bis zur genannten
Nummer ab. So lässt sich zeigen, dass eine Prüfung ohne die neue Migration rot ist.

## Datenbank

Migrationen liegen nummeriert in `supabase/migrations/`. Angewendet werden sie
im SQL-Editor des Supabase-Projekts, additive Änderungen **vor** dem Merge.
Weitere Hinweise: `supabase/README.md`.

## Weitere Dokumente

- `ROADMAP.md`, `PHASES.md`: Produkt- und Phasenplan
- `docs/RAILWAY_MIGRATION.md`: Umzug von Vercel auf Railway (abgeschlossen)
- `.claude/skills/edugame-design/`: Gestaltungsregeln für die Oberfläche
