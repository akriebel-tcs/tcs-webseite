-- CTA-Link der Lösungsblöcke als CMS-pflegbares Feld
-- Idempotent: nur fehlende Whitelist-Einträge / Feldwerte ergänzen.

-- 1) Whitelist: cta_link (de + en) für JEDEN aktuellen und künftigen block_* Eintrag auf home.start
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT 'home.start', s.section_key, 'cta_link', l.locale, true
  FROM public.cms_sections s
  CROSS JOIN (VALUES ('de'), ('en')) AS l(locale)
 WHERE s.page_key = 'home.start'
   AND s.section_key LIKE 'block_%'
ON CONFLICT DO NOTHING;

-- 2) Feldwerte vorbelegen für die bekannten Vorlage-Blöcke (BLOCK_META aus Code).
--    Nur einfügen, wenn noch keine Zeile existiert (kein Überschreiben).
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT v.page_key, v.section_key, 'cta_link', l.locale, v.link
FROM (VALUES
  ('home.start', 'block_communication', '/gebaeudekommunikation'),
  ('home.start', 'block_access',        '/zutrittskontrolle'),
  ('home.start', 'block_entry',         '/eingangssysteme'),
  ('home.start', 'block_signage',       '/gebaeudekommunikation/beschilderung'),
  ('home.start', 'block_solutions',     '/anwendungen/objektloesungen')
) AS v(page_key, section_key, link)
CROSS JOIN (VALUES ('de'), ('en')) AS l(locale)
WHERE NOT EXISTS (
  SELECT 1 FROM public.cms_section_fields f
   WHERE f.page_key = v.page_key
     AND f.section_key = v.section_key
     AND f.field_key = 'cta_link'
     AND f.locale = l.locale
);