// IDs aus Adresse oder Rumpf der Schüler-Routen kommen vom Browser. Die
// Datenbank-Funktionen (Migration 022) erwarten `uuid`; eine andere Zeichenkette
// liefe dort auf einen Typfehler und käme als 500 zurück. Vorher prüfen und mit
// 404 antworten, wie es die Routen vor der Umstellung auch taten.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function istUuid(wert: unknown): wert is string {
  return typeof wert === 'string' && UUID.test(wert)
}
