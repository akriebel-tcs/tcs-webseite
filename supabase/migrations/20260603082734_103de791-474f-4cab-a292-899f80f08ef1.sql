
-- Hotfix: Eyebrow-Backfill für card_v1 — erweiterte Alias-Liste.
-- Ergänzt den Sprint „Kartenmodell vereinheitlichen": die ursprüngliche
-- Migration kopierte nur `subtitle` → `eyebrow`. Hier ergänzen wir
-- `kicker`, `label`, `subline` und holen 1 Restzeile bei subtitle nach.

DO $mig$
DECLARE
  v_total int := 0;
  v_alias text;
  v_count int;
BEGIN
  FOR v_alias IN SELECT unnest(ARRAY['subtitle','kicker','label','subline']) LOOP
    WITH upd AS (
      UPDATE public.cms_section_fields f
      SET value = a.value, updated_at = now()
      FROM public.cms_section_fields a
      JOIN public.cms_sections s
        ON s.page_key = a.page_key AND s.section_key = a.section_key
      WHERE s.section_type = 'card_v1' AND s.is_active = true
        AND a.field_key = v_alias
        AND a.locale IN ('de','en')
        AND NULLIF(a.value, '') IS NOT NULL
        AND f.page_key = a.page_key
        AND f.section_key = a.section_key
        AND f.field_key = 'eyebrow'
        AND f.locale = a.locale
        AND NULLIF(f.value, '') IS NULL
      RETURNING 1
    )
    SELECT count(*) INTO v_count FROM upd;
    v_total := v_total + v_count;
    RAISE NOTICE 'eyebrow backfill alias=% rows=%', v_alias, v_count;
  END LOOP;

  RAISE NOTICE 'eyebrow backfill total=%', v_total;
END
$mig$;
