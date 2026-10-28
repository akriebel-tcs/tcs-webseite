-- Tranche 7a: DB-first Icons für Service/Home Quick-Win
-- Idempotent: bestehende Werte werden nicht überschrieben.

WITH icon_data(page_key, section_key, field_key, value) AS (
  VALUES
    -- home.ueber-tcs / values
    ('home.ueber-tcs','values','items.system.icon','factory'),
    ('home.ueber-tcs','values','items.innovation.icon','lightbulb'),
    ('home.ueber-tcs','values','items.quality.icon','shield'),
    ('home.ueber-tcs','values','items.partnership.icon','handshake'),
    -- home.ueber-tcs / manufacturing
    ('home.ueber-tcs','manufacturing','items.iso.icon','award'),
    ('home.ueber-tcs','manufacturing','items.smd.icon','factory'),
    ('home.ueber-tcs','manufacturing','items.ihk.icon','users'),
    ('home.ueber-tcs','manufacturing','items.sustainability.icon','leaf'),
    -- service.downloads / quickLinks
    ('service.downloads','quickLinks','downloads.icon','download'),
    ('service.downloads','quickLinks','faq.icon','help-circle'),
    ('service.downloads','quickLinks','ersatzteile.icon','shopping-cart'),
    ('service.downloads','quickLinks','support.icon','phone'),
    -- service.downloads / rma
    ('service.downloads','rma','items.rma.icon','clipboard-list'),
    ('service.downloads','rma','items.garantie.icon','settings'),
    ('service.downloads','rma','items.support.icon','phone'),
    -- service.downloads / bestellung
    ('service.downloads','bestellung','items.ersatzteile.icon','shopping-cart'),
    ('service.downloads','bestellung','items.beschriftung.icon','file-text'),
    ('service.downloads','bestellung','items.freischaltcodes.icon','settings'),
    -- service.downloads / akademie
    ('service.downloads','akademie','items.produktschulungen.icon','wrench'),
    ('service.downloads','akademie','items.webinare.icon','monitor'),
    ('service.downloads','akademie','items.zertifizierung.icon','award'),
    ('service.downloads','akademie','items.vorOrt.icon','users'),
    ('service.downloads','akademie','items.partner.icon','graduation-cap'),
    -- service.technischer-support / channels
    ('service.technischer-support','channels','items.telefon.icon','phone'),
    ('service.technischer-support','channels','items.email.icon','mail'),
    ('service.technischer-support','channels','items.tcsplan.icon','message-square'),
    ('service.technischer-support','channels','items.downloads.icon','file-text'),
    -- service.technischer-support / rma
    ('service.technischer-support','rma','items.rma.icon','clipboard-list'),
    ('service.technischer-support','rma','items.garantie.icon','settings'),
    ('service.technischer-support','rma','items.support.icon','phone'),
    -- service.technischer-support / ersatzteile
    ('service.technischer-support','ersatzteile','items.ersatzteile.icon','shopping-cart'),
    ('service.technischer-support','ersatzteile','items.beschriftung.icon','file-text'),
    ('service.technischer-support','ersatzteile','items.freischaltcodes.icon','settings')
)
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT d.page_key, d.section_key, d.field_key, l.locale, d.value
FROM icon_data d
CROSS JOIN (VALUES ('de'),('en')) AS l(locale)
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

-- Whitelist DE+EN für genau diese neuen Icon-Felder
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT page_key, section_key, field_key, locale, true
FROM public.cms_section_fields
WHERE page_key IN ('home.ueber-tcs','service.downloads','service.technischer-support')
  AND field_key LIKE '%.icon'
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
