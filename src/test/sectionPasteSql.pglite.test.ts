// @vitest-environment node
/**
 * TATSÄCHLICH AUSGEFÜHRTE Prüfung des SQL-Entwurfs für die Einzelbaustein-/
 * Unterbaum-Kopie (Etappe 3B).
 *
 * Der SQL-Block wird direkt aus dem Entwurfsdokument gelesen und in eine
 * isolierte Datenbank (PGlite, echtes PostgreSQL im Prozess) eingespielt.
 * Zusätzlich wird der bereits installierte Etappe-3A-Block eingespielt, damit
 * die Trigger mit der Kopie-Kennung real vorhanden sind. Ausschließlich
 * künstliche Testdaten, keine Verbindung zur laufenden Datenbank, keine
 * Migration, kein Deployment.
 *
 * Tabellen, Constraints, Indizes und Trigger sind aus der Live-Datenbank
 * abgeleitet; `cms_resequence_sections_dfs` und `cms_renumber_sections` sind
 * die REALEN Live-Fassungen. Der Autopilot ist durch eine beobachtbare
 * Testfunktion ersetzt.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

const DRAFT_3B = "docs/04-betrieb/sql-entwurf-baustein-kopie-2026-09-15.md";
const DRAFT_3A = "docs/04-betrieb/sql-entwurf-seitenkopie-2026-09-14.md";

function draftSql(file: string): string {
  const text = readFileSync(resolve(process.cwd(), file), "utf8");
  const match = text.match(/```sql\n([\s\S]*?)\n```/);
  if (!match) throw new Error(`SQL-Block nicht gefunden: ${file}`);
  return match[1];
}

const SCHEMA = `
CREATE TABLE public.cms_locales (
  locale text PRIMARY KEY,
  label_de text NOT NULL,
  label_native text NOT NULL,
  is_source boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT false,
  is_public boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 100
);

CREATE TABLE public.cms_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text NOT NULL UNIQUE,
  route_path text,
  page_type text NOT NULL,
  title_de text,
  title_en text,
  title_pl text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status = ANY (ARRAY['draft','published','archived'])),
  is_active boolean NOT NULL DEFAULT false,
  page_no serial UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cms_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text NOT NULL REFERENCES public.cms_pages(page_key) ON DELETE CASCADE,
  section_key text NOT NULL,
  section_type text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  section_no integer,
  section_uid serial NOT NULL,
  parent_section_id uuid REFERENCES public.cms_sections(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page_key, section_key)
);

CREATE TABLE public.cms_section_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text NOT NULL,
  section_key text NOT NULL,
  field_key text NOT NULL,
  locale text NOT NULL,
  value text,
  value_json jsonb,
  review_status text NOT NULL DEFAULT 'geprueft'
    CHECK (review_status = ANY (ARRAY['geprueft','maschinell','maschinell_veraltet'])),
  source_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page_key, section_key, field_key, locale),
  FOREIGN KEY (page_key, section_key)
    REFERENCES public.cms_sections(page_key, section_key) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE public.cms_admin_editable_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text NOT NULL,
  section_key text NOT NULL,
  field_key text NOT NULL,
  locale text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cms_admin_editable_fields_unique UNIQUE (page_key, section_key, field_key, locale)
);

CREATE TABLE public.cms_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text NOT NULL,
  section_key text NOT NULL,
  asset_role text NOT NULL,
  locale text,
  storage_path text NOT NULL,
  public_url text,
  alt_text_de text,
  alt_text_en text,
  alt_text_pl text,
  focal_x numeric,
  focal_y numeric,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  field_key text,
  file_name text,
  mime_type text,
  alt_de text,
  alt_en text,
  alt_pl text,
  asset_no serial NOT NULL,
  viewport text NOT NULL DEFAULT 'desktop'
    CHECK (viewport = ANY (ARRAY['mobile','tablet','desktop'])),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX cms_assets_active_slot_idx
  ON public.cms_assets (page_key, section_key, field_key, viewport) WHERE is_active;

CREATE TABLE public.cms_asset_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.cms_assets(id) ON DELETE CASCADE,
  locale text NOT NULL REFERENCES public.cms_locales(locale) ON UPDATE CASCADE,
  alt_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (asset_id, locale)
);

CREATE TABLE public.cms_page_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.cms_pages(id) ON DELETE CASCADE,
  locale text NOT NULL REFERENCES public.cms_locales(locale) ON UPDATE CASCADE,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page_id, locale)
);

CREATE TABLE public.cms_navigation_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nav_area text NOT NULL
    CHECK (nav_area = ANY (ARRAY['home','main','meta','footer','footer_bottom','persona'])),
  node_key text NOT NULL,
  parent_id uuid REFERENCES public.cms_navigation_nodes(id) ON DELETE CASCADE,
  page_key text,
  label text,
  route_path text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  label_de text, label_en text, label_pl text,
  description_de text, description_en text, description_pl text,
  node_type text NOT NULL DEFAULT 'page',
  external_url text,
  show_in_public_nav boolean NOT NULL DEFAULT true,
  node_no serial NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (nav_area, node_key)
);

CREATE TABLE public.cms_navigation_node_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid NOT NULL REFERENCES public.cms_navigation_nodes(id) ON DELETE CASCADE,
  locale text NOT NULL REFERENCES public.cms_locales(locale) ON UPDATE CASCADE,
  label text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (node_id, locale)
);

CREATE TABLE public.cms_translation_unit_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area text NOT NULL,
  ref_key text NOT NULL,
  unit_key text NOT NULL,
  locale text NOT NULL,
  review_status text NOT NULL DEFAULT 'geprueft',
  source_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (area, ref_key, unit_key, locale)
);

-- Fallen fuer unqualifizierte Arbeitsnamen: gleichnamige DAUERHAFTE Tabellen.
CREATE TABLE public._paste_key_map (sentinel text);
CREATE TABLE public._paste_fields (sentinel text);
CREATE TABLE public._paste_whitelist (sentinel text);
CREATE TABLE public._paste_assets (sentinel text);
CREATE TABLE public._paste_asset_tr (sentinel text);
CREATE TABLE public._paste_states (sentinel text);
CREATE TABLE public._paste_asset_map (sentinel text);
CREATE TABLE public._dup_sections (sentinel text);
CREATE TABLE public._dup_fields (sentinel text);
CREATE TABLE public._dup_whitelist (sentinel text);
CREATE TABLE public._dup_assets (sentinel text);
CREATE TABLE public._dup_asset_tr (sentinel text);
CREATE TABLE public._dup_page_tr (sentinel text);
CREATE TABLE public._dup_states (sentinel text);
CREATE TABLE public._dup_map (sentinel text);
CREATE TABLE public._dup_asset_map (sentinel text);
INSERT INTO public._paste_key_map VALUES ('bleibt');
INSERT INTO public._paste_fields VALUES ('bleibt');
INSERT INTO public._paste_whitelist VALUES ('bleibt');
INSERT INTO public._paste_assets VALUES ('bleibt');
INSERT INTO public._paste_asset_tr VALUES ('bleibt');
INSERT INTO public._paste_states VALUES ('bleibt');
INSERT INTO public._paste_asset_map VALUES ('bleibt');

CREATE TABLE public.test_autopilot_log (
  id serial PRIMARY KEY,
  area text,
  page_key text,
  unit_key text
);

CREATE FUNCTION public.cms_translation_normalize(p_text text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT lower(btrim(regexp_replace(coalesce(p_text, ''), '\\s+', ' ', 'g')))
$$;

CREATE FUNCTION public.cms_autopilot_enqueue_unit(
  p_area text, p_ref_id uuid, p_page_key text, p_section_key text,
  p_unit_key text, p_source_text text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.test_autopilot_log(area, page_key, unit_key)
  VALUES (p_area, p_page_key, p_unit_key);
END; $$;

CREATE FUNCTION public.cms_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE FUNCTION public.cms_validate_locale_column() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_col text := TG_ARGV[0]; v_val text;
BEGIN
  EXECUTE format('SELECT ($1).%I::text', v_col) INTO v_val USING NEW;
  IF v_val IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.cms_locales l WHERE l.locale = v_val) THEN
    RAISE EXCEPTION 'locale_not_registered: %', v_val USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END; $$;
`;

/** REALE Live-Fassungen der beiden Ordnungshilfen (Stand 2026-09-15). */
const ORDER_HELPERS = `
CREATE OR REPLACE FUNCTION public.cms_renumber_sections(p_page_key text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _row record;
  _idx int := 1;
BEGIN
  FOR _row IN
    SELECT id FROM public.cms_sections
     WHERE page_key = p_page_key
     ORDER BY sort_order, section_key
  LOOP
    UPDATE public.cms_sections
       SET section_no = _idx
     WHERE id = _row.id
       AND (section_no IS DISTINCT FROM _idx);
    _idx := _idx + 1;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cms_resequence_sections_dfs(p_page_key text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _idx int := 0;
  _row record;
BEGIN
  FOR _row IN
    WITH RECURSIVE tree AS (
      SELECT id, parent_section_id, section_key, sort_order,
             ARRAY[sort_order]::int[] AS path,
             ARRAY[section_key]::text[] AS keypath
        FROM public.cms_sections
       WHERE page_key = p_page_key AND parent_section_id IS NULL
      UNION ALL
      SELECT c.id, c.parent_section_id, c.section_key, c.sort_order,
             t.path || c.sort_order,
             t.keypath || c.section_key
        FROM public.cms_sections c
        JOIN tree t ON c.parent_section_id = t.id
       WHERE c.page_key = p_page_key
    )
    SELECT id FROM tree ORDER BY path, keypath
  LOOP
    UPDATE public.cms_sections
       SET sort_order = _idx, updated_at = now()
     WHERE id = _row.id AND sort_order IS DISTINCT FROM _idx;
    _idx := _idx + 1;
  END LOOP;
  PERFORM public.cms_renumber_sections(p_page_key);
END;
$function$;
`;

