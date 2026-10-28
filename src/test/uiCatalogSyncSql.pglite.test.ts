// @vitest-environment node
/**
 * TATSÄCHLICH AUSGEFÜHRTE Prüfung des SQL-Entwurfs für den additiven
 * Abgleich des Bedienungstext-Katalogs (Etappe 2B).
 *
 * Der SQL-Block wird direkt aus dem Entwurfsdokument gelesen und in eine
 * isolierte Datenbank (PGlite, echtes PostgreSQL im Prozess) eingespielt.
 * Es werden ausschließlich künstliche Testdaten verwendet. Es gibt keine
 * Verbindung zur laufenden Datenbank, keine Migration, kein Deployment.
 *
 * Autopilot und Fingerabdruck sind durch beobachtbare Testfunktionen
 * ersetzt; der Trigger wird wie in der Live-Datenbank an
 * `cms_autopilot_trg_ui_strings()` gebunden.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const DRAFT = "docs/04-betrieb/sql-entwurf-ui-katalog-abgleich-2026-09-14.md";

function draftSql(): string {
  const text = readFileSync(resolve(process.cwd(), DRAFT), "utf8");
  const match = text.match(/```sql\n([\s\S]*?)\n```/);
  if (!match) throw new Error("SQL-Block im Entwurf nicht gefunden");
  return match[1];
}

/** Nachbau der beteiligten Tabellen (Spalten/Constraints wie live). */
const SCHEMA = `
CREATE TABLE public.cms_locales (
  locale text PRIMARY KEY,
  label_de text NOT NULL,
  label_native text NOT NULL,
  is_source boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT false,
  is_public boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cms_ui_strings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace text NOT NULL,
  string_key text NOT NULL,
  source_text text NOT NULL,
  source_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  manifest_version text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (namespace, string_key)
);

CREATE TABLE public.cms_ui_string_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ui_string_id uuid NOT NULL REFERENCES public.cms_ui_strings(id) ON DELETE CASCADE,
  locale text NOT NULL REFERENCES public.cms_locales(locale),
  value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ui_string_id, locale)
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

-- beobachtbarer Ersatz für den Autopilot
CREATE TABLE public.test_autopilot_log (
  id serial PRIMARY KEY,
  area text,
  unit_key text
);

CREATE FUNCTION public.cms_translation_hash(p_text text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT md5(coalesce(p_text, '')) $$;

CREATE FUNCTION public.cms_autopilot_enqueue_unit(
  p_area text, p_ref_id uuid, p_page_key text, p_section_key text,
  p_unit_key text, p_source_text text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.test_autopilot_log(area, unit_key) VALUES (p_area, p_unit_key);
END; $$;
`;

const ROLES = `
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role; END IF;
END $$;
`;

const TRIGGER = `
CREATE TRIGGER cms_autopilot_ui_strings_aiu
AFTER INSERT OR UPDATE OF source_text, is_active ON public.cms_ui_strings
FOR EACH ROW EXECUTE FUNCTION public.cms_autopilot_trg_ui_strings();
`;

/** Trigger-Fassung OHNE Unterdrückungs-Kennung (alter Stand). */
const OLD_TRIGGER_FN = `
CREATE OR REPLACE FUNCTION public.cms_autopilot_trg_ui_strings()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.is_active AND (TG_OP = 'INSERT' OR coalesce(OLD.source_text,'') <> coalesce(NEW.source_text,'')) THEN
    PERFORM public.cms_autopilot_enqueue_unit('ui_string', NEW.id, '~ui', NEW.namespace, NEW.string_key, NEW.source_text);
  END IF;
  RETURN NULL;
END; $function$;
`;

let db: PGlite;
const NEW_TRIGGER_FN = draftSql().match(
  /CREATE OR REPLACE FUNCTION public\.cms_autopilot_trg_ui_strings\(\)[\s\S]*?\$function\$;/,
)![0];

type Json = Record<string, unknown>;

async function sync(manifest: unknown): Promise<Json> {
  const res = await db.query<{ out: Json }>(
    "select public.rpc_admin_sync_ui_strings($1::jsonb) as out",
    [JSON.stringify(manifest)],
  );
  return res.rows[0].out;
}

async function count(sql: string): Promise<number> {
  const res = await db.query<{ n: number }>(sql);
  return Number(res.rows[0].n);
}

const entry = (key: string, de: string, seed?: Record<string, string>) => ({
  namespace: "common",
  key,
  de,
  ...(seed ? { seed } : {}),
});

