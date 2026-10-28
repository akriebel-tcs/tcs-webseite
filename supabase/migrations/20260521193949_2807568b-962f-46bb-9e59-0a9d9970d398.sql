-- Idempotent: nur leere Titel werden gesetzt; vorhandene Werte bleiben unverändert.
WITH titles(page_key, title_de, title_en) AS (
  VALUES
    ('gebaeudemanagement.bcm-buchungssystem',  'BCM Buchungssystem',                  'BCM Booking System'),
    ('gebaeudemanagement.bcm-infoboard',       'BCM Infoboard',                       'BCM Infoboard'),
    ('mobile-tk-preview.root',                 'Mobile Türkommunikation',             'Mobile Door Communication'),
    ('zutrittskontrolle.aussenstation-adx5',   'Außenstation ADX5',                   'ADX5 Outdoor Station'),
    ('zutrittskontrolle.bcm-door-app',         'BCM DoorApp',                         'BCM DoorApp'),
    ('zutrittskontrolle.bcm-mini-cloud',       'BCM MiniCloud',                       'BCM MiniCloud'),
    ('zutrittskontrolle.digitale-briefkasten', 'Digitale Briefkastenanlage',          'Digital Mailbox System'),
    ('zutrittskontrolle.gsm-gateway',          'BCM GSM Gateway',                     'BCM GSM Gateway'),
    ('zutrittskontrolle.schrankschloss',       'Elektronisches Schrankschloss',       'Electronic Cabinet Lock'),
    ('zutrittskontrolle.serverschrankschloss', 'Elektronisches Serverschrankschloss', 'Electronic Server Cabinet Lock'),
    ('zutrittskontrolle.zufahrtskontrolle',    'Zufahrtskontrolle',                   'Vehicle Access Control'),
    ('zutrittskontrolle.zutrittssoftware',     'Zutrittssoftware',                    'Access Software')
)
UPDATE public.cms_pages p
SET
  title_de = CASE WHEN p.title_de IS NULL OR p.title_de = '' THEN t.title_de ELSE p.title_de END,
  title_en = CASE WHEN p.title_en IS NULL OR p.title_en = '' THEN t.title_en ELSE p.title_en END,
  updated_at = now()
FROM titles t
WHERE p.page_key = t.page_key
  AND (
    (p.title_de IS NULL OR p.title_de = '') OR
    (p.title_en IS NULL OR p.title_en = '')
  );
