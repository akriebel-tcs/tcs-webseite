REVOKE EXECUTE ON FUNCTION public.cms_card_v1_seed_whitelist() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cms_card_v1_seed_whitelist() TO service_role;