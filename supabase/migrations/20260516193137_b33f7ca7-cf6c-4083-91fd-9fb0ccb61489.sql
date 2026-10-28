-- Thumbnails für die 3 Karten auf produkte.hub
-- (Bilder werden 1:1 aus home.start übernommen, gleiche Storage-URL).
-- Idempotent: per (page_key, section_key, field_key, viewport) dedupliziert.

WITH src AS (
  SELECT section_key AS home_section, public_url, alt_text_de, alt_text_en, alt_de, alt_en
  FROM cms_assets
  WHERE page_key='home.start'
    AND section_key IN ('block_communication','block_access','block_entry')
    AND viewport='desktop'
    AND is_active=true
),
mapping AS (
  SELECT * FROM (VALUES
    ('block_communication','cards.tuerkommunikation'),
    ('block_access',       'cards.zutrittskontrolle'),
    ('block_entry',        'cards.eingangsloesungen')
  ) AS m(home_section, hub_section)
),
target AS (
  SELECT m.hub_section, s.public_url, s.alt_text_de, s.alt_text_en, s.alt_de, s.alt_en
  FROM mapping m
  JOIN src s ON s.home_section = m.home_section
)
INSERT INTO cms_assets (
  page_key, section_key, field_key, asset_role, viewport,
  storage_path, public_url, alt_text_de, alt_text_en, alt_de, alt_en,
  sort_order, is_active
)
SELECT
  'produkte.hub', hub_section, 'thumbnail', 'thumbnail', 'desktop',
  public_url, public_url, alt_text_de, alt_text_en, alt_de, alt_en,
  0, true
FROM target
ON CONFLICT DO NOTHING;

-- Defensive Bereinigung: falls schon mehrfach vorhanden, behalte nur die älteste je Slot.
DELETE FROM cms_assets a
USING cms_assets b
WHERE a.page_key='produkte.hub'
  AND b.page_key='produkte.hub'
  AND a.section_key=b.section_key
  AND a.field_key='thumbnail'
  AND b.field_key='thumbnail'
  AND a.viewport=b.viewport
  AND a.created_at > b.created_at;
