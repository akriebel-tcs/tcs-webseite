-- =====================================================================
-- PL/EN Übersetzungsgrundlage: Translation Memory + Jobs + Schutzlogik
-- Additiv und idempotent. Keine Änderung an DE-/EN-Inhalten.
-- =====================================================================

-- 1) Normalisierung + Hash (sprachneutral, deterministisch)
CREATE OR REPLACE FUNCTION public.cms_translation_normalize(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(btrim(regexp_replace(coalesce(p_text, ''), '\s+', ' ', 'g')))
$$;

CREATE OR REPLACE FUNCTION public.cms_translation_hash(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT md5(public.cms_translation_normalize(p_text))
$$;

-- 2) Übersetzbarkeit eines Feldschlüssels (Text vs. technisch)
CREATE OR REPLACE FUNCTION public.cms_field_is_translatable(p_field_key text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_field_key IS NULL THEN false
    -- technische / sprachneutrale Felder nie übersetzen
    WHEN p_field_key ~ '_enabled$' THEN false
    WHEN p_field_key IN ('phone_label', 'email_label') THEN false
    WHEN p_field_key ~ '(^|[._])(icon|image|href|url|link|slug|id|color|colour|bg|variant|aspect|order|position|kind|focus)([._]|$)' THEN false
    -- übersetzbare Textfelder
    WHEN p_field_key ~ '(^|\.)(title|label|text|description|intro|headline|subline|eyebrow|frage|antwort|answer|question|alt)$' THEN true
    WHEN p_field_key ~ '_label$' THEN true
    WHEN p_field_key ~ '\.\d+$' THEN true
    ELSE false
  END
$$;

-- 3) Provenienz am Inhaltsfeld: auf welchem DE-Stand beruht die Maschine?
ALTER TABLE public.cms_section_fields
  ADD COLUMN IF NOT EXISTS source_hash text;

ALTER TABLE public.cms_section_fields
  DROP CONSTRAINT IF EXISTS cms_section_fields_review_status_check;
ALTER TABLE public.cms_section_fields
  ADD CONSTRAINT cms_section_fields_review_status_check
  CHECK (review_status = ANY (ARRAY['geprueft'::text, 'maschinell'::text, 'maschinell_veraltet'::text]));

-- 4) Translation Memory
CREATE TABLE IF NOT EXISTS public.cms_translation_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_locale text NOT NULL DEFAULT 'de' CHECK (source_locale = ANY (ARRAY['de','en','pl'])),
  target_locale text NOT NULL CHECK (target_locale = ANY (ARRAY['de','en','pl'])),
  source_hash text NOT NULL,
  source_text text NOT NULL,
  target_text text,
  provider text,
  model text,
  origin text NOT NULL DEFAULT 'machine' CHECK (origin = ANY (ARRAY['machine','human'])),
  status text NOT NULL DEFAULT 'ok' CHECK (status = ANY (ARRAY['ok','failed','skipped'])),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cms_translation_memory_key
  ON public.cms_translation_memory (source_hash, target_locale);

REVOKE ALL ON public.cms_translation_memory FROM PUBLIC;
REVOKE ALL ON public.cms_translation_memory FROM anon;
REVOKE ALL ON public.cms_translation_memory FROM authenticated;
GRANT ALL ON public.cms_translation_memory TO service_role;
ALTER TABLE public.cms_translation_memory ENABLE ROW LEVEL SECURITY;
-- Absichtlich KEINE Policy: kein Zugriff für anon/authenticated.

-- 5) Übersetzungsaufträge (Batch-Protokoll)
CREATE TABLE IF NOT EXISTS public.cms_translation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id text NOT NULL,
  page_key text NOT NULL,
  section_key text NOT NULL,
  field_key text NOT NULL,
  target_locale text NOT NULL CHECK (target_locale = ANY (ARRAY['de','en','pl'])),
  source_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status = ANY (ARRAY['pending','memory_hit','translated','skipped_manual','failed'])),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cms_translation_jobs_key
  ON public.cms_translation_jobs (batch_id, page_key, section_key, field_key, target_locale);

REVOKE ALL ON public.cms_translation_jobs FROM PUBLIC;
REVOKE ALL ON public.cms_translation_jobs FROM anon;
REVOKE ALL ON public.cms_translation_jobs FROM authenticated;
GRANT ALL ON public.cms_translation_jobs TO service_role;
ALTER TABLE public.cms_translation_jobs ENABLE ROW LEVEL SECURITY;
-- Absichtlich KEINE Policy.

