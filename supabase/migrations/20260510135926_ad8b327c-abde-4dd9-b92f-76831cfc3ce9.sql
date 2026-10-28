-- cms-light-admin-write-scope-checkpoint-1
-- Additive Spalte: Sichtbarkeit in der späteren öffentlichen DB-Navigation.
-- Hat aktuell KEINE Wirkung — Public-Navigation wird weiterhin aus Code gerendert.
-- Wird vor Etappe F (Site liest Navigation aus DB) als Filter genutzt.

ALTER TABLE public.cms_navigation_nodes
  ADD COLUMN IF NOT EXISTS show_in_public_nav boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.cms_navigation_nodes.show_in_public_nav IS
  'Sichtbarkeitsflag für die spätere DB-getriebene öffentliche Navigation (Etappe F). Aktuell ohne Wirkung auf die Live-Site, weil die Public-Navigation noch codebasiert ist. Default true; explizit auf false zu setzen, wenn ein Knoten reiner Admin-Strukturknoten ist (z. B. node_key=''home'' während der Übergangsphase).';