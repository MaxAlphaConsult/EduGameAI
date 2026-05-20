import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ModulePreviewClient } from '@/components/modules/ModulePreviewClient'

interface AufgabeRow {
  aufgabe_id: string
  text: string
  antwortformat: string
  loesungen: string[]
  distraktoren?: string[]
  hilfen?: string[]
  teilkompetenz?: string
}

export default async function ModulePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: spiel } = await supabase
    .from('games')
    .select('id, titel, game_skin, aufgaben')
    .eq('id', id)
    .eq('lehrer_id', user.id)
    .single()

  if (!spiel) notFound()

  const aufgaben = (spiel.aufgaben ?? []) as AufgabeRow[]

  if (aufgaben.length === 0) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="rounded-2xl p-6" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <p className="text-sm font-bold mb-1" style={{ color: '#991B1B' }}>Keine Aufgaben vorhanden</p>
          <p className="text-xs" style={{ color: '#B91C1C' }}>
            Dieses Modul enthält noch keine Aufgaben — kannst du also nicht testen.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ModulePreviewClient
      modulId={id}
      titel={spiel.titel ?? 'Modul'}
      gameSkin={spiel.game_skin ?? 'mittelstufe'}
      aufgaben={aufgaben}
    />
  )
}
