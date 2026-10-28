-- Verlagere B-2521 (broschure_kita CTA) von Hub-Seite "anwendungen.bildungseinrichtungen"
-- auf die Detailseite "anwendungen.kindertagesstaetten" (P-266).
-- (page_key, section_key) hat ON UPDATE CASCADE -> Felder wandern automatisch mit.
DO $$
BEGIN
  -- Kollisionsschutz: falls section_key auf Zielseite bereits existiert, abbrechen
  IF EXISTS (
    SELECT 1 FROM public.cms_sections
    WHERE page_key = 'anwendungen.kindertagesstaetten'
      AND section_key = 'broschure_kita'
  ) THEN
    RAISE NOTICE 'broschure_kita existiert bereits auf Kita-Seite, kein Move nötig';
  ELSE
    UPDATE public.cms_sections
       SET page_key = 'anwendungen.kindertagesstaetten',
           sort_order = 55
     WHERE section_uid = 2521
       AND page_key = 'anwendungen.bildungseinrichtungen'
       AND section_key = 'broschure_kita';
  END IF;
END $$;