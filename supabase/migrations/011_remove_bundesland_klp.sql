-- Migration 011: Bundesland und KLP-Bezug komplett aus dem Datenmodell entfernen
--
-- Entscheidung: KLP-Integration wird nicht mehr verfolgt. Bundesland-Auswahl ist damit
-- gegenstandslos und wird komplett aus dem Produkt entfernt.

ALTER TABLE materials DROP COLUMN IF EXISTS bundesland;