DROP TRIGGER IF EXISTS cms_translation_memory_touch ON public.cms_translation_memory;
CREATE TRIGGER cms_translation_memory_touch
  BEFORE UPDATE ON public.cms_translation_memory
  FOR EACH ROW EXECUTE FUNCTION public.cms_set_updated_at();

DROP TRIGGER IF EXISTS cms_translation_jobs_touch ON public.cms_translation_jobs;
CREATE TRIGGER cms_translation_jobs_touch
  BEFORE UPDATE ON public.cms_translation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.cms_set_updated_at();

-- 6) DE-Änderung markiert Maschinenübersetzungen als veraltet
CREATE OR REPLACE FUNCTION public.cms_mark_machine_translations_stale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.locale <> 'de' THEN
    RETURN NEW;
  END IF;
  IF public.cms_translation_normalize(NEW.value) = public.cms_translation_normalize(OLD.value) THEN
    RETURN NEW;
  END IF;

  UPDATE public.cms_section_fields t
     SET review_status = 'maschinell_veraltet'
   WHERE t.page_key = NEW.page_key
     AND t.section_key = NEW.section_key
     AND t.field_key = NEW.field_key
     AND t.locale <> 'de'
     AND t.review_status = 'maschinell';

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.cms_mark_machine_translations_stale() FROM PUBLIC;

DROP TRIGGER IF EXISTS cms_section_fields_stale_machine ON public.cms_section_fields;
CREATE TRIGGER cms_section_fields_stale_machine
  AFTER UPDATE OF value ON public.cms_section_fields
  FOR EACH ROW EXECUTE FUNCTION public.cms_mark_machine_translations_stale();

-- 7) Interner Schreibweg für maschinelle Übersetzungen (nur service_role)
CREATE OR REPLACE FUNCTION public.rpc_internal_apply_machine_translation(
  p_page_key text,
  p_section_key text,
  p_field_key text,
  p_locale text,
  p_value text,
  p_source_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed boolean;
  v_exists boolean;
  v_status text;
  v_current text;
BEGIN
  IF p_locale NOT IN ('en','pl') THEN
    RETURN jsonb_build_object('success', false, 'error', 'locale_not_allowed');
  END IF;
  IF coalesce(btrim(p_value), '') = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'empty_value');
  END IF;
  IF NOT public.cms_field_is_translatable(p_field_key) THEN
    RETURN jsonb_build_object('success', false, 'error', 'field_not_translatable');
  END IF;

  SELECT true INTO v_allowed
    FROM public.cms_admin_editable_fields w
   WHERE w.page_key = p_page_key
     AND w.section_key = p_section_key
     AND w.field_key = p_field_key
     AND w.locale = p_locale
     AND w.is_enabled = true
   LIMIT 1;
  IF NOT coalesce(v_allowed, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'field_not_whitelisted');
  END IF;

  SELECT true, f.review_status, coalesce(f.value, '')
    INTO v_exists, v_status, v_current
    FROM public.cms_section_fields f
   WHERE f.page_key = p_page_key
     AND f.section_key = p_section_key
     AND f.field_key = p_field_key
     AND f.locale = p_locale
   LIMIT 1;

  IF coalesce(v_exists, false) THEN
    -- Manuell gepflegte Zieltexte werden NIE überschrieben.
    IF btrim(v_current) <> '' AND v_status = 'geprueft' THEN
      RETURN jsonb_build_object('success', true, 'updated', false, 'skipped', 'manual_value');
    END IF;
    UPDATE public.cms_section_fields
       SET value = p_value,
           review_status = 'maschinell',
           source_hash = p_source_hash
     WHERE page_key = p_page_key
       AND section_key = p_section_key
       AND field_key = p_field_key
       AND locale = p_locale;
  ELSE
    INSERT INTO public.cms_section_fields
      (page_key, section_key, field_key, locale, value, review_status, source_hash)
    VALUES
      (p_page_key, p_section_key, p_field_key, p_locale, p_value, 'maschinell', p_source_hash);
  END IF;

  RETURN jsonb_build_object('success', true, 'updated', true);
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_internal_apply_machine_translation(text,text,text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_internal_apply_machine_translation(text,text,text,text,text,text) FROM anon;
REVOKE ALL ON FUNCTION public.rpc_internal_apply_machine_translation(text,text,text,text,text,text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_internal_apply_machine_translation(text,text,text,text,text,text) TO service_role;