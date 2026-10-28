-- Tranche 17 — home.start: Source-only / nicht gerenderte Sektionen deaktivieren.
-- Idempotent. Keine Datenlöschung, nur is_active=false.

-- (A) contentBlocks Container + 6 Kindkarten:
-- Renderer (HomePage.tsx) instanziert für jede block_*-Section vom Typ
-- teaser_2col_v1 direkt Teaser2ColV1, das die Felder aus der block_*-Section
-- selbst liest. Alle 6 block_* haben vollständige eigene Felder
-- (title, text, label, cta_label, cta_link, image_position, ...).
-- Damit sind contentBlocks (cards_v1) + contentBlocks_item_* (card_v1) reine
-- Legacy/Source-only-Container, die im Admin als bearbeitbare Karten
-- erscheinen, aber auf der Website nicht durchschlagen ("Schein-Bearbeitung").
UPDATE public.cms_sections
SET is_active = false, updated_at = now()
WHERE page_key = 'home.start'
  AND is_active = true
  AND (
    section_key = 'contentBlocks'
    OR section_key LIKE 'contentBlocks_item_%'
  );

-- (B) ueberTcs (content_v1, "Geschäftsfelder"-Felder):
-- Wird vom Frontend nirgends referenziert (keine HomePage-/Komponenten-Bindung).
-- Inaktiv schalten; Daten bleiben erhalten.
UPDATE public.cms_sections
SET is_active = false, updated_at = now()
WHERE page_key = 'home.start'
  AND is_active = true
  AND section_key = 'ueberTcs'
  AND section_type = 'content_v1';