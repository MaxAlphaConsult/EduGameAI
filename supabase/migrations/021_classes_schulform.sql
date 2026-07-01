-- 021 — Schulform an der Klasse statt bei jeder LernFlow-Erstellung
-- ============================================================
-- Feedback: Die Schulform gehört zur Klasse und soll einmalig bei der
-- Klassenerstellung erfasst werden — nicht bei jedem LernFlow neu.
-- Der LernFlow leitet die Schulform künftig aus der gewählten Klasse ab.

alter table classes
  add column if not exists schulform text;
