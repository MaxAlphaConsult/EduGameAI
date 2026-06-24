// Bounded-Concurrency-Map: führt `fn` über alle `items` aus, aber mit höchstens
// `limit` gleichzeitig laufenden Promises. Ergebnisse in Eingabereihenfolge.
//
// Warum: Mehrere schwere Claude-Calls gleichzeitig (Spiel-/Baustein-Generierung)
// überlaufen sonst das API-Rate-Limit → 429 → SDK-Backoff → die ganze Pipeline
// kriecht und läuft in den Vercel-Function-Timeout. Gedrosselt greift zudem das
// Prompt-Caching: Der erste Call wärmt den System-Prompt-Cache, die folgenden
// lesen ihn (~0,1× Input-Tokens).
//
// Fehlerverhalten wie Promise.all: Wirft eine Ausführung, rejected das Gesamt-
// Promise (bereits gestartete Läufe werden nicht aktiv abgebrochen).
export async function mapLimit<I, O>(
  items: readonly I[],
  limit: number,
  fn: (item: I, index: number) => Promise<O>,
): Promise<O[]> {
  const results = new Array<O>(items.length)
  let next = 0

  const worker = async (): Promise<void> => {
    for (;;) {
      const i = next++
      if (i >= items.length) return
      results[i] = await fn(items[i], i)
    }
  }

  const workerCount = Math.max(1, Math.min(limit, items.length))
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  return results
}
