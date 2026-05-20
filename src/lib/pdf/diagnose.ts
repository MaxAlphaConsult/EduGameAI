// PDF-Generatoren für Klassendiagnose (Lehrkraft) und individuelle SuS-Rückmeldungen.
// DSGVO: ausschließlich anonyme Codes, keine Klarnamen.

interface DiagnoseInput {
  spielTitel: string
  ausgabemodus?: 'kompakt' | 'detail'
  klassenueberblick: {
    anzahl_codes: number
    lernziel_erreicht: number
    lernziel_teilweise: number
    lernziel_noch_nicht_gesichert: number
    gesamteinschaetzung: string
    lernziel_original: string
    abdeckungshinweis: string
  }
  kompetenzampel_klasse: { teilkompetenz: string; status: string; einschaetzung: string }[]
  haeufige_fehlvorstellungen: { fehlvorstellung: string; haeufigkeit: number; empfehlung: string }[]
  empfehlungen_weiterarbeit: {
    plenum: string[]
    vertiefung: string[]
    erweiterung: string[]
    exit_ticket_vorschlag?: string | null
  }
  foerdergruppen?: { gruppe: string; beschreibung: string; codes: string[]; empfehlung: string }[]
  individuelle_diagnosen: {
    code: string
    lernzielstatus: string
    empfehlung: string
    hilfenutzung?: string
    erreichte_komplexitaetsstufe?: number
    sichere_teilkompetenzen?: string[]
    unsichere_teilkompetenzen?: string[]
    fehlvorstellungen?: string[]
  }[]
  sus_rueckmeldungen?: {
    code: string
    lernstand_satz: string
    kann_schon_gut: string[]
    noch_ueben: string[]
    naechster_schritt: string
  }[]
  daten_hinweise?: string[]
}

const PURPLE = [124, 58, 237] as const
const PURPLE_LIGHT = [245, 240, 255] as const
const GREEN = [16, 185, 129] as const
const GREEN_LIGHT = [209, 250, 229] as const
const YELLOW = [217, 119, 6] as const
const YELLOW_LIGHT = [254, 243, 199] as const
const RED = [220, 38, 38] as const
const RED_LIGHT = [254, 226, 226] as const
const GRAY = [100, 100, 120] as const
const DARK = [20, 20, 35] as const
const LIGHT_BORDER = [233, 213, 255] as const

const STATUS_LABEL: Record<string, string> = {
  erreicht: 'Lernziel erreicht',
  teilweise_erreicht: 'Teilweise erreicht',
  noch_nicht_gesichert: 'Noch nicht gesichert',
}

const HILFENUTZUNG_LABEL: Record<string, string> = {
  selbststaendig: 'selbstständig',
  mit_hilfe: 'mit Hilfe',
  trotz_hilfe_unsicher: 'trotz Hilfe unsicher',
}

const sanitizeDateiname = (s: string) =>
  s.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '_').slice(0, 40)

// ============================================================
// LEHRKRAFT-PDF — Klassendiagnose mit anonymen Codes
// ============================================================

