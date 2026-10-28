-- Etappe S Hygiene: section_key 'items' -> 'liste'
-- Hintergrund: 'items' ist ein englisches Fremdlabel aus den Quell-i18n-JSONs.
-- Im Admin-Tree erscheint 'items' als Block-Name. 'liste' ist klar deutsch
-- und einheitlich für alle 6 betroffenen Seiten.
-- Idempotent: nach dem ersten Lauf existieren keine 'items'-Zeilen mehr.

-- Schritt 1: FK so erweitern, dass section_key-Umbenennungen automatisch
-- auf cms_section_fields propagieren. Vorher nur ON DELETE CASCADE.
ALTER TABLE public.cms_section_fields
  DROP CONSTRAINT IF EXISTS cms_section_fields_section_fkey;

ALTER TABLE public.cms_section_fields
  ADD CONSTRAINT cms_section_fields_section_fkey
  FOREIGN KEY (page_key, section_key)
  REFERENCES public.cms_sections(page_key, section_key)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- Schritt 2: Umbenennen in cms_sections (cms_section_fields zieht via FK nach).
UPDATE public.cms_sections
SET section_key = 'liste',
    updated_at  = now()
WHERE section_key = 'items'
  AND page_key IN (
    'eingangssysteme.funktionalitaet',
    'eingangssysteme.material',
    'eingangssysteme.integrationsformen',
    'eingangssysteme.referenzen',
    'eingangssysteme.standards',
    'anwendungen.objektloesungen'
  );

-- Schritt 3: Schwester-Tabellen ohne FK manuell nachziehen.
UPDATE public.cms_assets
SET section_key = 'liste',
    updated_at  = now()
WHERE section_key = 'items'
  AND page_key IN (
    'eingangssysteme.funktionalitaet',
    'eingangssysteme.material',
    'eingangssysteme.integrationsformen',
    'eingangssysteme.referenzen',
    'eingangssysteme.standards',
    'anwendungen.objektloesungen'
  );

UPDATE public.cms_admin_editable_fields
SET section_key = 'liste',
    updated_at  = now()
WHERE section_key = 'items'
  AND page_key IN (
    'eingangssysteme.funktionalitaet',
    'eingangssysteme.material',
    'eingangssysteme.integrationsformen',
    'eingangssysteme.referenzen',
    'eingangssysteme.standards',
    'anwendungen.objektloesungen'
  );