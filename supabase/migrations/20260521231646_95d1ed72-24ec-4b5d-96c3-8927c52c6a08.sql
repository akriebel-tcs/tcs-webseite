DELETE FROM cms_assets
WHERE page_key = 'produkte.tuerkommunikation'
  AND section_key IN (
    'filter-grid.aussenstationen',
    'filter-grid.innenstationen',
    'filter-grid.vorkonfigurierte-pakete'
  )
  AND is_active = false
  AND public_url LIKE '/catalog/%';