BEGIN;

-- =====================================================================
-- Task 1a: 16 fehlende hero-Sections auf Anwendungs-Detailseiten
-- =====================================================================
INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active) VALUES
  ('anwendungen.einfamilienhaus','hero','hero_v1',10,true),
  ('anwendungen.mehrfamilienhaus','hero','hero_v1',10,true),
  ('anwendungen.grossanlage','hero','hero_v1',10,true),
  ('anwendungen.sanierung','hero','hero_v1',10,true),
  ('anwendungen.pflege','hero','hero_v1',10,true),
  ('anwendungen.klinik','hero','hero_v1',10,true),
  ('anwendungen.behoerde','hero','hero_v1',10,true),
  ('anwendungen.feuerwehr','hero','hero_v1',10,true),
  ('anwendungen.feuerwehrdurchsage','hero','hero_v1',10,true),
  ('anwendungen.schwimmbad','hero','hero_v1',10,true),
  ('anwendungen.concierge','hero','hero_v1',10,true),
  ('anwendungen.interne-kommunikation','hero','hero_v1',10,true),
  ('anwendungen.mobile-tuerkommunikation','hero','hero_v1',10,true),
  ('anwendungen.bidirektionale-video','hero','hero_v1',10,true),
  ('anwendungen.digitale-namensverwaltung','hero','hero_v1',10,true),
  ('anwendungen.zutrittskontrolle-bcm','hero','hero_v1',10,true)
ON CONFLICT (page_key, section_key) DO NOTHING;

-- =====================================================================
-- Task 1b: 12 fehlende gallery-Sections auf Referenzprojekt-Seiten
-- section_type content_v1 als minimaler Fallback (kein gallery_v1 im Katalog)
-- sort_order = max(bestehend) + 10 pro Seite (typ. 50)
-- =====================================================================
INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active)
SELECT p.page_key,
       'gallery',
       'content_v1',
       COALESCE((SELECT MAX(sort_order) FROM public.cms_sections s WHERE s.page_key = p.page_key), 0) + 10,
       true
FROM (VALUES
  ('anwendungen.referenzprojekte.campus-westend'),
  ('anwendungen.referenzprojekte.fritztower'),
  ('anwendungen.referenzprojekte.haupttelegraphenamt'),
  ('anwendungen.referenzprojekte.klinikum-sued'),
  ('anwendungen.referenzprojekte.luisenpark-residenz'),
  ('anwendungen.referenzprojekte.pulse-berlin'),
  ('anwendungen.referenzprojekte.quartier-heidestrasse'),
  ('anwendungen.referenzprojekte.rathaus-neustadt'),
  ('anwendungen.referenzprojekte.seniorenresidenz-am-park'),
  ('anwendungen.referenzprojekte.spichern-2'),
  ('anwendungen.referenzprojekte.thulestrasse'),
  ('anwendungen.referenzprojekte.weidt-park-corner')
) AS p(page_key)
ON CONFLICT (page_key, section_key) DO NOTHING;

