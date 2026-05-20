// Flow-AccessCode: gut lesbar, klassenspezifisch, leicht zu tippen.
// Format: <THEMA>-<KLASSE>-<3 Hex-Zeichen>  → z.B. ZELLE-9A-K42
//
// Themenwort kommt aus dem Flow-Titel (erstes sinnvolles Wort, max. 6 Zeichen,
// nur A-Z + Umlaute → ASCII). Wir hängen klassennamen+kurzes random suffix
// an. Kollisionen werden über UNIQUE in der DB abgefangen — der Caller
// retried bis zu N Mal mit neuem Suffix.

function asciiUpper(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'SS')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

const STOPWORDS = new Set(['DIE', 'DER', 'DAS', 'EIN', 'EINE', 'UND', 'ODER', 'VON', 'EINHEIT', 'SPIEL', 'LERN', 'LERNREISE'])

function topicFromTitle(titel: string): string {
  const woerter = titel
    .split(/[\s\-_–—]+/)
    .map(asciiUpper)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
  const wort = woerter[0] ?? asciiUpper(titel) ?? 'FLOW'
  return wort.slice(0, 6) || 'FLOW'
}

function randomSuffix(length = 3): string {
  // Ohne 0/O/1/I/L → leichter zu tippen
  const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
  let out = ''
  const arr = new Uint8Array(length)
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    crypto.getRandomValues(arr)
  } else {
    for (let i = 0; i < length; i++) arr[i] = Math.floor(Math.random() * 256)
  }
  for (let i = 0; i < length; i++) {
    out += ALPHABET[arr[i] % ALPHABET.length]
  }
  return out
}

export interface AccessCodeInput {
  flowTitel: string
  klassenName: string
}

export function generateAccessCode({ flowTitel, klassenName }: AccessCodeInput): string {
  const thema = topicFromTitle(flowTitel)
  const klasse = asciiUpper(klassenName).slice(0, 4) || 'KL'
  return `${thema}-${klasse}-${randomSuffix(3)}`
}
