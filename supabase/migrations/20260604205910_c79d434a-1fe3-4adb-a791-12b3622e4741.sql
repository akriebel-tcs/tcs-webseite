-- Batch 22 Part 3/3: Admin-Whitelist für alle neuen Felder (kompakt, idempotent)
-- Gruppen-Whitelist
WITH groups(group_key) AS (VALUES
  ('group_produktzugang'),('group_downloads'),('group_planung'),('group_support'),('group_akademie')
),
locales(loc) AS (VALUES ('de'),('en')),
fields(fk) AS (VALUES ('label'),('title'),('intro'),('section_bg'))
INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT 'service.hub', g.group_key, f.fk, l.loc, true
FROM groups g CROSS JOIN locales l CROSS JOIN fields f
ON CONFLICT (page_key,section_key,field_key,locale)
DO UPDATE SET is_enabled=true, updated_at=now();

-- Karten-Whitelist
WITH cards(card_key) AS (VALUES
  ('group_produktzugang.katalog'),('group_produktzugang.finder'),('group_produktzugang.serien'),('group_produktzugang.stammdaten'),
  ('group_downloads.downloads'),('group_downloads.datenblaetter'),('group_downloads.handbuecher'),('group_downloads.schaltplaene'),('group_downloads.technische'),
  ('group_planung.planen'),('group_planung.ersatzteile'),
  ('group_support.support'),('group_support.faq'),('group_support.glossar'),
  ('group_akademie.akademie'),('group_akademie.serviceportal')
),
locales(loc) AS (VALUES ('de'),('en')),
fields(fk) AS (VALUES
  ('title'),('description'),
  ('link_1_label'),('link_1_href'),('link_1_enabled'),
  ('icon'),('is_placeholder'),('is_external')
)
INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT 'service.hub', c.card_key, f.fk, l.loc, true
FROM cards c CROSS JOIN locales l CROSS JOIN fields f
ON CONFLICT (page_key,section_key,field_key,locale)
DO UPDATE SET is_enabled=true, updated_at=now();