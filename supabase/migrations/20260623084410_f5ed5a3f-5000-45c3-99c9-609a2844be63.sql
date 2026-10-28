SELECT public.rpc_admin_upsert_asset(
  p_page_key => 'anwendungen.gesundheitseinrichtungen',
  p_section_key => 'card_pflege',
  p_field_key => 'image',
  p_storage_path => 'anwendungen.gesundheitseinrichtungen/card_pflege/image/desktop/Web_Teaser_Bildformat_1812x1360_Pflege.jpg',
  p_public_url => 'https://uvkubrrljyzfvbvejepl.supabase.co/storage/v1/object/public/cms-assets/anwendungen.gesundheitseinrichtungen/card_pflege/image/desktop/Web_Teaser_Bildformat_1812x1360_Pflege.jpg',
  p_file_name => 'Web_Teaser_Bildformat_1812x1360_Pflege.jpg',
  p_mime_type => 'image/jpeg',
  p_asset_role => 'image',
  p_viewport => 'desktop'
);

UPDATE public.cms_assets
SET alt_de = COALESCE(NULLIF(alt_de,''), 'Außenansicht eines Wohnstifts mit Bewohner am Rollator und Pflegekraft im Garten'),
    alt_en = COALESCE(NULLIF(alt_en,''), 'Outdoor view of an assisted-living facility with resident on a rollator and caregiver in the garden')
WHERE page_key='anwendungen.gesundheitseinrichtungen' AND section_key='card_pflege' AND field_key='image';