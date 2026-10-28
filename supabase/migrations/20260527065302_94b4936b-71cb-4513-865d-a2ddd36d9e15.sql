-- Tranche 26 — TCS in Bauten (P-055): Einzelkarten als card_v1-Kinder
-- Idempotent. Legacy-Felder unter `categories`/`systemfunktionen`/`referenzen`
-- bleiben unangetastet (Renderer-Fallback).
BEGIN;

-- 1) Container (cards_v1) anlegen
INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active) VALUES ('anwendungen.root', 'categories_wohnen', 'cards_v1', 35, true) ON CONFLICT (page_key, section_key) DO NOTHING;
INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active) VALUES ('anwendungen.root', 'categories_bildung', 'cards_v1', 36, true) ON CONFLICT (page_key, section_key) DO NOTHING;
INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active) VALUES ('anwendungen.root', 'categories_gesundheit', 'cards_v1', 37, true) ON CONFLICT (page_key, section_key) DO NOTHING;
INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active) VALUES ('anwendungen.root', 'categories_oeffentlich', 'cards_v1', 38, true) ON CONFLICT (page_key, section_key) DO NOTHING;
INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active) VALUES ('anwendungen.root', 'categories_uebergreifend', 'cards_v1', 39, true) ON CONFLICT (page_key, section_key) DO NOTHING;
INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active) VALUES ('anwendungen.root', 'systemfunktionen_cards', 'cards_v1', 45, true) ON CONFLICT (page_key, section_key) DO NOTHING;
INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active) VALUES ('anwendungen.root', 'referenzen_cards', 'cards_v1', 55, true) ON CONFLICT (page_key, section_key) DO NOTHING;

-- 2) Karten (card_v1) als Kinder
DO $tranche26$
DECLARE
  r RECORD;
  v_cards CONSTANT text[][] := ARRAY[
    ['categories_wohnen','card_wohnen_einfamilienhaus','10'],
    ['categories_wohnen','card_wohnen_mehrfamilienhaus','20'],
    ['categories_wohnen','card_wohnen_grossanlage','30'],
    ['categories_wohnen','card_wohnen_sanierung','40'],
    ['categories_bildung','card_bildung_schule','10'],
    ['categories_bildung','card_bildung_kita','20'],
    ['categories_bildung','card_bildung_wohnheim','30'],
    ['categories_gesundheit','card_gesundheit_pflege','10'],
    ['categories_gesundheit','card_gesundheit_klinik','20'],
    ['categories_oeffentlich','card_oeffentlich_behoerde','10'],
    ['categories_oeffentlich','card_oeffentlich_feuerwehr','20'],
    ['categories_oeffentlich','card_oeffentlich_schwimmbad','30'],
    ['categories_uebergreifend','card_uebergreifend_mobile','10'],
    ['categories_uebergreifend','card_uebergreifend_bcm','20'],
    ['categories_uebergreifend','card_uebergreifend_signage','30'],
    ['categories_uebergreifend','card_uebergreifend_entry','40'],
    ['categories_uebergreifend','card_uebergreifend_snipdoo','50'],
    ['systemfunktionen_cards','card_sf_concierge','10'],
    ['systemfunktionen_cards','card_sf_internekommunikation','20'],
    ['systemfunktionen_cards','card_sf_namensverwaltung','30'],
    ['systemfunktionen_cards','card_sf_feuerwehrdurchsage','40'],
    ['systemfunktionen_cards','card_sf_bidirektionalesvideo','50'],
    ['referenzen_cards','card_ref_pulse-berlin','10'],
    ['referenzen_cards','card_ref_weidt-park-corner','20'],
    ['referenzen_cards','card_ref_fritztower','30'],
    ['referenzen_cards','card_ref_haupttelegraphenamt','40'],
    ['referenzen_cards','card_ref_spichern-2','50'],
    ['referenzen_cards','card_ref_thulestrasse','60']
  ];
  i int;
BEGIN
  FOR i IN 1..array_length(v_cards,1) LOOP
    INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active, parent_section_id)
    SELECT 'anwendungen.root', v_cards[i][2], 'card_v1', v_cards[i][3]::int, true, p.id
    FROM public.cms_sections p
    WHERE p.page_key='anwendungen.root' AND p.section_key=v_cards[i][1]
    ON CONFLICT (page_key, section_key) DO NOTHING;
  END LOOP;
