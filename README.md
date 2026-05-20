# EduGame AI

KI-Lernspielplattform für Schulen — Lehrkraft lädt Unterrichtsmaterial hoch, die Pipeline analysiert es didaktisch in 21 Schritten und generiert ein spielbares Modul, das die Lehrkraft prüft und freigibt.

**Stack:** Next.js 16 · Supabase (EU, DSGVO) · Claude Sonnet 4.6 · Vercel · Zod-Validierung auf allen Pipeline-Outputs.

---

## Lokal starten

```bash
npm install
npm run dev          # http://localhost:3000
```

Erwartet `.env.local` mit `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL` und Supabase-Service-Key.

### Pipeline-E2E-Test (ohne UI)

```bash
npm run test:pipeline
```

Schickt synthetisches Mini-Material durch alle 7 Pipeline-Schritte und validiert jeden Output gegen sein Zod-Schema. Nutzt echte Claude-API-Calls (~5–10 Cent pro Lauf).

---

## Branch-Strategie

**Regel: niemals direkt auf `main` committen.** `main` spiegelt jederzeit den Vercel-Production-Stand.

| Branch-Typ | Namensschema | Zweck |
|---|---|---|
| `main` | `main` | Production. Nur Merges aus Feature-Branches, kein Direkt-Commit. |
| Feature | `feat/<kurz-beschreibung>` | Neue Funktion (z. B. `feat/lernzettel-pdf`). |
| Fix | `fix/<kurz-beschreibung>` | Bugfix gegen Production-Stand. |
| Performance | `perf/<kurz-beschreibung>` | Reine Performance-Verbesserung. |
| Refactor | `refactor/<kurz-beschreibung>` | Umbau ohne Verhaltensänderung. |
| Doku | `docs/<kurz-beschreibung>` | Nur README, Kommentare, Phasenplan. |
| Claude Code | `claude/<auto-name>` | Vom Claude-Worktree-System erzeugt; werden nach Merge gelöscht. |

### Ablauf pro Änderung

1. **Branch aus `main` ziehen**: `git switch -c feat/xyz`
2. **Kleine, themenreine Commits** im Imperativ („Fix: …", „Feat: …", „Perf: …"). Kein Code-Sammelsurium pro Commit.
3. **Push + PR auf `main`**. Bei kleinen Änderungen reicht der erste Push, größere als Draft-PR früh aufmachen.
4. **Vercel-Preview prüfen** (Preview-URL kommt automatisch im PR).
5. **Merge** als „Squash & Merge", damit `main` linear bleibt. Branch nach Merge löschen.

### Hotfix-Pfad

Bei Production-Bug:
1. `fix/<problem>` direkt aus `main` ziehen.
2. Möglichst kleiner Fix, kein Refactor.
3. Schneller Merge mit Vercel-Preview-Check.

### Lokale Worktrees

Claude-Code-Sessions arbeiten in `.claude/worktrees/<auto-name>/` auf einem `claude/<auto-name>`-Branch. Diese Branches werden nach Merge in `main` gelöscht; der Worktree-Ordner kann aufgeräumt werden.

---

## Wichtige Dateien

- `PHASES.md` — aktueller Phasenplan und was als Nächstes ansteht
- `EDUGAME_AI_TODO.md` — detaillierte TODO-Liste
- `src/lib/claude/pipeline.ts` — 7-stufige Pipeline (Analyse → Lernziel → Lernpfad → Spielmapping → Spielgenerierung → Validierung → Diagnose)
- `src/lib/schemas/pipeline.ts` — Zod-Schemas für alle Pipeline-Outputs
- `prompts/` — Claude-System-Prompts pro Schritt
- `supabase/migrations/` — Datenbank-Schema

---

## Deployment

Verbunden mit Vercel · Auto-Deploy bei jedem Push auf `main` · Preview-Deploys pro PR.
