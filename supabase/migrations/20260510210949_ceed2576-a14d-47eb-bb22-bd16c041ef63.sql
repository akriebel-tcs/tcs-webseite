-- cms-light-admin-section-field-editor-whitelist-1
-- 1) Whitelist-Tabelle für Admin-editierbare Section-Felder
CREATE TABLE IF NOT EXISTS public.cms_admin_editable_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text NOT NULL,
  section_key text NOT NULL,
  field_key text NOT NULL,
  locale text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cms_admin_editable_fields_locale_chk CHECK (locale IN ('de','en')),
  CONSTRAINT cms_admin_editable_fields_unique UNIQUE (page_key, section_key, field_key, locale)
);

ALTER TABLE public.cms_admin_editable_fields ENABLE ROW LEVEL SECURITY;

-- Lesepolicy: alle (anon + authenticated) dürfen die Whitelist lesen.
-- Schreiben ist NICHT erlaubt (nur Migrationen via service_role-Bypass).
DROP POLICY IF EXISTS "cms_admin_editable_fields read" ON public.cms_admin_editable_fields;
CREATE POLICY "cms_admin_editable_fields read"
  ON public.cms_admin_editable_fields
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- updated_at-Trigger
DROP TRIGGER IF EXISTS trg_cms_admin_editable_fields_updated_at ON public.cms_admin_editable_fields;
CREATE TRIGGER trg_cms_admin_editable_fields_updated_at
  BEFORE UPDATE ON public.cms_admin_editable_fields
  FOR EACH ROW
  EXECUTE FUNCTION public.cms_set_updated_at();

-- 2) Initiale Whitelist (acht Pflege-Felder), idempotent
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
VALUES
  ('anwendungen.pflege','hero','headline','de', true),
  ('anwendungen.pflege','hero','headline','en', true),
  ('anwendungen.pflege','hero','intro','de', true),
  ('anwendungen.pflege','hero','intro','en', true),
  ('anwendungen.pflege','answer-first','text','de', true),
  ('anwendungen.pflege','answer-first','text','en', true),
  ('anwendungen.pflege','intro','text','de', true),
  ('anwendungen.pflege','intro','text','en', true)
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

-- 3) Neue, generische Schreib-RPC mit Whitelist-Prüfung
CREATE OR REPLACE FUNCTION public.rpc_admin_update_section_field(
  p_page_key text,
  p_section_key text,
  p_field_key text,
  p_locale text,
  p_value text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _allowed boolean := false;
  _rows int := 0;
BEGIN
  IF p_locale NOT IN ('de','en') THEN
    RETURN jsonb_build_object(
      'success', false, 'updated', false,
      'error', 'locale_not_allowed',
      'page_key', p_page_key, 'section_key', p_section_key,
      'field_key', p_field_key, 'locale', p_locale
    );
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.cms_admin_editable_fields w
     WHERE w.page_key   = p_page_key
       AND w.section_key = p_section_key
       AND w.field_key  = p_field_key
       AND w.locale     = p_locale
       AND w.is_enabled = true
  ) INTO _allowed;

  IF NOT _allowed THEN
    RETURN jsonb_build_object(
      'success', false, 'updated', false,
      'error', 'field_not_allowed',
      'page_key', p_page_key, 'section_key', p_section_key,
      'field_key', p_field_key, 'locale', p_locale
    );
  END IF;

  UPDATE public.cms_section_fields
     SET value = p_value, updated_at = now()
   WHERE page_key   = p_page_key
     AND section_key = p_section_key
     AND field_key  = p_field_key
     AND locale     = p_locale;

  GET DIAGNOSTICS _rows = ROW_COUNT;

  IF _rows = 0 THEN
    RETURN jsonb_build_object(
      'success', false, 'updated', false,
      'error', 'row_not_found',
      'page_key', p_page_key, 'section_key', p_section_key,
      'field_key', p_field_key, 'locale', p_locale
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'updated', true,
    'page_key', p_page_key, 'section_key', p_section_key,
    'field_key', p_field_key, 'locale', p_locale
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_admin_update_section_field(text,text,text,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.rpc_admin_update_section_field(text,text,text,text,text) TO anon, authenticated;