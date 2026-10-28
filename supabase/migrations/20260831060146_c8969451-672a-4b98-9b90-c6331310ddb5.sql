CREATE TABLE IF NOT EXISTS public.cms_page_completion (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_path text NOT NULL UNIQUE,
  page_key text,
  status text NOT NULL DEFAULT 'none',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cms_page_completion_status_chk') THEN
    ALTER TABLE public.cms_page_completion
      ADD CONSTRAINT cms_page_completion_status_chk
      CHECK (status IN ('none','red','yellow','green'));
  END IF;
END $$;

GRANT SELECT ON public.cms_page_completion TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_page_completion TO authenticated;
GRANT ALL ON public.cms_page_completion TO service_role;

ALTER TABLE public.cms_page_completion ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='cms_page_completion'
      AND policyname='cms_page_completion public read'
  ) THEN
    CREATE POLICY "cms_page_completion public read"
      ON public.cms_page_completion FOR SELECT
      TO anon, authenticated USING (true);
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_cms_page_completion_updated_at ON public.cms_page_completion;
CREATE TRIGGER trg_cms_page_completion_updated_at
  BEFORE UPDATE ON public.cms_page_completion
  FOR EACH ROW EXECUTE FUNCTION public.cms_set_updated_at();

CREATE OR REPLACE FUNCTION public.rpc_admin_set_page_completion(
  p_route_path text,
  p_status text,
  p_page_key text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_route text := btrim(coalesce(p_route_path, ''));
  v_status text := lower(btrim(coalesce(p_status, 'none')));
BEGIN
  IF v_route = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'route_path_required');
  END IF;
  IF v_status NOT IN ('none','red','yellow','green') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status');
  END IF;

  INSERT INTO public.cms_page_completion (route_path, page_key, status)
  VALUES (v_route, nullif(btrim(coalesce(p_page_key,'')), ''), v_status)
  ON CONFLICT (route_path) DO UPDATE
    SET status = excluded.status,
        page_key = coalesce(excluded.page_key, public.cms_page_completion.page_key),
        updated_at = now();

  RETURN jsonb_build_object('success', true, 'route_path', v_route, 'status', v_status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_set_page_completion(text, text, text) TO anon, authenticated, service_role;