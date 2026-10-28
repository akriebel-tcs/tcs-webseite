
-- Fix linter: search_path mutable
create or replace function public.cms_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Fix linter: SECURITY DEFINER unnötig (RLS auf cms_pages reicht), -> INVOKER
create or replace function public.cms_page_is_public(_page_key text)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.cms_pages
    where page_key = _page_key
      and status = 'published'
      and is_active = true
  )
$$;