-- =====================================================================
-- Task 2: Whitelist (DE+EN, is_enabled=true) für priorisierte Bildslots
-- =====================================================================
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT page_key, section_key, field_key, locale, true
FROM (VALUES
  -- Referenzprojekte: hero.image + gallery.img_0/1/2
  ('anwendungen.referenzprojekte.campus-westend','hero','image'),
  ('anwendungen.referenzprojekte.campus-westend','gallery','img_0'),
  ('anwendungen.referenzprojekte.campus-westend','gallery','img_1'),
  ('anwendungen.referenzprojekte.campus-westend','gallery','img_2'),
  ('anwendungen.referenzprojekte.fritztower','hero','image'),
  ('anwendungen.referenzprojekte.fritztower','gallery','img_0'),
  ('anwendungen.referenzprojekte.fritztower','gallery','img_1'),
  ('anwendungen.referenzprojekte.fritztower','gallery','img_2'),
  ('anwendungen.referenzprojekte.haupttelegraphenamt','hero','image'),
  ('anwendungen.referenzprojekte.haupttelegraphenamt','gallery','img_0'),
  ('anwendungen.referenzprojekte.haupttelegraphenamt','gallery','img_1'),
  ('anwendungen.referenzprojekte.haupttelegraphenamt','gallery','img_2'),
  ('anwendungen.referenzprojekte.klinikum-sued','hero','image'),
  ('anwendungen.referenzprojekte.klinikum-sued','gallery','img_0'),
  ('anwendungen.referenzprojekte.klinikum-sued','gallery','img_1'),
  ('anwendungen.referenzprojekte.klinikum-sued','gallery','img_2'),
  ('anwendungen.referenzprojekte.luisenpark-residenz','hero','image'),
  ('anwendungen.referenzprojekte.luisenpark-residenz','gallery','img_0'),
  ('anwendungen.referenzprojekte.luisenpark-residenz','gallery','img_1'),
  ('anwendungen.referenzprojekte.luisenpark-residenz','gallery','img_2'),
  ('anwendungen.referenzprojekte.pulse-berlin','hero','image'),
  ('anwendungen.referenzprojekte.pulse-berlin','gallery','img_0'),
  ('anwendungen.referenzprojekte.pulse-berlin','gallery','img_1'),
  ('anwendungen.referenzprojekte.pulse-berlin','gallery','img_2'),
  ('anwendungen.referenzprojekte.quartier-heidestrasse','hero','image'),
  ('anwendungen.referenzprojekte.quartier-heidestrasse','gallery','img_0'),
  ('anwendungen.referenzprojekte.quartier-heidestrasse','gallery','img_1'),
  ('anwendungen.referenzprojekte.quartier-heidestrasse','gallery','img_2'),
  ('anwendungen.referenzprojekte.rathaus-neustadt','hero','image'),
  ('anwendungen.referenzprojekte.rathaus-neustadt','gallery','img_0'),
  ('anwendungen.referenzprojekte.rathaus-neustadt','gallery','img_1'),
  ('anwendungen.referenzprojekte.rathaus-neustadt','gallery','img_2'),
  ('anwendungen.referenzprojekte.seniorenresidenz-am-park','hero','image'),
  ('anwendungen.referenzprojekte.seniorenresidenz-am-park','gallery','img_0'),
  ('anwendungen.referenzprojekte.seniorenresidenz-am-park','gallery','img_1'),
  ('anwendungen.referenzprojekte.seniorenresidenz-am-park','gallery','img_2'),
  ('anwendungen.referenzprojekte.spichern-2','hero','image'),
  ('anwendungen.referenzprojekte.spichern-2','gallery','img_0'),
  ('anwendungen.referenzprojekte.spichern-2','gallery','img_1'),
  ('anwendungen.referenzprojekte.spichern-2','gallery','img_2'),
  ('anwendungen.referenzprojekte.thulestrasse','hero','image'),
  ('anwendungen.referenzprojekte.thulestrasse','gallery','img_0'),
  ('anwendungen.referenzprojekte.thulestrasse','gallery','img_1'),
  ('anwendungen.referenzprojekte.thulestrasse','gallery','img_2'),
  ('anwendungen.referenzprojekte.weidt-park-corner','hero','image'),
  ('anwendungen.referenzprojekte.weidt-park-corner','gallery','img_0'),
  ('anwendungen.referenzprojekte.weidt-park-corner','gallery','img_1'),
  ('anwendungen.referenzprojekte.weidt-park-corner','gallery','img_2'),
  -- Anwendungs-Detail-Heroes
  ('anwendungen.einfamilienhaus','hero','image'),
  ('anwendungen.mehrfamilienhaus','hero','image'),
  ('anwendungen.grossanlage','hero','image'),
  ('anwendungen.sanierung','hero','image'),
  ('anwendungen.pflege','hero','image'),
  ('anwendungen.klinik','hero','image'),
  ('anwendungen.behoerde','hero','image'),
  ('anwendungen.feuerwehr','hero','image'),
  ('anwendungen.feuerwehrdurchsage','hero','image'),
  ('anwendungen.schwimmbad','hero','image'),
  ('anwendungen.concierge','hero','image'),
  ('anwendungen.interne-kommunikation','hero','image'),
  ('anwendungen.mobile-tuerkommunikation','hero','image'),
  ('anwendungen.bidirektionale-video','hero','image'),
  ('anwendungen.digitale-namensverwaltung','hero','image'),
  ('anwendungen.zutrittskontrolle-bcm','hero','image'),
  -- Zutrittskontrolle Produkt-Heroes
  ('zutrittskontrolle.aussenstation-adx5','hero','image'),
  ('zutrittskontrolle.bcm-door-app','hero','image'),
  ('zutrittskontrolle.digitale-briefkasten','hero','image'),
  ('zutrittskontrolle.gsm-gateway','hero','image'),
  ('zutrittskontrolle.schrankschloss','hero','image'),
  ('zutrittskontrolle.serverschrankschloss','hero','image'),
  ('zutrittskontrolle.zufahrtskontrolle','hero','image'),
  -- Gebäudemanagement
  ('gebaeudemanagement.bcm-buchungssystem','hero','image'),
  ('gebaeudemanagement.bcm-infoboard','hero','image'),
  -- Gebäudekommunikation Türsprechanlagen Anwendungsumfelder
  ('gebaeudekommunikation.tuersprechanlagen','anwendungsumfelder','image_efh'),
  ('gebaeudekommunikation.tuersprechanlagen','anwendungsumfelder','image_mfh'),
  ('gebaeudekommunikation.tuersprechanlagen','anwendungsumfelder','image_gewerbe')
) AS t(page_key, section_key, field_key)
CROSS JOIN (VALUES ('de'),('en')) AS l(locale)
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

