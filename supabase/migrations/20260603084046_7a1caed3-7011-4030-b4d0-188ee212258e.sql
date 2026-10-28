-- Sprint „Kartenmodell Semantik — Bulletpoints und Chips trennen"
-- Idempotente Backfill- und Whitelist-Migration.
-- 1) features.N -> bullets.N (nur wenn bullets.N leer/fehlt), DE+EN
-- 2) features_N_enabled -> bullets_N_enabled (nur wenn leer/fehlt)
-- 3) Default-Leerzeilen für bullets.0..4, bullets_N_enabled, chips.0..4, chips_N_enabled
--    für alle aktiven card_v1-Sections, DE+EN.
-- 4) Whitelist (cms_admin_editable_fields) für bullets.* und chips.* freischalten.
-- features.* bleibt unverändert (Legacy/Fallback).

DO $$
DECLARE
  i int;
  fk_b text;
  fk_be text;
  fk_f text;
  fk_fe text;
  fk_c text;
  fk_ce text;
  loc text;
BEGIN
  -- 1+2) Backfill aus features.* nach bullets.* (Texte + Toggles)
  FOR i IN 0..4 LOOP
    fk_b  := 'bullets.' || i;
    fk_be := 'bullets_' || i || '_enabled';
    fk_f  := 'features.' || i;
    fk_fe := 'features_' || i || '_enabled';

    -- Text-Backfill
    INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
    SELECT f.page_key, f.section_key, fk_b, f.locale, f.value
    FROM cms_section_fields f
    JOIN cms_sections s
      ON s.page_key = f.page_key
     AND s.section_key = f.section_key
    WHERE f.field_key = fk_f
      AND s.section_type = 'card_v1'
      AND s.is_active = true
      AND COALESCE(NULLIF(f.value, ''), NULL) IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM cms_section_fields b
        WHERE b.page_key = f.page_key
          AND b.section_key = f.section_key
          AND b.field_key = fk_b
          AND b.locale = f.locale
          AND COALESCE(NULLIF(b.value, ''), NULL) IS NOT NULL
      )
    ON CONFLICT DO NOTHING;

    -- Toggle-Backfill (nur wenn bullets-Toggle leer/fehlt)
    INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
    SELECT f.page_key, f.section_key, fk_be, f.locale, f.value
    FROM cms_section_fields f
    JOIN cms_sections s
      ON s.page_key = f.page_key
     AND s.section_key = f.section_key
    WHERE f.field_key = fk_fe
      AND s.section_type = 'card_v1'
      AND s.is_active = true
      AND COALESCE(NULLIF(f.value, ''), NULL) IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM cms_section_fields b
        WHERE b.page_key = f.page_key
          AND b.section_key = f.section_key
          AND b.field_key = fk_be
          AND b.locale = f.locale
          AND COALESCE(NULLIF(b.value, ''), NULL) IS NOT NULL
      )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- 3) Default-Leerzeilen für alle aktiven card_v1 in DE+EN
  FOR loc IN SELECT unnest(ARRAY['de','en']) LOOP
    FOR i IN 0..4 LOOP
      FOR fk_b IN SELECT unnest(ARRAY[
        'bullets.' || i,
        'bullets_' || i || '_enabled',
        'chips.' || i,
        'chips_' || i || '_enabled'
      ]) LOOP
        INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
        SELECT s.page_key, s.section_key, fk_b, loc, ''
        FROM cms_sections s
        WHERE s.section_type = 'card_v1'
          AND s.is_active = true
          AND NOT EXISTS (
            SELECT 1 FROM cms_section_fields x
            WHERE x.page_key = s.page_key
              AND x.section_key = s.section_key
              AND x.field_key = fk_b
              AND x.locale = loc
          )
        ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;

  -- 4) Whitelist freischalten
  FOR loc IN SELECT unnest(ARRAY['de','en']) LOOP
    FOR i IN 0..4 LOOP
      FOR fk_b IN SELECT unnest(ARRAY[
        'bullets.' || i,
        'bullets_' || i || '_enabled',
        'chips.' || i,
        'chips_' || i || '_enabled'
      ]) LOOP
        INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
        SELECT s.page_key, s.section_key, fk_b, loc, true
        FROM cms_sections s
        WHERE s.section_type = 'card_v1'
          AND s.is_active = true
          AND NOT EXISTS (
            SELECT 1 FROM cms_admin_editable_fields w
            WHERE w.page_key = s.page_key
              AND w.section_key = s.section_key
              AND w.field_key = fk_b
              AND w.locale = loc
          )
        ON CONFLICT DO NOTHING;

        UPDATE cms_admin_editable_fields
          SET is_enabled = true, updated_at = now()
        WHERE field_key = fk_b
          AND locale = loc
          AND is_enabled = false
          AND EXISTS (
            SELECT 1 FROM cms_sections s
            WHERE s.page_key = cms_admin_editable_fields.page_key
              AND s.section_key = cms_admin_editable_fields.section_key
              AND s.section_type = 'card_v1'
              AND s.is_active = true
          );
      END LOOP;
    END LOOP;
  END LOOP;
END $$;