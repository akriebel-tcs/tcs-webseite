-- Etappe E2: Home-CTA-Link befüllen
-- Bisher war `cta_href` auf home.start/cta leer (DE+EN). Der Public-Renderer
-- CtaV1 verlangt aber title + cta_label + cta_href, sonst wird der Block
-- komplett ausgeblendet (= leere Home-Page-CTA). Wir setzen den Standard-
-- Link `/kontakt` als Default ein. Idempotent: nur überschreiben, wenn der
-- Wert noch leer/NULL ist.
UPDATE public.cms_section_fields
   SET value = '/kontakt',
       updated_at = now()
 WHERE page_key = 'home.start'
   AND section_key = 'cta'
   AND field_key = 'cta_href'
   AND (value IS NULL OR value = '');