const TRIGGERS = `
CREATE TRIGGER trg_cms_autopilot_pages AFTER INSERT OR UPDATE OF title_de
  ON public.cms_pages FOR EACH ROW EXECUTE FUNCTION public.cms_autopilot_trg_pages();
CREATE TRIGGER cms_pages_set_updated_at BEFORE UPDATE
  ON public.cms_pages FOR EACH ROW EXECUTE FUNCTION public.cms_set_updated_at();
CREATE TRIGGER trg_cms_card_v1_seed_whitelist AFTER INSERT
  ON public.cms_sections FOR EACH ROW EXECUTE FUNCTION public.cms_card_v1_seed_whitelist();
CREATE TRIGGER cms_sections_set_updated_at BEFORE UPDATE
  ON public.cms_sections FOR EACH ROW EXECUTE FUNCTION public.cms_set_updated_at();
CREATE TRIGGER trg_cms_autopilot_section_fields AFTER INSERT OR UPDATE OF value
  ON public.cms_section_fields FOR EACH ROW EXECUTE FUNCTION public.cms_autopilot_trg_section_fields();
CREATE TRIGGER trg_cms_section_fields_locale BEFORE INSERT OR UPDATE OF locale
  ON public.cms_section_fields FOR EACH ROW EXECUTE FUNCTION public.cms_validate_locale_column('locale');
CREATE TRIGGER trg_cms_autopilot_assets AFTER INSERT OR UPDATE OF alt_de
  ON public.cms_assets FOR EACH ROW EXECUTE FUNCTION public.cms_autopilot_trg_assets();
CREATE TRIGGER trg_cms_assets_locale BEFORE INSERT OR UPDATE OF locale
  ON public.cms_assets FOR EACH ROW EXECUTE FUNCTION public.cms_validate_locale_column('locale');
CREATE TRIGGER trg_cms_admin_editable_fields_locale BEFORE INSERT OR UPDATE OF locale
  ON public.cms_admin_editable_fields FOR EACH ROW EXECUTE FUNCTION public.cms_validate_locale_column('locale');
CREATE TRIGGER trg_cms_autopilot_nav AFTER INSERT OR UPDATE OF label_de, description_de
  ON public.cms_navigation_nodes FOR EACH ROW EXECUTE FUNCTION public.cms_autopilot_trg_nav();
`;

