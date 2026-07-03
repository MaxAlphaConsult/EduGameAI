# syntax=docker/dockerfile:1

# ------------------------------------------------------------------------------
# EduGame AI — Container-Image für Railway (und jede andere Node-Plattform).
# Vercel nutzt dieses Dockerfile NICHT — dort läuft der Build unverändert weiter.
#
# Mehrstufiger Build auf Basis des Next.js-"standalone"-Outputs (next.config.ts).
# Ergebnis: schlankes Runtime-Image ohne dev-Dependencies und ohne vollständige
# node_modules (nur die von @vercel/nft getracten Dateien).
# ------------------------------------------------------------------------------

ARG NODE_VERSION=22-slim

# ---- 1. Dependencies -----------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
# Nur Manifeste kopieren → Layer-Cache greift, solange sich Deps nicht ändern.
COPY package.json package-lock.json ./
RUN npm ci

# ---- 2. Build ------------------------------------------------------------------
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

# NEXT_PUBLIC_* werden zur BUILD-Zeit ins JS-Bundle eingebacken und müssen daher
# HIER vorhanden sein (nicht erst zur Laufzeit). Auf Railway als Build-Args setzen.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
# Telemetrie aus, reproduzierbarere Builds.
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- 3. Runtime ----------------------------------------------------------------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root-User.
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# Standalone-Server + statische Assets. server.js serviert public/ und
# .next/static automatisch, sobald sie an diese Pfade kopiert werden.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Sicherheitsnetz: prompts/ wird zur Laufzeit dynamisch gelesen
# (src/lib/claude/pipeline.ts: readFileSync(join(process.cwd(), 'prompts', filename))).
# Next tract den Ordner aktuell dank nft-Heuristik in den Standalone-Output — das
# beruht aber auf einem dynamischen Dateinamen und kann bei Version-Updates kippen.
# Dieses explizite COPY garantiert, dass die Generierung nie an fehlenden Prompts
# scheitert (kopiert identischen Inhalt, daher unschädlich).
COPY --from=builder --chown=nextjs:nodejs /app/prompts ./prompts

USER nextjs
EXPOSE 3000

# Server-only-Secrets (ANTHROPIC_API_KEY, UPSTASH_*) werden zur LAUFZEIT von
# Railway injiziert — nicht ins Image gebacken.
CMD ["node", "server.js"]
