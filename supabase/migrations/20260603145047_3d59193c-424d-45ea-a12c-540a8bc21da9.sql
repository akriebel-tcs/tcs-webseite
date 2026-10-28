-- =====================================================================
-- card_v1 Standard B-538 → flächig auf alle 701 aktiven card_v1-Karten
-- =====================================================================
-- Vollständig idempotent. Re-Lauf erzeugt 0 weitere Schreibvorgänge.
-- Lokale-Strategie: identische Werte in DE + EN für `_enabled`-Toggles
-- (sind sprachneutral), Texte sprachspezifisch.
-- =====================================================================

-- ---------------------------------------------------------------------
-- A1) chips.N ← tags (CSV), nur wenn chips.* je locale komplett leer
-- ---------------------------------------------------------------------
WITH active_cards AS (
  SELECT page_key, section_key
  FROM cms_sections
  WHERE section_type = 'card_v1' AND is_active = true
),
locales AS (SELECT unnest(ARRAY['de','en']) AS locale),
tags_by_card_loc AS (
  SELECT a.page_key, a.section_key, l.locale,
    (SELECT value FROM cms_section_fields f
       WHERE f.page_key=a.page_key AND f.section_key=a.section_key
         AND f.field_key='tags' AND f.locale=l.locale) AS tags_value
  FROM active_cards a CROSS JOIN locales l
),
empty_chips AS (
  SELECT t.page_key, t.section_key, t.locale, t.tags_value
  FROM tags_by_card_loc t
  WHERE COALESCE(t.tags_value,'') <> ''
    AND NOT EXISTS (
      SELECT 1 FROM cms_section_fields f
      WHERE f.page_key=t.page_key AND f.section_key=t.section_key
        AND f.field_key ~ '^chips\.[0-4]$' AND f.locale=t.locale
        AND COALESCE(f.value,'') <> ''
    )
)
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT e.page_key, e.section_key, 'chips.' || (g.idx - 1)::text, e.locale,
       TRIM(BOTH FROM split_part(e.tags_value, ',', g.idx))
FROM empty_chips e
CROSS JOIN generate_series(1,5) g(idx)
WHERE TRIM(BOTH FROM split_part(e.tags_value, ',', g.idx)) <> ''
ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE
SET value = EXCLUDED.value, updated_at = now()
WHERE COALESCE(cms_section_fields.value,'') = '';

-- chips_N_enabled = '1' für alle chips.N mit Inhalt (sprachneutral DE+EN)
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT s.page_key, s.section_key,
       'chips_' || (substring(f.field_key from '^chips\.([0-4])$'))::text || '_enabled',
       loc.locale, '1'
FROM cms_sections s
JOIN cms_section_fields f ON f.page_key=s.page_key AND f.section_key=s.section_key
CROSS JOIN (VALUES ('de'),('en')) loc(locale)
WHERE s.section_type='card_v1' AND s.is_active=true
  AND f.field_key ~ '^chips\.[0-4]$'
  AND COALESCE(f.value,'') <> ''
  AND f.locale = 'de' -- nur 1x pro Karte/Index iterieren
ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE
SET value = '1', updated_at = now()
WHERE COALESCE(cms_section_fields.value,'') = '';

-- ---------------------------------------------------------------------
-- A2) bullets.N ← features.N (nur wenn bullets.* je locale leer)
-- ---------------------------------------------------------------------
WITH active_cards AS (
  SELECT page_key, section_key FROM cms_sections
  WHERE section_type='card_v1' AND is_active=true
),
empty_bullets_loc AS (
  SELECT a.page_key, a.section_key, l.locale
  FROM active_cards a CROSS JOIN (VALUES ('de'),('en')) l(locale)
  WHERE NOT EXISTS (
    SELECT 1 FROM cms_section_fields f
    WHERE f.page_key=a.page_key AND f.section_key=a.section_key
      AND f.field_key ~ '^bullets\.[0-4]$' AND f.locale=l.locale
      AND COALESCE(f.value,'') <> ''
  )
)
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT e.page_key, e.section_key,
       'bullets.' || substring(f.field_key from '^features\.([0-4])$'),
       e.locale, f.value
