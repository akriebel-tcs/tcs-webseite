// @vitest-environment node
/**
 * TATSÄCHLICH AUSGEFÜHRTE Prüfung des SQL-Entwurfs für die vollständige
 * Seitenkopie (Etappe 3A).
 *
 * Der SQL-Block wird direkt aus dem Entwurfsdokument gelesen und in eine
 * isolierte Datenbank (PGlite, echtes PostgreSQL im Prozess) eingespielt.
 * Ausschließlich künstliche Testdaten, keine Verbindung zur laufenden
 * Datenbank, keine Migration, kein Deployment.
 *
 * Die Tabellen, Constraints und Trigger sind aus der Live-Datenbank
 * abgeleitet — insbesondere der reale Karten-Whitelist-Trigger
 * `cms_card_v1_seed_whitelist`. Der Autopilot ist durch eine beobachtbare
 * Testfunktion ersetzt.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const DRAFT = "docs/04-betrieb/sql-entwurf-seitenkopie-2026-09-14.md";

function draftSql(): string {
  const text = readFileSync(resolve(process.cwd(), DRAFT), "utf8");
  const match = text.match(/```sql\n([\s\S]*?)\n```/);
  if (!match) throw new Error("SQL-Block im Entwurf nicht gefunden");
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

-- Falle fuer unqualifizierte Arbeitsnamen: gleichnamige DAUERHAFTE Tabellen im
-- Schema public. Der Entwurf darf sie niemals anfassen (pg_temp-Qualifizierung).
CREATE TABLE public._dup_sections (sentinel text);
CREATE TABLE public._dup_fields (sentinel text);
CREATE TABLE public._dup_whitelist (sentinel text);
CREATE TABLE public._dup_assets (sentinel text);
CREATE TABLE public._dup_asset_tr (sentinel text);
CREATE TABLE public._dup_page_tr (sentinel text);
CREATE TABLE public._dup_states (sentinel text);
CREATE TABLE public._dup_map (sentinel text);
CREATE TABLE public._dup_asset_map (sentinel text);
INSERT INTO public._dup_sections VALUES ('bleibt');
INSERT INTO public._dup_fields VALUES ('bleibt');
INSERT INTO public._dup_whitelist VALUES ('bleibt');
INSERT INTO public._dup_assets VALUES ('bleibt');
INSERT INTO public._dup_asset_tr VALUES ('bleibt');
INSERT INTO public._dup_page_tr VALUES ('bleibt');
INSERT INTO public._dup_states VALUES ('bleibt');
INSERT INTO public._dup_map VALUES ('bleibt');
INSERT INTO public._dup_asset_map VALUES ('bleibt');


-- beobachtbarer Ersatz fuer den Autopiloten
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

/** Trigger genau wie live. */
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

/**
 * Live-Fassung von `cms_autopilot_trg_nav` (Stand 2026-09-14, aus der laufenden
 * Datenbank gelesen). Sie wird VOR dem Entwurf eingespielt, damit der Entwurf
 * sie nachweislich ersetzen muss: ohne Ersatz würden hier zwei Autopilot-
 * Aufträge entstehen (Beschriftung und Beschreibung).
 */
const NAV_TRIGGER_FN_LIVE = `
CREATE OR REPLACE FUNCTION public.cms_autopilot_trg_nav()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  IF TG_OP = 'INSERT'
     OR public.cms_translation_normalize(NEW.label_de) <> public.cms_translation_normalize(OLD.label_de) THEN
    PERFORM public.cms_autopilot_enqueue_unit(
      'nav_label', NEW.id, NEW.page_key, NEW.nav_area, 'label', NEW.label_de);
  END IF;
  IF TG_OP = 'INSERT'
     OR public.cms_translation_normalize(NEW.description_de) <> public.cms_translation_normalize(OLD.description_de) THEN
    PERFORM public.cms_autopilot_enqueue_unit(
      'nav_description', NEW.id, NEW.page_key, NEW.nav_area, 'description', NEW.description_de);
  END IF;
  RETURN NEW;
END; $fn$;
`;


