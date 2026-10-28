-- Batch 60: Blockstruktur P-006 gebaeudekommunikation.briefkastenanlagen
-- Neue Wechselteaser (entry, sortiment), neue Karten, Reihenfolge,
-- Sichtbarkeit und Linkziele. Idempotent.

-- 1) Zwei neue Wechselteaser nach hero, vor montageformen
INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active)
VALUES
  ('gebaeudekommunikation.briefkastenanlagen','entry','teaser_2col_v1',12,true),
  ('gebaeudekommunikation.briefkastenanlagen','sortiment','teaser_2col_v1',14,true)
ON CONFLICT (page_key, section_key) DO UPDATE
  SET section_type = EXCLUDED.section_type,
      sort_order   = EXCLUDED.sort_order,
      is_active    = EXCLUDED.is_active;

-- 2) Neuer Kartenblock anschluss nach smart, vor faq
INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active)
VALUES ('gebaeudekommunikation.briefkastenanlagen','anschluss','cards_v1',45,true)
ON CONFLICT (page_key, section_key) DO UPDATE
  SET section_type = EXCLUDED.section_type,
      sort_order   = EXCLUDED.sort_order,
      is_active    = EXCLUDED.is_active;

-- 3) Neue Karten (card_v1) als Kind-Sections
INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active, parent_section_id)
SELECT 'gebaeudekommunikation.briefkastenanlagen', v.sk, 'card_v1', v.so, true, p.id
FROM (VALUES
  ('montageformen__inputz', 30, 'montageformen'),
  ('smart__zutritt', 30, 'smart'),
  ('anschluss__namensanzeige', 10, 'anschluss'),
  ('anschluss__digitale-briefkastenanlage', 20, 'anschluss')
) AS v(sk, so, parent)
JOIN public.cms_sections p
  ON p.page_key = 'gebaeudekommunikation.briefkastenanlagen' AND p.section_key = v.parent
ON CONFLICT (page_key, section_key) DO UPDATE
  SET section_type      = EXCLUDED.section_type,
      sort_order        = EXCLUDED.sort_order,
      is_active         = EXCLUDED.is_active,
      parent_section_id = EXCLUDED.parent_section_id;

-- 4) Reihenfolge der bestehenden Karten
UPDATE public.cms_sections SET sort_order = 10 WHERE page_key='gebaeudekommunikation.briefkastenanlagen' AND section_key='montageformen__unterputz';
UPDATE public.cms_sections SET sort_order = 20 WHERE page_key='gebaeudekommunikation.briefkastenanlagen' AND section_key='montageformen__aufputz';
UPDATE public.cms_sections SET sort_order = 40 WHERE page_key='gebaeudekommunikation.briefkastenanlagen' AND section_key='montageformen__stele';
UPDATE public.cms_sections SET sort_order = 10 WHERE page_key='gebaeudekommunikation.briefkastenanlagen' AND section_key='smart__tuerkommunikation';
UPDATE public.cms_sections SET sort_order = 20 WHERE page_key='gebaeudekommunikation.briefkastenanlagen' AND section_key='smart__barrierefrei';
UPDATE public.cms_sections SET sort_order = 40, is_active = false WHERE page_key='gebaeudekommunikation.briefkastenanlagen' AND section_key='smart__design';
UPDATE public.cms_sections SET sort_order = 50, is_active = false WHERE page_key='gebaeudekommunikation.briefkastenanlagen' AND section_key='smart__beschriftung';

-- 5) Whitelist Teaser (de + en) inkl. Bildslot
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT 'gebaeudekommunikation.briefkastenanlagen', s.sk, f.fk, l.loc, true
FROM (VALUES ('entry'),('sortiment')) s(sk)
CROSS JOIN (VALUES ('label'),('title'),('text'),('intro'),('image_position'),('background_variant'),('cta_label'),('cta_link'),('image')) f(fk)
CROSS JOIN (VALUES ('de'),('en')) l(loc)
ON CONFLICT DO NOTHING;

-- 6) Whitelist Kartenblock anschluss
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT 'gebaeudekommunikation.briefkastenanlagen', 'anschluss', f.fk, l.loc, true
FROM (VALUES ('label'),('title'),('intro')) f(fk)
CROSS JOIN (VALUES ('de'),('en')) l(loc)
ON CONFLICT DO NOTHING;

-- 7) Whitelist neue Karten: Felder, die der card_v1-Trigger nicht seedet
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT 'gebaeudekommunikation.briefkastenanlagen', s.sk, f.fk, l.loc, true
FROM (VALUES ('montageformen__inputz'),('smart__zutritt'),('anschluss__namensanzeige'),('anschluss__digitale-briefkastenanlage')) s(sk)
CROSS JOIN (VALUES ('title'),('description'),('image'),('thumbnail'),('icon_image')) f(fk)
CROSS JOIN (VALUES ('de'),('en')) l(loc)
ON CONFLICT DO NOTHING;