export async function generateLehrkraftDiagnosePDF(data: DiagnoseInput): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageW = 210
  const pageH = 297
  const margin = 18
  const contentW = pageW - margin * 2
  const datum = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })

  let y = 0

  function neueSeiteWennNoetig(benoetigtMm: number) {
    if (y + benoetigtMm > pageH - 18) {
      doc.addPage()
      y = 20
    }
  }

  function sektionsTitel(text: string) {
    neueSeiteWennNoetig(14)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text(text, margin, y)
    doc.setDrawColor(...PURPLE)
    doc.setLineWidth(0.4)
    doc.line(margin, y + 1.5, margin + 30, y + 1.5)
    y += 8
  }

  // ── Header ───────────────────────────────────────────────
  doc.setFillColor(...PURPLE)
  doc.rect(0, 0, pageW, 38, 'F')

  doc.setFillColor(160, 90, 255)
  doc.roundedRect(margin, 9, 18, 18, 3, 3, 'F')
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('E', margin + 9, 21, { align: 'center' })

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('EduGame AI', margin + 22, 17)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(210, 190, 255)
  doc.text('Klassendiagnose · Lehrkraft', margin + 22, 23)

  doc.setFontSize(8)
  doc.text(datum, pageW - margin, 21, { align: 'right' })

  y = 46

  // ── Spiel-Titel ──────────────────────────────────────────
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  const titelLines = doc.splitTextToSize(data.spielTitel, contentW)
  doc.text(titelLines, margin, y)
  y += titelLines.length * 6 + 2

  if (data.ausgabemodus) {
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text(`Modus: ${data.ausgabemodus === 'detail' ? 'Detail-Diagnose' : 'Kompakt-Diagnose'}`, margin, y)
    y += 8
  }

  // ── Lernziel ─────────────────────────────────────────────
  doc.setFillColor(...PURPLE_LIGHT)
  const lzLines = doc.splitTextToSize(data.klassenueberblick.lernziel_original, contentW - 12)
  const lzH = lzLines.length * 5 + 12
  doc.roundedRect(margin, y, contentW, lzH, 3, 3, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...PURPLE)
  doc.text('Lernziel', margin + 5, y + 6)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...DARK)
  doc.text(lzLines, margin + 5, y + 11)
  y += lzH + 8

  // ── Klassenüberblick — 3 Kacheln ─────────────────────────
  sektionsTitel('Klassenüberblick')

  const kachelW = (contentW - 6) / 3
  const kachelH = 22
  const kacheln = [
    { label: 'Lernziel erreicht', wert: data.klassenueberblick.lernziel_erreicht, bg: GREEN_LIGHT, fg: GREEN },
    { label: 'Teilweise erreicht', wert: data.klassenueberblick.lernziel_teilweise, bg: YELLOW_LIGHT, fg: YELLOW },
    { label: 'Noch nicht gesichert', wert: data.klassenueberblick.lernziel_noch_nicht_gesichert, bg: RED_LIGHT, fg: RED },
  ]
  kacheln.forEach((k, i) => {
    const x = margin + i * (kachelW + 3)
    doc.setFillColor(...k.bg)
    doc.roundedRect(x, y, kachelW, kachelH, 3, 3, 'F')
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...k.fg)
    doc.text(String(k.wert), x + kachelW / 2, y + 11, { align: 'center' })
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(k.label, x + kachelW / 2, y + 17, { align: 'center' })
  })
  y += kachelH + 6

  // Gesamteinschätzung
  const geLines = doc.splitTextToSize(data.klassenueberblick.gesamteinschaetzung, contentW)
  doc.setFontSize(9.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...DARK)
  doc.text(geLines, margin, y)
  y += geLines.length * 5 + 3

  if (data.klassenueberblick.abdeckungshinweis) {
    const abdLines = doc.splitTextToSize(data.klassenueberblick.abdeckungshinweis, contentW)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...GRAY)
    doc.text(abdLines, margin, y)
    y += abdLines.length * 4.5 + 3
  }
  y += 4

  // ── Teilkompetenzen ──────────────────────────────────────
  if (data.kompetenzampel_klasse.length > 0) {
    sektionsTitel('Teilkompetenzen')
    for (const k of data.kompetenzampel_klasse) {
      neueSeiteWennNoetig(8)
      const dotColor = k.status === 'gruen' ? GREEN : k.status === 'gelb' ? YELLOW : RED
      doc.setFillColor(...dotColor)
      doc.circle(margin + 1.5, y - 1.5, 1.2, 'F')
      doc.setFontSize(9.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...DARK)
      const kLines = doc.splitTextToSize(k.teilkompetenz, contentW - 10)
      doc.text(kLines, margin + 6, y)
      y += kLines.length * 4.5
      if (k.einschaetzung) {
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...GRAY)
        const eLines = doc.splitTextToSize(k.einschaetzung, contentW - 10)
        doc.text(eLines, margin + 6, y)
        y += eLines.length * 4.5
      }
      y += 2
    }
    y += 2
  }

  // ── Häufige Fehlvorstellungen ────────────────────────────
  if (data.haeufige_fehlvorstellungen.length > 0) {
    sektionsTitel('Häufige Fehlvorstellungen')
    for (const f of data.haeufige_fehlvorstellungen) {
      const fLines = doc.splitTextToSize(f.fehlvorstellung, contentW - 18)
      const eLines = doc.splitTextToSize(f.empfehlung, contentW - 8)
      const boxH = fLines.length * 5 + eLines.length * 4.5 + 9
      neueSeiteWennNoetig(boxH + 2)
      doc.setFillColor(255, 251, 235)
      doc.setDrawColor(253, 230, 138)
      doc.setLineWidth(0.2)
      doc.roundedRect(margin, y, contentW, boxH, 2, 2, 'FD')
      doc.setFontSize(9.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(146, 64, 14)
      doc.text(fLines, margin + 4, y + 6)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text(`${f.haeufigkeit}x`, pageW - margin - 4, y + 6, { align: 'right' })
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(180, 83, 9)
      doc.text(eLines, margin + 4, y + 6 + fLines.length * 5 + 2)
      y += boxH + 3
    }
    y += 2
  }

  // ── Fördergruppen ────────────────────────────────────────
  if (data.foerdergruppen && data.foerdergruppen.length > 0) {
    sektionsTitel('Fördergruppen')
    for (const g of data.foerdergruppen) {
      const codesStr = g.codes.join(' · ')
      const codeLines = doc.splitTextToSize(codesStr, contentW - 6)
      const empfLines = doc.splitTextToSize(g.empfehlung, contentW - 6)
      const boxH = codeLines.length * 4.5 + empfLines.length * 4.5 + 14
      neueSeiteWennNoetig(boxH + 3)
      doc.setFillColor(...PURPLE_LIGHT)
      doc.setDrawColor(...LIGHT_BORDER)
      doc.setLineWidth(0.2)
      doc.roundedRect(margin, y, contentW, boxH, 2, 2, 'FD')
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...PURPLE)
      doc.text(`Gruppe ${g.gruppe}`, margin + 4, y + 6)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...DARK)
      doc.text(g.beschreibung, margin + 24, y + 6)
      doc.setFontSize(8.5)
      doc.setFont('courier', 'normal')
      doc.setTextColor(91, 33, 182)
      doc.text(codeLines, margin + 4, y + 10.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...DARK)
      doc.text(empfLines, margin + 4, y + 11 + codeLines.length * 4.5)
      y += boxH + 3
    }
    y += 2
  }

  // ── Empfehlungen ─────────────────────────────────────────
  const e = data.empfehlungen_weiterarbeit
  if (e.plenum.length || e.vertiefung.length || e.erweiterung.length || e.exit_ticket_vorschlag) {
    sektionsTitel('Empfehlungen für die Weiterarbeit')

    function druckeEmpfehlungs({ label, items, farbe }: { label: string; items: string[]; farbe: readonly [number, number, number] }) {
      if (items.length === 0) return
      neueSeiteWennNoetig(8)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...farbe)
      doc.text(label.toUpperCase(), margin, y)
      y += 4.5
      for (const item of items) {
        const lines = doc.splitTextToSize(item, contentW - 6)
        neueSeiteWennNoetig(lines.length * 4.5 + 2)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...DARK)
        doc.text('→', margin, y)
        doc.text(lines, margin + 5, y)
        y += lines.length * 4.5 + 1
      }
      y += 2
    }

    druckeEmpfehlungs({ label: 'Im Plenum', items: e.plenum, farbe: PURPLE })
    druckeEmpfehlungs({ label: 'Vertiefung', items: e.vertiefung, farbe: PURPLE })
    druckeEmpfehlungs({ label: 'Erweiterung', items: e.erweiterung, farbe: GREEN })

    if (e.exit_ticket_vorschlag) {
      const lines = doc.splitTextToSize(e.exit_ticket_vorschlag, contentW - 6)
      const boxH = lines.length * 4.5 + 8
      neueSeiteWennNoetig(boxH + 3)
      doc.setFillColor(...PURPLE_LIGHT)
      doc.roundedRect(margin, y, contentW, boxH, 2, 2, 'F')
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...PURPLE)
      doc.text('EXIT-TICKET', margin + 3, y + 4.5)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...DARK)
      doc.text(lines, margin + 3, y + 9.5)
      y += boxH + 3
    }
  }

  // ── Individuelle Diagnosen ───────────────────────────────
  if (data.individuelle_diagnosen.length > 0) {
    doc.addPage()
    y = 20
    sektionsTitel(`Individuelle Diagnosen (${data.individuelle_diagnosen.length} Codes)`)

    for (const d of data.individuelle_diagnosen) {
      const statusFarbe = d.lernzielstatus === 'erreicht' ? GREEN
        : d.lernzielstatus === 'teilweise_erreicht' ? YELLOW : RED

      const metaTeile = [STATUS_LABEL[d.lernzielstatus] ?? d.lernzielstatus]
      if (d.hilfenutzung) metaTeile.push(HILFENUTZUNG_LABEL[d.hilfenutzung] ?? d.hilfenutzung)
      if (d.erreichte_komplexitaetsstufe) metaTeile.push(`K-Stufe ${d.erreichte_komplexitaetsstufe}`)
      const metaStr = metaTeile.join(' · ')

      const empfLines = d.empfehlung ? doc.splitTextToSize(d.empfehlung, contentW - 24) : []
      let zusatzH = 0
      const sichere = d.sichere_teilkompetenzen ?? []
      const unsichere = d.unsichere_teilkompetenzen ?? []
      const fehlv = d.fehlvorstellungen ?? []
      const zusatzListen: { label: string; items: string[]; farbe: readonly [number, number, number] }[] = []
      if (sichere.length) zusatzListen.push({ label: 'sicher', items: sichere, farbe: GREEN })
      if (unsichere.length) zusatzListen.push({ label: 'noch unsicher', items: unsichere, farbe: YELLOW })
      if (fehlv.length) zusatzListen.push({ label: 'Fehlvorstellungen', items: fehlv, farbe: RED })

      for (const zl of zusatzListen) {
        const zlLines = doc.splitTextToSize(zl.items.join(' · '), contentW - 24)
        zusatzH += zlLines.length * 4 + 4
      }

      const boxH = 10 + empfLines.length * 4.5 + zusatzH + 2
      neueSeiteWennNoetig(boxH + 3)

      doc.setDrawColor(...LIGHT_BORDER)
      doc.setLineWidth(0.2)
      doc.roundedRect(margin, y, contentW, boxH, 2, 2, 'D')

      // Code-Chip
      doc.setFillColor(...PURPLE_LIGHT)
      doc.roundedRect(margin + 3, y + 3, 22, 5.5, 1, 1, 'F')
      doc.setFontSize(8)
      doc.setFont('courier', 'bold')
      doc.setTextColor(91, 33, 182)
      doc.text(d.code, margin + 14, y + 6.7, { align: 'center' })

      // Status + Meta
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...statusFarbe)
      doc.text(metaStr, margin + 28, y + 6.5)

      // Empfehlung
      if (empfLines.length > 0) {
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...GRAY)
        doc.text(empfLines, margin + 4, y + 12)
      }

      // Zusatz-Listen
      let zy = y + 12 + empfLines.length * 4.5 + 1
      for (const zl of zusatzListen) {
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...zl.farbe)
        doc.text(zl.label.toUpperCase(), margin + 4, zy)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...DARK)
        const zlLines = doc.splitTextToSize(zl.items.join(' · '), contentW - 24)
        doc.text(zlLines, margin + 22, zy)
        zy += Math.max(4, zlLines.length * 4) + 1
      }

      y += boxH + 2
    }
  }

  // ── Daten-Hinweise ───────────────────────────────────────
  if (data.daten_hinweise && data.daten_hinweise.length > 0) {
    neueSeiteWennNoetig(20)
    y += 4
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...YELLOW)
    doc.text('Hinweise zur Datengrundlage', margin, y)
    y += 5
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK)
    for (const h of data.daten_hinweise) {
      const hLines = doc.splitTextToSize(`· ${h}`, contentW)
      neueSeiteWennNoetig(hLines.length * 4 + 1)
      doc.text(hLines, margin, y)
      y += hLines.length * 4 + 1
    }
  }

  // ── Footer auf allen Seiten ──────────────────────────────
  const seitenAnzahl = doc.getNumberOfPages()
  for (let i = 1; i <= seitenAnzahl; i++) {
    doc.setPage(i)
    doc.setFillColor(...PURPLE)
    doc.rect(0, pageH - 12, pageW, 12, 'F')
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(210, 190, 255)
    doc.text('EduGame AI · Klassendiagnose · anonyme Codes (DSGVO)', margin, pageH - 4.5)
    doc.text(`Seite ${i} / ${seitenAnzahl}`, pageW - margin, pageH - 4.5, { align: 'right' })
  }

  doc.save(`Klassendiagnose_${sanitizeDateiname(data.spielTitel)}.pdf`)
}

