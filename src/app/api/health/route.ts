import { NextResponse } from 'next/server'

// Leichtgewichtiger Healthcheck für Railway (und beliebige Load-Balancer).
// Kein DB-/Netzwerk-Zugriff — prüft nur, dass der Prozess Requests bedient.
export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json({ status: 'ok' })
}
