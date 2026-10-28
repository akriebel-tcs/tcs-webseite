ALTER TABLE public.cms_page_completion
  ADD COLUMN IF NOT EXISTS hours integer;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cms_page_completion_hours_chk') THEN
    ALTER TABLE public.cms_page_completion
      ADD CONSTRAINT cms_page_completion_hours_chk
      CHECK (hours IS NULL OR (hours >= 0 AND hours <= 99));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.rpc_admin_set_page_hours(
  p_route_path text,
  p_hours integer,
  p_page_key text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_route text := btrim(coalesce(p_route_path, ''));
BEGIN
  IF v_route = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'route_path_required');
  END IF;
  IF p_hours IS NOT NULL AND (p_hours < 0 OR p_hours > 99) THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_hours');
  END IF;

  INSERT INTO public.cms_page_completion (route_path, page_key, hours)
  VALUES (v_route, nullif(btrim(coalesce(p_page_key,'')), ''), p_hours)
  ON CONFLICT (route_path) DO UPDATE
    SET hours = excluded.hours,
        page_key = coalesce(excluded.page_key, public.cms_page_completion.page_key),
        updated_at = now();

  RETURN jsonb_build_object('success', true, 'route_path', v_route, 'hours', p_hours);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_set_page_hours(text, integer, text) TO anon, authenticated, service_role;