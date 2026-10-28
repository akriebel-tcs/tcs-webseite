/**
 * Storyblok-Story -> CMS-Light-Zeilen.
 *
 * Umkehrung des Migrations-Konverters (`cms_light_to_storyblok.py`): Jeder Blok
 * traegt `section_key` (und `section_uid`); verschachtelte Bloks werden wieder
 * zu Feldschluesseln wie `bullets.0`, `items.<slug>.frage`, `vorteile.1.body`,
 * `tabs.<rolle>.label`. Feld-Uebersetzungen `feld__i18n__<locale>` werden zu
 * Zeilen je Sprache. So bleiben alle bestehenden Renderer und Spezialseiten
 * (`cms.text("hero", "headline")`) unveraendert nutzbar.
 */
import type { AssetRow, FieldRow, PageRows, RawSectionRow, Viewport } from "@/lib/content/rows";

export const DEFAULT_LOCALE = "de";

type Blok = Record<string, unknown> & { _uid?: string; component?: string };

const RESERVED = new Set([
  "_uid",
  "component",
  "_editable",
  "section_key",
  "section_uid",
  "hidden",
  "children",
  "legacy_items",
  "legacy_fields",
  "legacy_assets",
  "gallery",
  "bullets",
  "chips",
  "features",
  "items",
  "advantages",
  "tabs",
]);

const LIST_FIELDS = ["bullets", "chips", "features"] as const;
const VIEWPORTS: Viewport[] = ["desktop", "tablet", "mobile"];

interface Ctx {
  rows: PageRows;
  sectionKey: string;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** `title__i18n__en` -> ["title", "en"]; `title` -> ["title", "de"]. */
export function splitI18nKey(key: string): [string, string] {
  const idx = key.indexOf("__i18n__");
  if (idx === -1) return [key, DEFAULT_LOCALE];
  return [key.slice(0, idx), key.slice(idx + 8)];
}

/** Skalarer Storyblok-Wert -> CMS-Light-Textwert (oder null, wenn nicht abbildbar). */
export function scalarToText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number") return String(value);
  if (isPlainObject(value)) {
    if (value.fieldtype === "multilink" || value.linktype) {
      const url = (value.cached_url as string) || (value.url as string) || "";
      const anchor = value.anchor ? `#${value.anchor}` : "";
      return url ? `${url}${anchor}` : null;
    }
    // Richtext (ProseMirror) -> reiner Text, Absaetze durch Zeilenumbrueche
    if (value.type === "doc" && Array.isArray(value.content)) return richtextToPlain(value);
  }
  return null;
}

function richtextToPlain(doc: Record<string, unknown>): string {
  const blocks: string[] = [];
  const walk = (node: Record<string, unknown>, acc: string[]) => {
    if (node.type === "text" && typeof node.text === "string") acc.push(node.text);
    if (node.type === "hard_break") acc.push("\n");
    for (const child of (node.content as Record<string, unknown>[] | undefined) ?? []) walk(child, acc);
  };
  for (const node of (doc.content as Record<string, unknown>[]) ?? []) {
    const acc: string[] = [];
    walk(node, acc);
    blocks.push(acc.join(""));
  }
  return blocks.join("\n");
}

function isAssetValue(v: unknown): v is Record<string, unknown> {
  return isPlainObject(v) && (v.fieldtype === "asset" || (typeof v.filename === "string" && "alt" in v));
}

function pushField(ctx: Ctx, fieldKey: string, locale: string, value: unknown): void {
  const text = scalarToText(value);
  if (text === null || text === "") return;
  ctx.rows.fields.push({ section_key: ctx.sectionKey, field_key: fieldKey, locale, value: text, review_status: null });
}

/** Alle Sprachvarianten eines Feldes (`key`, `key__i18n__xx`) eines Objekts schreiben. */
function pushLocalized(ctx: Ctx, obj: Record<string, unknown>, sourceKey: string, targetKey: string): void {
  for (const [k, v] of Object.entries(obj)) {
    const [base, locale] = splitI18nKey(k);
    if (base !== sourceKey) continue;
    pushField(ctx, targetKey, locale, v);
  }
}

function pushAsset(ctx: Ctx, fieldKey: string, viewport: Viewport, asset: Record<string, unknown>): void {
  const url = typeof asset.filename === "string" ? asset.filename : "";
  if (!url) return;
  const translations: Array<{ locale: string; alt_text: string }> = [];
  for (const [k, v] of Object.entries(asset)) {
    const [base, locale] = splitI18nKey(k);
    if (base !== "alt" || typeof v !== "string" || v.trim() === "") continue;
    translations.push({ locale, alt_text: v });
  }
  const alt = (loc: string) => translations.find((t) => t.locale === loc)?.alt_text ?? null;
  ctx.rows.assets.push({
    section_key: ctx.sectionKey,
    field_key: fieldKey,
    public_url: url,
    alt_de: alt("de"),
    alt_en: alt("en"),
    alt_pl: alt("pl"),
    viewport,
    cms_asset_translations: translations,
  });
}