-- =====================================================================
-- Task 3a: Legacy-Slots auf konsolidiertes (field_key='image', viewport=…)
-- kopieren — nur falls Ziel noch nicht existiert. URL bleibt erhalten.
-- =====================================================================
INSERT INTO public.cms_assets (
  page_key, section_key, asset_role, locale, storage_path, public_url,
  alt_text_de, alt_text_en, focal_x, focal_y, sort_order, is_active,
  field_key, file_name, mime_type, alt_de, alt_en, viewport
)
SELECT
  a.page_key, a.section_key, a.asset_role, a.locale, a.storage_path, a.public_url,
  a.alt_text_de, a.alt_text_en, a.focal_x, a.focal_y, a.sort_order, true,
  'image', a.file_name, a.mime_type, a.alt_de, a.alt_en,
  CASE a.field_key
    WHEN 'image_desktop' THEN 'desktop'
    WHEN 'image_tablet'  THEN 'tablet'
    WHEN 'image_mobile'  THEN 'mobile'
  END AS viewport
FROM public.cms_assets a
WHERE a.is_active = true
  AND a.field_key IN ('image_desktop','image_tablet','image_mobile')
  AND NOT EXISTS (
    SELECT 1 FROM public.cms_assets b
    WHERE b.page_key = a.page_key
      AND b.section_key = a.section_key
      AND b.field_key = 'image'
      AND b.viewport = CASE a.field_key
                         WHEN 'image_desktop' THEN 'desktop'
                         WHEN 'image_tablet'  THEN 'tablet'
                         WHEN 'image_mobile'  THEN 'mobile'
                       END
  );

-- Task 3b: Legacy-Slots stilllegen (nicht löschen)
UPDATE public.cms_assets
   SET is_active = false,
       updated_at = now()
 WHERE is_active = true
   AND field_key IN ('image_desktop','image_tablet','image_mobile');

-- Task 3c: Whitelist für die konsolidierten hero.image-Slots
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT page_key, 'hero', 'image', locale, true
FROM (VALUES
  ('anwendungen.root'),
  ('eingangssysteme.root'),
  ('gebaeudekommunikation.root'),
  ('service.hub')
) AS p(page_key)
CROSS JOIN (VALUES ('de'),('en')) AS l(locale)
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

COMMIT;