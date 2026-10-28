UPDATE public.cms_navigation_nodes
SET label = 'Türsprechanlagen mit Zusatzfunktion',
    label_de = 'Türsprechanlagen mit Zusatzfunktion',
    label_en = COALESCE(label_en, 'Door intercom systems with additional functions'),
    updated_at = now()
WHERE node_no = 65;