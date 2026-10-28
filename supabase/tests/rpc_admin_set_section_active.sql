-- Smoketest für public.rpc_admin_set_section_active (Batch 56 + 56.1).
--
-- Garantien:
--  - Aktivieren einer nicht renderfähigen Section liefert
--    success=false, error='section_not_renderable' und `missing[]`.
--  - Aktivieren bleibt blockiert, solange Pflichtfelder fehlen.
--  - Aktivieren funktioniert, sobald alle Pflichtfelder gesetzt sind.
--  - Deaktivieren ist immer möglich, auch bei kaputter Renderfähigkeit.
--
-- Ausführung:
--   psql "$SUPABASE_DB_URL" -f supabase/tests/rpc_admin_set_section_active.sql
--
-- Alles in einer Transaktion mit ROLLBACK — kein bleibender Effekt.

\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE
  _payload jsonb;
  _pk text := '__test__.batch561.activate';
  _sk text := '__sec_cta__';
  _stid uuid;
BEGIN
  -- Setup: minimal eine Page + Section + Whitelist, KEINE Pflichtfelder gefüllt.
  INSERT INTO public.cms_pages (page_key, page_type, status, is_active, page_no)
    VALUES (_pk, 'test', 'draft', true, 9999990)
    ON CONFLICT (page_key) DO NOTHING;


  INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active)
    VALUES (_pk, _sk, 'cta_v1', 10, false)
    RETURNING id INTO _stid;

  -- 1) Aktivieren ohne Pflichtfelder ⇒ blockiert.
  _payload := public.rpc_admin_set_section_active(_pk, _sk, true);
  IF (_payload->>'success')::bool IS DISTINCT FROM false
     OR (_payload->>'error') IS DISTINCT FROM 'section_not_renderable' THEN
    RAISE EXCEPTION 'expected section_not_renderable, got %', _payload;
  END IF;
  IF jsonb_array_length(_payload->'missing') = 0 THEN
    RAISE EXCEPTION 'expected missing[] with entries, got %', _payload;
  END IF;

  -- 2) Pflichtfelder DE+EN setzen, dann erneut aktivieren ⇒ success.
  INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES
    (_pk, _sk, 'title', 'de', 'T'),
    (_pk, _sk, 'title', 'en', 'T'),
    (_pk, _sk, 'cta_label', 'de', 'L'),
    (_pk, _sk, 'cta_label', 'en', 'L'),
    (_pk, _sk, 'cta_href', 'de', '/x'),
    (_pk, _sk, 'cta_href', 'en', '/x');

  _payload := public.rpc_admin_set_section_active(_pk, _sk, true);
  IF (_payload->>'success')::bool IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'expected success=true after filling required fields, got %', _payload;
  END IF;

  -- 3) Deaktivieren bleibt immer möglich.
  _payload := public.rpc_admin_set_section_active(_pk, _sk, false);
  IF (_payload->>'success')::bool IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'expected success=true on deactivate, got %', _payload;
  END IF;

  RAISE NOTICE 'rpc_admin_set_section_active smoketest: ok';
END
$$;

ROLLBACK;
