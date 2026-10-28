-- =========================================================================
-- Etappe: cms-light-page-no-1
-- Kurze, fortlaufende Seiten-Nummer (page_no) als zweite, additive Adresse
-- neben page_key. Niemals recycelt. Idempotent.
-- =========================================================================

-- 1) Sequenz für neue Nummern
CREATE SEQUENCE IF NOT EXISTS public.cms_pages_page_no_seq
  AS integer
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  NO CYCLE;

-- 2) Spalte hinzufügen (nullable, damit Backfill möglich ist)
ALTER TABLE public.cms_pages
  ADD COLUMN IF NOT EXISTS page_no integer;

-- 3) Backfill für Seiten ohne Nummer, in stabiler Reihenfolge (alphabetisch
--    nach page_key, damit jeder Lauf dieselbe Zuteilung erzeugt).
DO $$
DECLARE
  _r record;
BEGIN
  FOR _r IN
    SELECT page_key
      FROM public.cms_pages
     WHERE page_no IS NULL
     ORDER BY page_key
  LOOP
    UPDATE public.cms_pages
       SET page_no = nextval('public.cms_pages_page_no_seq')
     WHERE page_key = _r.page_key
       AND page_no IS NULL;
  END LOOP;
END $$;

-- 4) Sequenz-Stand auf max(page_no) setzen, damit weitere Inserts sauber weiterzählen
SELECT setval(
  'public.cms_pages_page_no_seq',
  GREATEST(COALESCE((SELECT MAX(page_no) FROM public.cms_pages), 0), 1),
  true
);

-- 5) NOT NULL + UNIQUE absichern (idempotent)
ALTER TABLE public.cms_pages
  ALTER COLUMN page_no SET NOT NULL;

ALTER TABLE public.cms_pages
  ALTER COLUMN page_no SET DEFAULT nextval('public.cms_pages_page_no_seq');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'cms_pages_page_no_unique'
       AND conrelid = 'public.cms_pages'::regclass
  ) THEN
    ALTER TABLE public.cms_pages
      ADD CONSTRAINT cms_pages_page_no_unique UNIQUE (page_no);
  END IF;
END $$;

-- =========================================================================
-- 6) RPCs anpassen: page_no automatisch vergeben + im Rückgabewert mitgeben
-- =========================================================================

-- 6a) Upsert: Neuanlage bekommt automatische Nummer (über DEFAULT der Spalte)
CREATE OR REPLACE FUNCTION public.rpc_admin_upsert_page(
  p_page_key text,
  p_route_path text,
  p_page_type text
) RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _allowed_types CONSTANT text[] := ARRAY[
    'T01','T02','T03','T04','T05','T06','T07','T08','T09',
    'T10a','T10b','T11','T12','T13','T14','T15','T16a','T16b',
    'T17','T18','T19','T20','T21'
  ];
  _normalized_key text;
  _normalized_route text;
  _existing public.cms_pages%ROWTYPE;
  _action text;
  _page_no integer;
BEGIN
  _normalized_key := nullif(btrim(coalesce(p_page_key, '')), '');
  _normalized_route := nullif(btrim(coalesce(p_route_path, '')), '');

  IF _normalized_key IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'page_key_required');
  END IF;

  IF p_page_type IS NULL OR NOT (p_page_type = ANY(_allowed_types)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'page_type_not_allowed', 'page_type', p_page_type);
  END IF;

  SELECT * INTO _existing FROM public.cms_pages WHERE page_key = _normalized_key LIMIT 1;

  IF _existing.id IS NULL THEN
    INSERT INTO public.cms_pages (page_key, route_path, page_type, status, is_active)
    VALUES (_normalized_key, _normalized_route, p_page_type, 'draft', false)
    RETURNING page_no INTO _page_no;
    _action := 'inserted';
  ELSE
    UPDATE public.cms_pages
       SET route_path = _normalized_route,
           page_type  = p_page_type,
           updated_at = now()
     WHERE page_key = _normalized_key
    RETURNING page_no INTO _page_no;
    _action := 'updated';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'action', _action,
    'page_key', _normalized_key,
    'page_no', _page_no,
    'route_path', _normalized_route,
    'page_type', p_page_type
  );
END;
$function$;

