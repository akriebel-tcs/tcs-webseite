-- Tranche 15 — Persona-Doppelungen bereinigen
-- Auf den 6 Persona-Seiten rendern die Renderer ausschließlich die
-- `solution_teaser_*` (teaser_2col_v1) sichtbar. Die `solutions`
-- (cards_v1)-Parent-Section samt `solutions_item_*` (card_v1)-Karten
-- ist reiner Code-Fallback und wird nie angezeigt, solange aktive
-- Wechselteaser vorhanden sind. Im Admin sind sie aber als aktive
-- editierbare Karten sichtbar -> Schein-Bearbeitung, verboten.
--
-- Fix: Auf jeder Persona-Seite, die >=1 aktiven `solution_teaser_*`
-- (teaser_2col_v1) hat, werden die legacy `solutions`-Parent-Section
-- und alle ihre `solutions_item_*`-Kindkarten auf is_active=false
-- gesetzt. Daten bleiben erhalten, Renderer-Fallback bleibt funktional
-- (greift nur, wenn ein Admin die Teaser komplett deaktiviert).
-- Idempotent: nur Zeilen anfassen, die noch aktiv sind.

WITH personas AS (
  SELECT unnest(ARRAY[
    'personas.architekt',
    'personas.bauherr',
    'personas.fachhandel',
    'personas.fachplaner',
    'personas.handwerk',
    'personas.wohnungswirtschaft'
  ]) AS page_key
),
pages_with_active_teaser AS (
  SELECT p.page_key
  FROM personas p
  WHERE EXISTS (
    SELECT 1 FROM public.cms_sections s
    WHERE s.page_key = p.page_key
      AND s.section_type = 'teaser_2col_v1'
      AND s.section_key LIKE 'solution_teaser_%'
      AND s.is_active = true
  )
)
UPDATE public.cms_sections s
SET is_active = false,
    updated_at = now()
FROM pages_with_active_teaser pa
WHERE s.page_key = pa.page_key
  AND s.is_active = true
  AND (
    (s.section_key = 'solutions' AND s.section_type = 'cards_v1')
    OR (s.section_key LIKE 'solutions_item_%' AND s.section_type = 'card_v1')
  );