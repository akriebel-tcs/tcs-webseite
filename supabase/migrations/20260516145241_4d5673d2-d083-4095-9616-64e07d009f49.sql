-- 0) Dubletten-Bereinigung: ältere aktive Zeile pro Slot deaktivieren
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY page_key, section_key, field_key
           ORDER BY updated_at DESC, created_at DESC, id
         ) AS rn
  FROM public.cms_assets
  WHERE is_active = true
)
UPDATE public.cms_assets a
   SET is_active = false, updated_at = now()
  FROM ranked r
 WHERE a.id = r.id AND r.rn > 1;

-- 1) Neue Spalte viewport
ALTER TABLE public.cms_assets
  ADD COLUMN IF NOT EXISTS viewport text NOT NULL DEFAULT 'desktop';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cms_assets_viewport_check') THEN
    ALTER TABLE public.cms_assets
      ADD CONSTRAINT cms_assets_viewport_check
      CHECK (viewport IN ('mobile','tablet','desktop'));
  END IF;
END$$;

-- 2) Partial unique pro Slot + Viewport
DROP INDEX IF EXISTS public.cms_assets_active_slot_idx;
CREATE UNIQUE INDEX cms_assets_active_slot_idx
  ON public.cms_assets (page_key, section_key, field_key, viewport)
  WHERE is_active;

-- 3) rpc_admin_upsert_asset: + p_viewport
CREATE OR REPLACE FUNCTION public.rpc_admin_upsert_asset(
  p_page_key text,
  p_section_key text,
  p_field_key text,
  p_storage_path text,
  p_public_url text,
  p_file_name text DEFAULT NULL::text,
  p_mime_type text DEFAULT NULL::text,
  p_asset_role text DEFAULT 'image'::text,
  p_viewport text DEFAULT 'desktop'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _new_id uuid;
  _deactivated int := 0;
  _vp text;
BEGIN
  IF p_page_key IS NULL OR p_section_key IS NULL OR p_field_key IS NULL OR p_storage_path IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'required_fields_missing');
  END IF;
  _vp := coalesce(p_viewport, 'desktop');
  IF _vp NOT IN ('mobile','tablet','desktop') THEN
    RETURN jsonb_build_object('success', false, 'error', 'viewport_invalid', 'viewport', _vp);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.cms_pages WHERE page_key = p_page_key) THEN
    RETURN jsonb_build_object('success', false, 'error', 'page_not_found', 'page_key', p_page_key);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.cms_sections WHERE page_key = p_page_key AND section_key = p_section_key) THEN
    RETURN jsonb_build_object('success', false, 'error', 'section_not_found',
      'page_key', p_page_key, 'section_key', p_section_key);
  END IF;

  UPDATE public.cms_assets
     SET is_active = false, updated_at = now()
   WHERE page_key = p_page_key AND section_key = p_section_key
     AND field_key = p_field_key AND viewport = _vp AND is_active = true;
  GET DIAGNOSTICS _deactivated = ROW_COUNT;

  INSERT INTO public.cms_assets
    (page_key, section_key, field_key, asset_role, viewport,
     storage_path, public_url, file_name, mime_type, is_active)
  VALUES
    (p_page_key, p_section_key, p_field_key, coalesce(p_asset_role, 'image'), _vp,
     p_storage_path, p_public_url, p_file_name, p_mime_type, true)
  RETURNING id INTO _new_id;

  RETURN jsonb_build_object('success', true, 'asset_id', _new_id,
    'viewport', _vp, 'deactivated_previous', _deactivated);
END;
$function$;

-- 4) rpc_admin_read_assets: viewport mitliefern
CREATE OR REPLACE FUNCTION public.rpc_admin_read_assets(p_page_key text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', a.id, 'asset_no', a.asset_no,
        'page_key', a.page_key, 'section_key', a.section_key,
        'field_key', a.field_key, 'asset_role', a.asset_role,
        'viewport', a.viewport,
        'storage_path', a.storage_path, 'public_url', a.public_url,
        'file_name', a.file_name, 'mime_type', a.mime_type,
        'alt_de', a.alt_de, 'alt_en', a.alt_en,
        'is_active', a.is_active, 'updated_at', a.updated_at
      ) ORDER BY a.section_key, a.field_key, a.viewport, a.is_active DESC, a.updated_at DESC
    ),
    '[]'::jsonb
  )
  FROM public.cms_assets a
  WHERE a.page_key = p_page_key;
$function$;