-- Etappe: cms-light-seitentyp-zuordnung-und-anzeige-1
-- Zutrittskontrolle.root ist inhaltlich ein Bereichs-Hub (Hero · Intro · Wechselteaser)
-- analog zu Eingangssysteme.root / Gebäudekommunikation.root / Gebäudemanagement.root.
-- Diese sind alle T03 — Zutrittskontrolle steht aber irrtümlich auf T04.
-- Korrektur, damit die Seitentypen-Logik konsistent ist.
-- Idempotent: nur ändern, wenn der Soll-Zustand noch nicht erreicht ist.
UPDATE public.cms_pages
SET page_type = 'T03', updated_at = now()
WHERE page_key = 'zutrittskontrolle.root'
  AND page_type <> 'T03';