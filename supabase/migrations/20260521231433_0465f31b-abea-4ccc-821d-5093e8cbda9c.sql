-- Etappe I: public/catalog Bilder nach cms-assets Storage migrieren
-- Idempotent: setzt nur, wenn der Eintrag noch auf /catalog/... zeigt
-- ODER bereits auf den neuen Storage-Pfad zeigt (no-op bei erneutem Lauf).

DO $$
DECLARE
  v_base text := 'https://uvkubrrljyzfvbvejepl.supabase.co/storage/v1/object/public/cms-assets/produkte.tuerkommunikation%2Ffilter-grid.';
BEGIN
  -- ami-module
  UPDATE cms_assets
    SET storage_path = 'produkte.tuerkommunikation/filter-grid.ami-module/thumbnail/desktop/ami-module.jpg',
        public_url   = v_base || 'ami-module%2Fthumbnail%2Fdesktop%2Fami-module.jpg',
        updated_at   = now()
    WHERE page_key='produkte.tuerkommunikation'
      AND section_key='filter-grid.ami-module'
      AND field_key='thumbnail'
      AND viewport='desktop'
      AND is_active=true
      AND public_url <> v_base || 'ami-module%2Fthumbnail%2Fdesktop%2Fami-module.jpg';

  -- mobile-tuerkommunikation
  UPDATE cms_assets
    SET storage_path = 'produkte.tuerkommunikation/filter-grid.mobile-tuerkommunikation/thumbnail/desktop/mobile-tuerkommunikation.jpg',
        public_url   = v_base || 'mobile-tuerkommunikation%2Fthumbnail%2Fdesktop%2Fmobile-tuerkommunikation.jpg',
        updated_at   = now()
    WHERE page_key='produkte.tuerkommunikation'
      AND section_key='filter-grid.mobile-tuerkommunikation'
      AND field_key='thumbnail'
      AND viewport='desktop'
      AND is_active=true
      AND public_url <> v_base || 'mobile-tuerkommunikation%2Fthumbnail%2Fdesktop%2Fmobile-tuerkommunikation.jpg';

  -- netzgeraete-versorgung
  UPDATE cms_assets
    SET storage_path = 'produkte.tuerkommunikation/filter-grid.netzgeraete-versorgung/thumbnail/desktop/netzgeraete-versorgung.jpg',
        public_url   = v_base || 'netzgeraete-versorgung%2Fthumbnail%2Fdesktop%2Fnetzgeraete-versorgung.jpg',
        updated_at   = now()
    WHERE page_key='produkte.tuerkommunikation'
      AND section_key='filter-grid.netzgeraete-versorgung'
      AND field_key='thumbnail'
      AND viewport='desktop'
      AND is_active=true
      AND public_url <> v_base || 'netzgeraete-versorgung%2Fthumbnail%2Fdesktop%2Fnetzgeraete-versorgung.jpg';

  -- zubehoer-montage
  UPDATE cms_assets
    SET storage_path = 'produkte.tuerkommunikation/filter-grid.zubehoer-montage/thumbnail/desktop/zubehoer-montage.jpg',
        public_url   = v_base || 'zubehoer-montage%2Fthumbnail%2Fdesktop%2Fzubehoer-montage.jpg',
        updated_at   = now()
    WHERE page_key='produkte.tuerkommunikation'
      AND section_key='filter-grid.zubehoer-montage'
      AND field_key='thumbnail'
      AND viewport='desktop'
      AND is_active=true
      AND public_url <> v_base || 'zubehoer-montage%2Fthumbnail%2Fdesktop%2Fzubehoer-montage.jpg';

  -- zutrittskontrolle-bcm
  UPDATE cms_assets
    SET storage_path = 'produkte.tuerkommunikation/filter-grid.zutrittskontrolle-bcm/thumbnail/desktop/zutrittskontrolle-bcm.jpg',
        public_url   = v_base || 'zutrittskontrolle-bcm%2Fthumbnail%2Fdesktop%2Fzutrittskontrolle-bcm.jpg',
        updated_at   = now()
    WHERE page_key='produkte.tuerkommunikation'
      AND section_key='filter-grid.zutrittskontrolle-bcm'
      AND field_key='thumbnail'
      AND viewport='desktop'
      AND is_active=true
      AND public_url <> v_base || 'zutrittskontrolle-bcm%2Fthumbnail%2Fdesktop%2Fzutrittskontrolle-bcm.jpg';
END $$;