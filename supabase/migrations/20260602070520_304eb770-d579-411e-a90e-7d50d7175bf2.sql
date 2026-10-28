-- cms-light-p055-tcs-in-bauten-standard-hub-wechselteaser-1
-- Idempotent: kann mehrfach laufen, schreibt Inhalte nur beim ersten Mal.

BEGIN;

-- ===== 1. Fünf Wechselteaser als Top-Level-Sections anlegen =====
INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active, parent_section_id)
VALUES
  ('anwendungen.root', 'teaser_wohnbau',           'teaser_2col_v1', 10, true, NULL),
  ('anwendungen.root', 'teaser_bildung',           'teaser_2col_v1', 12, true, NULL),
  ('anwendungen.root', 'teaser_gesundheit',        'teaser_2col_v1', 14, true, NULL),
  ('anwendungen.root', 'teaser_oeffentliche_hand', 'teaser_2col_v1', 16, true, NULL),
  ('anwendungen.root', 'teaser_referenzprojekte',  'teaser_2col_v1', 18, true, NULL)
ON CONFLICT (page_key, section_key) DO UPDATE
  SET section_type = EXCLUDED.section_type,
      sort_order   = EXCLUDED.sort_order,
      is_active    = true,
      updated_at   = now();

-- ===== 2. Inhalte der Wechselteaser (nur beim ersten Mal) =====
WITH seed(section_key, field_key, locale, value) AS (
  VALUES
  -- Wohnbau
  ('teaser_wohnbau','label','de','TCS im Wohnbau'),
  ('teaser_wohnbau','label','en','TCS in residential buildings'),
  ('teaser_wohnbau','title','de','Vom Einfamilienhaus bis zum Wohnquartier'),
  ('teaser_wohnbau','title','en','From single-family home to residential quarter'),
  ('teaser_wohnbau','text','de','TCS ermöglicht maßgeschneiderte Gebäudeausstattungen – flexibel skalierbar vom Einfamilienhaus bis zur Großanlage. Sprechanlagen, Zutritt und Mobile Türkommunikation aus einer Hand.'),
  ('teaser_wohnbau','text','en','TCS enables tailor-made building equipment – flexibly scalable from single-family homes to large-scale developments. Intercom, access and mobile door communication from a single source.'),
  ('teaser_wohnbau','cta_label','de','Lösungen für den Wohnbau ansehen'),
  ('teaser_wohnbau','cta_label','en','Explore residential solutions'),
  ('teaser_wohnbau','cta_link','de','/anwendungen/wohnbau'),
  ('teaser_wohnbau','cta_link','en','/anwendungen/wohnbau'),
  ('teaser_wohnbau','image_position','de','right'),
  ('teaser_wohnbau','image_position','en','right'),
  ('teaser_wohnbau','background_variant','de','default'),
  ('teaser_wohnbau','background_variant','en','default'),

  -- Bildung
  ('teaser_bildung','label','de','TCS in Bildungseinrichtungen'),
  ('teaser_bildung','label','en','TCS in educational institutions'),
  ('teaser_bildung','title','de','Vom sicheren Eingang in Kitas bis zum Notrufsystem in Schulen'),
  ('teaser_bildung','title','en','From secure kindergarten entrances to school emergency call systems'),
  ('teaser_bildung','text','de','Unsere Installationen leisten Sicherheit und verbessern die Kommunikation in Schulen, Kitas und Wohnheimen – mit kontrolliertem Zugang, Sprechanlagen am Eingang und Digital Signage.'),
  ('teaser_bildung','text','en','Our installations provide security and improve communication in schools, day-care centres and dormitories – with controlled access, entrance intercoms and digital signage.'),
  ('teaser_bildung','cta_label','de','Lösungen für Bildung ansehen'),
  ('teaser_bildung','cta_label','en','Explore education solutions'),
  ('teaser_bildung','cta_link','de','/anwendungen/bildungseinrichtungen'),
  ('teaser_bildung','cta_link','en','/anwendungen/bildungseinrichtungen'),
  ('teaser_bildung','image_position','de','left'),
  ('teaser_bildung','image_position','en','left'),
  ('teaser_bildung','background_variant','de','muted'),
  ('teaser_bildung','background_variant','en','muted'),

  -- Gesundheit
  ('teaser_gesundheit','label','de','TCS in Gesundheitseinrichtungen'),
  ('teaser_gesundheit','label','en','TCS in healthcare facilities'),
  ('teaser_gesundheit','title','de','Vom Komfortruf in der Pflege bis zum Patientenaufruf in Praxen'),
  ('teaser_gesundheit','title','en','From comfort calls in care facilities to patient calls in medical practices'),
  ('teaser_gesundheit','text','de','Barrierefreie Kommunikation in der Pflege und im Betreuten Wohnen, in Arztpraxen und Kliniken – mit Notrufintegration, hygieneoptimierter Bedienung und einfacher Wegeleitung.'),
  ('teaser_gesundheit','text','en','Barrier-free communication in nursing homes and assisted living, doctor''s offices and hospitals – with emergency call integration, hygiene-optimised operation and easy guidance.'),
  ('teaser_gesundheit','cta_label','de','Lösungen für Gesundheit ansehen'),
  ('teaser_gesundheit','cta_label','en','Explore healthcare solutions'),
  ('teaser_gesundheit','cta_link','de','/anwendungen/gesundheitseinrichtungen'),
  ('teaser_gesundheit','cta_link','en','/anwendungen/gesundheitseinrichtungen'),
  ('teaser_gesundheit','image_position','de','right'),
  ('teaser_gesundheit','image_position','en','right'),
  ('teaser_gesundheit','background_variant','de','default'),
  ('teaser_gesundheit','background_variant','en','default'),

  -- Öffentliche Hand
  ('teaser_oeffentliche_hand','label','de','TCS in Einrichtungen der öffentlichen Hand'),
  ('teaser_oeffentliche_hand','label','en','TCS in public facilities'),
  ('teaser_oeffentliche_hand','title','de','Besucherverkehr leiten, Sicherheit garantieren und Kommunikation leisten'),
  ('teaser_oeffentliche_hand','title','en','Guide visitor traffic, ensure security and enable communication'),
  ('teaser_oeffentliche_hand','text','de','Eingangsüberwachung, Wegeleitung und Zutritt für Behörden, Ämter und kommunale Gebäude sind Kernbestandteil unserer Lösungen – inklusive Feuerwehrdurchsage und Schwimmbad-Sonderausstattung.'),
  ('teaser_oeffentliche_hand','text','en','Entrance monitoring, guidance and access for government agencies, public offices and municipal buildings are core elements of our solutions – including fire department announcements and special equipment for swimming pools.'),
  ('teaser_oeffentliche_hand','cta_label','de','Lösungen für die öffentliche Hand ansehen'),
  ('teaser_oeffentliche_hand','cta_label','en','Explore public sector solutions'),
  ('teaser_oeffentliche_hand','cta_link','de','/anwendungen/oeffentliche-hand'),
  ('teaser_oeffentliche_hand','cta_link','en','/anwendungen/oeffentliche-hand'),
  ('teaser_oeffentliche_hand','image_position','de','left'),
  ('teaser_oeffentliche_hand','image_position','en','left'),
  ('teaser_oeffentliche_hand','background_variant','de','muted'),
  ('teaser_oeffentliche_hand','background_variant','en','muted'),

  -- Referenzprojekte
  ('teaser_referenzprojekte','label','de','Referenzprojekte'),
  ('teaser_referenzprojekte','label','en','Reference projects'),
  ('teaser_referenzprojekte','title','de','Realisierte Projekte mit TCS-Systemen'),
  ('teaser_referenzprojekte','title','en','Realised projects with TCS systems'),
  ('teaser_referenzprojekte','text','de','Von Stadthäusern bis Großanlagen: Ein Auszug realisierter Projekte zeigt, wie unsere Systeme in unterschiedlichen Gebäudetypen wirken.'),
  ('teaser_referenzprojekte','text','en','From townhouses to large complexes: a selection of realised projects shows how our systems perform across building types.'),
  ('teaser_referenzprojekte','cta_label','de','Referenzprojekte ansehen'),
  ('teaser_referenzprojekte','cta_label','en','View reference projects'),
  ('teaser_referenzprojekte','cta_link','de','/anwendungen/referenzprojekte'),
  ('teaser_referenzprojekte','cta_link','en','/anwendungen/referenzprojekte'),
  ('teaser_referenzprojekte','image_position','de','right'),
  ('teaser_referenzprojekte','image_position','en','right'),
  ('teaser_referenzprojekte','background_variant','de','default'),
  ('teaser_referenzprojekte','background_variant','en','default')
)
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT 'anwendungen.root', section_key, field_key, locale, value FROM seed
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

