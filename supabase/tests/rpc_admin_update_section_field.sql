-- Smoketest für public.rpc_admin_update_section_field
--
-- Deterministische Prüfung aller vier Rückgabepfade — inklusive
-- `row_not_found`, der sich aus reinen Live-Daten heraus aktuell nicht
-- triggern lässt (alle whitelisted Pflege-Felder haben Werte).
--
-- Ausführung lokal/CI:
--   psql "$SUPABASE_DB_URL" -f supabase/tests/rpc_admin_update_section_field.sql
--
-- Sicherheit: alles in einer einzigen Transaktion mit ROLLBACK am Ende —
-- keine bleibenden Änderungen an Whitelist oder Inhalten. Schlägt ein
-- Assert fehl, bricht psql mit Fehlercode ab und die Transaktion rollt
-- ebenfalls zurück.
--
-- Hinweis: Greift NICHT auf Produktdaten zu, schreibt nichts dauerhaft.

\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  _payload jsonb;
  _existed_count int;
BEGIN
  -- 1) field_not_allowed: völlig unbekannte Kombination
  _payload := public.rpc_admin_update_section_field(
    p_page_key   => '__test__.never',
    p_section_key => '__no_section__',
    p_field_key  => '__no_field__',
    p_locale     => 'de',
    p_value      => 'x'
  );
  IF (_payload->>'success')::boolean IS DISTINCT FROM false
     OR (_payload->>'error') IS DISTINCT FROM 'field_not_allowed' THEN
    RAISE EXCEPTION 'expected field_not_allowed, got %', _payload;
  END IF;

  -- Anti-Insert-Beweis: keine Zeile entstanden
  SELECT count(*) INTO _existed_count
    FROM public.cms_section_fields
   WHERE page_key='__test__.never'
     AND section_key='__no_section__'
     AND field_key='__no_field__'
     AND locale='de';
  IF _existed_count <> 0 THEN
    RAISE EXCEPTION 'unexpected row created in cms_section_fields (count=%)', _existed_count;
  END IF;

  -- 2) locale_not_allowed
  _payload := public.rpc_admin_update_section_field(
    p_page_key   => 'anwendungen.pflege',
    p_section_key => 'hero',
    p_field_key  => 'headline',
    p_locale     => 'fr',
    p_value      => 'x'
  );
  IF (_payload->>'success')::boolean IS DISTINCT FROM false
     OR (_payload->>'error') IS DISTINCT FROM 'locale_not_allowed' THEN
    RAISE EXCEPTION 'expected locale_not_allowed, got %', _payload;
  END IF;

  -- 3) row_not_found: dazu temporär eine whitelisted Kombination ohne
  --    passende cms_section_fields-Zeile schaffen — alles in derselben
  --    Transaktion, am Ende ROLLBACK.
  INSERT INTO public.cms_admin_editable_fields
    (page_key, section_key, field_key, locale, is_enabled)
  VALUES
    ('__test__.row_not_found', '__sec__', '__fld__', 'de', true);

  _payload := public.rpc_admin_update_section_field(
    p_page_key   => '__test__.row_not_found',
    p_section_key => '__sec__',
    p_field_key  => '__fld__',
    p_locale     => 'de',
    p_value      => 'x'
  );
  IF (_payload->>'success')::boolean IS DISTINCT FROM false
     OR (_payload->>'error') IS DISTINCT FROM 'row_not_found' THEN
    RAISE EXCEPTION 'expected row_not_found, got %', _payload;
  END IF;

  -- Anti-Insert-Beweis: trotz row_not_found wurde NICHTS in
  -- cms_section_fields eingefügt (RPC ist UPDATE-only).
  SELECT count(*) INTO _existed_count
    FROM public.cms_section_fields
   WHERE page_key='__test__.row_not_found';
  IF _existed_count <> 0 THEN
    RAISE EXCEPTION 'row_not_found path created a row (count=%)', _existed_count;
  END IF;

  -- 4) success: Self-Save eines whitelisted Pflege-Feldes mit aktuellem Wert
  PERFORM 1;
  WITH cur AS (
    SELECT value FROM public.cms_section_fields
     WHERE page_key='anwendungen.pflege'
       AND section_key='hero' AND field_key='headline' AND locale='de'
  )
  SELECT public.rpc_admin_update_section_field(
    'anwendungen.pflege', 'hero', 'headline', 'de', (SELECT value FROM cur)
  ) INTO _payload;

  IF (_payload->>'success')::boolean IS DISTINCT FROM true
     OR (_payload->>'updated')::boolean IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'expected success/updated=true, got %', _payload;
  END IF;

  -- 5) Generischer Schreibschutz (Batch 56.1): aktive cta_v1-Section,
  --    Pflichtfeld leeren ⇒ Vertrag verlangt Renderfähigkeit ⇒
  --    success=false, error='section_no_longer_renderable', UPDATE rollbacked.
  DECLARE _pk text := '__test__.batch561.writeguard';
          _sk text := '__sec_cta__';
          _val_before text;
          _val_after text;
  BEGIN
    INSERT INTO public.cms_pages (page_key, page_type, status, is_active, page_no)
      VALUES (_pk, 'test', 'draft', true, 9999991)
      ON CONFLICT (page_key) DO NOTHING;

    INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active)
      VALUES (_pk, _sk, 'cta_v1', 10, true);
    INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES
      (_pk, _sk, 'title', 'de', 'T'), (_pk, _sk, 'title', 'en', 'T'),
      (_pk, _sk, 'cta_label', 'de', 'L'), (_pk, _sk, 'cta_label', 'en', 'L'),
      (_pk, _sk, 'cta_href', 'de', '/x'), (_pk, _sk, 'cta_href', 'en', '/x');
    INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled) VALUES
      (_pk, _sk, 'title', 'de', true), (_pk, _sk, 'title', 'en', true);

    _val_before := (SELECT value FROM public.cms_section_fields
      WHERE page_key=_pk AND section_key=_sk AND field_key='title' AND locale='de');

    _payload := public.rpc_admin_update_section_field(_pk, _sk, 'title', 'de', '');
    IF (_payload->>'success')::boolean IS DISTINCT FROM false
       OR (_payload->>'error') IS DISTINCT FROM 'section_no_longer_renderable' THEN
      RAISE EXCEPTION 'expected section_no_longer_renderable, got %', _payload;
    END IF;

    _val_after := (SELECT value FROM public.cms_section_fields
      WHERE page_key=_pk AND section_key=_sk AND field_key='title' AND locale='de');
    IF _val_after IS DISTINCT FROM _val_before THEN
      RAISE EXCEPTION 'expected ROLLBACK of value (before=%, after=%)', _val_before, _val_after;
    END IF;

    -- Deaktivierte Section: Leeren erlaubt (kein Vertragsverstoß möglich).
    UPDATE public.cms_sections SET is_active=false WHERE page_key=_pk AND section_key=_sk;
    _payload := public.rpc_admin_update_section_field(_pk, _sk, 'title', 'de', '');
    IF (_payload->>'success')::boolean IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'expected success=true on disabled section, got %', _payload;
    END IF;
  END;

  RAISE NOTICE 'rpc_admin_update_section_field smoketest: ok';
END
$$;

-- Wichtig: KEIN COMMIT. Alles zurückrollen.
ROLLBACK;

