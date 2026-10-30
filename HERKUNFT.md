# Herkunft übernommener Dateien

Teile der Infrastruktur stammen aus GateSign (`MaxAlphaConsult/GateSign`).
Übernommen wird **Datei für Datei** aus `origin/main`, auf EduGame
zugeschnitten. Nie ein Ordner, nie die GateSign-Historie (dort stehen in alten
Commits Zugangsdaten).

Neue Übernahmen werden hier mit Quellpfad, Commit und Anpassungen eingetragen.

## Phase 1: CI und Secret-Scan (30.10.2026)

Quelle: GateSign `origin/main`, Commit `193dae60ffe0314791852bf32e6f9b8afe8b9a90` (29.10.2026).

| Datei in EduGame | Quelle in GateSign | Angepasst |
|---|---|---|
| `.github/workflows/ci.yml` | `.github/workflows/ci.yml` | Node 22 statt 20 (wie im Dockerfile). Übernommen: TypeScript, Lint, Unit-Tests, DDL-Freigabe mit Nummernkollision. **Neu:** Job `datenbank` (`check:migrations`, `verify:rls`), Job `build` mit Platzhalter-Variablen. **Weggelassen:** `coverage` (kein Coverage-Werkzeug eingerichtet), `smoke-tests` (kein Playwright). `npm test` statt `npm run test:run`. |
| `.github/workflows/security.yml` | `.github/workflows/security.yml` | Übernommen: `secret-scan`, `dependency-audit` (Delta auf PRs). **Neu:** Prüfsumme der gitleaks-Datei wird geprüft; auf PRs zusätzlich Scan jedes PR-Commits (Repo ist öffentlich). **Weggelassen:** Semgrep und Bericht-Issue (brauchen `scripts/sicherheitsbericht.mjs` und eine Baseline-Triage). |
| `.gitleaks.toml` | `.gitleaks.toml` | Nur `useDefault = true`. Die GateSign-Ausnahme für Produkt-Slugs entfällt; die EduGame-Historie ist ohne Ausnahme fundfrei. |
| `.github/dependabot.yml` | `.github/dependabot.yml` | Ausnahmen auf EduGame-Pakete reduziert (keine PDF-/Bild-Bibliotheken von GateSign); Major-Sperre zusätzlich für `@electric-sql/pglite` (trägt `verify:rls`). |
| `.github/pull_request_template.md` | `.github/pull_request_template.md` | Checkliste neu aus EduGame-Vorfällen: Migration vor/nach dem Deploy, Schülerdaten nur über `schueler_*`-Funktionen, kein `40001` in DB-Funktionen. |
| `.husky/pre-commit` | `.husky/pre-commit` | Texte; sonst gleich. |
| `.husky/pre-push` | `.husky/pre-push` | `npm test` statt `test:run`; **neu:** `verify:rls` läuft mit. |
| `package.json` | (Muster aus GateSign) | Skripte `typecheck` und `prepare` (husky), devDependency `husky@9`. |

Nicht aus GateSign, aber in dieser Phase entstanden: die Bestandsliste in
`eslint.config.mjs` (React-Compiler-Regeln nur in zwölf Bestandsdateien als
Warnung).

## In GateSign zurückspielen

Was EduGame besser macht und in den Baukasten gehört:

- `scripts/verify-rls.mjs`: alle Migrationen in PGlite gegen einen Supabase-Stub mit Standardrechten, `--bis NNN` für die Gegenprobe, Wächter gegen `40001`/`40P01`.
- Rate-Limit mit `@upstash/ratelimit` (gleitendes Fenster) an einer zentralen Stelle im Proxy, mit Abdeckungstest (`src/proxy.test.ts`).
- gitleaks: Prüfsumme der heruntergeladenen Datei und Scan der PR-Commits.
