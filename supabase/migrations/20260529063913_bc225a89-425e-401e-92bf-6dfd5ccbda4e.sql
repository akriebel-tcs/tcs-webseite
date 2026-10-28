-- Sprint 2j: R2-Strukturmigration zutrittskontrolle + presse + signage
-- Reine, idempotente Typkorrektur content_v1 -> cards_v1 auf 5 Parent-Containern.
-- Renderer-Beweis: alle 5 Page-Komponenten lesen Kinder ausschließlich über
-- parent_section_key + section_type='card_v1'. Parent-Typ wird im JSX nicht
-- abgefragt. Keine Felder, Assets, Whitelist, Sortierung, Aktivierung
-- werden verändert. Public-Layout vorher = nachher.

UPDATE public.cms_sections
SET section_type = 'cards_v1', updated_at = now()
WHERE section_type = 'content_v1'
  AND is_active = true
  AND (page_key, section_key) IN (
    ('presse.root', 'releases'),
    ('signage.root', 'products'),
    ('zutrittskontrolle.fahrstuhlsteuerung', 'benefits'),
    ('zutrittskontrolle.mobiler-zutritt', 'benefits'),
    ('zutrittskontrolle.zufahrten-parkplaetze', 'benefits')
  );