import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Unit-Tests laufen in Node (keine DOM nötig). Die sicherheitsrelevanten reinen
// Funktionen (AccessCode, Rate-Limit) und die Proxy-Abdeckung werden hier
// getestet. DB-/RLS-Tests laufen separat über `supabase test db` (pgTAP),
// siehe supabase/tests/.
export default defineConfig({
  // `@`-Alias wie in tsconfig, damit Module unter Test (z. B. proxy.ts) ihre
  // `@/lib/...`-Imports auflösen können.
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
