CREATE OR REPLACE FUNCTION public.cms_field_is_translatable(p_field_key text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_field_key IS NULL THEN false
    -- technische / sprachneutrale Felder nie übersetzen
    WHEN p_field_key ~ '_enabled$' THEN false
    WHEN p_field_key IN ('phone_label', 'email_label') THEN false
    -- Beschriftungen sind Text, auch wenn der Feldname "link" enthält
    -- (z. B. link_1_label = "Katalog öffnen").
    WHEN p_field_key ~ '_label$' THEN true
    WHEN p_field_key ~ '(^|[._])(icon|image|href|url|link|slug|id|color|colour|bg|variant|aspect|order|position|kind|focus)([._]|$)' THEN false
    -- übersetzbare Textfelder
    WHEN p_field_key ~ '(^|\.)(title|label|text|description|intro|headline|subline|eyebrow|frage|antwort|answer|question|alt)$' THEN true
    WHEN p_field_key ~ '\.\d+$' THEN true
    ELSE false
  END
$function$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT locale FROM public.cms_locales WHERE is_active AND NOT is_source LOOP
    PERFORM public.rpc_internal_prepare_translation_locale(r.locale);
  END LOOP;
END $$;