const manifestOf = (entries: unknown[], extra: Json = {}) => ({
  version: "m-test-1",
  entries,
  ...extra,
});

beforeAll(async () => {
  db = new PGlite();
  await db.exec(ROLES);
  await db.exec(SCHEMA);
  await db.exec(draftSql());
  await db.exec(TRIGGER);
}, 60_000);

afterAll(async () => {
  await db?.close();
});

beforeEach(async () => {
  await db.exec(`
    TRUNCATE public.cms_translation_unit_state, public.cms_ui_string_translations,
             public.cms_ui_strings, public.test_autopilot_log RESTART IDENTITY CASCADE;
    DELETE FROM public.cms_locales;
    INSERT INTO public.cms_locales(locale, label_de, label_native, is_source, is_active, sort_order)
    VALUES ('de','Deutsch','Deutsch',true,true,1),
           ('en','Englisch','English',false,true,2),
           ('da','Dänisch','Dansk',false,false,3);
  `);
  await db.exec(NEW_TRIGGER_FN);
});

describe("SQL-Entwurf ausgeführt: Eingabeprüfung (die sechs Befunde der Nachprüfung)", () => {
  it("lehnt ein Manifest ohne entries ab", async () => {
    const out = await sync({ version: "v" });
    expect(out.error).toBe("entries_invalid");
    expect(out.applied).toBe(false);
  });

  it("lehnt eine Version ab, die keine Zeichenkette ist", async () => {
    const out = await sync({ version: 25, entries: [entry("k1", "Eins")] });
    expect(out.error).toBe("version_invalid");
  });

  it("lehnt einen leeren Eintrag ab", async () => {
    const out = await sync(manifestOf([{}]));
    expect(out.error).toBe("entries_invalid_rows");
  });

  it("lehnt einen Eintrag ohne namespace ab", async () => {
    const out = await sync(manifestOf([{ key: "k1", de: "Eins" }]));
    expect(out.error).toBe("entries_invalid_rows");
    expect(JSON.stringify(out.problems)).toContain("namespace");
  });

  it("lehnt einen Eintrag ohne key ab", async () => {
    const out = await sync(manifestOf([{ namespace: "common", de: "Eins" }]));
    expect(out.error).toBe("entries_invalid_rows");
    expect(JSON.stringify(out.problems)).toContain("key");
  });

  it("lehnt einen Eintrag ohne deutschen Text ab", async () => {
    const out = await sync(manifestOf([{ namespace: "common", key: "k1" }]));
    expect(out.error).toBe("entries_invalid_rows");
    expect(JSON.stringify(out.problems)).toContain("de");
  });

  it("lehnt weitere ungültige Formen ab und schreibt nie", async () => {
    expect((await sync(null)).error).toBe("manifest_invalid");
    expect((await sync({ version: "v", entries: [] })).error).toBe("entries_empty");
    expect((await sync(manifestOf([entry("k1", "Eins")], { dry_run: "ja" }))).error).toBe(
      "dry_run_invalid",
    );
    expect(
      (await sync(manifestOf([entry("k1", "Eins"), entry("k1", "Eins")]))).error,
    ).toBe("entries_duplicate_keys");
    expect((await sync(manifestOf([entry("k1", "Eins", { xx: "One" })]))).error).toBe(
      "entries_invalid_rows",
    );
    expect((await sync(manifestOf([entry("k1", "Eins", { da: "En" })]))).error).toBe(
      "entries_invalid_rows",
    );
    expect(await count("select count(*) n from public.cms_ui_strings")).toBe(0);
  });
});

describe("SQL-Entwurf ausgeführt: Vorschau", () => {
  it("zählt auch die Startwerte NEUER Schlüssel und schreibt nichts", async () => {
    const out = await sync(manifestOf([entry("neu", "Neu", { en: "New" })]));
    expect(out.success).toBe(true);
    expect(out.applied).toBe(false);
    const report = out.report as Json;
    expect(report.missing_sources).toBe(1);
    expect(report.seed_candidates).toBe(1);
    expect(report.missing_translations).toEqual({ en: 1 });
    expect(await count("select count(*) n from public.cms_ui_strings")).toBe(0);
    expect(await count("select count(*) n from public.test_autopilot_log")).toBe(0);
  });

  it("weist stillgelegte Katalogzeilen als übersprungen aus", async () => {
    await db.exec(`
      INSERT INTO public.cms_ui_strings(namespace, string_key, source_text, source_hash, is_active)
      VALUES ('common','alt','Alt', md5('Alt'), false);
    `);
    const out = await sync(manifestOf([entry("alt", "Alt", { en: "Old" })]));
    const report = out.report as Json;
    expect(report.skipped_inactive_sources).toBe(1);
    expect(report.skipped_inactive_seeds).toBe(1);
    expect(report.seed_candidates).toBe(0);
    expect(report.missing_translations).toEqual({});
  });
});

