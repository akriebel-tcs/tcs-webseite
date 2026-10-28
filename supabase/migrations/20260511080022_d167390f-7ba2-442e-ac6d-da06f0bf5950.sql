-- cms-light-admin-second-pilot-page-1
-- Zweite Pilotseite anwendungen.gesundheitseinrichtungen freischalten.
-- Idempotent: nur fehlende Zeilen anlegen, keine redaktionellen Werte überschreiben.
-- Keine neue Schreib-RPC. Keine Statusänderung. Bleibt draft / inaktiv.

-- 1) cms_pages: Zielzustand sicherstellen, NIE veröffentlichen.
INSERT INTO public.cms_pages (page_key, route_path, page_type, status, is_active)
SELECT 'anwendungen.gesundheitseinrichtungen',
       '/anwendungen/gesundheitseinrichtungen',
       'T05', 'draft', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.cms_pages WHERE page_key = 'anwendungen.gesundheitseinrichtungen'
);

-- Falls Eintrag schon existiert: nur route_path/page_type korrigieren.
-- status / is_active werden hier bewusst NICHT angefasst.
UPDATE public.cms_pages
   SET route_path = '/anwendungen/gesundheitseinrichtungen',
       page_type  = 'T05',
       updated_at = now()
 WHERE page_key = 'anwendungen.gesundheitseinrichtungen'
   AND (route_path IS DISTINCT FROM '/anwendungen/gesundheitseinrichtungen'
        OR page_type IS DISTINCT FROM 'T05');

-- 2) cms_sections: hero / answer-first / intro
INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active)
SELECT 'anwendungen.gesundheitseinrichtungen', v.section_key, v.section_type, v.sort_order, true
FROM (VALUES
  ('hero',         'hero',         10),
  ('answer-first', 'answer-first', 20),
  ('intro',        'intro',        30)
) AS v(section_key, section_type, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.cms_sections s
   WHERE s.page_key = 'anwendungen.gesundheitseinrichtungen'
     AND s.section_key = v.section_key
);

-- 3) cms_section_fields: leere Initialwerte je (section, field, locale)
--    Nur einfügen, wenn Zeile fehlt. Bestehende Werte werden nie überschrieben.
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT 'anwendungen.gesundheitseinrichtungen', v.section_key, v.field_key, v.locale, ''
FROM (VALUES
  ('hero',         'headline', 'de'),
  ('hero',         'headline', 'en'),
  ('hero',         'intro',    'de'),
  ('hero',         'intro',    'en'),
  ('answer-first', 'text',     'de'),
  ('answer-first', 'text',     'en'),
  ('intro',        'text',     'de'),
  ('intro',        'text',     'en')
) AS v(section_key, field_key, locale)
WHERE NOT EXISTS (
  SELECT 1 FROM public.cms_section_fields f
   WHERE f.page_key = 'anwendungen.gesundheitseinrichtungen'
     AND f.section_key = v.section_key
     AND f.field_key  = v.field_key
     AND f.locale     = v.locale
);

-- 4) cms_admin_editable_fields: Whitelist-Einträge ergänzen, initial is_enabled=true.
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT 'anwendungen.gesundheitseinrichtungen', v.section_key, v.field_key, v.locale, true
FROM (VALUES
  ('hero',         'headline', 'de'),
  ('hero',         'headline', 'en'),
  ('hero',         'intro',    'de'),
  ('hero',         'intro',    'en'),
  ('answer-first', 'text',     'de'),
  ('answer-first', 'text',     'en'),
  ('intro',        'text',     'de'),
  ('intro',        'text',     'en')
) AS v(section_key, field_key, locale)
WHERE NOT EXISTS (
  SELECT 1 FROM public.cms_admin_editable_fields w
   WHERE w.page_key = 'anwendungen.gesundheitseinrichtungen'
     AND w.section_key = v.section_key
     AND w.field_key  = v.field_key
     AND w.locale     = v.locale
);

-- 5) Bestehende Read-RPC erweitern (KEINE neue RPC).
--    Optionaler Parameter p_page_key (Default = 'anwendungen.pflege') hält
--    bestehende Aufrufer ohne Parameter abwärtskompatibel.
--    Funktion bleibt SECURITY DEFINER read-only — kein Schreibzugriff.
DROP FUNCTION IF EXISTS public.rpc_admin_read_pilot_pflege();
DROP FUNCTION IF EXISTS public.rpc_admin_read_pilot_pflege(text);

CREATE OR REPLACE FUNCTION public.rpc_admin_read_pilot_pflege(
  p_page_key text DEFAULT 'anwendungen.pflege'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  _page jsonb;
  _sections jsonb;
  _fields jsonb;
begin
  select to_jsonb(p) - 'title_de' - 'title_en' - 'id' - 'created_at' - 'updated_at'
    into _page
  from public.cms_pages p
  where p.page_key = p_page_key
  limit 1;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'page_key', s.page_key,
             'section_key', s.section_key,
             'section_type', s.section_type,
             'is_active', s.is_active
           )
           order by s.sort_order, s.section_key
         ), '[]'::jsonb)
    into _sections
  from public.cms_sections s
  where s.page_key = p_page_key;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'page_key', f.page_key,
             'section_key', f.section_key,
             'field_key', f.field_key,
             'locale', f.locale,
             'value', f.value
           )
           order by f.section_key, f.field_key, f.locale
         ), '[]'::jsonb)
    into _fields
  from public.cms_section_fields f
  where f.page_key = p_page_key;

  return jsonb_build_object(
    'page', _page,
    'sections', _sections,
    'fields', _fields
  );
end;
$function$;