-- ===== 3. Bilder der Wechselteaser (aus bestehenden Karten übernehmen, nur einmalig) =====
WITH src(target_section, source_section) AS (
  VALUES
    ('teaser_wohnbau',           'card_wohnen_einfamilienhaus'),
    ('teaser_bildung',           'card_bildung_schule'),
    ('teaser_gesundheit',        'card_gesundheit_pflege'),
    ('teaser_oeffentliche_hand', 'card_oeffentlich_behoerde'),
    ('teaser_referenzprojekte',  'card_ref_pulse-berlin')
)
INSERT INTO public.cms_assets (
  page_key, section_key, field_key, asset_role, viewport,
  storage_path, public_url, alt_de, alt_en, sort_order, is_active
)
SELECT
  'anwendungen.root', s.target_section, 'image', 'image', 'desktop',
  COALESCE(a.storage_path, ''),
  a.public_url,
  COALESCE(a.alt_de, ''),
  COALESCE(a.alt_en, ''),
  0, true
FROM src s
JOIN public.cms_assets a
  ON a.page_key='anwendungen.root'
 AND a.section_key=s.source_section
 AND a.field_key='image'
 AND a.viewport='desktop'
 AND a.is_active=true
WHERE NOT EXISTS (
  SELECT 1 FROM public.cms_assets t
   WHERE t.page_key='anwendungen.root'
     AND t.section_key=s.target_section
     AND t.field_key='image'
     AND t.viewport='desktop'
);

