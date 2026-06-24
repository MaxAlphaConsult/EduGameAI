# Supabase – Migrations- & RLS-Workflow

Projekt-Ref: `yttcljtkydirlkibqpgy` (EU-Region).

## Migrationen anwenden (professionell, nicht handkopieren)

Migrationen liegen versioniert in `supabase/migrations/` und werden über die CLI
angewendet — **nicht** per Copy-&-Paste im Dashboard.

```bash
# Einmalig: CLI ans Projekt binden
supabase link --project-ref yttcljtkydirlkibqpgy

# Ausstehende Migrationen anwenden (in Dateinamen-Reihenfolge)
supabase db push
```

### Vorher auf einer Kopie testen
Niemals ungetestet auf Prod. Eine der beiden Varianten:
- **Supabase Branching**: ephemere DB-Kopie pro Branch, Migration dort `db push`en und prüfen.
- **Staging-Projekt**: zweites Supabase-Projekt mit identischem Schema.

### In CI statt vom Laptop
Migrationen sollten beim Merge automatisch laufen (GitHub Action mit
`SUPABASE_ACCESS_TOKEN` + DB-Passwort als Repository-Secrets) — erst gegen
Staging/Branch, dann Prod. So bleibt der Stand reproduzierbar und reviewbar.

## Namens-Konvention & Kollisions-Check

Reihenfolge ergibt sich aus dem **Dateinamen**. Zwei Dateien mit gleichem
Nummern-Präfix (`010_a.sql` + `010_b.sql`) sind fragil — die Reihenfolge hängt
dann am Alphabet des Resttitels.

- **Künftige Migrationen**: eindeutiges, monoton steigendes Präfix. Empfohlen ist
  die Supabase-Konvention `YYYYMMDDHHMMSS_name.sql` (z. B. via `supabase migration new <name>`).
- **Bekannte Altlasten**: `010_*` und `011_*` existieren doppelt. Sie sind bereits
  in Prod angewendet und werden **nicht umbenannt** (sonst hält die CLI sie für
  neu und führt sie erneut aus). Sie sind im Kollisions-Check „grandfathered".
- **CI-Gate**: `npm run check:migrations` schlägt bei *neuen* Präfix-Kollisionen fehl.

### Idempotenz
Migrationen sind idempotent geschrieben (`IF NOT EXISTS`, `DROP POLICY IF EXISTS …`),
sodass eine erneute Ausführung gefahrlos ist.

## RLS-Tests (pgTAP)

Die sicherheitskritischen RLS-Policies (anonymer Schüler-Zugriff) werden mit
pgTAP getestet — auf DB-Ebene, deterministisch:

```bash
# Lokalen Stack starten und DB-Tests ausführen
supabase start
supabase test db
```

Die Tests liegen in `supabase/tests/`. Sie prüfen u. a., dass die `anon`-Rolle
**nur** freigegebene Inhalte (mit aktivem `flow_release`) lesen kann und
unfreigegebene **nicht** — siehe `tests/rls_student_access.test.sql`.
