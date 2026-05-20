import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { LehrkraftCheckPanel } from '@/components/playground/LehrkraftCheckPanel'
import { AufgabenMitQuelle } from '@/components/playground/AufgabenMitQuelle'
import { ModulInfoEdit } from '@/components/modules/ModulInfoEdit'
import Link from 'next/link'

const SKIN_LABEL: Record<string, string> = {
  unterstufe: 'Unterstufe (Kl. 1–6)',
  mittelstufe: 'Mittelstufe (Kl. 7–10)',
  oberstufe: 'Oberstufe (Kl. 11–13)',
}

interface AnalyseRow { material_id: string }

interface MaterialAbschnitt { id: string; text: string; seite?: number }

interface AufgabeRow {
  aufgabe_id: string
  text: string
  antwortformat: string
  loesungen: string[]
  abschnitt_ref?: string
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

  const aufgaben = (spiel.aufgaben ?? []) as AufgabeRow[]
  const analyse = spiel.analyses as AnalyseRow | null

  // Materialabschnitte, Sourcemapping und Geschwister-Module parallel laden
  const [materialResult, checkResult, geschwisterResult] = await Promise.all([
    analyse?.material_id
      ? supabase.from('materials').select('abschnitte').eq('id', analyse.material_id).single()
      : Promise.resolve({ data: null }),
    supabase.from('lehrkraft_checks').select('sourcemapping, reduktionen').eq('spiel_id', id).maybeSingle(),
    spiel.game_flow_id
      ? supabase
          .from('games')
          .select('id, titel, spieltyp_didaktisch, game_engine, reihenfolge')
          .eq('game_flow_id', spiel.game_flow_id)
          .eq('lehrer_id', user.id)
      : Promise.resolve({ data: null }),
  ])

  const abschnitte = (materialResult.data?.abschnitte ?? []) as MaterialAbschnitt[]
  const sourcemapping = checkResult.data?.sourcemapping ?? null
  const reduktionen = checkResult.data?.reduktionen ?? null
  const geschwisterModule = ((geschwisterResult.data ?? []) as Array<{
    id: string
    titel: string | null
    spieltyp_didaktisch: string | null
    game_engine: string | null
    reihenfolge: number | null
  }>)
    .filter((m) => m.id !== id)
    .sort((a, b) => (a.reihenfolge ?? 999) - (b.reihenfolge ?? 999))

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/spiele" className="text-sm text-muted-foreground hover:text-foreground">← Lernspiele</Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">{spiel.titel}</span>
      </div>

      {/* Spielen-Testen-Buttons: Einzeln + ganzes Lernspiel */}
      {aufgaben.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {/* Ganzes Lernspiel testen — der „Hauptweg" für die meisten Lehrer */}
          {spiel.game_flow_id && (
            <Link
              href={`/spiele/${spiel.game_flow_id}/preview`}
              target="_blank"
              className="block rounded-2xl p-5 transition-all hover:scale-[1.005]"
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
                color: 'white',
                textDecoration: 'none',
                boxShadow: '0 6px 24px rgba(124,58,237,0.25)',
              }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.18)' }}>
                  ▶▶
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base">Ganzes Lernspiel testen</p>
                  <p className="text-xs" style={{ color: '#E9D5FF' }}>
                    Alle Module hintereinander, wie ein Schüler.
                  </p>
                </div>
                <span className="text-xl flex-shrink-0" style={{ color: '#E9D5FF' }}>↗</span>
              </div>
            </Link>
          )}

          {/* Nur dieses Modul testen — für Debugging einer einzelnen Aufgabe */}
          <Link
            href={`/modules/${id}/preview`}
            target="_blank"
            className="block rounded-2xl p-5 transition-all hover:scale-[1.005]"
            style={{
              background: '#FFFFFF',
              color: '#1F1235',
              textDecoration: 'none',
              border: '1.5px solid #C4B5FD',
              boxShadow: '0 2px 12px rgba(124,58,237,0.08)',
            }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: '#F3EEFF', color: '#7C3AED' }}>
                ▶
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base">Nur dieses Modul testen</p>
                <p className="text-xs" style={{ color: '#7A6A94' }}>
                  Schneller Probelauf einer einzelnen Aufgabe.
                </p>
              </div>
              <span className="text-xl flex-shrink-0" style={{ color: '#C4B5FD' }}>↗</span>
            </div>
          </Link>
        </div>
      )}

      {/* Andere Module aus diesem Lernspiel — schneller Wechsel */}
      {geschwisterModule.length > 0 && (
        <div className="mb-6 rounded-2xl p-4" style={{ background: '#FAFAFA', border: '1px solid #E9D5FF' }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#7A6A94' }}>
            Andere Module aus diesem Lernspiel
          </p>
          <div className="flex flex-col gap-2">
            {geschwisterModule.map((m) => (
              <div key={m.id} className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{ background: '#FFFFFF', border: '1px solid #F3EEFF' }}>
                <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: '#F3EEFF', color: '#7C3AED' }}>
                  {m.reihenfolge ?? '·'}
                </span>
                <span className="text-xs font-medium flex-1 truncate" style={{ color: '#1F1235' }}>
                  {m.titel || m.spieltyp_didaktisch || m.game_engine || 'Modul'}
                </span>
                <Link href={`/modules/${m.id}/preview`} target="_blank"
                  className="text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0"
                  style={{ background: '#F3EEFF', color: '#7C3AED', border: '1px solid #E9D5FF', textDecoration: 'none' }}>
                  ▶ Testen
                </Link>
                <Link href={`/modules/${m.id}`}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg flex-shrink-0"
                  style={{ background: '#FFFFFF', color: '#7A6A94', border: '1px solid #E9D5FF', textDecoration: 'none' }}>
                  Öffnen →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {/* Meta-Info */}
        <div className="border rounded-xl p-5">
          <div className="flex items-start justify-between gap-4 mb-3">
            <h2 className="font-semibold">Modul-Info</h2>
            <ModulInfoEdit
              spielId={id}
              titel={spiel.titel ?? ''}
              status={spiel.status ?? 'entwurf'}
              flowId={spiel.game_flow_id ?? null}
            />
          </div>
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
              <p className="text-xs text-muted-foreground">
                Dieses Modul wird Teil eines Lernspiels. Du gibst es unter <Link href="/classes" className="text-primary hover:underline">Klassen</Link> für eine Klasse frei.
              </p>
            </div>
          )}
        </div>

        {/* Aufgaben mit Sourcemapping + "Neu generieren" */}
        <AufgabenMitQuelle
          spielId={id}
          aufgaben={aufgaben}
          abschnitte={abschnitte}
          sourcemapping={sourcemapping}
          reduktionen={reduktionen}
        />

        {/* Lehrkraft-Check */}
        <LehrkraftCheckPanel spielId={id} initialStatus={spiel.status ?? 'entwurf'} />
      </div>
    </div>
  )
}
