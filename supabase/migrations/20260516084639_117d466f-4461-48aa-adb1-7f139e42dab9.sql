BEGIN;
DELETE FROM public.cms_admin_editable_fields WHERE page_key IN ('gebaeudekommunikation.tuersprechanlagen.kopie','gebaeudemanagement.root.kopie');
DELETE FROM public.cms_section_fields       WHERE page_key IN ('gebaeudekommunikation.tuersprechanlagen.kopie','gebaeudemanagement.root.kopie');
DELETE FROM public.cms_assets               WHERE page_key IN ('gebaeudekommunikation.tuersprechanlagen.kopie','gebaeudemanagement.root.kopie');
DELETE FROM public.cms_sections             WHERE page_key IN ('gebaeudekommunikation.tuersprechanlagen.kopie','gebaeudemanagement.root.kopie');
DELETE FROM public.cms_pages                WHERE page_key IN ('gebaeudekommunikation.tuersprechanlagen.kopie','gebaeudemanagement.root.kopie');
COMMIT;