DO $$
DECLARE
  v_page text := 'gebaeudekommunikation.tuersprechanlagen';
  v_section text := 'snipdoo';
  v_field text := 'cta_link';
  v_value text := '/gebaeudekommunikation/snipdoo-ip';
BEGIN
  INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
  VALUES (v_page, v_section, v_field, 'de', v_value)
  ON CONFLICT (page_key, section_key, field_key, locale)
  DO UPDATE SET value = EXCLUDED.value, updated_at = now();

  INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
  VALUES (v_page, v_section, v_field, 'en', v_value)
  ON CONFLICT (page_key, section_key, field_key, locale)
  DO UPDATE SET value = EXCLUDED.value, updated_at = now();

  INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
  VALUES (v_page, v_section, v_field, 'de', true)
  ON CONFLICT ON CONSTRAINT cms_admin_editable_fields_unique
  DO UPDATE SET is_enabled = true, updated_at = now();

  INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
  VALUES (v_page, v_section, v_field, 'en', true)
  ON CONFLICT ON CONSTRAINT cms_admin_editable_fields_unique
  DO UPDATE SET is_enabled = true, updated_at = now();
END $$;