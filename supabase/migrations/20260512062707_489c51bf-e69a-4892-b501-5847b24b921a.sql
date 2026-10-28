
-- ============================================================
-- Kurz-IDs (idempotent): node_no, section_uid, asset_no
-- ============================================================

-- 1) cms_navigation_nodes.node_no  (Kurz-ID N-…)
CREATE SEQUENCE IF NOT EXISTS public.cms_navigation_nodes_node_no_seq;

ALTER TABLE public.cms_navigation_nodes
  ADD COLUMN IF NOT EXISTS node_no integer;

-- Bestehende Zeilen rückwirkend nummerieren (nach Alter)
DO $$
DECLARE r record; i int;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.cms_navigation_nodes WHERE node_no IS NULL
  ) THEN
    SELECT COALESCE(MAX(node_no), 0) INTO i FROM public.cms_navigation_nodes;
    FOR r IN
      SELECT id FROM public.cms_navigation_nodes
       WHERE node_no IS NULL
       ORDER BY created_at, id
    LOOP
      i := i + 1;
      UPDATE public.cms_navigation_nodes SET node_no = i WHERE id = r.id;
    END LOOP;
    PERFORM setval('public.cms_navigation_nodes_node_no_seq', i, true);
  ELSE
    PERFORM setval(
      'public.cms_navigation_nodes_node_no_seq',
      GREATEST(COALESCE((SELECT MAX(node_no) FROM public.cms_navigation_nodes), 0), 1),
      true
    );
  END IF;
END$$;

ALTER TABLE public.cms_navigation_nodes
  ALTER COLUMN node_no SET DEFAULT nextval('public.cms_navigation_nodes_node_no_seq'),
  ALTER COLUMN node_no SET NOT NULL;

ALTER SEQUENCE public.cms_navigation_nodes_node_no_seq
  OWNED BY public.cms_navigation_nodes.node_no;

CREATE UNIQUE INDEX IF NOT EXISTS cms_navigation_nodes_node_no_key
  ON public.cms_navigation_nodes(node_no);


-- 2) cms_sections.section_uid  (Kurz-ID B-…, fix — NICHT zu verwechseln mit section_no = Position)
CREATE SEQUENCE IF NOT EXISTS public.cms_sections_section_uid_seq;

ALTER TABLE public.cms_sections
  ADD COLUMN IF NOT EXISTS section_uid integer;

DO $$
DECLARE r record; i int;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.cms_sections WHERE section_uid IS NULL
  ) THEN
    SELECT COALESCE(MAX(section_uid), 0) INTO i FROM public.cms_sections;
    FOR r IN
      SELECT id FROM public.cms_sections
       WHERE section_uid IS NULL
       ORDER BY created_at, id
    LOOP
      i := i + 1;
      UPDATE public.cms_sections SET section_uid = i WHERE id = r.id;
    END LOOP;
    PERFORM setval('public.cms_sections_section_uid_seq', i, true);
  ELSE
    PERFORM setval(
      'public.cms_sections_section_uid_seq',
      GREATEST(COALESCE((SELECT MAX(section_uid) FROM public.cms_sections), 0), 1),
      true
    );
  END IF;
END$$;

ALTER TABLE public.cms_sections
  ALTER COLUMN section_uid SET DEFAULT nextval('public.cms_sections_section_uid_seq'),
  ALTER COLUMN section_uid SET NOT NULL;

ALTER SEQUENCE public.cms_sections_section_uid_seq
  OWNED BY public.cms_sections.section_uid;

CREATE UNIQUE INDEX IF NOT EXISTS cms_sections_section_uid_key
  ON public.cms_sections(section_uid);


-- 3) cms_assets.asset_no  (Kurz-ID A-…)
CREATE SEQUENCE IF NOT EXISTS public.cms_assets_asset_no_seq;

ALTER TABLE public.cms_assets
  ADD COLUMN IF NOT EXISTS asset_no integer;

DO $$
DECLARE r record; i int;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.cms_assets WHERE asset_no IS NULL
  ) THEN
    SELECT COALESCE(MAX(asset_no), 0) INTO i FROM public.cms_assets;
    FOR r IN
      SELECT id FROM public.cms_assets
       WHERE asset_no IS NULL
       ORDER BY created_at, id
    LOOP
      i := i + 1;
      UPDATE public.cms_assets SET asset_no = i WHERE id = r.id;
    END LOOP;
    PERFORM setval('public.cms_assets_asset_no_seq', i, true);
  ELSE
    PERFORM setval(
      'public.cms_assets_asset_no_seq',
      GREATEST(COALESCE((SELECT MAX(asset_no) FROM public.cms_assets), 0), 1),
      true
    );
  END IF;
END$$;

ALTER TABLE public.cms_assets
  ALTER COLUMN asset_no SET DEFAULT nextval('public.cms_assets_asset_no_seq'),
  ALTER COLUMN asset_no SET NOT NULL;

ALTER SEQUENCE public.cms_assets_asset_no_seq
  OWNED BY public.cms_assets.asset_no;

CREATE UNIQUE INDEX IF NOT EXISTS cms_assets_asset_no_key
  ON public.cms_assets(asset_no);


-- ============================================================
-- Resolver-RPCs (Kurz-ID -> fachliche Schlüssel)
-- ============================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_resolve_node_no(p_node_no integer)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _row public.cms_navigation_nodes%ROWTYPE;
BEGIN
  IF p_node_no IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'node_no_required');
  END IF;
  SELECT * INTO _row FROM public.cms_navigation_nodes WHERE node_no = p_node_no LIMIT 1;
  IF _row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'node_not_found', 'node_no', p_node_no);
  END IF;
  RETURN jsonb_build_object(
    'success', true,
    'node_no', _row.node_no,
    'id', _row.id,
    'nav_area', _row.nav_area,
    'node_key', _row.node_key,
    'page_key', _row.page_key,
    'label_de', _row.label_de,
    'label_en', _row.label_en,
    'is_active', _row.is_active
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_admin_resolve_section_uid(p_section_uid integer)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _row public.cms_sections%ROWTYPE;
BEGIN
  IF p_section_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'section_uid_required');
  END IF;
  SELECT * INTO _row FROM public.cms_sections WHERE section_uid = p_section_uid LIMIT 1;
  IF _row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'section_not_found', 'section_uid', p_section_uid);
  END IF;
  RETURN jsonb_build_object(
    'success', true,
    'section_uid', _row.section_uid,
    'id', _row.id,
    'page_key', _row.page_key,
    'section_key', _row.section_key,
    'section_type', _row.section_type,
    'section_no', _row.section_no,
    'sort_order', _row.sort_order,
    'is_active', _row.is_active
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_admin_resolve_asset_no(p_asset_no integer)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _row public.cms_assets%ROWTYPE;
BEGIN
  IF p_asset_no IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'asset_no_required');
  END IF;
  SELECT * INTO _row FROM public.cms_assets WHERE asset_no = p_asset_no LIMIT 1;
  IF _row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'asset_not_found', 'asset_no', p_asset_no);
  END IF;
  RETURN jsonb_build_object(
    'success', true,
    'asset_no', _row.asset_no,
    'id', _row.id,
    'page_key', _row.page_key,
    'section_key', _row.section_key,
    'field_key', _row.field_key,
    'asset_role', _row.asset_role,
    'public_url', _row.public_url,
    'storage_path', _row.storage_path,
    'file_name', _row.file_name,
    'mime_type', _row.mime_type,
    'is_active', _row.is_active
  );
END;
$function$;