let db: PGlite;
type Json = Record<string, unknown>;

async function paste(args: {
  sourcePage?: string;
  sourceSection: string;
  targetPage?: string;
  parent?: string | null;
  position?: number | null;
  newKey?: string | null;
}): Promise<Json> {
  const res = await db.query<{ out: Json }>(
    "select public.rpc_admin_paste_section($1,$2,$3,$4,$5,$6) as out",
    [
      args.sourcePage ?? "quelle",
      args.sourceSection,
      args.targetPage ?? "ziel",
      args.parent ?? null,
      args.position ?? null,
      args.newKey ?? null,
    ],
  );
  return res.rows[0].out;
}

async function rows<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const res = await db.query<T>(sql, params);
  return res.rows;
}

async function count(sql: string, params: unknown[] = []): Promise<number> {
  const r = await rows<{ n: number }>(sql, params);
  return Number(r[0].n);
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SCHEMA);
  await db.exec(ORDER_HELPERS);
  // Etappe 3A: liefert die Trigger mit der Kopie-Kennung.
  await db.exec(draftSql(DRAFT_3A));
  // Etappe 3B: der hier geprüfte Entwurf.
  await db.exec(draftSql(DRAFT_3B));
  await db.exec(TRIGGERS);
}, 90_000);

afterAll(async () => {
  await db?.close();
});

/**
 * Quelle `quelle`: inaktiver Container mit zwei aktiven Karten, eine davon mit
 * einem inaktiven Enkel; mehrere Sprachen inkl. leer/NULL, JSON-Feld,
 * Prüfstatus, vier Bilder (mobile/tablet/desktop aktiv, eines inaktiv),
 * vertikale Alt-Übersetzung, Alt-Prüfzustand, deaktivierte Whitelist-Zeile,
 * zusätzlich ein Bestandsschlüssel mit Punkt (`cards.first`).
 *
 * Ziel `ziel`: zwei bestehende Bausteine plus ein bereits vorhandener
 * `karte_a`, damit die Kindnamen-Zuordnung greifen muss.
 */
