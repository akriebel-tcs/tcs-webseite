
-- =========================================================
-- Etappe I.5 — Bild-Upload (RPCs + Storage-Policies)
-- =========================================================
-- Schreibwege ausschließlich über whitelisted RPCs.
-- Storage-Policies: anon darf in Prototyp-Phase Bilder
-- in den Bucket 'cms-assets' schreiben/löschen. Wird mit
-- Admin-Login wieder eingeschränkt.

-- ---------- Storage-Policies (idempotent) ----------
DROP POLICY IF EXISTS "cms_assets bucket anon insert" ON storage.objects;
CREATE POLICY "cms_assets bucket anon insert"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'cms-assets');

DROP POLICY IF EXISTS "cms_assets bucket anon update" ON storage.objects;
CREATE POLICY "cms_assets bucket anon update"
ON storage.objects FOR UPDATE TO anon, authenticated
USING (bucket_id = 'cms-assets')
WITH CHECK (bucket_id = 'cms-assets');

DROP POLICY IF EXISTS "cms_assets bucket anon delete" ON storage.objects;
CREATE POLICY "cms_assets bucket anon delete"
ON storage.objects FOR DELETE TO anon, authenticated
USING (bucket_id = 'cms-assets');

-- ---------- RPC: Asset anlegen / ersetzen ----------
CREATE OR REPLACE FUNCTION public.rpc_admin_upsert_asset(
  p_page_key      text,
  p_section_key   text,
  p_field_key     text,
  p_storage_path  text,
  p_public_url    text,
  p_file_name     text DEFAULT NULL,
  p_mime_type     text DEFAULT NULL,
  p_asset_role    text DEFAULT 'image'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_id uuid;
  _deactivated int := 0;
BEGIN
  IF p_page_key IS NULL OR p_section_key IS NULL OR p_field_key IS NULL OR p_storage_path IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'required_fields_missing');
  END IF;

  -- Vorherige aktive Assets im selben Slot deaktivieren (nicht löschen).
  UPDATE public.cms_assets
     SET is_active = false, updated_at = now()
   WHERE page_key = p_page_key
     AND section_key = p_section_key
     AND field_key = p_field_key
     AND is_active = true;
  GET DIAGNOSTICS _deactivated = ROW_COUNT;

  INSERT INTO public.cms_assets
    (page_key, section_key, field_key, asset_role,
     storage_path, public_url, file_name, mime_type, is_active)
  VALUES
    (p_page_key, p_section_key, p_field_key, coalesce(p_asset_role, 'image'),
     p_storage_path, p_public_url, p_file_name, p_mime_type, true)
  RETURNING id INTO _new_id;

  RETURN jsonb_build_object(
    'success', true,
    'asset_id', _new_id,
    'deactivated_previous', _deactivated
  );
END;
$$;

-- ---------- RPC: Alt-Text pflegen (DE/EN) ----------
CREATE OR REPLACE FUNCTION public.rpc_admin_update_asset_alt(
  p_asset_id uuid,
  p_locale   text,
  p_value    text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rows int := 0;
  _normalized text;
BEGIN
  IF p_locale NOT IN ('de','en') THEN
    RETURN jsonb_build_object('success', false, 'error', 'locale_not_allowed', 'locale', p_locale);
  END IF;

  _normalized := nullif(btrim(coalesce(p_value, '')), '');

  IF p_locale = 'de' THEN
    UPDATE public.cms_assets SET alt_de = _normalized, updated_at = now() WHERE id = p_asset_id;
  ELSE
    UPDATE public.cms_assets SET alt_en = _normalized, updated_at = now() WHERE id = p_asset_id;
  END IF;

  GET DIAGNOSTICS _rows = ROW_COUNT;
  IF _rows = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'asset_not_found', 'asset_id', p_asset_id);
  END IF;

  RETURN jsonb_build_object('success', true, 'asset_id', p_asset_id, 'locale', p_locale);
END;
$$;

-- ---------- RPC: Asset weich löschen ----------
CREATE OR REPLACE FUNCTION public.rpc_admin_delete_asset(p_asset_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _rows int := 0;
BEGIN
  UPDATE public.cms_assets
     SET is_active = false, updated_at = now()
   WHERE id = p_asset_id;
  GET DIAGNOSTICS _rows = ROW_COUNT;
  IF _rows = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'asset_not_found', 'asset_id', p_asset_id);
  END IF;
  RETURN jsonb_build_object('success', true, 'asset_id', p_asset_id, 'is_active', false);
END;
$$;

-- ---------- RPC: Assets einer Seite lesen (Admin) ----------
CREATE OR REPLACE FUNCTION public.rpc_admin_read_assets(p_page_key text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'page_key', a.page_key,
        'section_key', a.section_key,
        'field_key', a.field_key,
        'asset_role', a.asset_role,
        'storage_path', a.storage_path,
        'public_url', a.public_url,
        'file_name', a.file_name,
        'mime_type', a.mime_type,
        'alt_de', a.alt_de,
        'alt_en', a.alt_en,
        'is_active', a.is_active,
        'updated_at', a.updated_at
      ) ORDER BY a.section_key, a.field_key, a.is_active DESC, a.updated_at DESC
    ),
    '[]'::jsonb
  )
  FROM public.cms_assets a
  WHERE a.page_key = p_page_key;
$$;