-- ===== 4. Admin-Whitelist für die neuen Felder =====
WITH wl(section_key, field_key) AS (
  VALUES
    ('teaser_wohnbau','label'),('teaser_wohnbau','title'),('teaser_wohnbau','text'),
    ('teaser_wohnbau','cta_label'),('teaser_wohnbau','cta_link'),
    ('teaser_wohnbau','image_position'),('teaser_wohnbau','background_variant'),
    ('teaser_bildung','label'),('teaser_bildung','title'),('teaser_bildung','text'),
    ('teaser_bildung','cta_label'),('teaser_bildung','cta_link'),
    ('teaser_bildung','image_position'),('teaser_bildung','background_variant'),
    ('teaser_gesundheit','label'),('teaser_gesundheit','title'),('teaser_gesundheit','text'),
    ('teaser_gesundheit','cta_label'),('teaser_gesundheit','cta_link'),
    ('teaser_gesundheit','image_position'),('teaser_gesundheit','background_variant'),
    ('teaser_oeffentliche_hand','label'),('teaser_oeffentliche_hand','title'),('teaser_oeffentliche_hand','text'),
    ('teaser_oeffentliche_hand','cta_label'),('teaser_oeffentliche_hand','cta_link'),
    ('teaser_oeffentliche_hand','image_position'),('teaser_oeffentliche_hand','background_variant'),
    ('teaser_referenzprojekte','label'),('teaser_referenzprojekte','title'),('teaser_referenzprojekte','text'),
    ('teaser_referenzprojekte','cta_label'),('teaser_referenzprojekte','cta_link'),
    ('teaser_referenzprojekte','image_position'),('teaser_referenzprojekte','background_variant')
), locales AS (
  SELECT unnest(ARRAY['de','en']) AS locale
)
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT 'anwendungen.root', wl.section_key, wl.field_key, l.locale, true
FROM wl CROSS JOIN locales l
ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE
  SET is_enabled = true, updated_at = now();

-- ===== 5. Alte Kategorien-Container deaktivieren (Inhalte bleiben erhalten) =====
-- Die fünf Unterbereiche werden ab jetzt über die Wechselteaser geführt.
-- Karten und Felder bleiben in der DB, im Admin sichtbar als Diagnose/Legacy.
UPDATE public.cms_sections
SET is_active = false, updated_at = now()
WHERE page_key = 'anwendungen.root'
  AND is_active = true
  AND section_key IN (
    'categories_wohnen',
    'categories_bildung',
    'categories_gesundheit',
    'categories_oeffentlich',
    'referenzen',
    'referenzen_cards'
  );

COMMIT;