let db: PGlite;

type Json = Record<string, unknown>;

async function duplicate(
  source: string,
  newKey: string,
  route: string | null = null,
  navArea: string | null = null,
  parentNodeKey: string | null = null,
  nodeKey: string | null = null,
): Promise<Json> {
  const res = await db.query<{ out: Json }>(
    "select public.rpc_admin_duplicate_page($1,$2,$3,$4,$5,$6) as out",
    [source, newKey, route, navArea, parentNodeKey, nodeKey],
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
  await db.exec(NAV_TRIGGER_FN_LIVE);
  await db.exec(draftSql());
  await db.exec(TRIGGERS);
}, 60_000);


afterAll(async () => {
  await db?.close();
});

/**
 * Quellbestand: inaktiver Elterncontainer mit aktiven Kindern,
 * Geschwisterreihenfolge, mehrere Sprachen und Prüfzustände, JSON-Feld,
 * mobile/tablet/desktop und ein inaktives Bild, Alt- und
 * Seitentitelübersetzungen, deaktivierte Whitelist-Zeile.
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

    INSERT INTO public.cms_pages(page_key, route_path, page_type, title_de, title_en, title_pl, status, is_active)
    VALUES ('quelle','/quelle','detail','Quelle DE','Source EN','Zrodlo PL','published', true);

    INSERT INTO public.cms_sections(page_key, section_key, section_type, sort_order, is_active, section_no)
    VALUES ('quelle','container','group_v1',10,false,1),
           ('quelle','karte_a','card_v1',20,true,2),
           ('quelle','karte_b','card_v1',30,true,3);

    UPDATE public.cms_sections c
       SET parent_section_id = (SELECT id FROM public.cms_sections WHERE page_key='quelle' AND section_key='container')
     WHERE c.page_key='quelle' AND c.section_key IN ('karte_a','karte_b');

    INSERT INTO public.cms_section_fields(page_key,section_key,field_key,locale,value,value_json,review_status,source_hash)
    VALUES ('quelle','karte_a','title','de','Titel DE',NULL,'geprueft','h1'),
           ('quelle','karte_a','title','en','Title EN',NULL,'maschinell','h1'),
           ('quelle','karte_a','title','pl',NULL,NULL,'maschinell_veraltet','h1'),
           ('quelle','karte_a','title','nl','',NULL,'maschinell',NULL),
           ('quelle','karte_b','bullets.0','de','Punkt',NULL,'geprueft',NULL),
           ('quelle','container','config','de',NULL,'{"cols":3}'::jsonb,'geprueft',NULL);

    -- Whitelist: eine Zeile bewusst deaktiviert
    INSERT INTO public.cms_admin_editable_fields(page_key,section_key,field_key,locale,is_enabled)
    VALUES ('quelle','karte_a','title','de',true),
           ('quelle','karte_a','title','en',false);

    INSERT INTO public.cms_assets(page_key,section_key,asset_role,storage_path,alt_de,alt_en,alt_pl,viewport,sort_order,is_active,focal_x,focal_y,field_key,file_name,mime_type)
    VALUES ('quelle','karte_a','hero','p/mobile.jpg','Alt mobil',NULL,NULL,'mobile',10,true,0.3,0.7,'image','mobile.jpg','image/jpeg'),
           ('quelle','karte_a','hero','p/tablet.jpg','Alt tablet',NULL,NULL,'tablet',20,true,NULL,NULL,'image','tablet.jpg','image/jpeg'),
           ('quelle','karte_a','hero','p/desktop.jpg','Alt desktop','Alt desktop EN','Alt desktop PL','desktop',30,true,NULL,NULL,'image','desktop.jpg','image/jpeg'),
           ('quelle','karte_b','hero','p/aus.jpg','Alt aus',NULL,NULL,'desktop',40,false,NULL,NULL,'image','aus.jpg','image/jpeg');

    INSERT INTO public.cms_asset_translations(asset_id, locale, alt_text)
    SELECT id, 'nl', 'Alt NL' FROM public.cms_assets WHERE page_key='quelle' AND viewport='mobile';

    -- Vertikale Titelzeilen: 'en' existiert vertikal UND als Spalte
    -- (die vertikale Zeile muss Vorrang haben), 'nl' nur vertikal,
    -- 'pl' nur als Spalte.
    INSERT INTO public.cms_page_translations(page_id, locale, title)
    SELECT id, 'nl', 'Bron NL' FROM public.cms_pages WHERE page_key='quelle';
    INSERT INTO public.cms_page_translations(page_id, locale, title)
    SELECT id, 'en', 'Source EN vertikal' FROM public.cms_pages WHERE page_key='quelle';

    INSERT INTO public.cms_translation_unit_state(area, ref_key, unit_key, locale, review_status, source_hash)
    VALUES ('page_title','quelle','title','nl','maschinell','ph'),
           ('page_title','quelle','title','en','geprueft','pe');
    INSERT INTO public.cms_translation_unit_state(area, ref_key, unit_key, locale, review_status, source_hash)
    SELECT 'asset_alt', id::text, 'alt', 'nl', 'maschinell', 'ah'
      FROM public.cms_assets WHERE page_key='quelle' AND viewport='mobile';


    -- Fremde Seite mit eigenem Zustand: darf nie verändert werden
    INSERT INTO public.cms_pages(page_key, page_type, title_de) VALUES ('fremd','detail','Fremd');
    INSERT INTO public.cms_translation_unit_state(area, ref_key, unit_key, locale, review_status)
    VALUES ('page_title','fremd','title','nl','geprueft');

    TRUNCATE public.test_autopilot_log RESTART IDENTITY;
  `);
});

describe("Seitenkopie: Zielbestand vollständig", () => {
  it("legt die Kopie als inaktiven Entwurf an und lässt die Quelle unberührt", async () => {
    const out = await duplicate("quelle", "kopie", "/kopie");
    expect(out.success).toBe(true);

    const [copy] = await rows<{ status: string; is_active: boolean; title_pl: string; page_no: number }>(
      "select status, is_active, title_pl, page_no from public.cms_pages where page_key='kopie'",
    );
    expect(copy.status).toBe("draft");
    expect(copy.is_active).toBe(false);
    expect(copy.title_pl).toBe("Zrodlo PL");

    const [src] = await rows<{ status: string; is_active: boolean; page_no: number }>(
      "select status, is_active, page_no from public.cms_pages where page_key='quelle'",
    );
    expect(src.status).toBe("published");
    expect(src.is_active).toBe(true);
    expect(copy.page_no).not.toBe(src.page_no);
  });

  it("ordnet Elternbeziehungen innerhalb der Kopie neu zu (nicht NULL, nicht auf die Quelle)", async () => {
    await duplicate("quelle", "kopie");
    const kids = await rows<{ section_key: string; parent_key: string | null; page_key: string }>(`
      select c.section_key, p.section_key as parent_key, p.page_key
        from public.cms_sections c
        left join public.cms_sections p on p.id = c.parent_section_id
       where c.page_key='kopie' and c.section_key in ('karte_a','karte_b')
       order by c.section_key`);
    expect(kids).toHaveLength(2);
    for (const k of kids) {
      expect(k.parent_key).toBe("container");
      expect(k.page_key).toBe("kopie");
    }
    const container = await rows<{ is_active: boolean; sort_order: number; section_no: number }>(
      "select is_active, sort_order, section_no from public.cms_sections where page_key='kopie' and section_key='container'",
    );
    expect(container[0].is_active).toBe(false);
    expect(container[0].sort_order).toBe(10);
    expect(container[0].section_no).toBe(1);
  });

  it("erhält alle Feldsprachen inkl. leerem/NULL-Wert, JSON, Prüfstatus und Fingerabdruck", async () => {
    await duplicate("quelle", "kopie");
    const fields = await rows<{
      field_key: string; locale: string; value: string | null;
      review_status: string; source_hash: string | null; value_json: unknown;
    }>(`select field_key, locale, value, review_status, source_hash, value_json
          from public.cms_section_fields where page_key='kopie' order by section_key, field_key, locale`);
    expect(fields).toHaveLength(6);
    const pl = fields.find((f) => f.field_key === "title" && f.locale === "pl")!;
    expect(pl.value).toBeNull();
    expect(pl.review_status).toBe("maschinell_veraltet");
    const nl = fields.find((f) => f.field_key === "title" && f.locale === "nl")!;
    expect(nl.value).toBe("");
    expect(nl.review_status).toBe("maschinell");
    expect(nl.source_hash).toBeNull();
    const en = fields.find((f) => f.field_key === "title" && f.locale === "en")!;
    expect(en.review_status).toBe("maschinell");
    expect(en.source_hash).toBe("h1");
    const cfg = fields.find((f) => f.field_key === "config")!;
    expect(cfg.value_json).toEqual({ cols: 3 });
  });

  it("kopiert die Whitelist exakt, auch deaktiviert, ohne Erweiterung durch den Karten-Seed-Trigger", async () => {
    const src = await rows<{ section_key: string; field_key: string; locale: string; is_enabled: boolean }>(
      `select section_key, field_key, locale, is_enabled from public.cms_admin_editable_fields
        where page_key='quelle' order by section_key, field_key, locale`,
    );
    const out = await duplicate("quelle", "kopie");
    expect(out.success).toBe(true);
    const wl = await rows<{ section_key: string; field_key: string; locale: string; is_enabled: boolean }>(
      `select section_key, field_key, locale, is_enabled from public.cms_admin_editable_fields
        where page_key='kopie' order by section_key, field_key, locale`,
    );
    // exakt gleiche Menge und gleiche Freigaben — keine zusätzliche Zeile
    expect(wl).toEqual(src);
    expect(out.whitelist_copied).toBe(src.length);
    expect(wl.find((w) => w.field_key === "title" && w.locale === "en")!.is_enabled).toBe(false);
  });


  it("kopiert alle Medienzuordnungen inkl. inaktiv, viewport, Sortierung, Fokus und Alt-Spalten", async () => {
    const out = await duplicate("quelle", "kopie");
    const assets = await rows<{
      viewport: string; is_active: boolean; sort_order: number; storage_path: string;
      alt_pl: string | null; focal_x: string | null; asset_no: number;
    }>(`select viewport, is_active, sort_order, storage_path, alt_pl, focal_x, asset_no
          from public.cms_assets where page_key='kopie' order by sort_order`);
    expect(assets).toHaveLength(4);
    expect(assets.map((a) => a.viewport)).toEqual(["mobile", "tablet", "desktop", "desktop"]);
    expect(assets[3].is_active).toBe(false);
    expect(assets[0].storage_path).toBe("p/mobile.jpg");
    expect(Number(assets[0].focal_x)).toBeCloseTo(0.3);
    expect(assets[2].alt_pl).toBe("Alt desktop PL");
    expect(out.assets_copied).toBe(4);

    // Mediendateien werden nicht kopiert: gleiche Pfade, neue Zeilen-IDs
    const shared = await count(`
      select count(*) as n from public.cms_assets a join public.cms_assets b
        on a.storage_path = b.storage_path and a.page_key='quelle' and b.page_key='kopie' and a.id <> b.id`);
    expect(shared).toBe(4);
  });

  it("kopiert Seitentitel- und Alt-Übersetzungen sowie die zugehörigen Prüfzustände auf neue Referenzen", async () => {
    const out = await duplicate("quelle", "kopie");
    expect(out.page_translations_copied).toBe(2);
    expect(out.asset_translations_copied).toBe(1);
    expect(out.unit_states_copied).toBe(3);


    const pt = await rows<{ title: string; locale: string }>(`
      select t.locale, t.title from public.cms_page_translations t
        join public.cms_pages p on p.id = t.page_id where p.page_key='kopie'
       order by t.locale`);
    expect(pt).toEqual([
      { locale: "en", title: "Source EN vertikal" },
      { locale: "nl", title: "Bron NL" },
    ]);


    const [at] = await rows<{ alt_text: string; viewport: string }>(`
      select t.alt_text, a.viewport from public.cms_asset_translations t
        join public.cms_assets a on a.id = t.asset_id where a.page_key='kopie'`);
    expect(at).toMatchObject({ alt_text: "Alt NL", viewport: "mobile" });

    const states = await rows<{
      area: string; ref_key: string; locale: string; review_status: string; source_hash: string;
    }>(
      "select area, ref_key, locale, review_status, source_hash from public.cms_translation_unit_state order by area, ref_key, locale",
    );
    const pageState = states.filter((s) => s.area === "page_title" && s.ref_key === "kopie");
    expect(pageState).toHaveLength(2);
    expect(pageState.find((s) => s.locale === "nl")).toMatchObject({
      review_status: "maschinell", source_hash: "ph",
    });
    expect(pageState.find((s) => s.locale === "en")).toMatchObject({
      review_status: "geprueft", source_hash: "pe",
    });


    const newAsset = await rows<{ id: string }>(
      "select id from public.cms_assets where page_key='kopie' and viewport='mobile'",
    );
    const assetState = states.filter((s) => s.area === "asset_alt" && s.ref_key === newAsset[0].id);
    expect(assetState).toHaveLength(1);
    expect(assetState[0].review_status).toBe("maschinell");

    // fremder Zustand unverändert
    const fremd = states.filter((s) => s.ref_key === "fremd");
    expect(fremd).toHaveLength(1);
    expect(fremd[0].review_status).toBe("geprueft");
  });

  it("lässt den Quellbestand vollständig unverändert", async () => {
    const before = await rows(`select page_key, section_key, field_key, locale, value, review_status, source_hash
      from public.cms_section_fields where page_key='quelle' order by section_key, field_key, locale`);
    const assetsBefore = await rows(
      "select id, viewport, sort_order, is_active, alt_de from public.cms_assets where page_key='quelle' order by sort_order",
    );
    await duplicate("quelle", "kopie", "/kopie", "main", null, null);
    const after = await rows(`select page_key, section_key, field_key, locale, value, review_status, source_hash
      from public.cms_section_fields where page_key='quelle' order by section_key, field_key, locale`);
    const assetsAfter = await rows(
      "select id, viewport, sort_order, is_active, alt_de from public.cms_assets where page_key='quelle' order by sort_order",
    );
    expect(after).toEqual(before);
    expect(assetsAfter).toEqual(assetsBefore);
  });
});

describe("Seitenkopie: keine Übersetzungsläufe, Trigger danach normal", () => {
  it("erzeugt beim Kopieren keinen einzigen Autopilot-Auftrag", async () => {
    const out = await duplicate("quelle", "kopie", "/kopie", "main");
    expect(out.success).toBe(true);
    expect(out.autopilot_suppressed_in_this_transaction).toBe(true);
    expect(await count("select count(*) as n from public.test_autopilot_log")).toBe(0);
  });

  it("verhält sich nach der Kopie wieder normal (redaktionelle Änderung löst Trigger aus)", async () => {
    await duplicate("quelle", "kopie");
    await db.exec(
      "update public.cms_section_fields set value='Neu DE' where page_key='kopie' and section_key='karte_a' and field_key='title' and locale='de'",
    );
    await db.exec("update public.cms_pages set title_de='Anders' where page_key='kopie'");
    await db.exec(
      "insert into public.cms_sections(page_key,section_key,section_type) values ('kopie','karte_c','card_v1')",
    );
    const log = await rows<{ area: string }>("select area from public.test_autopilot_log order by id");
    expect(log.map((l) => l.area)).toEqual(expect.arrayContaining(["section_field", "page_title"]));
    // Karten-Seed-Trigger arbeitet außerhalb der Kopie wieder normal
    expect(
      await count(
        "select count(*) as n from public.cms_admin_editable_fields where page_key='kopie' and section_key='karte_c'",
      ),
    ).toBeGreaterThan(0);
  });
});

describe("Seitenkopie: Navigationsknoten", () => {
  it("legt einen inaktiven, nicht öffentlichen Knoten mit übersetzten Titeln an", async () => {
    const out = await duplicate("quelle", "kopie", "/kopie", "main");
    const [node] = await rows<{
      node_key: string; is_active: boolean; show_in_public_nav: boolean;
      label_de: string; label_en: string; label_pl: string; parent_id: string | null;
    }>("select node_key, is_active, show_in_public_nav, label_de, label_en, label_pl, parent_id from public.cms_navigation_nodes");
    expect(node.node_key).toBe("kopie");
    expect(node.is_active).toBe(false);
    expect(node.show_in_public_nav).toBe(false);
    expect(node.label_de).toBe("Quelle DE");
    expect(node.label_pl).toBe("Zrodlo PL");
    expect(node.parent_id).toBeNull();

    // Vertikale Titelzeile hat Vorrang vor der Spalte title_en
    expect(node.label_en).toBe("Source EN vertikal");

    const tr = await rows<{ locale: string; label: string }>(
      "select locale, label from public.cms_navigation_node_translations order by locale",
    );
    expect(tr).toEqual([
      { locale: "en", label: "Source EN vertikal" },
      { locale: "nl", label: "Bron NL" },
    ]);
    expect(out.nav_translations_copied).toBe(2);
  });

  it("überträgt vorhandene Titel-Prüfzustände auf die Beschriftung, ohne Freigabe zu erfinden", async () => {
    const out = await duplicate("quelle", "kopie", "/kopie", "main");
    const [node] = await rows<{ id: string }>("select id from public.cms_navigation_nodes");
    const navStates = await rows<{ locale: string; review_status: string; source_hash: string | null }>(
      `select locale, review_status, source_hash from public.cms_translation_unit_state
        where area='nav_label' and ref_key=$1 and unit_key='label' order by locale`,
      [node.id],
    );
    expect(navStates).toEqual([
      // aus dem vorhandenen page_title-Zustand übernommen
      { locale: "en", review_status: "geprueft", source_hash: "pe" },
      { locale: "nl", review_status: "maschinell", source_hash: "ph" },
      // kein Nachweis vorhanden -> maschinell, niemals geprueft
      { locale: "pl", review_status: "maschinell", source_hash: null },
    ]);
    expect(out.nav_states_copied).toBe(3);
    expect(navStates.some((s) => s.review_status === "geprueft" && s.locale === "pl")).toBe(false);
  });

  it("erzeugt durch den Navigationsknoten keinen Autopilot-Auftrag", async () => {
    await duplicate("quelle", "kopie", "/kopie", "main");
    const log = await rows<{ area: string }>("select area from public.test_autopilot_log");
    expect(log).toEqual([]);

    // Danach wieder Normalverhalten: Einfügen erzeugt Beschriftung UND Beschreibung
    await db.exec(`insert into public.cms_navigation_nodes(nav_area,node_key,label_de,description_de)
                   values ('main','danach','Danach','Beschreibung')`);
    const after = await rows<{ area: string }>("select area from public.test_autopilot_log order by id");
    expect(after.map((r) => r.area)).toEqual(["nav_label", "nav_description"]);
  });


  it("meldet einen unbekannten Eltern-Knoten und schreibt nichts", async () => {
    const out = await duplicate("quelle", "kopie", "/kopie", "main", "gibtsnicht");
    expect(out.error).toBe("nav_parent_not_found");
    expect(await count("select count(*) as n from public.cms_pages where page_key='kopie'")).toBe(0);
  });

  it("verschiebt vorhandene Navigation nicht", async () => {
    await db.exec(`insert into public.cms_navigation_nodes(nav_area,node_key,sort_order,label_de)
                   values ('main','bestehend',10,'Bestehend')`);
    const before = await rows("select id, sort_order, parent_id, is_active from public.cms_navigation_nodes");
    await duplicate("quelle", "kopie", "/kopie", "main");
    const after = await rows(
      "select id, sort_order, parent_id, is_active from public.cms_navigation_nodes where node_key='bestehend'",
    );
    expect(after).toEqual(before);
  });
});

describe("Seitenkopie: Abbrüche", () => {
  it("meldet einen belegten Zielschlüssel und schreibt nichts", async () => {
    await duplicate("quelle", "kopie");
    const before = await count("select count(*) as n from public.cms_sections where page_key='kopie'");
    const out = await duplicate("quelle", "kopie");
    expect(out.error).toBe("target_page_key_exists");
    expect(await count("select count(*) as n from public.cms_sections where page_key='kopie'")).toBe(before);
  });

  it("meldet einen belegten Pfad", async () => {
    const out = await duplicate("quelle", "kopie", "/quelle");
    expect(out.error).toBe("target_route_path_exists");
    expect(await count("select count(*) as n from public.cms_pages where page_key='kopie'")).toBe(0);
  });

  it("meldet eine unbekannte Quelle", async () => {
    const out = await duplicate("gibtsnicht", "kopie");
    expect(out.error).toBe("source_not_found");
  });

  it("bricht bei fremdem Eltern-Verweis vor jedem Schreiben ab", async () => {
    await db.exec(`
      insert into public.cms_sections(page_key,section_key,section_type) values ('fremd','extern','group_v1');
      update public.cms_sections set parent_section_id =
        (select id from public.cms_sections where page_key='fremd' and section_key='extern')
       where page_key='quelle' and section_key='karte_b';`);
    const out = await duplicate("quelle", "kopie");
    expect(out.error).toBe("section_parent_foreign");
    expect(await count("select count(*) as n from public.cms_pages where page_key='kopie'")).toBe(0);
  });

  it("bricht bei einem Zyklus in der Elternkette ab", async () => {
    await db.exec(`
      update public.cms_sections c set parent_section_id =
        (select id from public.cms_sections where page_key='quelle' and section_key='karte_a')
       where c.page_key='quelle' and c.section_key='container';`);
    const out = await duplicate("quelle", "kopie");
    expect(out.error).toBe("section_parent_cycle");
    expect(await count("select count(*) as n from public.cms_pages where page_key='kopie'")).toBe(0);
  });

  it("nimmt einen Fehler mitten im Kopieren vollständig zurück (keine halbe Seite)", async () => {
    // Fehler erst spät im Kopieren: nur für Zeilen der Kopie.
    await db.exec(`
      create function public.test_break() returns trigger language plpgsql as $$
      BEGIN
        IF EXISTS (SELECT 1 FROM public.cms_assets a WHERE a.id = NEW.asset_id AND a.page_key = 'kopie') THEN
          RAISE EXCEPTION 'test_break';
        END IF;
        RETURN NEW;
      END; $$;
      create trigger test_break_trg before insert on public.cms_asset_translations
        for each row execute function public.test_break();`);
    await expect(duplicate("quelle", "kopie")).rejects.toThrow();
    await db.exec(
      "drop trigger test_break_trg on public.cms_asset_translations; drop function public.test_break();",
    );

    expect(await count("select count(*) as n from public.cms_pages where page_key='kopie'")).toBe(0);
    expect(await count("select count(*) as n from public.cms_sections where page_key='kopie'")).toBe(0);
    expect(await count("select count(*) as n from public.cms_assets where page_key='kopie'")).toBe(0);
    expect(await count("select count(*) as n from public.cms_admin_editable_fields where page_key='kopie'")).toBe(0);
    expect(await count("select count(*) as n from public.test_autopilot_log")).toBe(0);
  });

  it("lehnt einen leeren Zielschlüssel ab", async () => {
    const out = await duplicate("quelle", "   ");
    expect(out.error).toBe("new_page_key_required");
  });

  it("lehnt einen unbekannten Navigationsbereich ab", async () => {
    const out = await duplicate("quelle", "kopie", null, "unbekannt");
    expect(out.error).toBe("nav_area_invalid");
    expect(await count("select count(*) as n from public.cms_pages where page_key='kopie'")).toBe(0);
  });
});

describe("Seitenkopie: Arbeitstabellen und Tiefe", () => {
  it("fasst gleichnamige dauerhafte Tabellen im Schema public nicht an", async () => {
    const names = [
      "_dup_sections", "_dup_fields", "_dup_whitelist", "_dup_assets",
      "_dup_asset_tr", "_dup_page_tr", "_dup_states", "_dup_map", "_dup_asset_map",
    ];
    const out = await duplicate("quelle", "kopie", "/kopie", "main");
    expect(out.success).toBe(true);
    for (const n of names) {
      // Tabelle existiert weiterhin und enthält ihre Zeile
      expect(await count(`select count(*) as n from public.${n}`)).toBe(1);
    }
  });

  it("kopiert eine gültige Elternkette tiefer als 64 Ebenen vollständig", async () => {
    await db.exec(`
      insert into public.cms_pages(page_key, page_type, title_de) values ('tief','detail','Tief');
      insert into public.cms_sections(page_key, section_key, section_type, sort_order)
        select 'tief', 'ebene_' || g, 'group_v1', g from generate_series(1,70) g;
      update public.cms_sections c set parent_section_id = p.id
        from public.cms_sections p
       where c.page_key='tief' and p.page_key='tief'
         and p.section_key = 'ebene_' || (split_part(c.section_key,'_',2)::int - 1);`);

    const out = await duplicate("tief", "tief.kopie");
    expect(out.success).toBe(true);
    expect(out.sections_copied).toBe(70);
    // jede Ebene außer der ersten hat einen Elternteil INNERHALB der Kopie
    expect(
      await count(`select count(*) as n from public.cms_sections c
                     join public.cms_sections p on p.id = c.parent_section_id
                    where c.page_key='tief.kopie' and p.page_key='tief.kopie'`),
    ).toBe(69);
  });

  it("erkennt einen Zyklus, der länger als 64 Ebenen ist", async () => {
    await db.exec(`
      insert into public.cms_pages(page_key, page_type, title_de) values ('zyklus','detail','Zyklus');
      insert into public.cms_sections(page_key, section_key, section_type, sort_order)
        select 'zyklus', 'ebene_' || g, 'group_v1', g from generate_series(1,70) g;
      update public.cms_sections c set parent_section_id = p.id
        from public.cms_sections p
       where c.page_key='zyklus' and p.page_key='zyklus'
         and p.section_key = 'ebene_' || (split_part(c.section_key,'_',2)::int - 1);
      update public.cms_sections c set parent_section_id =
        (select id from public.cms_sections where page_key='zyklus' and section_key='ebene_70')
       where c.page_key='zyklus' and c.section_key='ebene_1';`);

    const out = await duplicate("zyklus", "zyklus.kopie");
    expect(out.error).toBe("section_parent_cycle");
    expect(await count("select count(*) as n from public.cms_pages where page_key='zyklus.kopie'")).toBe(0);
  });

  it("erkennt eine belegte Route auch bei anderem Zielschlüssel", async () => {
    await duplicate("quelle", "kopie", "/kopie");
    const out = await duplicate("quelle", "kopie2", "/kopie");
    expect(out.error).toBe("target_route_path_exists");
    expect(await count("select count(*) as n from public.cms_pages where page_key='kopie2'")).toBe(0);
  });
});

