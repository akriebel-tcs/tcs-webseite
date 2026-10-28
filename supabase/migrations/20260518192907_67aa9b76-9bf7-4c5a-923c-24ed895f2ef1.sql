-- Etappe catalog-series-thumbnails-cms-override-1
-- Idempotent: bei Wiederholung passiert nichts.

DO $$
DECLARE
  v_page_key text := 'produkte.tuerkommunikation';
  v_parent_id uuid;
  s record;
BEGIN
  -- 1) Container-Section für alle Serien-Overrides
  INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active)
  VALUES (v_page_key, 'series-overrides', 'series_override_container_v1', 9000, true)
  ON CONFLICT (page_key, section_key) DO NOTHING;

  SELECT id INTO v_parent_id
  FROM public.cms_sections
  WHERE page_key = v_page_key AND section_key = 'series-overrides';

  -- 2) Eine Kind-Section pro bekannter Serie aus der Produkt-DB.
  --    section_key = 'series-override.<normalized_slug>' (lower, " "/":"->"-")
  FOR s IN
    SELECT slug_key, label, sort_order FROM (VALUES
      ('pes',              'PES',              11),
      ('pes-pro',          'PES PRO',          10),
      ('pet',              'PET',              21),
      ('pet-pro',          'PET PRO',          20),
      ('puk',              'PUK',              30),
      ('pds',              'PDS',              31),
      ('pak',              'PAK',              32),
      ('pakl',             'PAKL',             33),
      ('carus-argos',      'Carus ARGOS',      41),
      ('carus-iris',       'Carus IRIS',       40),
      ('carus-adapto',     'Carus ADAPTO',    100),
      ('carus-origo',      'Carus ORIGO',     101),
      ('avu',              'AVU',              51),
      ('avu-v6d',          'AVU V6D',          50),
      ('ave-v6d',          'AVE V6D',          52),
      ('avd-v6d',          'AVD V6D',          53),
      ('avc-v6d',          'AVC V6D',          54),
      ('avc-v2d',          'AVC V2D',          55),
      ('asx',              'ASX',              60),
      ('adx5',             'ADX5',             61),
      ('ad6',              'AD6',              62),
      ('ad4',              'AD4',              63),
      ('tcu',              'TCU',              70),
      ('senso-pro',        'SENSO PRO',       105),
      ('isw',              'ISW',             110),
      ('ish',              'ISH',             111),
      ('ivh',              'IVH',             112),
      ('tasta-pro',        'TASTA PRO',       112),
      ('tasta',            'TASTA',           113),
      ('skyline-ten-pro',  'SKYLINE:TEN PRO', 115)
    ) AS v(slug_key, label, sort_order)
  LOOP
    INSERT INTO public.cms_sections
      (page_key, section_key, section_type, sort_order, is_active, parent_section_id)
    VALUES
      (v_page_key, 'series-override.' || s.slug_key, 'series_override_v1',
       s.sort_order, true, v_parent_id)
    ON CONFLICT (page_key, section_key) DO NOTHING;
  END LOOP;
END $$;

-- 3) Whitelist (cms_admin_editable_fields) für die pflegbaren Felder/Slots.
--    Pflicht laut Projektregel: jeder neue Slot braucht einen Whitelist-Eintrag.
INSERT INTO public.cms_admin_editable_fields
  (page_key, section_key, field_key, locale, is_enabled)
SELECT
  'produkte.tuerkommunikation',
  s.section_key,
  fld.field_key,
  loc.locale,
  true
FROM public.cms_sections s
CROSS JOIN (VALUES ('thumbnail'), ('sort_order_override')) AS fld(field_key)
CROSS JOIN (VALUES ('de'), ('en')) AS loc(locale)
WHERE s.page_key = 'produkte.tuerkommunikation'
  AND s.section_key LIKE 'series-override.%'
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;