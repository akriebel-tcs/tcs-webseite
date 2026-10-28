-- Live-Schaltung Bereich 1 (Gebäudekommunikation): 5 Seiten auf published+aktiv
UPDATE public.cms_pages
   SET status = 'published', is_active = true, updated_at = now()
 WHERE page_key IN (
   'gebaeudekommunikation.tuersprechanlagen',
   'gebaeudekommunikation.briefkastenanlagen',
   'gebaeudekommunikation.systemloesungen',
   'gebaeudekommunikation.grossanlagen',
   'gebaeudekommunikation.snipdoo-ip'
 );