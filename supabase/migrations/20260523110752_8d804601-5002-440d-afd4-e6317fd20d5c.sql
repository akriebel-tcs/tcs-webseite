-- L5: Whitelist für die 6 Referenz-Item-Bildslots (eingangssysteme.referenzen / items / <key>.image)
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT 'eingangssysteme.referenzen', 'items', fk, loc, true
FROM (VALUES
  ('forumMuseumsinsel.image'),
  ('pulse.image'),
  ('weidtParkCorner.image'),
  ('hamburgerFamiliendomizil.image'),
  ('fritzTower.image'),
  ('potsdamerWohnhaus.image')
) AS f(fk)
CROSS JOIN (VALUES ('de'),('en')) AS l(loc)
ON CONFLICT DO NOTHING;