beforeEach(async () => {
  await db.exec(`
    TRUNCATE public.cms_navigation_node_translations, public.cms_navigation_nodes,
             public.cms_translation_unit_state, public.cms_asset_translations,
             public.cms_page_translations, public.cms_assets,
             public.cms_admin_editable_fields, public.cms_section_fields,
             public.cms_sections, public.cms_pages, public.test_autopilot_log
      RESTART IDENTITY CASCADE;
    DELETE FROM public.cms_locales;
    INSERT INTO public.cms_locales(locale,label_de,label_native,is_source,is_active,is_public,sort_order)
    VALUES ('de','Deutsch','Deutsch',true,true,true,1),
           ('en','Englisch','English',false,true,true,2),
           ('pl','Polnisch','Polski',false,true,true,3),
           ('nl','Niederländisch','Nederlands',false,true,true,4);

    INSERT INTO public.cms_pages(page_key, route_path, page_type, title_de, status, is_active)
    VALUES ('quelle','/quelle','detail','Quelle DE','published', true),
           ('ziel','/ziel','detail','Ziel DE','published', true);

    INSERT INTO public.cms_sections(page_key, section_key, section_type, sort_order, is_active, section_no)
    VALUES ('quelle','container','group_v1',10,false,1),
           ('quelle','karte_a','card_v1',20,true,2),
           ('quelle','karte_a_kind','card_v1',25,false,3),
           ('quelle','karte_b','card_v1',30,true,4),
           ('quelle','cards.first','card_v1',40,true,5),
           ('ziel','z1','group_v1',0,true,1),
           ('ziel','z2','group_v1',1,true,2),
           ('ziel','karte_a','card_v1',2,true,3);

    UPDATE public.cms_sections c
       SET parent_section_id = (SELECT id FROM public.cms_sections WHERE page_key='quelle' AND section_key='container')
     WHERE c.page_key='quelle' AND c.section_key IN ('karte_a','karte_b');
    UPDATE public.cms_sections c
       SET parent_section_id = (SELECT id FROM public.cms_sections WHERE page_key='quelle' AND section_key='karte_a')
     WHERE c.page_key='quelle' AND c.section_key = 'karte_a_kind';

    INSERT INTO public.cms_section_fields(page_key,section_key,field_key,locale,value,value_json,review_status,source_hash)
    VALUES ('quelle','karte_a','title','de','Titel DE',NULL,'geprueft','h1'),
           ('quelle','karte_a','title','en','Title EN',NULL,'maschinell','h1'),
           ('quelle','karte_a','title','pl',NULL,NULL,'maschinell_veraltet','h1'),
           ('quelle','karte_a','title','nl','',NULL,'maschinell',NULL),
           ('quelle','karte_b','bullets.0','de','Punkt',NULL,'geprueft',NULL),
           ('quelle','karte_a_kind','title','de','Enkel',NULL,'geprueft',NULL),
           ('quelle','container','config','de',NULL,'{"cols":3}'::jsonb,'geprueft',NULL);

    -- eine Whitelist-Zeile bewusst deaktiviert
    UPDATE public.cms_admin_editable_fields SET is_enabled = false
     WHERE page_key='quelle' AND section_key='karte_a' AND field_key='eyebrow' AND locale='en';
    INSERT INTO public.cms_admin_editable_fields(page_key,section_key,field_key,locale,is_enabled)
    VALUES ('quelle','container','config','de',true);

    INSERT INTO public.cms_assets(page_key,section_key,asset_role,storage_path,alt_de,alt_en,alt_pl,alt_text_pl,viewport,sort_order,is_active,focal_x,focal_y,field_key,file_name,mime_type)
    VALUES ('quelle','karte_a','hero','p/mobile.jpg','Alt mobil',NULL,NULL,NULL,'mobile',10,true,0.3,0.7,'image','mobile.jpg','image/jpeg'),
           ('quelle','karte_a','hero','p/tablet.jpg','Alt tablet',NULL,NULL,NULL,'tablet',20,true,NULL,NULL,'image','tablet.jpg','image/jpeg'),
           ('quelle','karte_a','hero','p/desktop.jpg','Alt desktop','Alt EN','Alt PL','Alt Text PL','desktop',30,true,NULL,NULL,'image','desktop.jpg','image/jpeg'),
           ('quelle','karte_b','hero','p/aus.jpg','Alt aus',NULL,NULL,NULL,'desktop',40,false,NULL,NULL,'image','aus.jpg','image/jpeg');

    INSERT INTO public.cms_asset_translations(asset_id, locale, alt_text)
    SELECT id, 'nl', 'Alt NL' FROM public.cms_assets WHERE page_key='quelle' AND viewport='mobile';
    INSERT INTO public.cms_asset_translations(asset_id, locale, alt_text)
    SELECT id, 'pl', 'Alt PL vertikal' FROM public.cms_assets WHERE page_key='quelle' AND viewport='mobile';

    INSERT INTO public.cms_translation_unit_state(area, ref_key, unit_key, locale, review_status, source_hash)
    SELECT 'asset_alt', id::text, 'alt', 'nl', 'maschinell', 'ah'
      FROM public.cms_assets WHERE page_key='quelle' AND viewport='mobile';
    INSERT INTO public.cms_translation_unit_state(area, ref_key, unit_key, locale, review_status, source_hash)
    VALUES ('page_title','quelle','title','nl','geprueft','pt');

    TRUNCATE public.test_autopilot_log RESTART IDENTITY;
  `);
});

