-- Etappe J.4: Hero-Doppelfeld bereinigen + Reorder-RPC für Sections.
--
-- 1) hero.image_alt entfernen: Alt-Texte werden direkt am Asset gepflegt
--    (cms_assets.alt_de/alt_en). Das separate Section-Feld war eine
--    Dopplung. Idempotent.
DELETE FROM public.cms_admin_editable_fields
 WHERE page_key = 'home.start'
   AND section_key = 'hero'
   AND field_key = 'image_alt';

DELETE FROM public.cms_section_fields
 WHERE page_key = 'home.start'
   AND section_key = 'hero'
   AND field_key = 'image_alt';

-- 2) Reorder-RPC: tauscht sort_order zweier Nachbar-Sections derselben Seite.
--    Whitelist nur für home.start.block_* (Schritt-für-Schritt-Freigabe).
CREATE OR REPLACE FUNCTION public.rpc_admin_reorder_section(
  p_page_key   text,
  p_section_key text,
  p_direction  text  -- 'up' | 'down'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _self   public.cms_sections%ROWTYPE;
  _other  public.cms_sections%ROWTYPE;
  _tmp    int;
BEGIN
  IF p_direction NOT IN ('up','down') THEN
    RETURN jsonb_build_object('success', false, 'error', 'direction_invalid');
  END IF;

  -- Whitelist: vorerst nur home.start (alle Sections der Startseite).
  IF p_page_key <> 'home.start' THEN
    RETURN jsonb_build_object('success', false, 'error', 'page_not_allowed', 'page_key', p_page_key);
  END IF;

  SELECT * INTO _self
    FROM public.cms_sections
   WHERE page_key = p_page_key
     AND section_key = p_section_key
     AND is_active = true;
  IF _self.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'section_not_found');
  END IF;

  IF p_direction = 'up' THEN
    SELECT * INTO _other
      FROM public.cms_sections
     WHERE page_key = p_page_key
       AND is_active = true
       AND sort_order < _self.sort_order
     ORDER BY sort_order DESC
     LIMIT 1;
  ELSE
    SELECT * INTO _other
      FROM public.cms_sections
     WHERE page_key = p_page_key
       AND is_active = true
       AND sort_order > _self.sort_order
     ORDER BY sort_order ASC
     LIMIT 1;
  END IF;

  IF _other.id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'noop', true, 'reason', 'edge');
  END IF;

  -- Tausch über Zwischenwert (sort_order ist nicht UNIQUE, aber sauber).
  _tmp := _self.sort_order;
  UPDATE public.cms_sections SET sort_order = _other.sort_order, updated_at = now() WHERE id = _self.id;
  UPDATE public.cms_sections SET sort_order = _tmp,            updated_at = now() WHERE id = _other.id;

  RETURN jsonb_build_object(
    'success', true,
    'page_key', p_page_key,
    'moved', p_section_key,
    'swapped_with', _other.section_key,
    'new_sort_order', _other.sort_order
  );
END;
$$;