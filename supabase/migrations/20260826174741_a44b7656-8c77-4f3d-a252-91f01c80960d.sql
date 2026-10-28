DO $$
DECLARE
  v_page text := 'service.downloads';
  v_sec  text := 'dokumente';
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('label_uebersicht','de','Übersicht'),
      ('label_uebersicht','en','Overview'),
      ('label_kapitel','de','Kapitel in diesem Bereich'),
      ('label_kapitel','en','Chapters in this area')
    ) AS t(field_key, locale, value)
  LOOP
    INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
    SELECT v_page, v_sec, r.field_key, r.locale, r.value
    WHERE NOT EXISTS (
      SELECT 1 FROM public.cms_section_fields f
      WHERE f.page_key = v_page AND f.section_key = v_sec
        AND f.field_key = r.field_key AND f.locale = r.locale
    );

    INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
    SELECT v_page, v_sec, r.field_key, r.locale, true
    WHERE NOT EXISTS (
      SELECT 1 FROM public.cms_admin_editable_fields e
      WHERE e.page_key = v_page AND e.section_key = v_sec
        AND e.field_key = r.field_key AND e.locale = r.locale
    );
  END LOOP;
END $$;