END
$tranche26$;

-- 3) Felder aus Legacy-Quellen kopieren
DO $tranche26b$
DECLARE
  -- card_key, legacy_section, legacy_base, href, icon, is_ref
  v_map CONSTANT text[][] := ARRAY[
    ['card_wohnen_einfamilienhaus','categories','wohnen.cards.einfamilienhaus','/anwendungen/einfamilienhaus','Home','0'],
    ['card_wohnen_mehrfamilienhaus','categories','wohnen.cards.mehrfamilienhaus','/anwendungen/mehrfamilienhaus','Building2','0'],
    ['card_wohnen_grossanlage','categories','wohnen.cards.grossanlage','/anwendungen/grossanlage','Warehouse','0'],
    ['card_wohnen_sanierung','categories','wohnen.cards.sanierung','/anwendungen/sanierung','Wrench','0'],
    ['card_bildung_schule','categories','bildung.cards.schule','/anwendungen/bildungseinrichtungen','GraduationCap','0'],
    ['card_bildung_kita','categories','bildung.cards.kita','/anwendungen/bildungseinrichtungen','Baby','0'],
    ['card_bildung_wohnheim','categories','bildung.cards.wohnheim','/anwendungen/bildungseinrichtungen','Hotel','0'],
    ['card_gesundheit_pflege','categories','gesundheit.cards.pflege','/anwendungen/pflege','HeartPulse','0'],
    ['card_gesundheit_klinik','categories','gesundheit.cards.klinik','/anwendungen/klinik','Stethoscope','0'],
    ['card_oeffentlich_behoerde','categories','oeffentlich.cards.behoerde','/anwendungen/behoerde','Landmark','0'],
    ['card_oeffentlich_feuerwehr','categories','oeffentlich.cards.feuerwehr','/anwendungen/feuerwehr','Flame','0'],
    ['card_oeffentlich_schwimmbad','categories','oeffentlich.cards.schwimmbad','/anwendungen/schwimmbad','Waves','0'],
    ['card_uebergreifend_mobile','categories','uebergreifend.cards.mobile','/anwendungen/mobile-tuerkommunikation','Smartphone','0'],
    ['card_uebergreifend_bcm','categories','uebergreifend.cards.bcm','/anwendungen/zutrittskontrolle-bcm','KeyRound','0'],
    ['card_uebergreifend_signage','categories','uebergreifend.cards.signage','/gebaeudekommunikation/beschilderung','Type','0'],
    ['card_uebergreifend_entry','categories','uebergreifend.cards.entry','/entry-system','DoorOpen','0'],
    ['card_uebergreifend_snipdoo','categories','uebergreifend.cards.snipdoo','/anwendungen/mobile-tuerkommunikation','Cloud','0'],
    ['card_sf_concierge','systemfunktionen','cards.concierge','/anwendungen/concierge','MonitorPlay','0'],
    ['card_sf_internekommunikation','systemfunktionen','cards.interneKommunikation','/anwendungen/interne-kommunikation','Megaphone','0'],
    ['card_sf_namensverwaltung','systemfunktionen','cards.namensverwaltung','/anwendungen/digitale-namensverwaltung','UserCog','0'],
    ['card_sf_feuerwehrdurchsage','systemfunktionen','cards.feuerwehrdurchsage','/anwendungen/feuerwehrdurchsage','ShieldCheck','0'],
    ['card_sf_bidirektionalesvideo','systemfunktionen','cards.bidirektionalesVideo','/anwendungen/bidirektionale-video','Video','0'],
    ['card_ref_pulse-berlin','referenzen','projekte.pulse-berlin','','','1'],
    ['card_ref_weidt-park-corner','referenzen','projekte.weidt-park-corner','','','1'],
    ['card_ref_fritztower','referenzen','projekte.fritztower','','','1'],
    ['card_ref_haupttelegraphenamt','referenzen','projekte.haupttelegraphenamt','','','1'],
    ['card_ref_spichern-2','referenzen','projekte.spichern-2','','','1'],
    ['card_ref_thulestrasse','referenzen','projekte.thulestrasse','','','1']
  ];
  i int;
  v_ck text; v_ls text; v_lb text; v_href text; v_icon text; v_is_ref boolean;
