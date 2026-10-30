## Was ändert sich

<!-- Ein bis drei Sätze: was tut der PR und warum. -->

## Checkliste

Nur die Punkte, die hier schon einmal Zeit oder Daten gekostet haben:

- [ ] Neue Migration: additive Teile sind **vor** dem Merge auf Prod angewendet (SQL-Editor), Marke `ddl-auf-prod` gesetzt. Teile, die erst **nach** dem Deploy laufen dürfen (Policies entfernen), stehen mit Reihenfolge unten.
- [ ] Neuer Zugriff auf Schülerdaten: über eine `schueler_*`-Funktion, nicht über eine neue anon-Policy. `npm run verify:rls` grün, Gegenprobe mit `--bis <vorige Nummer>` rot.
- [ ] Eigener Fehler aus einer DB-Funktion: SQLSTATE `PTxyz`, nie `40001`/`40P01` (PostgREST wiederholt diese bis zum Timeout).
- [ ] Keine Schülerdaten (Codes, Antworten) in Logs, URLs oder Fehlermeldungen.
- [ ] Keine Passwörter, Schlüssel oder `.env`-Dateien im Commit.

## Geprüft mit

<!-- Wie nachgewiesen? Zahl mit Bezugsgröße, Statuscode, Gegenprobe. Was ist NICHT geprüft? -->
