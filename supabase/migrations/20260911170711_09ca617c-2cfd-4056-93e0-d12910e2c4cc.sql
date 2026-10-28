-- Nur Performance: identische Ergebnisse, aber inline-fähig (kein SET search_path,
-- ausschliesslich pg_catalog-Builtins, daher unabhängig vom Suchpfad) und
-- PARALLEL SAFE. Vorher wurde jede Prüfung pro Zeile als eigener Funktionsaufruf
-- ausgeführt; die Textliste lief dadurch in die Anweisungs-Zeitgrenze.

CREATE OR REPLACE FUNCTION public.cms_translation_normalize(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE PARALLEL SAFE
AS $function$
  SELECT pg_catalog.lower(pg_catalog.btrim(pg_catalog.regexp_replace(COALESCE(p_text, ''::text), '\s+', ' ', 'g')))
$function$;

CREATE OR REPLACE FUNCTION public.cms_translation_hash(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE PARALLEL SAFE
AS $function$
  SELECT pg_catalog.md5(pg_catalog.lower(pg_catalog.btrim(pg_catalog.regexp_replace(COALESCE(p_text, ''::text), '\s+', ' ', 'g'))))
$function$;

CREATE OR REPLACE FUNCTION public.cms_text_is_translatable(p_value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE PARALLEL SAFE
AS $function$
  SELECT CASE
    WHEN p_value IS NULL OR pg_catalog.btrim(p_value) = '' THEN false
    WHEN pg_catalog.btrim(p_value) !~ '[A-Za-zÄÖÜäöüß]' THEN false
    WHEN pg_catalog.btrim(p_value) ~* '^(https?://|www\.|/|#|mailto:|tel:)' THEN false
    WHEN pg_catalog.btrim(p_value) ~* '\.(png|jpe?g|svg|webp|avif|gif|pdf|mp4|webm)$' THEN false
    WHEN pg_catalog.btrim(p_value) ~* '^#?[0-9a-f]{3,8}$' THEN false
    WHEN pg_catalog.btrim(p_value) ~* '^(true|false|on|off|yes|no|ja|nein|auto|none|null|left|right|center|centre|top|bottom|start|end|asc|desc)$' THEN false
    WHEN pg_catalog.btrim(p_value) ~ '^[a-z0-9]+([._:/-][a-z0-9]+)+$' THEN false
    ELSE true
  END
$function$;

CREATE INDEX IF NOT EXISTS cms_section_fields_locale_idx
  ON public.cms_section_fields (locale);

ANALYZE public.cms_section_fields;
ANALYZE public.cms_assets;
ANALYZE public.cms_navigation_nodes;
ANALYZE public.cms_pages;
