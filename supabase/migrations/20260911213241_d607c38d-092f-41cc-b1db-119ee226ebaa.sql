REVOKE ALL ON FUNCTION public.cms_autopilot_trg_section_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cms_autopilot_trg_pages() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cms_autopilot_trg_nav() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cms_autopilot_trg_assets() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_next_batch(uuid, integer) FROM PUBLIC, anon, authenticated;