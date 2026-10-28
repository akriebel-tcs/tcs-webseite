-- P-015 Sonderbereinigung Referenzseite produkt_sub_v1
-- page_key: zutrittskontrolle.elektronische-drueckergarnitur
-- Idempotent, nicht-destruktiv.

DO $$
DECLARE
  v_page_key text := 'zutrittskontrolle.elektronische-drueckergarnitur';
  v_parent_id uuid;
BEGIN
  -- 1) benefit_7 als Kind-Section anlegen (falls nicht vorhanden)
  SELECT id INTO v_parent_id
    FROM public.cms_sections
   WHERE page_key = v_page_key AND section_key = 'benefits';

  INSERT INTO public.cms_sections
    (page_key, section_key, section_type, sort_order, is_active, parent_section_id)
  VALUES
    (v_page_key, 'benefit_7', 'card_v1', 70, true, v_parent_id)
  ON CONFLICT (page_key, section_key) DO NOTHING;
END $$;

-- 2) Felder für benefit_7 (title, description in DE/EN) idempotent einfügen
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES
  ('zutrittskontrolle.elektronische-drueckergarnitur', 'benefit_7', 'title', 'de', 'Konform mit DIN EN 16867 und DIN EN 1906'),
  ('zutrittskontrolle.elektronische-drueckergarnitur', 'benefit_7', 'title', 'en', 'Compliant with DIN EN 16867 and DIN EN 1906'),
  ('zutrittskontrolle.elektronische-drueckergarnitur', 'benefit_7', 'description', 'de',
    (SELECT value FROM public.cms_section_fields
      WHERE page_key='zutrittskontrolle.elektronische-drueckergarnitur'
        AND section_key='benefits' AND field_key='items.7.desc' AND locale='de' LIMIT 1)),
  ('zutrittskontrolle.elektronische-drueckergarnitur', 'benefit_7', 'description', 'en',
    (SELECT value FROM public.cms_section_fields
      WHERE page_key='zutrittskontrolle.elektronische-drueckergarnitur'
        AND section_key='benefits' AND field_key='items.7.desc' AND locale='en' LIMIT 1))
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

-- 3) Standard-Icon 'check-circle-2' für alle benefit_1..benefit_7 setzen
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT 'zutrittskontrolle.elektronische-drueckergarnitur', sk, 'icon', loc, 'check-circle-2'
  FROM (VALUES ('benefit_1'),('benefit_2'),('benefit_3'),('benefit_4'),('benefit_5'),('benefit_6'),('benefit_7')) AS s(sk)
  CROSS JOIN (VALUES ('de'),('en')) AS l(loc)
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

-- 4) Whitelist title/description/icon/image für benefit_7 ergänzen
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT 'zutrittskontrolle.elektronische-drueckergarnitur', 'benefit_7', fk, loc, true
  FROM (VALUES ('title'),('description'),('icon'),('image')) AS f(fk)
  CROSS JOIN (VALUES ('de'),('en')) AS l(loc)
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

-- 5) Legacy-Whitelist im Admin ausblenden (Daten bleiben erhalten)
--    a) Parent-Listenfelder benefits.items.* / useCases.items.*
UPDATE public.cms_admin_editable_fields
   SET is_enabled = false, updated_at = now()
 WHERE page_key = 'zutrittskontrolle.elektronische-drueckergarnitur'
   AND section_key IN ('benefits','useCases')
   AND field_key LIKE 'items.%'
   AND is_enabled = true;

--    b) Sub-Keys 'desc' auf benefit_* Kindkarten (kanonisch ist 'description')
UPDATE public.cms_admin_editable_fields
   SET is_enabled = false, updated_at = now()
 WHERE page_key = 'zutrittskontrolle.elektronische-drueckergarnitur'
   AND section_key LIKE 'benefit\_%' ESCAPE '\'
   AND field_key = 'desc'
   AND is_enabled = true;

--    c) Sub-Keys 'text' auf usecase_* Kindkarten (kanonisch ist 'description')
UPDATE public.cms_admin_editable_fields
   SET is_enabled = false, updated_at = now()
 WHERE page_key = 'zutrittskontrolle.elektronische-drueckergarnitur'
   AND section_key LIKE 'usecase\_%' ESCAPE '\'
   AND field_key = 'text'
   AND is_enabled = true;

-- 6) Section-Sortierung neu nummerieren (idempotent)
SELECT public.cms_renumber_sections('zutrittskontrolle.elektronische-drueckergarnitur');