-- 1) Tote Pilot-RPC entfernen
DROP FUNCTION IF EXISTS public.rpc_admin_update_pilot_pflege_field(text, text, text, text);
DROP FUNCTION IF EXISTS public.rpc_admin_update_pilot_pflege_field(text, text, text);

-- 2) Nav-Knoten auf die Inhaltsseite umhängen
UPDATE public.cms_navigation_nodes
   SET page_key = 'kontakt-bcm.root', updated_at = now()
 WHERE page_key = 'kontakt.bcm';

-- 3) Leere Dublette löschen (RPC umgeht RLS und prüft Nav-Referenzen)
DO $$
DECLARE _result jsonb;
BEGIN
  SELECT public.rpc_admin_delete_page('kontakt.bcm') INTO _result;
  RAISE NOTICE 'delete kontakt.bcm: %', _result;
END $$;