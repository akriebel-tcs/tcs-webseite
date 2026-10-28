-- Etappe J.6 — CTA pro Lösungsblock statt zentral.
-- Idempotent. Nur home.start. Keine Schreibwege außerhalb der Whitelist berührt.

-- 1) Pro block_* Section ein cta-Feld in DE/EN sicherstellen (ohne bestehende Werte zu überschreiben).
DO $$
DECLARE
  blk text;
  blocks text[] := ARRAY[
    'block_communication',
    'block_access',
    'block_entry',
    'block_signage',
    'block_solutions',
    'block_consulting'
  ];
BEGIN
  FOREACH blk IN ARRAY blocks LOOP
    -- DE
    INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
    SELECT 'home.start', blk, 'cta', 'de', 'Mehr erfahren'
    WHERE NOT EXISTS (
      SELECT 1 FROM cms_section_fields
      WHERE page_key='home.start' AND section_key=blk AND field_key='cta' AND locale='de'
    );
    -- EN
    INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
    SELECT 'home.start', blk, 'cta', 'en', 'Learn more'
    WHERE NOT EXISTS (
      SELECT 1 FROM cms_section_fields
      WHERE page_key='home.start' AND section_key=blk AND field_key='cta' AND locale='en'
    );

    -- Whitelist DE
    INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
    SELECT 'home.start', blk, 'cta', 'de', true
    WHERE NOT EXISTS (
      SELECT 1 FROM cms_admin_editable_fields
      WHERE page_key='home.start' AND section_key=blk AND field_key='cta' AND locale='de'
    );
    -- Whitelist EN
    INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
    SELECT 'home.start', blk, 'cta', 'en', true
    WHERE NOT EXISTS (
      SELECT 1 FROM cms_admin_editable_fields
      WHERE page_key='home.start' AND section_key=blk AND field_key='cta' AND locale='en'
    );
  END LOOP;
END $$;

-- 2) Zentrales cta_default aus content_blocks_intro entfernen (Werte + Whitelist).
DELETE FROM cms_section_fields
 WHERE page_key='home.start'
   AND section_key='content_blocks_intro'
   AND field_key='cta_default';

DELETE FROM cms_admin_editable_fields
 WHERE page_key='home.start'
   AND section_key='content_blocks_intro'
   AND field_key='cta_default';