import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { AufgabenMitQuelle } from '@/components/playground/AufgabenMitQuelle'
import { ModulInfoEdit } from '@/components/modules/ModulInfoEdit'
import { BausteinInhaltEdit } from '@/components/modules/BausteinInhaltEdit'
import Link from 'next/link'
import { getThemeForSkin } from '@/lib/game/theme'
import type { BausteinTyp, BausteinInhalt } from '@/types'

const BAUSTEIN_LABEL: Record<string, string> = {
  einstieg: 'Einstieg',
  vorwissen_check: 'Vorwissen-Check',
  input: 'Input / Erklärung',
  erarbeitung: 'Erarbeitung',
  spiel: 'Spiel',
  sicherung: 'Sicherung',
  transfer: 'Transfer',
  post_check: 'Abschluss-Check',
}

const SKIN_LABEL: Record<string, string> = {
  unterstufe: 'Unterstufe (Kl. 1–6)',
  mittelstufe: 'Mittelstufe (Kl. 7–10)',
  oberstufe: 'Oberstufe (Kl. 11–13)',
}

function skinLabel(skin: string | null | undefined): string {
  if (!skin) return '—'
  if (SKIN_LABEL[skin]) return SKIN_LABEL[skin]
  // Fallback: Theme-Label nutzen (mit Emoji), oder den rohen Skin-Namen
  const theme = getThemeForSkin(skin)
  return `${theme.label}  ·  ${skin}`
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
  const alleModule = ((geschwisterResult.data ?? []) as Array<{
    id: string
    titel: string | null
    spieltyp_didaktisch: string | null
    game_engine: string | null
    reihenfolge: number | null
  }>).sort((a, b) => (a.reihenfolge ?? 999) - (b.reihenfolge ?? 999))

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/spiele" className="text-sm text-muted-foreground hover:text-foreground">← Lernspiele</Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">{spiel.titel}</span>
      </div>

      {/* Großer CTA: ganzes Lernspiel testen */}
      {aufgaben.length > 0 && spiel.game_flow_id && (
        <Link
          href={`/spiele/${spiel.game_flow_id}/preview`}
          target="_blank"
          className="block mb-4 rounded-2xl p-5 transition-all hover:scale-[1.005]"
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

      {/* Module einzeln testen — Liste aller Module inkl. dem aktuellen */}
      {alleModule.length > 0 && (
        <div className="mb-6 rounded-2xl p-4" style={{ background: '#FAFAFA', border: '1px solid #E9D5FF' }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#7A6A94' }}>
            Module einzeln testen
          </p>
          <div className="flex flex-col gap-2">
            {alleModule.map((m) => {
              const istAktuell = m.id === id
              return (
                <div key={m.id} className="flex items-center gap-2 rounded-xl px-3 py-2"
                  style={{
                    background: istAktuell ? '#F6F1FF' : '#FFFFFF',
                    border: istAktuell ? '1.5px solid #7C3AED' : '1px solid #F3EEFF',
                  }}>
                  <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: istAktuell ? '#7C3AED' : '#F3EEFF', color: istAktuell ? 'white' : '#7C3AED' }}>
                    {m.reihenfolge ?? '·'}
                  </span>
                  <span className="text-xs font-medium flex-1 truncate" style={{ color: '#1F1235' }}>
                    {m.titel || m.spieltyp_didaktisch || m.game_engine || 'Modul'}
                  </span>
                  {istAktuell && (
                    <span className="text-xs font-bold flex-shrink-0" style={{ color: '#7C3AED' }}>
                      du bist hier
                    </span>
                  )}
                  <Link href={`/modules/${m.id}/preview`} target="_blank"
                    className="text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0"
                    style={{ background: '#F3EEFF', color: '#7C3AED', border: '1px solid #E9D5FF', textDecoration: 'none' }}>
                    ▶ Testen
                  </Link>
                  {!istAktuell && (
                    <Link href={`/modules/${m.id}`}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg flex-shrink-0"
                      style={{ background: '#FFFFFF', color: '#7A6A94', border: '1px solid #E9D5FF', textDecoration: 'none' }}>
                      Öffnen →
                    </Link>
                  )}
                </div>
              )
            })}
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
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Baustein</dt>
            <dd>{BAUSTEIN_LABEL[spiel.baustein_typ ?? 'spiel'] ?? 'Spiel'}</dd>
            <dt className="text-muted-foreground">Spieltyp</dt>
            <dd>{spiel.spieltyp_didaktisch || '—'}</dd>
            <dt className="text-muted-foreground">Altersstufe</dt>
            <dd>{skinLabel(spiel.game_skin)}</dd>
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

        {/* Erklär-Inhalt bearbeiten — nur für Nicht-Spiel-Bausteine */}
        {spiel.baustein_typ && spiel.baustein_typ !== 'spiel' && (
          <BausteinInhaltEdit
            spielId={id}
            bausteinTyp={spiel.baustein_typ as BausteinTyp}
            bausteinInhalt={(spiel.baustein_inhalt ?? null) as BausteinInhalt | null}
          />
        )}

        {/* Aufgaben mit Sourcemapping + "Neu generieren" */}
        <AufgabenMitQuelle
          spielId={id}
          aufgaben={aufgaben}
          abschnitte={abschnitte}
          sourcemapping={sourcemapping}
          reduktionen={reduktionen}
        />

        {/* Hinweis auf den Flow-Check */}
        {spiel.game_flow_id && (
          <div className="rounded-xl px-4 py-3" style={{ background: '#F6F1FF', border: '1px solid #C4B5FD' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: '#5B21B6' }}>
              ℹ️ Lehrkraft-Check läuft auf Flow-Ebene
            </p>
            <p className="text-xs leading-relaxed" style={{ color: '#5B21B6' }}>
              Die didaktische Bewertung erfolgt für das ganze Lernspiel — Module
              werden zusammen gedacht, nicht isoliert.{' '}
              <Link href={`/spiele/${spiel.game_flow_id}`} className="underline font-semibold" style={{ color: '#5B21B6' }}>
                Zum Flow-Check →
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
