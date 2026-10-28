-- Batch 22 Pilot service.hub Part 1/3: 5 Karten-Gruppen + 16 Karten-Kinder (cms_sections, idempotent)
INSERT INTO cms_sections (page_key,section_key,section_type,sort_order,is_active,parent_section_id) VALUES
('service.hub','group_produktzugang','cards_v1',20,true,NULL),
('service.hub','group_downloads','cards_v1',30,true,NULL),
('service.hub','group_planung','cards_v1',40,true,NULL),
('service.hub','group_support','cards_v1',50,true,NULL),
('service.hub','group_akademie','cards_v1',60,true,NULL)
ON CONFLICT (page_key,section_key) DO UPDATE SET section_type=EXCLUDED.section_type, sort_order=EXCLUDED.sort_order, is_active=true, updated_at=now();

INSERT INTO cms_sections (page_key,section_key,section_type,sort_order,is_active,parent_section_id) VALUES
('service.hub','group_produktzugang.katalog','card_v1',10,true,(SELECT id FROM cms_sections WHERE page_key='service.hub' AND section_key='group_produktzugang')),
('service.hub','group_produktzugang.finder','card_v1',20,true,(SELECT id FROM cms_sections WHERE page_key='service.hub' AND section_key='group_produktzugang')),
('service.hub','group_produktzugang.serien','card_v1',30,true,(SELECT id FROM cms_sections WHERE page_key='service.hub' AND section_key='group_produktzugang')),
('service.hub','group_produktzugang.stammdaten','card_v1',40,true,(SELECT id FROM cms_sections WHERE page_key='service.hub' AND section_key='group_produktzugang'))
ON CONFLICT (page_key,section_key) DO UPDATE SET section_type=EXCLUDED.section_type, sort_order=EXCLUDED.sort_order, is_active=true, parent_section_id=EXCLUDED.parent_section_id, updated_at=now();

INSERT INTO cms_sections (page_key,section_key,section_type,sort_order,is_active,parent_section_id) VALUES
('service.hub','group_downloads.downloads','card_v1',10,true,(SELECT id FROM cms_sections WHERE page_key='service.hub' AND section_key='group_downloads')),
('service.hub','group_downloads.datenblaetter','card_v1',20,true,(SELECT id FROM cms_sections WHERE page_key='service.hub' AND section_key='group_downloads')),
('service.hub','group_downloads.handbuecher','card_v1',30,true,(SELECT id FROM cms_sections WHERE page_key='service.hub' AND section_key='group_downloads')),
('service.hub','group_downloads.schaltplaene','card_v1',40,true,(SELECT id FROM cms_sections WHERE page_key='service.hub' AND section_key='group_downloads')),
('service.hub','group_downloads.technische','card_v1',50,true,(SELECT id FROM cms_sections WHERE page_key='service.hub' AND section_key='group_downloads'))
ON CONFLICT (page_key,section_key) DO UPDATE SET section_type=EXCLUDED.section_type, sort_order=EXCLUDED.sort_order, is_active=true, parent_section_id=EXCLUDED.parent_section_id, updated_at=now();

INSERT INTO cms_sections (page_key,section_key,section_type,sort_order,is_active,parent_section_id) VALUES
('service.hub','group_planung.planen','card_v1',10,true,(SELECT id FROM cms_sections WHERE page_key='service.hub' AND section_key='group_planung')),
('service.hub','group_planung.ersatzteile','card_v1',20,true,(SELECT id FROM cms_sections WHERE page_key='service.hub' AND section_key='group_planung'))
ON CONFLICT (page_key,section_key) DO UPDATE SET section_type=EXCLUDED.section_type, sort_order=EXCLUDED.sort_order, is_active=true, parent_section_id=EXCLUDED.parent_section_id, updated_at=now();

INSERT INTO cms_sections (page_key,section_key,section_type,sort_order,is_active,parent_section_id) VALUES
('service.hub','group_support.support','card_v1',10,true,(SELECT id FROM cms_sections WHERE page_key='service.hub' AND section_key='group_support')),
('service.hub','group_support.faq','card_v1',20,true,(SELECT id FROM cms_sections WHERE page_key='service.hub' AND section_key='group_support')),
('service.hub','group_support.glossar','card_v1',30,true,(SELECT id FROM cms_sections WHERE page_key='service.hub' AND section_key='group_support'))
ON CONFLICT (page_key,section_key) DO UPDATE SET section_type=EXCLUDED.section_type, sort_order=EXCLUDED.sort_order, is_active=true, parent_section_id=EXCLUDED.parent_section_id, updated_at=now();

INSERT INTO cms_sections (page_key,section_key,section_type,sort_order,is_active,parent_section_id) VALUES
('service.hub','group_akademie.akademie','card_v1',10,true,(SELECT id FROM cms_sections WHERE page_key='service.hub' AND section_key='group_akademie')),
('service.hub','group_akademie.serviceportal','card_v1',20,true,(SELECT id FROM cms_sections WHERE page_key='service.hub' AND section_key='group_akademie'))
ON CONFLICT (page_key,section_key) DO UPDATE SET section_type=EXCLUDED.section_type, sort_order=EXCLUDED.sort_order, is_active=true, parent_section_id=EXCLUDED.parent_section_id, updated_at=now();

UPDATE cms_sections SET is_active=false, sort_order=99, updated_at=now() WHERE page_key='service.hub' AND section_key='sections';
UPDATE cms_sections SET sort_order=100, updated_at=now() WHERE page_key='service.hub' AND section_key='standard_cta';