FROM empty_bullets_loc e
JOIN cms_section_fields f
  ON f.page_key=e.page_key AND f.section_key=e.section_key
 AND f.locale=e.locale
 AND f.field_key ~ '^features\.[0-4]$'
 AND COALESCE(f.value,'') <> ''
ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE
SET value = EXCLUDED.value, updated_at = now()
WHERE COALESCE(cms_section_fields.value,'') = '';

-- bullets_N_enabled = '1' (sprachneutral DE+EN) für bullets mit Inhalt
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT DISTINCT s.page_key, s.section_key,
       'bullets_' || substring(f.field_key from '^bullets\.([0-4])$') || '_enabled',
       loc.locale, '1'
FROM cms_sections s
JOIN cms_section_fields f ON f.page_key=s.page_key AND f.section_key=s.section_key
CROSS JOIN (VALUES ('de'),('en')) loc(locale)
WHERE s.section_type='card_v1' AND s.is_active=true
  AND f.field_key ~ '^bullets\.[0-4]$'
  AND COALESCE(f.value,'') <> ''
ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE
SET value = '1', updated_at = now()
WHERE COALESCE(cms_section_fields.value,'') = '';

-- ---------------------------------------------------------------------
-- A3) link_1_href ← cta_href, sonst href (nur wenn link_1_href leer)
-- ---------------------------------------------------------------------
WITH active_cards AS (
  SELECT page_key, section_key FROM cms_sections
  WHERE section_type='card_v1' AND is_active=true
),
src_href AS (
  SELECT a.page_key, a.section_key, l.locale,
    COALESCE(
      NULLIF((SELECT value FROM cms_section_fields f
              WHERE f.page_key=a.page_key AND f.section_key=a.section_key
                AND f.field_key='cta_href' AND f.locale=l.locale), ''),
      NULLIF((SELECT value FROM cms_section_fields f
              WHERE f.page_key=a.page_key AND f.section_key=a.section_key
                AND f.field_key='href' AND f.locale=l.locale), '')
    ) AS new_href,
    (SELECT value FROM cms_section_fields f
       WHERE f.page_key=a.page_key AND f.section_key=a.section_key
         AND f.field_key='link_1_href' AND f.locale=l.locale) AS existing
  FROM active_cards a CROSS JOIN (VALUES ('de'),('en')) l(locale)
)
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT page_key, section_key, 'link_1_href', locale, new_href
FROM src_href
WHERE COALESCE(existing,'') = '' AND COALESCE(new_href,'') <> ''
ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE
SET value = EXCLUDED.value, updated_at = now()
WHERE COALESCE(cms_section_fields.value,'') = '';

-- ---------------------------------------------------------------------
-- A4) Standard-Labels DE/EN für link_1/2/3.
--     Wird gesetzt, wenn link_N_label leer ODER in Legacy-Whitelist.
-- ---------------------------------------------------------------------
-- Whitelist: bekannte Altlabels, die durch Standard ersetzt werden.
-- "Mehr erfahren", "Learn more" bleiben (sind bereits Standard).
WITH active_cards AS (
  SELECT page_key, section_key FROM cms_sections
  WHERE section_type='card_v1' AND is_active=true
),
defaults(idx, locale, label) AS (
  VALUES
    (1,'de','Mehr erfahren'),     (1,'en','Learn more'),
    (2,'de','Zum Planer'),        (2,'en','To planner'),
    (3,'de','Zum Konfigurator'),  (3,'en','To configurator')
),
targets AS (
  SELECT a.page_key, a.section_key, d.idx, d.locale, d.label,
    LOWER(TRIM(BOTH FROM COALESCE(
      (SELECT value FROM cms_section_fields f
         WHERE f.page_key=a.page_key AND f.section_key=a.section_key
           AND f.field_key='link_' || d.idx || '_label' AND f.locale=d.locale), ''))) AS existing_norm
  FROM active_cards a CROSS JOIN defaults d
),
to_set AS (
  SELECT page_key, section_key, idx, locale, label
  FROM targets
  WHERE existing_norm = ''
     OR existing_norm IN ('details','detail','mehr','more','read more','weiterlesen','details →','mehr →')
)
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT page_key, section_key, 'link_' || idx || '_label', locale, label FROM to_set
ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE
SET value = EXCLUDED.value, updated_at = now();

