
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
VALUES
  ('zutrittskontrolle.root','teaser_fahrstuhlsteuerung','cta_label','de','Mehr erfahren'),
  ('zutrittskontrolle.root','teaser_fahrstuhlsteuerung','cta_label','en','Learn more'),
  ('zutrittskontrolle.root','teaser_fahrstuhlsteuerung','cta_link','de','/zutrittskontrolle/fahrstuhlsteuerung'),
  ('zutrittskontrolle.root','teaser_fahrstuhlsteuerung','cta_link','en','/zutrittskontrolle/fahrstuhlsteuerung'),
  ('zutrittskontrolle.root','teaser_mobile_door_app','cta_label','de','Mehr erfahren'),
  ('zutrittskontrolle.root','teaser_mobile_door_app','cta_label','en','Learn more'),
  ('zutrittskontrolle.root','teaser_mobile_door_app','cta_link','de','/zutrittskontrolle/mobiler-zutritt'),
  ('zutrittskontrolle.root','teaser_mobile_door_app','cta_link','en','/zutrittskontrolle/mobiler-zutritt'),
  ('zutrittskontrolle.root','teaser_schliesssysteme','cta_label','de','Mehr erfahren'),
  ('zutrittskontrolle.root','teaser_schliesssysteme','cta_label','en','Learn more'),
  ('zutrittskontrolle.root','teaser_schliesssysteme','cta_link','de','/gebaeudemanagement/schraenke-behaelter'),
  ('zutrittskontrolle.root','teaser_schliesssysteme','cta_link','en','/gebaeudemanagement/schraenke-behaelter')
ON CONFLICT (page_key, section_key, field_key, locale)
DO UPDATE SET value = EXCLUDED.value, updated_at = now();
