ALTER FUNCTION public.rpc_internal_translation_coverage() SET statement_timeout = '120s';
ALTER FUNCTION public.rpc_internal_translation_dry_run(text, text[]) SET statement_timeout = '60s';
ALTER FUNCTION public.rpc_internal_translation_qa(text, text[], integer) SET statement_timeout = '60s';
ALTER FUNCTION public.rpc_internal_translation_next_batch(uuid, integer) SET statement_timeout = '60s';