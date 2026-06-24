// Flow-AccessCode: 8-stelliger, zufälliger Zahlencode (z.B. 12345678).
//
// Datensparsamkeit (DSGVO): Der Code enthält KEIN Thema, KEINEN Klassennamen
// und KEINE personenbezogenen Daten — er ist ein reines, nicht-sprechendes
// Zufallstoken. Nicht-sequenziell (erschwert Enumeration). Eindeutigkeit wird
// über die UNIQUE-Spalte in flow_releases + Retry im Caller sichergestellt.

const CODE_LENGTH = 8

function getRandomValues(arr: Uint8Array): Uint8Array {
  // Web Crypto ist in Node 18+ und im Browser global verfügbar. Für einen
  // sicherheitsrelevanten Code bewusst KEIN Math.random-Fallback — lieber laut
  // scheitern als schwache Zufälligkeit.
  if (typeof crypto === 'undefined' || !('getRandomValues' in crypto)) {
    throw new Error('crypto.getRandomValues nicht verfügbar — AccessCode-Erzeugung abgebrochen')
  }
  crypto.getRandomValues(arr)
  return arr
}

// Erzeugt 8 gleichverteilte Ziffern (0–9). Rejection-Sampling (Werte ≥ 250
// verwerfen) vermeidet den Modulo-Bias, der bei `byte % 10` entstünde.
export function generateAccessCode(): string {
  const digits: string[] = []
  const buf = new Uint8Array(CODE_LENGTH * 2)
  while (digits.length < CODE_LENGTH) {
    getRandomValues(buf)
    for (let i = 0; i < buf.length && digits.length < CODE_LENGTH; i++) {
      if (buf[i] < 250) digits.push(String(buf[i] % 10))
    }
  }
  return digits.join('')
}

// Normalisiert eine Nutzereingabe auf den reinen 8-stelligen Code: entfernt
// Leerzeichen/Bindestriche/sonstige Zeichen und kürzt auf max. 8 Ziffern.
export function normalizeAccessCode(input: string): string {
  return (input ?? '').replace(/\D/g, '').slice(0, CODE_LENGTH)
}

export const ACCESS_CODE_LENGTH = CODE_LENGTH
