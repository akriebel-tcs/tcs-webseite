-- Batch 22 Part 2/3: Gruppen-Felder + Karten-Felder via INSERT...SELECT (kompakt, idempotent)
-- ============ Gruppen-Felder (label/title/intro/section_bg) für 5 Gruppen × 2 Sprachen ============
WITH groups(group_key, src_key, bg) AS (VALUES
  ('group_produktzugang','produktzugang','default'),
  ('group_downloads','downloads','secondary'),
  ('group_planung','planung','default'),
  ('group_support','support','secondary'),
  ('group_akademie','akademie','default')
),
locales(loc) AS (VALUES ('de'),('en')),
field_map(dst_field, src_suffix) AS (VALUES
  ('label','label'),
  ('title','headline'),
  ('intro','intro')
)
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT
  'service.hub',
  g.group_key,
  fm.dst_field,
  l.loc,
  COALESCE((SELECT value FROM cms_section_fields
            WHERE page_key='service.hub'
              AND section_key='sections'
              AND field_key = g.src_key||'.'||fm.src_suffix
              AND locale = l.loc), '')
FROM groups g CROSS JOIN locales l CROSS JOIN field_map fm
ON CONFLICT (page_key,section_key,field_key,locale)
DO UPDATE SET value=EXCLUDED.value, updated_at=now();

-- section_bg pro Gruppe (de + en)
WITH groups(group_key, bg) AS (VALUES
  ('group_produktzugang','default'),
  ('group_downloads','secondary'),
  ('group_planung','default'),
  ('group_support','secondary'),
  ('group_akademie','default')
),
locales(loc) AS (VALUES ('de'),('en'))
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT 'service.hub', g.group_key, 'section_bg', l.loc, g.bg
FROM groups g CROSS JOIN locales l
ON CONFLICT (page_key,section_key,field_key,locale)
DO UPDATE SET value=EXCLUDED.value, updated_at=now();

-- ============ Karten-Felder (16 Karten × Texte + Meta × 2 Sprachen) ============
WITH cards(group_key, item_key, src_group, src_item, icon, href, is_placeholder) AS (VALUES
  ('group_produktzugang','katalog',      'produktzugang','katalog',      'BookOpen',      '/service/online-produktkatalog','0'),
  ('group_produktzugang','finder',       'produktzugang','finder',       'Search',        '',                              '1'),
  ('group_produktzugang','serien',       'produktzugang','serien',       'Layers',        '',                              '1'),
  ('group_produktzugang','stammdaten',   'produktzugang','stammdaten',   'Database',      '',                              '1'),
  ('group_downloads','downloads',        'downloads','downloads',        'Download',      '/downloads',                    '0'),
  ('group_downloads','datenblaetter',    'downloads','datenblaetter',    'FileText',      '/downloads',                    '0'),
  ('group_downloads','handbuecher',      'downloads','handbuecher',      'BookMarked',    '/downloads',                    '0'),
  ('group_downloads','schaltplaene',     'downloads','schaltplaene',     'Network',       '/technischer-support',          '0'),
  ('group_downloads','technische',       'downloads','technische',       'FolderOpen',    '/downloads',                    '0'),
  ('group_planung','planen',             'planung','planen',             'ClipboardList', '/planen-konfigurieren',         '0'),
  ('group_planung','ersatzteile',        'planung','ersatzteile',        'Wrench',        '/ersatzteile',                  '0'),
  ('group_support','support',            'support','support',            'Phone',         '/technischer-support',          '0'),
  ('group_support','faq',                'support','faq',                'HelpCircle',    '/downloads',                    '0'),
  ('group_support','glossar',            'support','glossar',            'Type',          '',                              '1'),
  ('group_akademie','akademie',          'akademie','akademie',          'GraduationCap', '/wissen/akademie',              '0'),
  ('group_akademie','serviceportal',     'akademie','serviceportal',     'ShieldCheck',   '/serviceportal',                '0')
),
locales(loc) AS (VALUES ('de'),('en')),
text_map(dst_field, src_suffix) AS (VALUES
  ('title','title'),
  ('description','description'),
  ('link_1_label','linkLabel')
)
-- 1) Text-Felder aus alter Section übernehmen
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT
  'service.hub',
  c.group_key||'.'||c.item_key,
  tm.dst_field,
  l.loc,
  COALESCE((SELECT value FROM cms_section_fields
            WHERE page_key='service.hub'
              AND section_key='sections'
              AND field_key = c.src_group||'.items.'||c.src_item||'.'||tm.src_suffix
              AND locale = l.loc), '')
FROM cards c CROSS JOIN locales l CROSS JOIN text_map tm
ON CONFLICT (page_key,section_key,field_key,locale)
DO UPDATE SET value=EXCLUDED.value, updated_at=now();

-- 2) Meta-Felder pro Karte (icon, link_1_href, link_1_enabled, is_placeholder, is_external)
WITH cards(group_key, item_key, icon, href, is_placeholder) AS (VALUES
  ('group_produktzugang','katalog',      'BookOpen',      '/service/online-produktkatalog','0'),
  ('group_produktzugang','finder',       'Search',        '',                              '1'),
  ('group_produktzugang','serien',       'Layers',        '',                              '1'),
  ('group_produktzugang','stammdaten',   'Database',      '',                              '1'),
  ('group_downloads','downloads',        'Download',      '/downloads',                    '0'),
  ('group_downloads','datenblaetter',    'FileText',      '/downloads',                    '0'),
  ('group_downloads','handbuecher',      'BookMarked',    '/downloads',                    '0'),
  ('group_downloads','schaltplaene',     'Network',       '/technischer-support',          '0'),
  ('group_downloads','technische',       'FolderOpen',    '/downloads',                    '0'),
  ('group_planung','planen',             'ClipboardList', '/planen-konfigurieren',         '0'),
  ('group_planung','ersatzteile',        'Wrench',        '/ersatzteile',                  '0'),
  ('group_support','support',            'Phone',         '/technischer-support',          '0'),
  ('group_support','faq',                'HelpCircle',    '/downloads',                    '0'),
  ('group_support','glossar',            'Type',          '',                              '1'),
  ('group_akademie','akademie',          'GraduationCap', '/wissen/akademie',              '0'),
  ('group_akademie','serviceportal',     'ShieldCheck',   '/serviceportal',                '0')
),
locales(loc) AS (VALUES ('de'),('en')),
meta(field_key, value_expr) AS (VALUES
  ('icon','icon'),
  ('link_1_href','href'),
  ('link_1_enabled','enabled'),
  ('is_placeholder','placeholder'),
  ('is_external','external')
)
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT
  'service.hub',
  c.group_key||'.'||c.item_key,
  m.field_key,
  l.loc,
  CASE m.field_key
    WHEN 'icon' THEN c.icon
    WHEN 'link_1_href' THEN c.href
    WHEN 'link_1_enabled' THEN CASE WHEN c.is_placeholder='1' OR c.href='' THEN '0' ELSE '1' END
    WHEN 'is_placeholder' THEN c.is_placeholder
    WHEN 'is_external' THEN '0'
  END
FROM cards c CROSS JOIN locales l CROSS JOIN meta m
ON CONFLICT (page_key,section_key,field_key,locale)
DO UPDATE SET value=EXCLUDED.value, updated_at=now();