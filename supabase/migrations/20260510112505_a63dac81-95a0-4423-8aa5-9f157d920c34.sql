-- =========================================================
-- 1. profiles
-- =========================================================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.cms_set_updated_at();

-- =========================================================
-- 2. roles
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'viewer');

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Rollencheck (rekursionsfrei, SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- =========================================================
-- 3. handle_new_user — Profil bei Sign-up automatisch anlegen
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email)
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- 4. claim_first_admin — Bootstrap (einmalig nutzbar)
-- =========================================================
CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _admin_exists BOOLEAN;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
    INTO _admin_exists;

  IF _admin_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'admin_already_exists');
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'admin')
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true, 'user_id', _uid, 'role', 'admin');
END;
$$;

REVOKE ALL ON FUNCTION public.claim_first_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;

-- =========================================================
-- 5. RLS-Policies
-- =========================================================

-- profiles
CREATE POLICY "profiles select own"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "profiles select admin"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "profiles update own"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- user_roles
CREATE POLICY "user_roles select own"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "user_roles select admin"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles insert admin"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles delete admin"
ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- 6. Bestehende Admin-RPCs härten: Admin-Rolle erforderlich
-- =========================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_update_navigation_label(
  p_node_id uuid,
  p_locale  text,
  p_value   text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
declare
  _rows int := 0;
  _normalized text;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    return jsonb_build_object(
      'success', false,
      'updated', false,
      'error', 'not_authorized'
    );
  end if;

  if p_locale not in ('de', 'en') then
    return jsonb_build_object(
      'success', false, 'updated', false,
      'error', 'locale_not_allowed',
      'node_id', p_node_id, 'locale', p_locale
    );
  end if;

  _normalized := nullif(btrim(coalesce(p_value, '')), '');

  if p_locale = 'de' then
    update public.cms_navigation_nodes
       set label_de = _normalized, updated_at = now()
     where id = p_node_id;
  else
    update public.cms_navigation_nodes
       set label_en = _normalized, updated_at = now()
     where id = p_node_id;
  end if;

  get diagnostics _rows = row_count;

  if _rows = 0 then
    return jsonb_build_object(
      'success', false, 'updated', false,
      'error', 'node_not_found',
      'node_id', p_node_id, 'locale', p_locale
    );
  end if;

  return jsonb_build_object(
    'success', true, 'updated', true,
    'node_id', p_node_id, 'locale', p_locale, 'value', _normalized
  );
end;
$function$;

REVOKE ALL ON FUNCTION public.rpc_admin_update_navigation_label(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_admin_update_navigation_label(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_admin_update_pilot_pflege_field(
  p_section_key text,
  p_field_key   text,
  p_locale      text,
  p_value       text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
declare
  _page_key constant text := 'anwendungen.pflege';
  _allowed boolean := false;
  _rows int := 0;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    return jsonb_build_object(
      'success', false, 'updated', false,
      'error', 'not_authorized'
    );
  end if;

  if (p_section_key = 'hero' and p_field_key = 'headline')
     or (p_section_key = 'hero' and p_field_key = 'intro')
     or (p_section_key = 'answer-first' and p_field_key = 'text')
     or (p_section_key = 'intro' and p_field_key = 'text')
  then
    _allowed := true;
  end if;

  if not _allowed then
    return jsonb_build_object(
      'success', false, 'updated', false,
      'error', 'field_not_allowed',
      'section_key', p_section_key, 'field_key', p_field_key, 'locale', p_locale
    );
  end if;

  if p_locale not in ('de', 'en') then
    return jsonb_build_object(
      'success', false, 'updated', false,
      'error', 'locale_not_allowed',
      'section_key', p_section_key, 'field_key', p_field_key, 'locale', p_locale
    );
  end if;

  update public.cms_section_fields
     set value = p_value, updated_at = now()
   where page_key = _page_key
     and section_key = p_section_key
     and field_key = p_field_key
     and locale = p_locale;

  get diagnostics _rows = row_count;

  if _rows = 0 then
    return jsonb_build_object(
      'success', false, 'updated', false,
      'error', 'row_not_found',
      'section_key', p_section_key, 'field_key', p_field_key, 'locale', p_locale
    );
  end if;

  return jsonb_build_object(
    'success', true, 'updated', true,
    'section_key', p_section_key, 'field_key', p_field_key, 'locale', p_locale
  );
end;
$function$;

REVOKE ALL ON FUNCTION public.rpc_admin_update_pilot_pflege_field(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_admin_update_pilot_pflege_field(text, text, text, text) TO authenticated;

-- Lese-RPCs bleiben für anon offen (sie liefern nur Diagnose-/Pilotdaten).