describe("Bausteinkopie: vollständiger Unterbaum", () => {
  it("kopiert Wurzel und alle Kinder, behält Aktivzustand und Verschachtelung", async () => {
    const out = await paste({ sourceSection: "container", newKey: "container_neu" });
    expect(out.success).toBe(true);
    expect(out.sections_copied).toBe(4);
    expect(out.assets_skipped).toBe(0);

    const tree = await rows<{ section_key: string; is_active: boolean; parent_key: string | null; section_type: string }>(`
      select c.section_key, c.is_active, c.section_type, p.section_key as parent_key
        from public.cms_sections c
        left join public.cms_sections p on p.id = c.parent_section_id
       where c.page_key='ziel' order by c.sort_order`);
    const byKey = Object.fromEntries(tree.map((t) => [t.section_key, t]));

    expect(byKey["container_neu"].is_active).toBe(false);
    expect(byKey["container_neu"].parent_key).toBe(null);
    // 'karte_a' existiert im Ziel schon → deterministisches Suffix
    expect(byKey["karte_a_kopie"].parent_key).toBe("container_neu");
    expect(byKey["karte_a_kopie"].is_active).toBe(true);
    expect(byKey["karte_b"].parent_key).toBe("container_neu");
    expect(byKey["karte_a_kind"].parent_key).toBe("karte_a_kopie");
    expect(byKey["karte_a_kind"].is_active).toBe(false);
    expect(byKey["container_neu"].section_type).toBe("group_v1");
  });

  it("liefert die vollständige Namenszuordnung additiv zurück", async () => {
    const out = await paste({ sourceSection: "container", newKey: "container_neu" });
    expect(out.key_map).toEqual({
      container: "container_neu",
      karte_a: "karte_a_kopie",
      karte_a_kind: "karte_a_kind",
      karte_b: "karte_b",
    });
  });

  it("erhält alle Feldsprachen inkl. leer/NULL, JSON, Prüfstatus und Fingerabdruck", async () => {
    await paste({ sourceSection: "container", newKey: "container_neu" });
    const f = await rows<{
      section_key: string; field_key: string; locale: string;
      value: string | null; value_json: unknown; review_status: string; source_hash: string | null;
    }>(`select section_key, field_key, locale, value, value_json, review_status, source_hash
          from public.cms_section_fields where page_key='ziel' order by section_key, field_key, locale`);
    expect(f).toHaveLength(7);
    const a = f.filter((r) => r.section_key === "karte_a_kopie");
    expect(a.map((r) => r.locale).sort()).toEqual(["de", "en", "nl", "pl"]);
    expect(a.find((r) => r.locale === "pl")).toMatchObject({ value: null, review_status: "maschinell_veraltet", source_hash: "h1" });
    expect(a.find((r) => r.locale === "nl")).toMatchObject({ value: "", review_status: "maschinell", source_hash: null });
    expect(a.find((r) => r.locale === "en")?.review_status).toBe("maschinell");
    const cfg = f.find((r) => r.field_key === "config");
    expect(cfg?.value_json).toEqual({ cols: 3 });
    expect(cfg?.section_key).toBe("container_neu");
  });

  it("übernimmt die Whitelist exakt, inklusive deaktivierter Zeile, ohne neue Seeds", async () => {
    const before = await count(
      "select count(*)::int as n from public.cms_admin_editable_fields where page_key='quelle' and section_key in ('container','karte_a','karte_a_kind','karte_b')",
    );
    const targetBefore = await count(
      "select count(*)::int as n from public.cms_admin_editable_fields where page_key='ziel'",
    );
    const out = await paste({ sourceSection: "container", newKey: "container_neu" });
    expect(out.whitelist_copied).toBe(before);
    const after = await count(
      "select count(*)::int as n from public.cms_admin_editable_fields where page_key='ziel'",
    );
    // Genau die kopierten Zeilen — kein zusaetzlicher Karten-Seed.
    expect(after).toBe(targetBefore + before);

    const off = await rows<{ is_enabled: boolean }>(
      "select is_enabled from public.cms_admin_editable_fields where page_key='ziel' and section_key='karte_a_kopie' and field_key='eyebrow' and locale='en'",
    );
    expect(off[0].is_enabled).toBe(false);
  });

  it("kopiert alle vier Bilder inkl. inaktivem, viewport, Fokus und allen Sprachspalten", async () => {
    const out = await paste({ sourceSection: "container", newKey: "container_neu" });
    expect(out.assets_copied).toBe(4);
    const a = await rows<{
      section_key: string; viewport: string; is_active: boolean; storage_path: string;
      alt_pl: string | null; alt_text_pl: string | null; focal_x: string | null; sort_order: number;
    }>(`select section_key, viewport, is_active, storage_path, alt_pl, alt_text_pl, focal_x, sort_order
          from public.cms_assets where page_key='ziel' order by sort_order`);
    expect(a).toHaveLength(4);
    expect(a.map((r) => r.viewport)).toEqual(["mobile", "tablet", "desktop", "desktop"]);
    expect(a.filter((r) => r.is_active === false)).toHaveLength(1);
    expect(Number(a[0].focal_x)).toBeCloseTo(0.3);
    expect(a[0].storage_path).toBe("p/mobile.jpg");
    const desktop = a.find((r) => r.viewport === "desktop" && r.is_active);
    expect(desktop?.alt_pl).toBe("Alt PL");
    expect(desktop?.alt_text_pl).toBe("Alt Text PL");
  });

  it("hängt vertikale Alt-Übersetzungen und Alt-Prüfzustände an die neuen Bild-IDs", async () => {
    const out = await paste({ sourceSection: "container", newKey: "container_neu" });
    expect(out.asset_translations_copied).toBe(2);
    expect(out.unit_states_copied).toBe(1);

    const tr = await rows<{ locale: string; alt_text: string; page_key: string }>(`
      select t.locale, t.alt_text, a.page_key from public.cms_asset_translations t
        join public.cms_assets a on a.id = t.asset_id
       where a.page_key='ziel' order by t.locale`);
    expect(tr.map((r) => r.locale)).toEqual(["nl", "pl"]);

    const st = await rows<{ review_status: string; source_hash: string; ref_key: string }>(`
      select st.review_status, st.source_hash, st.ref_key
        from public.cms_translation_unit_state st
        join public.cms_assets a on a.id::text = st.ref_key
       where a.page_key='ziel' and st.area='asset_alt'`);
    expect(st).toHaveLength(1);
    expect(st[0].review_status).toBe("maschinell");
    expect(st[0].source_hash).toBe("ah");
  });

  it("kopiert keinen Seitentitel und keine Navigation", async () => {
    await paste({ sourceSection: "container", newKey: "container_neu" });
    expect(await count("select count(*)::int as n from public.cms_page_translations")).toBe(0);
    expect(await count("select count(*)::int as n from public.cms_navigation_nodes")).toBe(0);
    expect(
      await count("select count(*)::int as n from public.cms_translation_unit_state where area='page_title'"),
    ).toBe(1);
  });
});