BEGIN
  FOR i IN 1..array_length(v_map,1) LOOP
    v_ck := v_map[i][1]; v_ls := v_map[i][2]; v_lb := v_map[i][3];
    v_href := v_map[i][4]; v_icon := v_map[i][5]; v_is_ref := v_map[i][6]='1';

    -- title
    INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
    SELECT 'anwendungen.root', v_ck, 'title', locale, value
    FROM public.cms_section_fields
    WHERE page_key='anwendungen.root' AND section_key=v_ls AND field_key = v_lb || '.title' AND value IS NOT NULL
    ON CONFLICT DO NOTHING;

    IF v_is_ref THEN
      -- referenzen: 'type' → description
      INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
      SELECT 'anwendungen.root', v_ck, 'description', locale, value
      FROM public.cms_section_fields
      WHERE page_key='anwendungen.root' AND section_key=v_ls AND field_key = v_lb || '.type' AND value IS NOT NULL
      ON CONFLICT DO NOTHING;
    ELSE
      -- description
      INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
      SELECT 'anwendungen.root', v_ck, 'description', locale, value
      FROM public.cms_section_fields
      WHERE page_key='anwendungen.root' AND section_key=v_ls AND field_key = v_lb || '.description' AND value IS NOT NULL
      ON CONFLICT DO NOTHING;

      -- tags (concatenated)
      INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
      SELECT 'anwendungen.root', v_ck, 'tags', locale, string_agg(value, ', ' ORDER BY field_key)
      FROM public.cms_section_fields
      WHERE page_key='anwendungen.root' AND section_key=v_ls
        AND field_key LIKE v_lb || '.tags.%' AND value IS NOT NULL
      GROUP BY locale
      ON CONFLICT DO NOTHING;

      IF v_href <> '' THEN
        INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES
          ('anwendungen.root', v_ck, 'cta_href', 'de', v_href),
          ('anwendungen.root', v_ck, 'cta_href', 'en', v_href)
        ON CONFLICT DO NOTHING;
      END IF;

      IF v_icon <> '' THEN
        INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES
          ('anwendungen.root', v_ck, 'icon', 'de', v_icon),
          ('anwendungen.root', v_ck, 'icon', 'en', v_icon)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END LOOP;
END
$tranche26b$;

-- 4) Whitelist (cms_admin_editable_fields)
DO $tranche26c$
DECLARE
  v_normal_cards CONSTANT text[] := ARRAY[
    'card_wohnen_einfamilienhaus','card_wohnen_mehrfamilienhaus','card_wohnen_grossanlage','card_wohnen_sanierung',
    'card_bildung_schule','card_bildung_kita','card_bildung_wohnheim',
    'card_gesundheit_pflege','card_gesundheit_klinik',
    'card_oeffentlich_behoerde','card_oeffentlich_feuerwehr','card_oeffentlich_schwimmbad',
    'card_uebergreifend_mobile','card_uebergreifend_bcm','card_uebergreifend_signage','card_uebergreifend_entry','card_uebergreifend_snipdoo',
    'card_sf_concierge','card_sf_internekommunikation','card_sf_namensverwaltung','card_sf_feuerwehrdurchsage','card_sf_bidirektionalesvideo'
  ];
  v_ref_cards CONSTANT text[] := ARRAY[
    'card_ref_pulse-berlin','card_ref_weidt-park-corner','card_ref_fritztower','card_ref_haupttelegraphenamt','card_ref_spichern-2','card_ref_thulestrasse'
  ];
  v_normal_fields CONSTANT text[] := ARRAY['title','description','tags','cta_href','icon','icon_image','image'];
  v_ref_fields    CONSTANT text[] := ARRAY['title','description','icon_image','image'];
  v_loc text; v_ck text; v_fk text;
BEGIN
  FOREACH v_ck IN ARRAY v_normal_cards LOOP
    FOREACH v_fk IN ARRAY v_normal_fields LOOP
      FOREACH v_loc IN ARRAY ARRAY['de','en'] LOOP
        INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
        VALUES ('anwendungen.root', v_ck, v_fk, v_loc, true)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
  FOREACH v_ck IN ARRAY v_ref_cards LOOP
    FOREACH v_fk IN ARRAY v_ref_fields LOOP
      FOREACH v_loc IN ARRAY ARRAY['de','en'] LOOP
        INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
        VALUES ('anwendungen.root', v_ck, v_fk, v_loc, true)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END
$tranche26c$;

COMMIT;