/** `legacy_fields` ist JSON `{ "<key>": { "<locale>": "<wert>" } }` (Konverter). */
function pushLegacyFields(ctx: Ctx, raw: unknown, prefix = ""): void {
  if (typeof raw !== "string" || raw.trim() === "") return;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }
  if (!isPlainObject(parsed)) return;
  for (const [key, byLocale] of Object.entries(parsed)) {
    if (isPlainObject(byLocale)) {
      for (const [locale, value] of Object.entries(byLocale)) pushField(ctx, `${prefix}${key}`, locale, value);
    } else {
      pushField(ctx, `${prefix}${key}`, DEFAULT_LOCALE, byLocale);
    }
  }
}

function flattenListItems(ctx: Ctx, prefix: string, items: unknown): void {
  if (!Array.isArray(items)) return;
  items.forEach((item, i) => {
    if (!isPlainObject(item)) return;
    pushLocalized(ctx, item, "text", `${prefix}.${i}`);
    if (typeof item.enabled === "boolean") pushField(ctx, `${prefix}_${i}_enabled`, DEFAULT_LOCALE, item.enabled);
  });
}

const ITEM_FIELD_MAP: Record<string, string> = { image_alt: "imageAlt" };

function flattenLegacyItem(ctx: Ctx, item: Record<string, unknown>): void {
  const component = item.component;
  if (component === "group_item") {
    const g = String(item.group_key ?? "");
    if (!g) return;
    for (const k of ["title", "label", "description", "text", "icon"]) pushLocalized(ctx, item, k, `${g}.${k}`);
    flattenListItems(ctx, `${g}.items`, item.items);
    pushLegacyFields(ctx, item.legacy_fields, `${g}.`);
    return;
  }
  const slug = String(item.item_key ?? "");
  if (!slug) return;
  for (const [k, v] of Object.entries(item)) {
    const [base, locale] = splitI18nKey(k);
    if (["_uid", "component", "_editable", "item_key", "advantages", "legacy_fields", "enabled"].includes(base)) continue;
    if (isAssetValue(v)) {
      pushAsset(ctx, `${slug}.${base}`, "desktop", v);
      continue;
    }
    pushField(ctx, `items.${slug}.${ITEM_FIELD_MAP[base] ?? base}`, locale, v);
  }
  if (typeof item.enabled === "boolean") pushField(ctx, `items.${slug}.enabled`, DEFAULT_LOCALE, item.enabled);
  if (Array.isArray(item.advantages)) {
    item.advantages.forEach((adv, i) => {
      if (isPlainObject(adv)) pushLocalized(ctx, adv, "headline", `items.${slug}.vorteile.${i}`);
    });
  }
  pushLegacyFields(ctx, item.legacy_fields, `items.${slug}.`);
}

function flattenFaqItems(ctx: Ctx, items: unknown): void {
  if (!Array.isArray(items)) return;
  items.forEach((item, i) => {
    if (!isPlainObject(item)) return;
    const slug = String(item.item_key ?? `q${i + 1}`);
    pushLocalized(ctx, item, "question", `items.${slug}.frage`);
    pushLocalized(ctx, item, "answer", `items.${slug}.antwort`);
    pushLocalized(ctx, item, "category", `items.${slug}.category`);
    pushLocalized(ctx, item, "cta_label", `items.${slug}.cta_label`);
    pushLocalized(ctx, item, "cta_href", `items.${slug}.cta_href`);
    if (typeof item.enabled === "boolean") pushField(ctx, `items.${slug}.enabled`, DEFAULT_LOCALE, item.enabled);
    pushLegacyFields(ctx, item.legacy_fields, `items.${slug}.`);
  });
}

function flattenAdvantages(ctx: Ctx, items: unknown): void {
  if (!Array.isArray(items)) return;
  items.forEach((adv, i) => {
    if (!isPlainObject(adv)) return;
    for (const k of ["headline", "body", "online_href", "vcf_href"]) pushLocalized(ctx, adv, k, `vorteile.${i}.${k}`);
  });
}

function flattenRoleTabs(ctx: Ctx, tabs: unknown): void {
  if (!Array.isArray(tabs)) return;
  for (const tab of tabs) {
    if (!isPlainObject(tab)) continue;
    const key = String(tab.role_key ?? "");
    if (!key) continue;
    for (const k of ["label", "headline", "p1", "p2"]) pushLocalized(ctx, tab, k, `tabs.${key}.${k}`);
  }
}

