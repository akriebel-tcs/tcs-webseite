-- ============================================================
-- Sprint „Standardkarten-Vertrag" (2026-06-04)
-- Schritte 4 + 6: Typ-Migration, Whitelist-Backfill, Auto-Trigger
-- Komplett idempotent.
-- ============================================================

-- 1) Sections von product_scroller_v1 → product_showcase_list_v1
UPDATE public.cms_sections
SET section_type = 'product_showcase_list_v1', updated_at = now()
WHERE section_type = 'product_scroller_v1'
  AND ( (page_key = 'zutrittskontrolle.biometrie' AND section_key = 'produkte')
     OR (page_key = 'zutrittskontrolle.zufahrtskontrolle' AND section_key = 'produkte') );

-- 2) Trigger-Funktion: bei neuem card_v1 automatisch Whitelist befüllen
CREATE OR REPLACE FUNCTION public.cms_card_v1_seed_whitelist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fk text;
  loc text;
  fields text[] := ARRAY[
    'icon','icon_enabled','image_enabled','eyebrow_enabled',
    'bullets.0','bullets.1','bullets.2','bullets.3','bullets.4',
    'bullets_0_enabled','bullets_1_enabled','bullets_2_enabled','bullets_3_enabled','bullets_4_enabled',
    'chips.0','chips.1','chips.2','chips.3','chips.4',
    'chips_0_enabled','chips_1_enabled','chips_2_enabled','chips_3_enabled','chips_4_enabled',
    'link_1_label','link_1_href','link_1_kind','link_1_enabled',
    'link_2_label','link_2_href','link_2_kind','link_2_enabled',
    'link_3_label','link_3_href','link_3_kind','link_3_enabled'
  ];
  locales text[] := ARRAY['de','en'];
BEGIN
  IF NEW.section_type <> 'card_v1' THEN
    RETURN NEW;
  END IF;
  FOREACH fk IN ARRAY fields LOOP
    FOREACH loc IN ARRAY locales LOOP
      INSERT INTO public.cms_admin_editable_fields
        (page_key, section_key, field_key, locale, is_enabled)
      VALUES (NEW.page_key, NEW.section_key, fk, loc, true)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
  RETURN NEW;
END;
$$;

-- Unique-Constraint absichern, damit ON CONFLICT funktioniert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cms_admin_editable_fields_unique_key'
  ) THEN
    BEGIN
      ALTER TABLE public.cms_admin_editable_fields
        ADD CONSTRAINT cms_admin_editable_fields_unique_key
        UNIQUE (page_key, section_key, field_key, locale);
    EXCEPTION WHEN duplicate_table OR unique_violation THEN
      NULL;
    END;
  END IF;
END $$;

-- Trigger anhängen (zuerst alten droppen für Idempotenz)
DROP TRIGGER IF EXISTS trg_cms_card_v1_seed_whitelist ON public.cms_sections;
CREATE TRIGGER trg_cms_card_v1_seed_whitelist
AFTER INSERT ON public.cms_sections
FOR EACH ROW
EXECUTE FUNCTION public.cms_card_v1_seed_whitelist();

-- 3) Backfill aller bestehenden aktiven card_v1
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT s.page_key, s.section_key, fk.field_key, loc.locale, true
FROM public.cms_sections s
CROSS JOIN (VALUES
  ('icon'),('icon_enabled'),('image_enabled'),('eyebrow_enabled'),
  ('bullets.0'),('bullets.1'),('bullets.2'),('bullets.3'),('bullets.4'),
  ('bullets_0_enabled'),('bullets_1_enabled'),('bullets_2_enabled'),('bullets_3_enabled'),('bullets_4_enabled'),
  ('chips.0'),('chips.1'),('chips.2'),('chips.3'),('chips.4'),
  ('chips_0_enabled'),('chips_1_enabled'),('chips_2_enabled'),('chips_3_enabled'),('chips_4_enabled'),
  ('link_1_label'),('link_1_href'),('link_1_kind'),('link_1_enabled'),
  ('link_2_label'),('link_2_href'),('link_2_kind'),('link_2_enabled'),
  ('link_3_label'),('link_3_href'),('link_3_kind'),('link_3_enabled')
) AS fk(field_key)
CROSS JOIN (VALUES ('de'),('en')) AS loc(locale)
WHERE s.section_type = 'card_v1' AND s.is_active = true
ON CONFLICT DO NOTHING;