describe("SQL-Entwurf ausgeführt: Anwenden", () => {
  const manifest = manifestOf([entry("neu", "Neu", { en: "New" })], { dry_run: false });

  it("fügt Schlüssel und Startwert ein, ohne Auftrag und ohne Freigabe", async () => {
    const out = await sync(manifest);
    expect(out.applied).toBe(true);
    expect(out.inserted_strings).toBe(1);
    expect(out.inserted_translations).toBe(1);
    expect(out.inserted_review_states).toBe(1);
    expect(out.own_import_autopilot_suppressed).toBe(true);
    expect(out.protocol_version).toBe(2);
    expect(await count("select count(*) n from public.test_autopilot_log")).toBe(0);
    const state = await db.query<{ review_status: string }>(
      "select review_status from public.cms_translation_unit_state",
    );
    expect(state.rows.map((r) => r.review_status)).toEqual(["maschinell"]);
  });

  it("wirkt bei Wiederholung nicht erneut", async () => {
    await sync(manifest);
    const again = await sync(manifest);
    expect(again.inserted_strings).toBe(0);
    expect(again.inserted_translations).toBe(0);
    expect(await count("select count(*) n from public.cms_ui_string_translations")).toBe(1);
  });

  it("lässt den Trigger danach normal arbeiten", async () => {
    await sync(manifest);
    await db.exec(`
      INSERT INTO public.cms_ui_strings(namespace, string_key, source_text, source_hash)
      VALUES ('common','redaktionell','Von Hand', md5('Von Hand'));
    `);
    expect(await count("select count(*) n from public.test_autopilot_log")).toBe(1);
  });

  it("überschreibt weder deutsche Quelle noch Zieltext noch Freigabe", async () => {
    await db.exec(`
      INSERT INTO public.cms_ui_strings(namespace, string_key, source_text, source_hash)
      VALUES ('common','vorhanden','Anders', md5('Anders'));
      INSERT INTO public.cms_ui_string_translations(ui_string_id, locale, value)
      SELECT id, 'en', '' FROM public.cms_ui_strings WHERE string_key = 'vorhanden';
    `);
    const out = await sync(
      manifestOf([entry("vorhanden", "Neu im Code", { en: "New" })], { dry_run: false }),
    );
    expect((out.report as Json).source_conflicts).toBe(1);
    expect(out.inserted_translations).toBe(0);
    const row = await db.query<{ source_text: string; value: string }>(
      `select u.source_text, t.value from public.cms_ui_strings u
         join public.cms_ui_string_translations t on t.ui_string_id = u.id`,
    );
    expect(row.rows[0].source_text).toBe("Anders");
    expect(row.rows[0].value).toBe("");
  });

  it("ergänzt stillgelegte Zeilen nicht beiläufig mit Startwerten", async () => {
    await db.exec(`
      INSERT INTO public.cms_ui_strings(namespace, string_key, source_text, source_hash, is_active)
      VALUES ('common','alt','Alt', md5('Alt'), false);
    `);
    const out = await sync(manifestOf([entry("alt", "Alt", { en: "Old" })], { dry_run: false }));
    expect(out.inserted_translations).toBe(0);
    expect(await count("select count(*) n from public.cms_ui_string_translations")).toBe(0);
    expect(
      await count("select count(*) n from public.cms_ui_strings where is_active"),
    ).toBe(0);
  });

  it("importiert nicht in einen verwaisten Prüfzustand hinein", async () => {
    await db.exec(`
      INSERT INTO public.cms_ui_strings(namespace, string_key, source_text, source_hash)
      VALUES ('common','waise','Waise', md5('Waise'));
      INSERT INTO public.cms_translation_unit_state(area, ref_key, unit_key, locale, review_status)
      VALUES ('ui_string','common|waise','waise','en','geprueft');
    `);
    const out = await sync(manifestOf([entry("waise", "Waise", { en: "Orphan" })], { dry_run: false }));
    expect((out.report as Json).review_state_conflicts).toBe(1);
    expect(out.inserted_translations).toBe(0);
    expect(await count("select count(*) n from public.cms_ui_string_translations")).toBe(0);
    const state = await db.query<{ review_status: string }>(
      "select review_status from public.cms_translation_unit_state",
    );
    expect(state.rows.map((r) => r.review_status)).toEqual(["geprueft"]);
  });

  it("erkennt den verwaisten Prüfzustand auch bei noch fehlender Quellzeile", async () => {
    // Nur ein Prüfzustand, keine Quell- und keine Zielzeile.
    await db.exec(`
      INSERT INTO public.cms_translation_unit_state(area, ref_key, unit_key, locale, review_status)
      VALUES ('ui_string','test|new-orphan','new-orphan','en','geprueft');
    `);
    const neu = { namespace: "test", key: "new-orphan", de: "Neu", seed: { en: "New" } };

    const dry = await sync(manifestOf([neu]));
    const report = dry.report as Json;
    expect(report.review_state_conflicts).toBe(1);
    expect(report.seed_candidates).toBe(0);

    const applied = await sync(manifestOf([neu], { dry_run: false }));
    expect(applied.inserted_strings).toBe(1);
    expect(applied.inserted_translations).toBe(0);
    expect(applied.inserted_review_states).toBe(0);
    expect(await count("select count(*) n from public.cms_ui_string_translations")).toBe(0);
    expect(await count("select count(*) n from public.cms_translation_unit_state")).toBe(1);
  });

  it("bricht vollständig ab, wenn der Prüfzustand nicht mitgeschrieben wird", async () => {
    await db.exec(`
      CREATE FUNCTION public.test_block_state() RETURNS trigger LANGUAGE plpgsql
        AS $$ BEGIN RETURN NULL; END $$;
      CREATE TRIGGER test_block_state_bi BEFORE INSERT ON public.cms_translation_unit_state
        FOR EACH ROW EXECUTE FUNCTION public.test_block_state();
    `);
    await expect(sync(manifest)).rejects.toThrow(/Prüfzustände weichen ab/);
    await db.exec(`
      DROP TRIGGER test_block_state_bi ON public.cms_translation_unit_state;
      DROP FUNCTION public.test_block_state();
    `);
    expect(await count("select count(*) n from public.cms_ui_strings")).toBe(0);
    expect(await count("select count(*) n from public.cms_ui_string_translations")).toBe(0);
  });
});

