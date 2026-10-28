-- Batch 22 Cleanup: Platzhalter-Labels + alte Container-Felder leeren

-- 1) link_1_label leeren für die 4 Placeholder-Karten (de + en)
UPDATE cms_section_fields
SET value = '', updated_at = now()
WHERE page_key = 'service.hub'
  AND section_key IN (
    'group_produktzugang.finder',
    'group_produktzugang.serien',
    'group_produktzugang.stammdaten',
    'group_support.glossar'
  )
  AND field_key = 'link_1_label';

-- 2) Alte sections-Felder leeren (nicht löschen) — Spiegel-Audit verlangt
--    leere Werte oder Container-Reaktivierung. Section bleibt als Hülle
--    erhalten (Rollback-fähig: Texte via i18n-JSON wiederherstellbar).
UPDATE cms_section_fields
SET value = '', updated_at = now()
WHERE page_key = 'service.hub'
  AND section_key = 'sections'
  AND value IS NOT NULL
  AND value <> '';