/** Asset-Feldname -> [Slot, Viewport]: `image_tablet` -> ["image", "tablet"]. */
export function splitAssetKey(key: string): [string, Viewport] {
  for (const vp of VIEWPORTS) {
    if (vp !== "desktop" && key.endsWith(`_${vp}`)) return [key.slice(0, -(vp.length + 1)), vp];
  }
  return [key, "desktop"];
}

function flattenBlok(rows: PageRows, blok: Blok, parentId: string | null, index: number): void {
  if (blok.hidden === true) return; // ehemals is_active=false: wird nicht gerendert, Kinder ebenfalls nicht
  const sectionKey = String(blok.section_key ?? blok._uid ?? "");
  const id = String(blok._uid ?? `${parentId ?? "root"}-${index}`);
  rows.sections.push({
    id,
    section_key: sectionKey,
    section_type: typeof blok.component === "string" ? blok.component : null,
    sort_order: index,
    parent_section_id: parentId,
    section_uid: typeof blok.section_uid === "string" ? blok.section_uid : null,
    editable: typeof blok._editable === "string" ? blok._editable : null,
  });
  const ctx: Ctx = { rows, sectionKey };

  for (const [k, v] of Object.entries(blok)) {
    const [base, locale] = splitI18nKey(k);
    // `items` ist bei FAQ eine Blok-Liste, bei list_v1 ein Textfeld (eine Zeile je Eintrag)
    if (RESERVED.has(base) && !(base === "items" && !Array.isArray(v))) continue;
    if (isAssetValue(v)) {
      const [slot, vp] = splitAssetKey(base);
      pushAsset(ctx, slot, vp, v);
      continue;
    }
    if (Array.isArray(v)) continue; // unbekannte Blok-Listen: keine Entsprechung im Zeilenmodell
    pushField(ctx, base, locale, v);
  }

  for (const list of LIST_FIELDS) flattenListItems(ctx, list, blok[list]);
  flattenFaqItems(ctx, blok.items);
  flattenAdvantages(ctx, blok.advantages);
  flattenRoleTabs(ctx, blok.tabs);
  if (Array.isArray(blok.legacy_items)) {
    for (const item of blok.legacy_items) if (isPlainObject(item)) flattenLegacyItem(ctx, item);
  }
  pushLegacyFields(ctx, blok.legacy_fields);

  if (Array.isArray(blok.gallery)) {
    blok.gallery.forEach((asset, i) => {
      if (isAssetValue(asset)) pushAsset(ctx, `img_${i}`, "desktop", asset);
    });
  }
  if (Array.isArray(blok.legacy_assets)) {
    for (const a of blok.legacy_assets) {
      if (!isPlainObject(a)) continue;
      const vp = (VIEWPORTS as string[]).includes(String(a.viewport)) ? (a.viewport as Viewport) : "desktop";
      pushAsset(ctx, String(a.field_key ?? "image"), vp, a);
    }
  }

  if (Array.isArray(blok.children)) {
    blok.children.forEach((child, i) => {
      if (isPlainObject(child)) flattenBlok(rows, child as Blok, id, i);
    });
  }
}

export interface PageStoryContent {
  component?: string;
  page_key?: string;
  page_type?: string;
  page_no?: string;
  title?: string;
  body?: Blok[];
  [key: string]: unknown;
}

/** Story-Inhalt (Content-Type `page`) -> Zeilen fuer useCmsPageContent. */
export function flattenPageContent(content: PageStoryContent | null | undefined): PageRows {
  const rows: PageRows = { fields: [], assets: [], sections: [] };
  if (!content) return rows;
  const body = Array.isArray(content.body) ? content.body : [];
  body.forEach((blok, i) => {
    if (isPlainObject(blok)) flattenBlok(rows, blok as Blok, null, i);
  });
  // Seitentitel als Pseudo-Feld, damit Renderer ihn wie bisher ueber meta lesen koennen
  const ctx: Ctx = { rows, sectionKey: "__page__" };
  pushLocalized(ctx, content, "title", "title");
  pushLocalized(ctx, content, "meta_title", "meta_title");
  pushLocalized(ctx, content, "meta_description", "meta_description");
  return rows;
}

/** Sprachkarte eines Feldes: { de: "...", en: "..." } */
export function localizedMap(obj: Record<string, unknown>, field: string): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(obj)) {
    const [base, locale] = splitI18nKey(k);
    if (base !== field) continue;
    const text = scalarToText(v);
    if (text) out[locale] = text;
  }
  return out;
}