describe("SQL-Entwurf ausgeführt: Protokollstand und Rechte", () => {
  it("meldet Protokollversion 2 und den Trigger-Vertrag", async () => {
    const res = await db.query<{ out: Json }>(
      "select public.rpc_admin_ui_catalog_sync_capabilities() as out",
    );
    expect(res.rows[0].out.protocol_version).toBe(2);
    expect(res.rows[0].out.trigger_suppression_supported).toBe(true);
    expect(res.rows[0].out.writes).toBe("insert_only");
  });

  it("schreibt nichts, wenn der Trigger-Vertrag fehlt (fail-closed)", async () => {
    await db.exec(OLD_TRIGGER_FN);
    const caps = await db.query<{ out: Json }>(
      "select public.rpc_admin_ui_catalog_sync_capabilities() as out",
    );
    expect(caps.rows[0].out.trigger_suppression_supported).toBe(false);

    const out = await sync(manifestOf([entry("neu", "Neu", { en: "New" })], { dry_run: false }));
    expect(out.error).toBe("trigger_contract_missing");
    expect(out.applied).toBe(false);
    expect(await count("select count(*) n from public.cms_ui_strings")).toBe(0);
    expect(await count("select count(*) n from public.test_autopilot_log")).toBe(0);
  });

  it("gibt beide Verträge nur der Dienstrolle frei", async () => {
    for (const fn of [
      "public.rpc_admin_sync_ui_strings(jsonb)",
      "public.rpc_admin_ui_catalog_sync_capabilities()",
    ]) {
      const res = await db.query<{ svc: boolean; anon: boolean; auth: boolean; pub: boolean }>(
        `select has_function_privilege('service_role', '${fn}', 'EXECUTE') svc,
                has_function_privilege('anon', '${fn}', 'EXECUTE') anon,
                has_function_privilege('authenticated', '${fn}', 'EXECUTE') auth,
                has_function_privilege('public', '${fn}', 'EXECUTE') pub`,
      );
      expect(res.rows[0].svc).toBe(true);
      expect(res.rows[0].anon).toBe(false);
      expect(res.rows[0].auth).toBe(false);
      expect(res.rows[0].pub).toBe(false);
    }
  });
});
