-- 1) Seed-Trigger für Standardkarten um das Textfeld 'eyebrow' ergänzen
CREATE OR REPLACE FUNCTION public.cms_card_v1_seed_whitelist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fk text;
  loc text;
  fields text[] := ARRAY[
    'icon','icon_enabled','image_enabled','eyebrow','eyebrow_enabled',
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

-- 2) Idempotenter Backfill für alle bestehenden Standardkarten
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT s.page_key, s.section_key, 'eyebrow', l.locale, true
FROM public.cms_sections s
CROSS JOIN (VALUES ('de'), ('en')) AS l(locale)
WHERE s.section_type = 'card_v1'
  AND NOT EXISTS (
    SELECT 1 FROM public.cms_admin_editable_fields w
    WHERE w.page_key = s.page_key
      AND w.section_key = s.section_key
      AND w.field_key = 'eyebrow'
      AND w.locale = l.locale
  );