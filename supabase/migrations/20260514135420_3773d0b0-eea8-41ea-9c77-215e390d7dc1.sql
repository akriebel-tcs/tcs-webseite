-- Rollback: section_key 'liste' -> 'items' auf den 6 Seiten.
-- FK cms_section_fields(page_key, section_key) -> cms_sections hat ON UPDATE CASCADE,
-- damit wandern die 388 Felder automatisch mit.
UPDATE public.cms_sections
   SET section_key = 'items', updated_at = now()
 WHERE section_key = 'liste'
   AND page_key IN (
     'eingangssysteme.funktionalitaet',
     'eingangssysteme.material',
     'eingangssysteme.integrationsformen',
     'eingangssysteme.referenzen',
     'eingangssysteme.standards',
     'anwendungen.objektloesungen'
   );

-- Whitelist und Assets manuell nachziehen (kein FK-Cascade darauf).
UPDATE public.cms_admin_editable_fields
   SET section_key = 'items', updated_at = now()
 WHERE section_key = 'liste'
   AND page_key IN (
     'eingangssysteme.funktionalitaet',
     'eingangssysteme.material',
     'eingangssysteme.integrationsformen',
     'eingangssysteme.referenzen',
     'eingangssysteme.standards',
     'anwendungen.objektloesungen'
   );

UPDATE public.cms_assets
   SET section_key = 'items', updated_at = now()
 WHERE section_key = 'liste'
   AND page_key IN (
     'eingangssysteme.funktionalitaet',
     'eingangssysteme.material',
     'eingangssysteme.integrationsformen',
     'eingangssysteme.referenzen',
     'eingangssysteme.standards',
     'anwendungen.objektloesungen'
   );