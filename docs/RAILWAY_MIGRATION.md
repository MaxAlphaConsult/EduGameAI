# Railway-Migration — Runbook

**Stand 30.10.2026: abgeschlossen.** Railway ist die einzige Plattform
(`edugame-ai-production.up.railway.app`, Auto-Deploy von `main` über das
Dockerfile). Vercel wird nicht mehr genutzt; die `VERCEL`-Weiche in
`next.config.ts` ist entfernt. Der Text unten beschreibt den Umzug, wie er
vorbereitet wurde, und bleibt als Nachweis stehen.

Umzug von Vercel auf Railway (Container). Ziel: Weg vom 300s-Function-Limit,
alles auf einer Plattform.

## Was vorbereitet wurde

| Datei | Zweck |
|---|---|
| `next.config.ts` | `output: "standalone"` (bis 30.10.2026 nur, wenn nicht auf Vercel). |
| `Dockerfile` | 3-stufiger Build (deps → build → runtime) auf Standalone-Basis, non-root, Node 22. Kopiert `prompts/` explizit als Sicherheitsnetz (Pipeline liest sie dynamisch). |
| `.dockerignore` | Hält Secrets & Ballast aus dem Build-Kontext. |
| `railway.json` | Builder = Dockerfile, Healthcheck `/api/health`, Restart-Policy. |
| `src/app/api/health/route.ts` | Leichtgewichtiger 200-Healthcheck (auch auf Vercel harmlos). |
| `.env.example` | Dokumentiert alle benötigten Variablen. |

## Env-Variablen (Railway → Service → Variables)

Railway stellt Service-Variablen bei Dockerfile-Builds automatisch auch als
**Build-Args** bereit. Deshalb reicht es, alle fünf als Service-Variablen zu setzen:

**Build-Zeit (ins Client-Bundle eingebacken):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Laufzeit (Server-Secrets):**
- `ANTHROPIC_API_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

> ⚠️ Ändert sich eine `NEXT_PUBLIC_*`-Variable, muss **neu gebaut** werden
> (nicht nur neu gestartet) — der Wert steckt im Bundle.

## Railway-Setup

1. Neues Projekt → **Deploy from GitHub repo** → dieses Repo, Branch `main`.
2. Railway erkennt `railway.json` + `Dockerfile` automatisch.
3. Die fünf Variablen oben setzen.
4. Deploy abwarten. Healthcheck `/api/health` muss grün werden.
5. Provisorische Railway-Domain öffnen (`*.up.railway.app`) und durchtesten:
   Login (8-stellige Codes), Generierung eines Moduls, Spiel-Flow, PDF-Export.

## Das 300s-Limit — was sich ändert

Die fünf Routen mit `export const maxDuration = 300`
(`analyze`, `games/*/generate`, `games/*/check`, `flows/*/improve`, `flows/*/check`)
sind Vercel-Deployment-Hints. **Auf Railway sind sie No-Ops** — der Container hat
keinen Function-Timeout, lange Läufe blockieren nicht mehr. Die inkrementelle
Generierung pro Modul (`gen_status`) kann bleiben (robuster), ist aber nicht mehr
durch die 300s erzwungen. Die `maxDuration`-Zeilen können später entfernt werden;
sie schaden nicht.

## ⚠️ Wichtig, falls Cloudflare davor kommt

Railway selbst erzwingt **kein** hartes HTTP-Request-Timeout — lange
Generierungs-Requests laufen durch. **Cloudflare (Free/Pro) kappt Proxy-Requests
aber nach ~100s.** Wenn ein einzelner Generierungs-Call länger als 100s dauert und
über einen orange-gewolkten Cloudflare-Proxy läuft, bricht CF ab, obwohl der
Container weiterarbeitet.

Optionen (eine wählen), falls Cloudflare eingesetzt wird:
- **API-Subdomain DNS-only** (graue Wolke) → Generierungs-Requests umgehen den
  CF-Proxy und gehen direkt an Railway. Frontend/Assets bleiben proxied/gecacht.
- **Chunks < 100s halten** — die `gen_status`-Infra kann pro Baustein so
  geschnitten werden, dass jeder Einzel-Request deutlich unter 100s bleibt.
- **Ohne Cloudflare starten** — Railway-Domain direkt nutzen; CDN später ergänzen.

Empfehlung fürs Erste: **ohne Cloudflare live gehen**, Timing der Gen-Routen auf
Railway messen, dann entscheiden.

## Cutover (wenn Tests grün)

1. Custom Domain in Railway hinzufügen → CNAME beim DNS-Provider setzen.
2. TTL vorab niedrig setzen (z.B. 300s) für schnellen Rollback.
3. DNS umstellen. Vercel-Deployment **noch nicht löschen**.
4. Beobachten: Logs, Fehlerraten, Gen-Laufzeiten.

## Rollback

Seit 30.10.2026 gibt es keinen Rückweg zu Vercel mehr. Rollback heißt: einen
älteren Commit auf Railway erneut ausrollen.

## Lokaler Container-Test

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="https://<ref>.supabase.co" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon-key>" \
  -t edugame-ai .

docker run --rm -p 3000:3000 \
  -e ANTHROPIC_API_KEY="<key>" \
  -e UPSTASH_REDIS_REST_URL="<url>" \
  -e UPSTASH_REDIS_REST_TOKEN="<token>" \
  edugame-ai

# → http://localhost:3000/api/health  sollte {"status":"ok"} liefern
```
