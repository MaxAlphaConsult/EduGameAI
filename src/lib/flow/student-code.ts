// Persönliche Schüler-Codes ("Tier-Codes", z.B. FUCHS-482193).
//
// Anforderungen: kid-tippbar (Tiername + Ziffern) UND brute-force-resistent.
// Daher: Krypto-Zufall (kein vorhersagbares Math.random), 6 Ziffern statt 4
// (Raum ~21 Mio. statt ~216k → mit der per-Release-Rate-Grenze ist Raten pro
// Schulstunde praktisch chancenlos), und Eindeutigkeit innerhalb der Klasse.

const TIER_NAMEN = [
  'ADLER', 'BAER', 'DACHS', 'ELCH', 'FUCHS', 'GEIER', 'HAMSTER', 'IGEL',
  'JAGUAR', 'KOLIBRI', 'LEMUR', 'MARDER', 'NASHORN', 'OTTER', 'PANDA', 'QUOKKA',
  'RABE', 'STORCH', 'TAPIR', 'UHU', 'VIELFRASS', 'WASCHBAER', 'YAK', 'ZEBRA',
]

const ZIFFERN = 6

// Gleichverteilter Krypto-Zufall in [0, maxExclusive) ohne Modulo-Bias
// (Rejection-Sampling). Wirft, statt auf Math.random zurückzufallen.
function randInt(maxExclusive: number): number {
  if (typeof crypto === 'undefined' || !('getRandomValues' in crypto)) {
    throw new Error('crypto.getRandomValues nicht verfügbar — Code-Erzeugung abgebrochen')
  }
  const arr = new Uint32Array(1)
  const limit = Math.floor(0xffffffff / maxExclusive) * maxExclusive
  let x = 0
  do {
    crypto.getRandomValues(arr)
    x = arr[0]
  } while (x >= limit)
  return x % maxExclusive
}

// Erzeugt `anzahl` eindeutige Schülercodes. Eindeutigkeit über ein Set; ein Guard
// verhindert Endlosschleifen (der Raum ist riesig, Kollisionen sind extrem selten).
export function generateStudentCodes(anzahl: number): string[] {
  const min = 10 ** (ZIFFERN - 1)
  const spanne = 9 * min // [min, 10^ZIFFERN)
  const codes = new Set<string>()
  let guard = 0
  while (codes.size < anzahl && guard < anzahl * 50 + 100) {
    guard++
    const tier = TIER_NAMEN[randInt(TIER_NAMEN.length)]
    const zahl = min + randInt(spanne)
    codes.add(`${tier}-${zahl}`)
  }
  return [...codes]
}

export const STUDENT_CODE_ZIFFERN = ZIFFERN