-- 6b) Duplicate: Kopie bekommt eigene neue Nummer
CREATE OR REPLACE FUNCTION public.rpc_admin_duplicate_page(
  p_source_page_key text,
  p_new_page_key text,
  p_new_route_path text
) RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _src public.cms_pages%ROWTYPE;
  _new_key text;
  _new_route text;
  _exists boolean;
  _new_page_no integer;
  _sections_copied int := 0;
  _fields_copied int := 0;
  _whitelist_copied int := 0;
BEGIN
  _new_key   := nullif(btrim(coalesce(p_new_page_key, '')), '');
  _new_route := nullif(btrim(coalesce(p_new_route_path, '')), '');

  IF _new_key IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'new_page_key_required');
  END IF;

  SELECT * INTO _src FROM public.cms_pages WHERE page_key = p_source_page_key;
  IF _src.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'source_not_found',
      'source_page_key', p_source_page_key);
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.cms_pages WHERE page_key = _new_key) INTO _exists;
  IF _exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'target_page_key_exists',
      'new_page_key', _new_key);
  END IF;

  IF _new_route IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM public.cms_pages WHERE route_path = _new_route) INTO _exists;
    IF _exists THEN
      RETURN jsonb_build_object('success', false, 'error', 'target_route_path_exists',
        'new_route_path', _new_route);
    END IF;
  END IF;

  INSERT INTO public.cms_pages
    (page_key, route_path, page_type, title_de, title_en, status, is_active)
  VALUES
    (_new_key, _new_route, _src.page_type,
     _src.title_de, _src.title_en, 'draft', false)
  RETURNING page_no INTO _new_page_no;

  INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active)
  SELECT _new_key, section_key, section_type, sort_order, is_active
    FROM public.cms_sections
   WHERE page_key = _src.page_key;
  GET DIAGNOSTICS _sections_copied = ROW_COUNT;

  INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value, value_json)
  SELECT _new_key, section_key, field_key, locale, value, value_json
    FROM public.cms_section_fields
   WHERE page_key = _src.page_key;
  GET DIAGNOSTICS _fields_copied = ROW_COUNT;

  INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
  SELECT _new_key, section_key, field_key, locale, is_enabled
    FROM public.cms_admin_editable_fields
   WHERE page_key = _src.page_key;
  GET DIAGNOSTICS _whitelist_copied = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'source_page_key', _src.page_key,
    'source_page_no', _src.page_no,
    'new_page_key', _new_key,
    'new_page_no', _new_page_no,
    'new_route_path', _new_route,
    'sections_copied', _sections_copied,
    'fields_copied', _fields_copied,
    'whitelist_copied', _whitelist_copied
  );
END;
$function$;

-- 6c) Read pages with nav → page_no mit ausliefern (Admin-UI braucht das)
CREATE OR REPLACE FUNCTION public.rpc_admin_read_pages_with_nav()
  RETURNS jsonb
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'page_key', p.page_key,
        'page_no', p.page_no,
        'route_path', p.route_path,
        'page_type', p.page_type,
        'title_de', p.title_de,
        'title_en', p.title_en,
        'status', p.status,
        'is_active', p.is_active,
        'updated_at', p.updated_at,
        'nav_usage', coalesce(u.usage, '[]'::jsonb)
      )
      ORDER BY p.page_key
    ),
    '[]'::jsonb
  )
  FROM public.cms_pages p
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
             jsonb_build_object(
               'nav_area', n.nav_area,
               'node_key', n.node_key,
               'is_active', n.is_active
             )
             ORDER BY n.nav_area, n.node_key
           ) AS usage
    FROM public.cms_navigation_nodes n
    WHERE n.page_key = p.page_key
  ) u ON true;
$function$;

-- 6d) Resolver: page_no → page_key (für Redakteur-Prompts wie „Seite 154")
CREATE OR REPLACE FUNCTION public.rpc_admin_resolve_page_no(p_page_no integer)
  RETURNS jsonb
  LANGUAGE plpgsql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _row public.cms_pages%ROWTYPE;
BEGIN
  IF p_page_no IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'page_no_required');
  END IF;

  SELECT * INTO _row FROM public.cms_pages WHERE page_no = p_page_no LIMIT 1;
  IF _row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'page_not_found', 'page_no', p_page_no);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'page_no', _row.page_no,
    'page_key', _row.page_key,
    'route_path', _row.route_path,
    'page_type', _row.page_type,
    'status', _row.status,
    'is_active', _row.is_active
  );
END;
$function$;