-- A4b) link_N_enabled defaults für leere Schalter (alle 3 Slots auf '1'
--      vorbeschreiben — Renderer zeigt nur Links mit href).
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT a.page_key, a.section_key, 'link_' || g.idx || '_enabled', l.locale, '1'
FROM (SELECT page_key, section_key FROM cms_sections WHERE section_type='card_v1' AND is_active=true) a
CROSS JOIN generate_series(1,3) g(idx)
CROSS JOIN (VALUES ('de'),('en')) l(locale)
ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE
SET value = '1', updated_at = now()
WHERE COALESCE(cms_section_fields.value,'') = '';

-- A4c) link_N_kind defaults: 'intern' wenn link_N_href mit '/' beginnt,
--      'extern' wenn http/mailto/tel, 'kurz-id' wenn P-/B-, sonst leer.
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT s.page_key, s.section_key, 'link_' || g.idx || '_kind', l.locale,
  CASE
    WHEN h.value ~ '^(https?:|mailto:|tel:)' THEN 'extern'
    WHEN h.value ~ '^/' THEN 'intern'
    WHEN h.value ~ '^[PB]-\d+$' THEN 'kurz-id'
    ELSE NULL
  END
FROM cms_sections s
CROSS JOIN generate_series(1,3) g(idx)
CROSS JOIN (VALUES ('de'),('en')) l(locale)
LEFT JOIN cms_section_fields h
  ON h.page_key=s.page_key AND h.section_key=s.section_key
 AND h.field_key='link_' || g.idx || '_href' AND h.locale=l.locale
WHERE s.section_type='card_v1' AND s.is_active=true
  AND h.value IS NOT NULL AND h.value <> ''
ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE
SET value = EXCLUDED.value, updated_at = now()
WHERE COALESCE(cms_section_fields.value,'') = '';

-- ---------------------------------------------------------------------
-- A5) Whitelist im Admin: alle 3 Linkslots + chips/bullets-Slots
--     sichtbar/editierbar/toggelbar machen.
-- ---------------------------------------------------------------------
INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT s.page_key, s.section_key, fk.field_key, l.locale, true
FROM cms_sections s
CROSS JOIN (VALUES
  ('link_1_label'),('link_1_href'),('link_1_enabled'),('link_1_kind'),
  ('link_2_label'),('link_2_href'),('link_2_enabled'),('link_2_kind'),
  ('link_3_label'),('link_3_href'),('link_3_enabled'),('link_3_kind'),
  ('chips.0'),('chips.1'),('chips.2'),('chips.3'),('chips.4'),
  ('chips_0_enabled'),('chips_1_enabled'),('chips_2_enabled'),('chips_3_enabled'),('chips_4_enabled'),
  ('bullets.0'),('bullets.1'),('bullets.2'),('bullets.3'),('bullets.4'),
  ('bullets_0_enabled'),('bullets_1_enabled'),('bullets_2_enabled'),('bullets_3_enabled'),('bullets_4_enabled')
) fk(field_key)
CROSS JOIN (VALUES ('de'),('en')) l(locale)
WHERE s.section_type='card_v1' AND s.is_active=true
ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE
SET is_enabled = true, updated_at = now()
WHERE cms_admin_editable_fields.is_enabled IS DISTINCT FROM true;

-- ---------------------------------------------------------------------
-- A6) Idempotenz-Quittung (kein Abbruch). Ergebnis nur informativ via
--     Migration-Log; spätere Audits laufen über card-renderer-paritaet.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v_cards int;
  v_link1_filled int;
  v_chips_filled int;
  v_bullets_filled int;
BEGIN
  SELECT COUNT(*) INTO v_cards FROM cms_sections WHERE section_type='card_v1' AND is_active=true;
  SELECT COUNT(DISTINCT (page_key, section_key)) INTO v_link1_filled
    FROM cms_section_fields
    WHERE field_key='link_1_label' AND COALESCE(value,'')<>'';
  SELECT COUNT(DISTINCT (page_key, section_key)) INTO v_chips_filled
    FROM cms_section_fields
    WHERE field_key ~ '^chips\.[0-4]$' AND COALESCE(value,'')<>'';
  SELECT COUNT(DISTINCT (page_key, section_key)) INTO v_bullets_filled
    FROM cms_section_fields
    WHERE field_key ~ '^bullets\.[0-4]$' AND COALESCE(value,'')<>'';
  RAISE NOTICE 'card_v1 standard rollout: cards=% link1_label=% chips=% bullets=%',
    v_cards, v_link1_filled, v_chips_filled, v_bullets_filled;
END$$;