describe("Bausteinkopie: kein Übersetzungslauf", () => {
  it("löst keinen einzigen Autopilot-Aufruf aus", async () => {
    const out = await paste({ sourceSection: "container", newKey: "container_neu" });
    expect(out.success).toBe(true);
    expect(out.autopilot_suppressed_in_this_transaction).toBe(true);
    expect(await count("select count(*)::int as n from public.test_autopilot_log")).toBe(0);
  });

  it("lässt normales Bearbeiten nach der Kopie unverändert (Kennung zurückgesetzt)", async () => {
    await paste({ sourceSection: "container", newKey: "container_neu" });
    await db.exec(
      "update public.cms_section_fields set value='Neuer Text' where page_key='ziel' and section_key='karte_a_kopie' and field_key='title' and locale='de'",
    );
    expect(await count("select count(*)::int as n from public.test_autopilot_log")).toBe(1);
  });

  it("setzt die Kennung auch nach einem Fehler zurück", async () => {
    // Vorbelegte Whitelist-Zeile im Ziel erzwingt einen Unique-Konflikt.
    await db.exec(
      "insert into public.cms_admin_editable_fields(page_key,section_key,field_key,locale,is_enabled) values ('ziel','neu','config','de',true)",
    );
    const out = await paste({ sourceSection: "container", newKey: "neu" });
    expect(out.success).toBe(false);
    expect(out.error).toBe("paste_unique_conflict");
    await db.exec(
      "update public.cms_section_fields set value='Danach' where page_key='quelle' and section_key='karte_b' and field_key='bullets.0' and locale='de'",
    );
    expect(await count("select count(*)::int as n from public.test_autopilot_log")).toBe(1);
  });
});

describe("Bausteinkopie: Namen, Kollisionen, Grammatik", () => {
  it("lehnt einen bestehenden Wurzelnamen klar ab und nennt den Versuch", async () => {
    const out = await paste({ sourceSection: "karte_a", newKey: "karte_a" });
    expect(out.success).toBe(false);
    expect(out.error).toBe("target_section_key_exists");
    expect(out.attempted_section_key).toBe("karte_a");
    expect(await count("select count(*)::int as n from public.cms_sections where page_key='ziel'")).toBe(3);
  });

  it("lässt Bestandsschlüssel mit Punkt kopieren", async () => {
    const out = await paste({ sourceSection: "cards.first" });
    expect(out.success).toBe(true);
    expect(out.new_section_key).toBe("cards.first");
    expect(
      await count("select count(*)::int as n from public.cms_sections where page_key='ziel' and section_key='cards.first'"),
    ).toBe(1);
  });

  it("erlaubt Bindestrich als Trenner, lehnt ungültige Namen weiter ab", async () => {
    const ok = await paste({ sourceSection: "karte_b", newKey: "hero-top" });
    expect(ok.success).toBe(true);
    for (const bad of ["Bad Key", "_start", "ende.", "doppel..punkt", "-vorne"]) {
      const out = await paste({ sourceSection: "karte_b", newKey: bad });
      expect(out.error).toBe("new_section_key_invalid");
    }
  });

  it("vergibt deterministische Kindnamen, wenn auch das erste Suffix belegt ist", async () => {
    await db.exec(
      "insert into public.cms_sections(page_key,section_key,section_type,sort_order) values ('ziel','karte_a_kopie','card_v1',9)",
    );
    const out = await paste({ sourceSection: "container", newKey: "container_neu" });
    expect(out.success).toBe(true);
    expect((out.key_map as Record<string, string>)["karte_a"]).toBe("karte_a_kopie_2");
    // Kein Kind geht verloren
    expect(out.sections_copied).toBe(4);
  });
});

describe("Bausteinkopie: Position und bestehende Reihenfolge", () => {
  async function rootOrder(): Promise<string[]> {
    const r = await rows<{ section_key: string }>(
      "select section_key from public.cms_sections where page_key='ziel' and parent_section_id is null order by sort_order",
    );
    return r.map((x) => x.section_key);
  }

  it("Position 0 setzt die Kopie an den Anfang", async () => {
    await paste({ sourceSection: "karte_b", newKey: "neu", position: 0 });
    expect(await rootOrder()).toEqual(["neu", "z1", "z2", "karte_a"]);
  });

  it("Position in der Mitte erhält die relative Reihenfolge der Geschwister", async () => {
    await paste({ sourceSection: "karte_b", newKey: "neu", position: 2 });
    expect(await rootOrder()).toEqual(["z1", "z2", "neu", "karte_a"]);
  });

  it("Position am Ende (oder darüber) landet zuletzt", async () => {
    await paste({ sourceSection: "karte_b", newKey: "neu", position: 99 });
    expect(await rootOrder()).toEqual(["z1", "z2", "karte_a", "neu"]);
  });

  it("bindet die Kopie an den gewählten Zielparent derselben Seite", async () => {
    const out = await paste({ sourceSection: "karte_b", newKey: "neu", parent: "z1", position: 0 });
    expect(out.success).toBe(true);
    const [r] = await rows<{ parent_key: string }>(`
      select p.section_key as parent_key from public.cms_sections c
        join public.cms_sections p on p.id=c.parent_section_id
       where c.page_key='ziel' and c.section_key='neu'`);
    expect(r.parent_key).toBe("z1");
  });

  it("meldet einen fehlenden oder fremdseitigen Zielparent", async () => {
    expect((await paste({ sourceSection: "karte_b", newKey: "neu", parent: "gibt_es_nicht" })).error).toBe(
      "parent_not_found",
    );
    // 'container' existiert nur auf der Quellseite
    expect((await paste({ sourceSection: "karte_b", newKey: "neu2", parent: "container" })).error).toBe(
      "parent_not_found",
    );
  });
});