// ============================================================
// SuS-PDFs — 1 Seite pro Schüler-Code, motivierend, ohne Ampel
// ============================================================

interface SusPdfInput {
  spielTitel: string
  lernziel: string
  rueckmeldungen: {
    code: string
    lernstand_satz: string
    kann_schon_gut: string[]
    noch_ueben: string[]
    naechster_schritt: string
  }[]
}

export async function generateSusRueckmeldungenPDF(data: SusPdfInput): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageW = 210
  const pageH = 297
  const margin = 18
  const contentW = pageW - margin * 2

  data.rueckmeldungen.forEach((r, idx) => {
    if (idx > 0) doc.addPage()

    // ── Header (kein Ampelfarbe — neutraler Lila-Verlauf) ─
    doc.setFillColor(...PURPLE)
    doc.rect(0, 0, pageW, 42, 'F')

    doc.setFillColor(160, 90, 255)
    doc.roundedRect(margin, 11, 18, 18, 3, 3, 'F')
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('E', margin + 9, 23, { align: 'center' })

    doc.setFontSize(13)
    doc.text('EduGame AI', margin + 22, 19)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(210, 190, 255)
    doc.text('Deine persönliche Rückmeldung', margin + 22, 25)

    // Code-Chip rechts
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(pageW - margin - 32, 14, 32, 12, 2, 2, 'F')
    doc.setFontSize(10)
    doc.setFont('courier', 'bold')
    doc.setTextColor(...PURPLE)
    doc.text(r.code, pageW - margin - 16, 22, { align: 'center' })

    let y = 52

    // ── Spielname ──────────────────────────────────────────
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text('Zu deinem Spiel', margin, y)
    y += 5
    doc.setFontSize(17)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    const titelLines = doc.splitTextToSize(data.spielTitel, contentW)
    doc.text(titelLines, margin, y)
    y += titelLines.length * 7 + 6

    // ── Lernstand-Satz (motivierend, ohne Ampel) ──────────
    doc.setFillColor(...PURPLE_LIGHT)
    const lsLines = doc.splitTextToSize(r.lernstand_satz, contentW - 12)
    const lsH = lsLines.length * 6 + 10
    doc.roundedRect(margin, y, contentW, lsH, 3, 3, 'F')
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK)
    doc.text(lsLines, margin + 6, y + 8)
    y += lsH + 10

    // ── Das kannst du schon gut ────────────────────────────
    if (r.kann_schon_gut.length > 0) {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...GREEN)
      doc.text('Das kannst du schon gut', margin, y)
      y += 7
      for (const k of r.kann_schon_gut) {
        const lines = doc.splitTextToSize(k, contentW - 8)
        if (y + lines.length * 5 > pageH - 30) break
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...DARK)
        doc.setFillColor(...GREEN)
        doc.circle(margin + 2, y - 1.5, 1.2, 'F')
        doc.text(lines, margin + 7, y)
        y += lines.length * 5 + 2
      }
      y += 4
    }

    // ── Das solltest du noch üben ──────────────────────────
    if (r.noch_ueben.length > 0) {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...YELLOW)
      doc.text('Das solltest du noch üben', margin, y)
      y += 7
      for (const u of r.noch_ueben) {
        const lines = doc.splitTextToSize(u, contentW - 8)
        if (y + lines.length * 5 > pageH - 30) break
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...DARK)
        doc.setFillColor(...YELLOW)
        doc.circle(margin + 2, y - 1.5, 1.2, 'F')
        doc.text(lines, margin + 7, y)
        y += lines.length * 5 + 2
      }
      y += 4
    }

    // ── Dein nächster Schritt ──────────────────────────────
    if (r.naechster_schritt) {
      const nsLines = doc.splitTextToSize(r.naechster_schritt, contentW - 14)
      const nsH = nsLines.length * 5.5 + 14
      if (y + nsH > pageH - 20) {
        // Falls kein Platz mehr: trotzdem rendern, wird abgeschnitten
      }
      doc.setFillColor(255, 251, 235)
      doc.setDrawColor(253, 230, 138)
      doc.setLineWidth(0.3)
      doc.roundedRect(margin, y, contentW, nsH, 3, 3, 'FD')
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(146, 64, 14)
      doc.text('Dein nächster Schritt', margin + 6, y + 7)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...DARK)
      doc.text(nsLines, margin + 6, y + 12)
    }

    // ── Footer ─────────────────────────────────────────────
    doc.setFillColor(...PURPLE)
    doc.rect(0, pageH - 14, pageW, 14, 'F')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('Super dass du gespielt hast — weiter so!', margin, pageH - 5.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(210, 190, 255)
    doc.text('EduGame AI', pageW - margin, pageH - 5.5, { align: 'right' })
  })

  doc.save(`SuS_Rueckmeldungen_${sanitizeDateiname(data.spielTitel)}.pdf`)
}
