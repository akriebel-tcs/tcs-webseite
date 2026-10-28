-- /downloads als reine Download-Seite: Hüllentexte, neue Bedienlabels,
-- Sichtbarkeit der Service-Zusatzblöcke. Idempotent.
DO $$
DECLARE
  v_page text := 'service.downloads';
BEGIN
  -- 1. Hero-/Dokumente-Texte Download-orientiert (DE/EN)
  PERFORM rpc_admin_update_section_field(v_page,'hero','label','de','Download-Center');
  PERFORM rpc_admin_update_section_field(v_page,'hero','label','en','Download center');
  PERFORM rpc_admin_update_section_field(v_page,'hero','headline','de','Downloads finden');
  PERFORM rpc_admin_update_section_field(v_page,'hero','headline','en','Find downloads');
  PERFORM rpc_admin_update_section_field(v_page,'hero','intro','de','Finden Sie Handbücher, Produktinformationen, Planungsunterlagen, Software und Publikationen.');
  PERFORM rpc_admin_update_section_field(v_page,'hero','intro','en','Find manuals, product information, planning documents, software and publications.');

  PERFORM rpc_admin_update_section_field(v_page,'dokumente','headline','de','Downloads');
  PERFORM rpc_admin_update_section_field(v_page,'dokumente','headline','en','Downloads');
  PERFORM rpc_admin_update_section_field(v_page,'dokumente','intro','de','Suchen Sie direkt nach Produkt, Artikelnummer oder Dokument — oder wählen Sie eine Zielgruppe und einen Bereich.');
  PERFORM rpc_admin_update_section_field(v_page,'dokumente','intro','en','Search directly by product, article number or document — or choose an audience and an area.');
  PERFORM rpc_admin_update_section_field(v_page,'dokumente','label_suche','de','Produkt, Artikelnummer oder Dokument suchen');
  PERFORM rpc_admin_update_section_field(v_page,'dokumente','label_suche','en','Search product, article number or document');
  PERFORM rpc_admin_update_section_field(v_page,'dokumente','choose_audience_hint','de','Bitte wählen Sie eine Zielgruppe, um die passenden Downloads anzuzeigen — oder suchen Sie direkt.');
  PERFORM rpc_admin_update_section_field(v_page,'dokumente','choose_audience_hint','en','Please choose an audience to see the matching downloads — or search directly.');

  -- 2. Neue Bedienlabels (nur UI-Texte)
  PERFORM rpc_admin_update_section_field(v_page,'dokumente','label_weitere_filter','de','Weitere Filter');
  PERFORM rpc_admin_update_section_field(v_page,'dokumente','label_weitere_filter','en','More filters');
  PERFORM rpc_admin_update_section_field(v_page,'dokumente','label_zugeordnete_artikel','de','Zugeordnete Artikel');
  PERFORM rpc_admin_update_section_field(v_page,'dokumente','label_zugeordnete_artikel','en','Assigned articles');

  -- 3. Whitelist für die neuen Felder (Pflicht: sonst „noch nicht CMS-gepflegt")
  INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
  SELECT v_page,'dokumente', f, l, true
  FROM (VALUES ('label_weitere_filter'),('label_zugeordnete_artikel')) AS fields(f),
       (VALUES ('de'),('en')) AS locales(l)
  WHERE NOT EXISTS (
    SELECT 1 FROM cms_admin_editable_fields e
    WHERE e.page_key = v_page AND e.section_key='dokumente'
      AND e.field_key = fields.f AND e.locale = locales.l
  );

  -- 4. Service-Zusatzblöcke gehören nicht in den Hauptfluss von /downloads
  PERFORM rpc_admin_set_section_active(v_page, s, false)
  FROM (VALUES ('quickLinks'),('faq'),('rma'),('bestellung'),('akademie'),('glossar'),('ansprechpartner')) AS t(s);

  -- 5. Download-Block direkt nach dem Hero
  PERFORM rpc_admin_set_section_position(v_page,'dokumente',2);
END $$;