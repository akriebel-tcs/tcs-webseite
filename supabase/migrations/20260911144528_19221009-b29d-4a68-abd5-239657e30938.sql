-- Schmaler Aufrufweg für die Edge Function (nur service_role).
CREATE OR REPLACE FUNCTION public.rpc_internal_rate_limit_hit(
  p_bucket text,
  p_subject text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS jsonb
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public, cms_internal, pg_temp
AS $$
  SELECT cms_internal.rate_limit_hit(p_bucket, p_subject, p_limit, p_window_seconds);
$$;

REVOKE ALL ON FUNCTION public.rpc_internal_rate_limit_hit(text, text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_internal_rate_limit_hit(text, text, integer, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_internal_rate_limit_hit(text, text, integer, integer) TO service_role;