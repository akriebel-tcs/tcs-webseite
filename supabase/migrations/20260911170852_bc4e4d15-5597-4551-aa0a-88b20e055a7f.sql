-- Die Gesamtmenge (rund 16.000 Texte je Sprache) wird bei jedem Listenabruf
-- vollständig ausgewertet. Die knappe Standard-Zeitgrenze der Lese-Rolle (3 s)
-- reichte dafür nicht. Zeitgrenze nur für diese Lesefunktionen erhöhen und
-- Parallelverarbeitung erlauben.
ALTER FUNCTION public.cms_translation_units(text, text[], text[]) PARALLEL SAFE;
ALTER FUNCTION public.cms_translation_units(text, text[], text[]) SET statement_timeout = '25s';
ALTER FUNCTION public.rpc_admin_list_translation_units(text, text[], text, text, text, integer, integer)
  SET statement_timeout = '25s';