describe("Bausteinkopie: Quelle und Zielbestand", () => {
  it("lässt die Quelle bei seitenübergreifendem Einfügen unverändert", async () => {
    const before = await rows(
      "select section_key, sort_order, section_no, is_active from public.cms_sections where page_key='quelle' order by section_key",
    );
    const beforeFields = await rows(
      "select section_key, field_key, locale, value, review_status from public.cms_section_fields where page_key='quelle' order by section_key, field_key, locale",
    );
    const beforeAssets = await rows(
      "select storage_path, viewport, is_active from public.cms_assets where page_key='quelle' order by storage_path",
    );
    await paste({ sourceSection: "container", newKey: "container_neu" });
    expect(
      await rows("select section_key, sort_order, section_no, is_active from public.cms_sections where page_key='quelle' order by section_key"),
    ).toEqual(before);
    expect(
      await rows("select section_key, field_key, locale, value, review_status from public.cms_section_fields where page_key='quelle' order by section_key, field_key, locale"),
    ).toEqual(beforeFields);
    expect(
      await rows("select storage_path, viewport, is_active from public.cms_assets where page_key='quelle' order by storage_path"),
    ).toEqual(beforeAssets);
  });

  it("kopiert innerhalb derselben Seite ohne die eigenen neuen Zeilen mitzulesen", async () => {
    const out = await paste({
      sourcePage: "quelle",
      sourceSection: "container",
      targetPage: "quelle",
      newKey: "container_kopie",
      position: 0,
    });
    expect(out.success).toBe(true);
    expect(out.sections_copied).toBe(4);
    // Bestehende Felder und Bilder der Quelle bleiben inhaltlich unverändert;
    // nur Ordnungszahlen dürfen sich ändern (beabsichtigte Wirkung).
    const f = await rows<{ n: number }>(
      "select count(*)::int as n from public.cms_section_fields where page_key='quelle' and section_key in ('container','karte_a','karte_b','karte_a_kind')",
    );
    expect(Number(f[0].n)).toBe(7);
    const orig = await rows<{ is_active: boolean }>(
      "select is_active from public.cms_sections where page_key='quelle' and section_key='container'",
    );
    expect(orig[0].is_active).toBe(false);
    expect(
      await count("select count(*)::int as n from public.cms_assets where page_key='quelle'"),
    ).toBe(8);
  });

  it("bricht bei einem Medienkonflikt im Ziel vollständig ab, ohne zu überspringen", async () => {
    await db.exec(`
      insert into public.cms_sections(page_key,section_key,section_type,sort_order) values ('ziel','karte_a_kopie','card_v1',9);
      insert into public.cms_assets(page_key,section_key,asset_role,storage_path,field_key,viewport,is_active)
      values ('ziel','karte_a_kopie_2','hero','anders.jpg','image','mobile',true);
    `);
    const out = await paste({ sourceSection: "container", newKey: "container_neu" });
    expect(out.success).toBe(false);
    expect(out.error).toBe("paste_asset_slot_conflict");
    expect(
      await count("select count(*)::int as n from public.cms_sections where page_key='ziel' and section_key='container_neu'"),
    ).toBe(0);
  });

  it("läuft bei einem Fehler mitten im Einfügen vollständig zurück — auch die Reihenfolge", async () => {
    const before = await rows(
      "select section_key, sort_order, section_no from public.cms_sections where page_key='ziel' order by section_key",
    );
    await db.exec(
      "insert into public.cms_admin_editable_fields(page_key,section_key,field_key,locale,is_enabled) values ('ziel','neu','config','de',true)",
    );
    const out = await paste({ sourceSection: "container", newKey: "neu", position: 0 });
    expect(out.success).toBe(false);
    expect(out.error).toBe("paste_unique_conflict");
    expect(
      await rows("select section_key, sort_order, section_no from public.cms_sections where page_key='ziel' order by section_key"),
    ).toEqual(before);
    expect(await count("select count(*)::int as n from public.cms_sections where page_key='ziel'")).toBe(3);
  });

  it("bricht bei einem Zyklus oder fremden Eltern-Verweis auf der Zielseite ohne Schreiben ab", async () => {
    await db.exec(`
      update public.cms_sections set parent_section_id = (select id from public.cms_sections where page_key='ziel' and section_key='z2')
       where page_key='ziel' and section_key='z1';
      update public.cms_sections set parent_section_id = (select id from public.cms_sections where page_key='ziel' and section_key='z1')
       where page_key='ziel' and section_key='z2';
    `);
    const cycle = await paste({ sourceSection: "karte_b", newKey: "neu" });
    expect(cycle.error).toBe("target_page_section_cycle");
    expect(await count("select count(*)::int as n from public.cms_sections where page_key='ziel'")).toBe(3);

    await db.exec(`
      update public.cms_sections set parent_section_id = null where page_key='ziel' and section_key='z1';
      update public.cms_sections set parent_section_id = (select id from public.cms_sections where page_key='quelle' and section_key='container')
       where page_key='ziel' and section_key='z2';
    `);
    const foreign = await paste({ sourceSection: "karte_b", newKey: "neu" });
    expect(foreign.error).toBe("target_page_parent_foreign");
    expect(await count("select count(*)::int as n from public.cms_sections where page_key='ziel'")).toBe(3);
  });

  it("meldet fehlende Quelle und fehlende Zielseite unverändert", async () => {
    expect((await paste({ sourceSection: "gibt_es_nicht" })).error).toBe("source_not_found");
    expect((await paste({ sourceSection: "karte_b", targetPage: "gibt_es_nicht" })).error).toBe(
      "target_page_not_found",
    );
  });
});

