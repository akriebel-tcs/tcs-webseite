DO $$
DECLARE
  v RECORD;
BEGIN
  FOR v IN
    SELECT * FROM (VALUES
      ('dokumente','label_bereich','Bereich','Area'),
      ('dokumente','label_produktkategorie','Produktkategorie','Product category'),
      ('dokumente','label_familie_serie','Familie/Serie','Family/series'),
      ('dokumente','label_system','System','System'),
      ('dokumente','label_asset_typ','Asset-Typ','Asset type'),
      ('dokumente','label_dokument_quellentyp','Dokument-/Quellentyp','Document/source type'),
      ('dokumente','label_sprache','Sprache','Language'),
      ('dokumente','label_verfuegbarkeit','Verfügbarkeit','Availability'),
      ('dokumente','label_alle','Alle','All'),
      ('dokumente','label_suche','Downloads durchsuchen','Search downloads'),
      ('dokumente','label_filter','Filter','Filters'),
      ('dokumente','label_filter_zuruecksetzen','Filter zurücksetzen','Reset filters'),
      ('dokumente','label_gruppieren_familie_serie','Nach Familie/Serie gruppieren','Group by family/series'),
      ('dokumente','label_eintrag','Eintrag','entry'),
      ('dokumente','label_eintraege','Einträge','entries'),
      ('dokumente','btn_download','Download','Download'),
      ('dokumente','btn_open','Öffnen','Open'),
      ('dokumente','badge_external_link','Externer Link','External link'),
      ('dokumente','empty_hint','Keine Treffer für die aktuelle Auswahl.','No results for the current selection.'),
      ('dokumente','choose_audience_hint','Bitte wählen Sie oben eine Zielgruppe, um die passenden Downloads anzuzeigen.','Please choose an audience above to see the matching downloads.'),
      ('dokumente','error_hint','Die Downloads können derzeit nicht geladen werden. Bitte versuchen Sie es später erneut.','Downloads cannot be loaded at the moment. Please try again later.'),
      ('quickLinks','items.downloads.href','#dokumente','#dokumente'),
      ('quickLinks','items.faq.href','#faq','#faq'),
      ('quickLinks','items.ersatzteile.href','https://tcs24.com/','https://tcs24.com/'),
      ('quickLinks','items.support.href','/kontakt','/kontakt'),
      ('bestellung','items.ersatzteile.href','https://tcs24.com/','https://tcs24.com/'),
      ('bestellung','items.beschriftung.href','','')
    ) AS x(section_key, field_key, val_de, val_en)
  LOOP
    INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
    VALUES ('service.downloads', v.section_key, v.field_key, 'de', v.val_de)
    ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

    INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
    VALUES ('service.downloads', v.section_key, v.field_key, 'en', v.val_en)
    ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

    INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
    VALUES ('service.downloads', v.section_key, v.field_key, 'de', true)
    ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE SET is_enabled = true, updated_at = now();

    INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
    VALUES ('service.downloads', v.section_key, v.field_key, 'en', true)
    ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE SET is_enabled = true, updated_at = now();
  END LOOP;
END $$;