-- Etappe: Block-ID (B-…) im Admin-Baum prominent zeigen.
-- Erweitert die Lese-RPC um `section_uid`, damit das Frontend die stabile
-- Identitätsnummer ohne Zusatzabfrage anzeigen kann. Idempotent (CREATE OR REPLACE).
CREATE OR REPLACE FUNCTION public.rpc_admin_read_page_sections(p_page_key text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'page_key', s.page_key,
        'section_key', s.section_key,
        'section_type', s.section_type,
        'section_no', s.section_no,
        'section_uid', s.section_uid,
        'sort_order', s.sort_order,
        'is_active', s.is_active,
        'updated_at', s.updated_at
      )
      ORDER BY s.sort_order, s.section_key
    ),
    '[]'::jsonb
  )
  FROM public.cms_sections s
  WHERE s.page_key = p_page_key;
$$;