describe("Bausteinkopie: Zyklen in der Quelle", () => {
  async function setParent(child: string, parent: string | null, page = "quelle") {
    if (parent === null) {
      await db.exec(
        `update public.cms_sections set parent_section_id = null where page_key='${page}' and section_key='${child}'`,
      );
      return;
    }
    await db.exec(`
      update public.cms_sections set parent_section_id =
        (select id from public.cms_sections where page_key='${page}' and section_key='${parent}')
       where page_key='${page}' and section_key='${child}'`);
  }

  it("lehnt einen Selbstbezug der Quellwurzel ab", async () => {
    await db.exec(`
      update public.cms_sections s set parent_section_id = s.id
       where s.page_key='quelle' and s.section_key='container'`);
    const out = await paste({ sourceSection: "container", newKey: "container_neu" });
    expect(out.success).toBe(false);
    expect(out.error).toBe("section_parent_cycle");
    expect(await count("select count(*)::int as n from public.cms_sections where page_key='ziel'")).toBe(3);
  });

  it("lehnt einen Zyklus Wurzel→eigenes Kind ab (Erreichbarkeit allein genügt nicht)", async () => {
    // container -> karte_a -> karte_a_kind, zusaetzlich container.parent = karte_a
    await setParent("container", "karte_a");
    const out = await paste({ sourceSection: "container", newKey: "container_neu" });
    expect(out.success).toBe(false);
    expect(out.error).toBe("section_parent_cycle");
    expect(await count("select count(*)::int as n from public.cms_sections where page_key='ziel'")).toBe(3);
  });

  it("lehnt einen langen Zyklus über einen Enkel ab", async () => {
    await setParent("container", "karte_a_kind");
    const out = await paste({ sourceSection: "container", newKey: "container_neu" });
    expect(out.success).toBe(false);
    expect(out.error).toBe("section_parent_cycle");
    expect(await count("select count(*)::int as n from public.cms_sections where page_key='ziel'")).toBe(3);
  });

  it("kopiert ein Kind mit intaktem Elternknoten außerhalb des Unterbaums weiter normal", async () => {
    const out = await paste({ sourceSection: "karte_a", newKey: "karte_a_neu" });
    expect(out.success).toBe(true);
    expect(out.sections_copied).toBe(2);
    const [r] = await rows<{ parent_key: string | null }>(`
      select p.section_key as parent_key from public.cms_sections c
        left join public.cms_sections p on p.id = c.parent_section_id
       where c.page_key='ziel' and c.section_key='karte_a_neu'`);
    expect(r.parent_key).toBe(null);
  });

  it("lehnt einen fremdseitigen Elternverweis der Quellwurzel ab", async () => {
    await db.exec(`
      update public.cms_sections set parent_section_id =
        (select id from public.cms_sections where page_key='ziel' and section_key='z1')
       where page_key='quelle' and section_key='container'`);
    const out = await paste({ sourceSection: "container", newKey: "container_neu" });
    expect(out.success).toBe(false);
    expect(out.error).toBe("section_parent_foreign");
    expect(await count("select count(*)::int as n from public.cms_sections where page_key='ziel'")).toBe(3);
  });
});


describe("Bausteinkopie: Schutz dauerhafter Tabellen", () => {
  it("lässt gleichnamige dauerhafte Tabellen im Schema public unberührt", async () => {
    await paste({ sourceSection: "container", newKey: "container_neu" });
    for (const t of [
      "_paste_key_map",
      "_paste_fields",
      "_paste_whitelist",
      "_paste_assets",
      "_paste_asset_tr",
      "_paste_states",
      "_paste_asset_map",
    ]) {
      const r = await rows<{ sentinel: string }>(`select sentinel from public.${t}`);
      expect(r).toEqual([{ sentinel: "bleibt" }]);
    }
  });
});

/**
 * Injizierter Fehlerfall (keine Aussage über die echten Live-Trigger):
 * ein künstlicher BEFORE-INSERT-Trigger überspringt GENAU EINMAL einen
 * Kind-Baustein (RETURN NULL). Ohne die Prüfung direkt nach `RETURNING id`
 * würde die Kopie als erfolgreich gelten bzw. bei dauerhaftem Überspringen
 * endlos weiterzählen.
 */
describe("Bausteinkopie: Kind-Einfügung ohne Zeile", () => {
  beforeEach(async () => {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS public.test_skip_once(done boolean NOT NULL DEFAULT false);
      DELETE FROM public.test_skip_once;
      INSERT INTO public.test_skip_once(done) VALUES (false);
      CREATE OR REPLACE FUNCTION public.test_skip_one_child() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.page_key = 'ziel' AND NEW.section_key LIKE 'karte_a%'
           AND EXISTS (SELECT 1 FROM public.test_skip_once WHERE done = false) THEN
          UPDATE public.test_skip_once SET done = true;
          RETURN NULL;
        END IF;
        RETURN NEW;
      END; $$;
      DROP TRIGGER IF EXISTS trg_test_skip_one_child ON public.cms_sections;
      CREATE TRIGGER trg_test_skip_one_child BEFORE INSERT ON public.cms_sections
        FOR EACH ROW EXECUTE FUNCTION public.test_skip_one_child();
    `);
  });

  afterEach(async () => {
    await db.exec("DROP TRIGGER IF EXISTS trg_test_skip_one_child ON public.cms_sections;");
  });

  it("bricht klar ab, wenn ein Kind-INSERT keine Zeile liefert", async () => {
    await expect(paste({ sourceSection: "container", newKey: "container_neu" })).rejects.toThrow(
      /paste_child_insert_no_row/,
    );
    expect(await count("select count(*)::int as n from public.cms_sections where page_key='ziel'")).toBe(3);
  });
});

