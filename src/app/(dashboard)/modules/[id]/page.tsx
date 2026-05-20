import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { LehrkraftCheckPanel } from '@/components/playground/LehrkraftCheckPanel'
import { AufgabenListe } from '@/components/playground/AufgabenListe'
import Link from 'next/link'

const SKIN_LABEL: Record<string, string> = {
  unterstufe: 'Unterstufe (Kl. 1–6)',
  mittelstufe: 'Mittelstufe (Kl. 7–10)',
  oberstufe: 'Oberstufe (Kl. 11–13)',
}

export default async function ModuleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: spiel } = await supabase
    .from('games')
    .select('*, analyses(*)')
    .eq('id', id)
    .eq('lehrer_id', user.id)
    .single()

  if (!spiel) notFound()

  const aufgaben = (spiel.aufgaben ?? []) as Array<{ aufgabe_id: string; text: string; antwortformat: string; loesungen: string[] }>

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/modules" className="text-sm text-muted-foreground hover:text-foreground">← Module</Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">{spiel.titel}</span>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Meta-Info */}
        <div className="border rounded-xl p-5">
          <h2 className="font-semibold mb-3">Modul-Info</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Spieltyp</dt>
            <dd>{spiel.spieltyp_didaktisch || '—'}</dd>
            <dt className="text-muted-foreground">Altersstufe</dt>
            <dd>{SKIN_LABEL[spiel.game_skin] ?? spiel.game_skin}</dd>
            <dt className="text-muted-foreground">Aufgaben</dt>
            <dd>{aufgaben.length}</dd>
            <dt className="text-muted-foreground">Status</dt>
            <dd className={`font-medium ${spiel.status === 'freigegeben' ? 'text-green-700' : spiel.status === 'entwurf' ? 'text-muted-foreground' : 'text-yellow-700'}`}>
              {spiel.status}
            </dd>
          </dl>
          {spiel.status === 'freigegeben' && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">Schüler-Link:</p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-3 py-1.5 rounded flex-1 truncate">
                  {typeof window !== 'undefined' ? window.location.origin : ''}/play/{id}
                </code>
                <Link href={`/play/${id}`} target="_blank"
                  className="text-xs text-primary hover:underline whitespace-nowrap">
                  Öffnen →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Aufgaben-Vorschau mit Neu-Generieren */}
        <AufgabenListe spielId={id} initialAufgaben={aufgaben} />

        {/* Lehrkraft-Check */}
        <LehrkraftCheckPanel spielId={id} />
      </div>
    </div>
  )
}