-- 8) Feldwerte: Teaser (DE Texte, technische Flags/URL auch EN)
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
VALUES
  ('gebaeudekommunikation.briefkastenanlagen','entry','label','de','Design- und Montagesystem ENTRY'),
  ('gebaeudekommunikation.briefkastenanlagen','entry','title','de','Der Eingang bekommt ein Design, der Briefkasten gehört dazu.'),
  ('gebaeudekommunikation.briefkastenanlagen','entry','text','de','PLATZHALTER — Text folgt'),
  ('gebaeudekommunikation.briefkastenanlagen','entry','cta_label','de','Anlage konfigurieren'),
  ('gebaeudekommunikation.briefkastenanlagen','entry','cta_link','de','https://www.tcsag.de/Konfiguratoren/ENTRY-LBX/'),
  ('gebaeudekommunikation.briefkastenanlagen','entry','cta_link','en','https://www.tcsag.de/Konfiguratoren/ENTRY-LBX/'),
  ('gebaeudekommunikation.briefkastenanlagen','entry','image_position','de','right'),
  ('gebaeudekommunikation.briefkastenanlagen','entry','image_position','en','right'),
  ('gebaeudekommunikation.briefkastenanlagen','entry','background_variant','de','default'),
  ('gebaeudekommunikation.briefkastenanlagen','entry','background_variant','en','default'),
  ('gebaeudekommunikation.briefkastenanlagen','sortiment','label','de','Vorverdrahtete Briefkastenanlagen'),
  ('gebaeudekommunikation.briefkastenanlagen','sortiment','title','de','Die Anlage kommt montiert und verkabelt.'),
  ('gebaeudekommunikation.briefkastenanlagen','sortiment','text','de','PLATZHALTER — Text folgt'),
  ('gebaeudekommunikation.briefkastenanlagen','sortiment','cta_label','de','Anlage anfragen'),
  ('gebaeudekommunikation.briefkastenanlagen','sortiment','cta_link','de','/kontakt'),
  ('gebaeudekommunikation.briefkastenanlagen','sortiment','cta_link','en','/kontakt'),
  ('gebaeudekommunikation.briefkastenanlagen','sortiment','image_position','de','left'),
  ('gebaeudekommunikation.briefkastenanlagen','sortiment','image_position','en','left'),
  ('gebaeudekommunikation.briefkastenanlagen','sortiment','background_variant','de','muted'),
  ('gebaeudekommunikation.briefkastenanlagen','sortiment','background_variant','en','muted'),
  -- Kartenblock anschluss (DE)
  ('gebaeudekommunikation.briefkastenanlagen','anschluss','label','de','Weiter gedacht'),
  ('gebaeudekommunikation.briefkastenanlagen','anschluss','title','de','Wenn die Anlage mehr können soll.'),
  -- Neue Karten (DE)
  ('gebaeudekommunikation.briefkastenanlagen','montageformen__inputz','title','de','Inputz'),
  ('gebaeudekommunikation.briefkastenanlagen','montageformen__inputz','description','de','PLATZHALTER — Text folgt'),
  ('gebaeudekommunikation.briefkastenanlagen','smart__zutritt','title','de','Zugang zur Haustür ohne Schlüssel'),
  ('gebaeudekommunikation.briefkastenanlagen','smart__zutritt','description','de','PLATZHALTER — Text folgt'),
  ('gebaeudekommunikation.briefkastenanlagen','smart__zutritt','icon','de','key-round'),
  ('gebaeudekommunikation.briefkastenanlagen','smart__zutritt','icon','en','key-round'),
  ('gebaeudekommunikation.briefkastenanlagen','anschluss__namensanzeige','title','de','Digitale Namensanzeige'),
  ('gebaeudekommunikation.briefkastenanlagen','anschluss__namensanzeige','description','de','PLATZHALTER — Text folgt'),
  ('gebaeudekommunikation.briefkastenanlagen','anschluss__namensanzeige','link_1_label','de','Mehr erfahren'),
  ('gebaeudekommunikation.briefkastenanlagen','anschluss__namensanzeige','link_1_href','de','/gebaeudemanagement/digitale-namensanzeige'),
  ('gebaeudekommunikation.briefkastenanlagen','anschluss__namensanzeige','link_1_href','en','/gebaeudemanagement/digitale-namensanzeige'),
  ('gebaeudekommunikation.briefkastenanlagen','anschluss__namensanzeige','link_1_enabled','de','1'),
  ('gebaeudekommunikation.briefkastenanlagen','anschluss__namensanzeige','link_1_enabled','en','1'),
  ('gebaeudekommunikation.briefkastenanlagen','anschluss__digitale-briefkastenanlage','title','de','Digitale Briefkastenanlage'),
  ('gebaeudekommunikation.briefkastenanlagen','anschluss__digitale-briefkastenanlage','description','de','PLATZHALTER — Text folgt'),
  ('gebaeudekommunikation.briefkastenanlagen','anschluss__digitale-briefkastenanlage','link_1_label','de','Mehr erfahren'),
  ('gebaeudekommunikation.briefkastenanlagen','anschluss__digitale-briefkastenanlage','link_1_href','de','/zutrittskontrolle/digitale-briefkasten'),
  ('gebaeudekommunikation.briefkastenanlagen','anschluss__digitale-briefkastenanlage','link_1_href','en','/zutrittskontrolle/digitale-briefkasten'),
  ('gebaeudekommunikation.briefkastenanlagen','anschluss__digitale-briefkastenanlage','link_1_enabled','de','1'),
  ('gebaeudekommunikation.briefkastenanlagen','anschluss__digitale-briefkastenanlage','link_1_enabled','en','1')
ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE SET value = EXCLUDED.value;

-- 9) Linkziele der Karten in B-037 und B-039 abschalten (Werte bleiben stehen)
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT 'gebaeudekommunikation.briefkastenanlagen', s.sk, 'link_'||n.i||'_enabled', l.loc, '0'
FROM (VALUES
  ('montageformen__unterputz'),('montageformen__aufputz'),('montageformen__inputz'),('montageformen__stele'),
  ('smart__tuerkommunikation'),('smart__barrierefrei'),('smart__zutritt')
) s(sk)
CROSS JOIN (VALUES (1),(2),(3)) n(i)
CROSS JOIN (VALUES ('de'),('en')) l(loc)
ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE SET value = '0';

-- 10) Nummerierung der Sections konsistent neu aufbauen
SELECT public.cms_resequence_sections_dfs('gebaeudekommunikation.briefkastenanlagen');