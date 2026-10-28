-- Batch 60: Hero-Intro-Feldkollision auf eine Wahrheit (hero.subline) konsolidieren.
-- Idempotent: mehrfaches Ausführen ändert nach dem ersten Lauf nichts mehr.

CREATE TEMP TABLE _shell_pages(page_key text PRIMARY KEY);
INSERT INTO _shell_pages VALUES
 ('gebaeudemanagement.bcm-buchungssystem'),
 ('gebaeudemanagement.bcm-infoboard'),
 ('zutrittskontrolle.aussenstation-adx5'),
 ('zutrittskontrolle.bcm-door-app'),
 ('zutrittskontrolle.bcm-mini-cloud'),
 ('zutrittskontrolle.digitale-briefkasten'),
 ('zutrittskontrolle.gsm-gateway'),
 ('zutrittskontrolle.schrankschloss'),
 ('zutrittskontrolle.serverschrankschloss'),
 ('zutrittskontrolle.zufahrtskontrolle'),
 ('zutrittskontrolle.zutrittssoftware');

-- Schritt 1: Fall a — Altwert nach subline übernehmen (Upsert), je Locale.
WITH src AS (
  SELECT o.page_key, o.section_key, o.locale,
         COALESCE(
           NULLIF(btrim(MAX(CASE WHEN o.field_key='intro' THEN o.value END)), ''),
           NULLIF(btrim(MAX(CASE WHEN o.field_key='introText' THEN o.value END)), ''),
           NULLIF(btrim(MAX(CASE WHEN o.field_key='description' THEN o.value END)), '')
         ) AS altwert
  FROM cms_section_fields o
  WHERE o.section_key = 'hero'
    AND o.field_key IN ('intro','introText','description')
    AND btrim(COALESCE(o.value,'')) <> ''
    AND o.page_key NOT IN (SELECT page_key FROM _shell_pages)
  GROUP BY o.page_key, o.section_key, o.locale
), need AS (
  SELECT s.* FROM src s
  LEFT JOIN cms_section_fields sub
    ON sub.page_key = s.page_key AND sub.section_key = s.section_key
   AND sub.locale = s.locale AND sub.field_key = 'subline'
  WHERE s.altwert IS NOT NULL
    AND btrim(COALESCE(sub.value,'')) = ''
)
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT page_key, section_key, 'subline', locale, altwert FROM need
ON CONFLICT (page_key, section_key, field_key, locale)
DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE btrim(COALESCE(cms_section_fields.value,'')) = '';

-- Schritt 2: Verifizieren + Altfelder leeren, aber nur wenn Text identisch in subline steht.
UPDATE cms_section_fields o
SET value = '', updated_at = now()
WHERE o.section_key = 'hero'
  AND o.field_key IN ('intro','introText','description')
  AND btrim(COALESCE(o.value,'')) <> ''
  AND o.page_key NOT IN (SELECT page_key FROM _shell_pages)
  AND EXISTS (
    SELECT 1 FROM cms_section_fields sub
    WHERE sub.page_key = o.page_key AND sub.section_key = o.section_key
      AND sub.locale = o.locale AND sub.field_key = 'subline'
      AND btrim(COALESCE(sub.value,'')) = btrim(o.value)
  );

-- Schritt 3: Whitelist — hero.subline auf allen Hero-Blöcken DE+EN freischalten.
INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT DISTINCT s.page_key, s.section_key, 'subline', l.locale, true
FROM cms_sections s CROSS JOIN (VALUES ('de'),('en')) AS l(locale)
WHERE s.section_key = 'hero'
ON CONFLICT (page_key, section_key, field_key, locale)
DO UPDATE SET is_enabled = true, updated_at = now();

DROP TABLE _shell_pages;