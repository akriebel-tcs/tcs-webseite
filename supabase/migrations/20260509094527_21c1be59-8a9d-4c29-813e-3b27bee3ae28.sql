
-- CMS-Light Schema (cms-light-pilot-schema-1)
-- Strikt getrennt von der externen Produktdatenbank.
-- Nur für redaktionelle Webseiteninhalte.

-- 1. cms_pages
create table public.cms_pages (
  id uuid primary key default gen_random_uuid(),
  page_key text unique not null,
  route_path text null,
  page_type text not null,
  title_de text null,
  title_en text null,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. cms_sections
create table public.cms_sections (
  id uuid primary key default gen_random_uuid(),
  page_key text not null references public.cms_pages(page_key) on delete cascade,
  section_key text not null,
  section_type text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page_key, section_key)
);

-- 3. cms_section_fields
create table public.cms_section_fields (
  id uuid primary key default gen_random_uuid(),
  page_key text not null,
  section_key text not null,
  field_key text not null,
  locale text not null check (locale in ('de','en')),
  value text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page_key, section_key, field_key, locale)
);

-- 4. cms_assets
create table public.cms_assets (
  id uuid primary key default gen_random_uuid(),
  page_key text not null,
  section_key text not null,
  asset_role text not null,
  locale text null check (locale is null or locale in ('de','en')),
  storage_path text null,
  public_url text null,
  alt_text_de text null,
  alt_text_en text null,
  focal_x numeric null,
  focal_y numeric null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indizes für Joins über page_key/section_key
create index cms_sections_page_key_idx on public.cms_sections(page_key);
create index cms_section_fields_page_section_idx on public.cms_section_fields(page_key, section_key);
create index cms_assets_page_section_idx on public.cms_assets(page_key, section_key);

-- updated_at Trigger
create or replace function public.cms_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger cms_pages_set_updated_at before update on public.cms_pages
  for each row execute function public.cms_set_updated_at();
create trigger cms_sections_set_updated_at before update on public.cms_sections
  for each row execute function public.cms_set_updated_at();
create trigger cms_section_fields_set_updated_at before update on public.cms_section_fields
  for each row execute function public.cms_set_updated_at();
create trigger cms_assets_set_updated_at before update on public.cms_assets
  for each row execute function public.cms_set_updated_at();

-- Security definer helper: ist die Seite zu page_key öffentlich sichtbar?
create or replace function public.cms_page_is_public(_page_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.cms_pages
    where page_key = _page_key
      and status = 'published'
      and is_active = true
  )
$$;

-- RLS aktivieren
alter table public.cms_pages enable row level security;
alter table public.cms_sections enable row level security;
alter table public.cms_section_fields enable row level security;
alter table public.cms_assets enable row level security;

-- Lese-Policies: nur veröffentlicht + aktiv (für anon und authenticated)
create policy "cms_pages public read published"
  on public.cms_pages for select
  to anon, authenticated
  using (status = 'published' and is_active = true);

create policy "cms_sections public read published"
  on public.cms_sections for select
  to anon, authenticated
  using (is_active = true and public.cms_page_is_public(page_key));

create policy "cms_section_fields public read published"
  on public.cms_section_fields for select
  to anon, authenticated
  using (public.cms_page_is_public(page_key));

create policy "cms_assets public read published"
  on public.cms_assets for select
  to anon, authenticated
  using (is_active = true and public.cms_page_is_public(page_key));

-- KEINE Insert/Update/Delete-Policies. Schreibrechte folgen in einer
-- späteren Etappe (cms-light-admin-security-1 / cms-light-admin-minimal-1).

-- Vorbereitender Draft-Datensatz für die Pilotseite (nicht öffentlich sichtbar)
insert into public.cms_pages (page_key, route_path, page_type, title_de, title_en, status, is_active)
values ('anwendungen.pflege', '/anwendungen/pflege', 'T05', 'Pflege', 'Care', 'draft', false);
