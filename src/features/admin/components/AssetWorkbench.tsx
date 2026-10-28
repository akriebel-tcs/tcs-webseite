/**
 * AssetWorkbench — zentrale Bildredaktion für alle CMS-Assets.
 *
 * Lesepfad: `rpc_admin_read_assets_overview` (read-only). Schreibwege
 * ausschließlich über bereits vorhandene RPCs in `cmsAdminAssets.ts`
 * (`uploadAsset`, `updateAssetAlt`, `deleteAsset`).
 *
 * Diese Workbench listet ALLE Asset-Zeilen einer Seite, gruppiert nach
 * Slot (page_key + section_key + field_key), zeigt für jeden Slot drei
 * Viewports (desktop/tablet/mobile), Aktiv-Flags, Alt-Texte, Dubletten
 * und Section/Page-Status. Bearbeitung passiert in einem Slot-Dialog,
 * der den bestehenden AssetUploader wiederverwendet.
 *
 * Wichtig:
 * - Keine Public-Website-Änderung.
 * - Keine Produktdatenbank.
 * - Keine direkten Tabellen-Schreibzugriffe.
 * - Repo-Dateien unter src/features/(...)/assets bleiben unangetastet.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  readAssets,
  readAssetsOverview,
  type CmsAssetOverviewRow,
  type CmsAssetRow,
} from "@/features/admin/api/cmsAdminAssets";
import {
  readEditableFields,
  type EditableFieldRow,
} from "@/features/admin/api/cmsAdminEditableFields";
import {
  readAllIconFields,
  type IconFieldRow,
} from "@/features/admin/api/cmsAdminIconFields";
import { saveSectionField } from "@/features/admin/api/cmsAdminWrite";
import AssetUploader from "@/features/admin/components/AssetUploader";
import AdminPreviewDrawer from "@/features/admin/components/AdminPreviewDrawer";
import IconPickerDialog from "@/features/admin/components/IconPickerDialog";
import { resolveIcon } from "@/features/cms/components/iconResolver";
import {
  RENDERER_SLOT_MAP,
  normalizeSectionType,
} from "@/features/admin/lib/rendererSlotMap";
import { getEditorialSectionKind } from "@/features/admin/lib/editorialSectionKind";


/**
 * Erkennt Slots auf aktiven Container-/Parent-Sections, die der Renderer
 * laut `rendererSlotMap` GAR NICHT liest (z. B. ein alter Parent-Bildslot
 * `produkte.image_3d` auf `product_scroller_v1`, der seine Bilder
 * tatsächlich nur über die Kind-Sections `card_v1.image` bezieht).
 *
 * Solche Slots werden in der Standardansicht als „Legacy / Renderer
 * ignoriert" behandelt und nur unter „Legacy / Inaktiv anzeigen"
 * sichtbar gemacht. Unbekannte section_types werden NICHT markiert,
 * damit wir hier nichts versehentlich verstecken.
 */
const THUMBNAIL_PARENT_CONTAINERS = new Set([
  "card_grid_v1",
  "catalog_filter_grid_v1",
]);

function isRendererIgnoredSlot(
  sectionType: string | null | undefined,
  fieldKey: string | null | undefined,
  parentSectionType: string | null | undefined = null,
): boolean {
  if (!fieldKey) return false;
  const norm = normalizeSectionType(sectionType ?? null);
  if (!norm) return false;
  const spec = RENDERER_SLOT_MAP[norm];
  if (!spec) return false; // unbekannter Typ → nicht filtern
  if (!spec.some((s) => s.fieldKey === fieldKey)) return true;

  // card_v1 trägt sowohl `image` als auch `thumbnail` im Spec, weil der
  // tatsächlich gelesene Slot vom Parent-Container abhängt:
  //  - `card_grid_v1` / `catalog_filter_grid_v1` (Hub-/Filter-Grid) → `thumbnail`
  //  - alle anderen (`cards_v1`, `product_scroller_v1`, …) → `image`
  // Der jeweils nicht passende Slot ist auf dieser Karte renderer-ignoriert
  // und erscheint nur unter „Legacy/Inaktiv anzeigen".
  if (norm === "card_v1" && (fieldKey === "image" || fieldKey === "thumbnail")) {
    const parentNorm = normalizeSectionType(parentSectionType ?? null);
    const usesThumbnail = !!parentNorm && THUMBNAIL_PARENT_CONTAINERS.has(parentNorm);
    if (usesThumbnail && fieldKey === "image") return true;
    if (!usesThumbnail && fieldKey === "thumbnail") return true;
  }
  return false;
}

type ViewportKey = "desktop" | "tablet" | "mobile";

interface SlotKey {
  page_key: string;
  section_key: string;
  field_key: string;
}

interface SlotRow extends SlotKey {
  /** "image" = klassischer Bild-Slot aus cms_assets; "icon" = Lucide-Icon-Feld aus cms_section_fields. */
  kind: "image" | "icon";
  page_title_de: string | null;
  page_status: string | null;
  page_is_active: boolean | null;
  page_route_path: string | null;
  section_type: string | null;
  section_is_active: boolean | null;
  /** section_type der Parent-Section (z. B. `card_grid_v1`), falls vorhanden. */
  parent_section_type: string | null;
  byViewport: Record<ViewportKey, CmsAssetOverviewRow[]>;
  /** Aktive Zeile pro Viewport (oder undefined). */
  active: Record<ViewportKey, CmsAssetOverviewRow | undefined>;
  /** True, wenn der Slot nur über die Whitelist bekannt ist (noch kein Asset). */
  is_planned_only: boolean;
  /** True, wenn Page/Section-Meta unbekannt sind (keine Quelle hat sie geliefert). */
  meta_unknown: boolean;
  /** Nur für `kind === "icon"`: aktueller Wert (DE bevorzugt) und EN. */
  icon_value_de?: string | null;
  icon_value_en?: string | null;
}


const VIEWPORTS: ViewportKey[] = ["desktop", "tablet", "mobile"];

/**
 * Routen-Normalisierung für Vergleiche zwischen Vorschau (iframe-URL inkl.
 * `?_p=…` Cache-Buster, evtl. Hash) und `cms_pages.route_path`. Strippt
 * Query/Hash und trailing slash (außer "/").
 */
function normalizeRoute(input: string | null | undefined): string {
  if (!input) return "";
  let p = input.trim();
  // Vollständige URL → nur Pfad behalten.
  if (/^https?:\/\//i.test(p)) {
    try {
      p = new URL(p).pathname;
    } catch {
      /* ignore */
    }
  }
  // Query/Hash entfernen.
  const qIdx = p.indexOf("?");
  if (qIdx >= 0) p = p.slice(0, qIdx);
  const hIdx = p.indexOf("#");
  if (hIdx >= 0) p = p.slice(0, hIdx);
  if (!p.startsWith("/")) p = "/" + p;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p;
}

/**
 * Heuristik: gilt ein `field_key` als Bildplatz?
 * Hartes Whitelist plus Muster, die in der DB nachweislich Asset-Slots tragen.
 * Bewusst eng — Eyebrow/Headline/Alt-Felder sind keine Bildplätze.
 */
const IMAGE_FIELD_NAME_RE =
  /^(image|logo|thumbnail|icon_image|hero_image|background_image|og_image)$|^(image|img|gallery)_|\.(image|img|thumbnail|icon_image)$/i;

const NON_ASSET_FIELD_KEYS = new Set([
  "image_position",
  "image_alt",
  "imageAlt",
  "background_variant",
  "caption",
  "credit",
  // `icon` ist ein Textfeld mit Lucide-Icon-Picker (Inhalte-Bereich),
  // KEIN Bildslot. Es wird in der Bildredaktion absichtlich ignoriert.
  "icon",
]);

/**
 * Legacy-Bildfeldnamen (Stand 2026-05-16): Pro Slot gibt es jetzt einen
 * `field_key` (z. B. `image`) mit drei Viewport-Varianten. Die alten
 * Feldnamen `image_desktop`/`image_tablet`/`image_mobile` werden vom
 * Renderer nicht mehr gelesen und sollen in der Standardansicht der
 * Bildredaktion nicht mehr als eigenständige aktuelle Bildplätze
 * erscheinen — sie bleiben aber unter „Legacy / Inaktiv anzeigen"
 * nachvollziehbar.
 */
const LEGACY_VIEWPORT_FIELD_KEYS = new Set([
  "image_desktop",
  "image_tablet",
  "image_mobile",
]);

function isLegacyViewportFieldKey(fieldKey: string | null | undefined): boolean {
  return !!fieldKey && LEGACY_VIEWPORT_FIELD_KEYS.has(fieldKey);
}

function isImageFieldKey(fieldKey: string | null | undefined, assetKnownFieldKeys: Set<string>): boolean {
  if (!fieldKey) return false;
  if (NON_ASSET_FIELD_KEYS.has(fieldKey)) return false;
  if (assetKnownFieldKeys.has(fieldKey)) return true;
  return IMAGE_FIELD_NAME_RE.test(fieldKey);
}


/**
 * Baut die Slot-Liste aus zwei Quellen:
 *  1. `cms_assets` (Overview-RPC) — bestehende Asset-Zeilen mit Page/Section-Kontext.
 *  2. `cms_admin_editable_fields` (Whitelist) — geplante Bildslots ohne Asset.
 * Whitelist-Einträge werden auf bildartige `field_key`s gefiltert und mit
 * Page/Section-Meta aus Quelle 1 angereichert (sofern eine andere Asset-Zeile
 * derselben Page/Section bereits Meta geliefert hat). Fehlt jede Meta-Quelle,
 * markiert `meta_unknown=true` den Slot → landet in Legacy/Inaktiv.
 */
function buildSlots(
  assetRows: CmsAssetOverviewRow[],
  whitelist: EditableFieldRow[],
): SlotRow[] {
  const map = new Map<string, SlotRow>();
  const pageMeta = new Map<string, {
    page_title_de: string | null;
    page_status: string | null;
    page_is_active: boolean | null;
    page_route_path: string | null;
  }>();
  const sectionMeta = new Map<string, {
    section_type: string | null;
    section_is_active: boolean | null;
  }>();
  const assetKnownFieldKeys = new Set<string>();

  for (const r of assetRows) {
    if (r.field_key) assetKnownFieldKeys.add(r.field_key);
    if (!pageMeta.has(r.page_key)) {
      pageMeta.set(r.page_key, {
        page_title_de: r.page_title_de,
        page_status: r.page_status,
        page_is_active: r.page_is_active,
        page_route_path: r.page_route_path,
      });
    }
    const sk = `${r.page_key}::${r.section_key}`;
    if (!sectionMeta.has(sk)) {
      sectionMeta.set(sk, {
        section_type: r.section_type,
        section_is_active: r.section_is_active,
      });
    }
  }

  // Hilfsfunktion: Parent-section_type aus section_key ableiten
  // (z. B. `filter-grid.foo` → Parent `filter-grid`).
  const parentTypeFor = (page_key: string, section_key: string): string | null => {
    const dot = section_key.lastIndexOf(".");
    if (dot <= 0) return null;
    const parentKey = section_key.slice(0, dot);
    return sectionMeta.get(`${page_key}::${parentKey}`)?.section_type ?? null;
  };

  // Quelle 1: bestehende Asset-Zeilen
  for (const r of assetRows) {
    const fk = r.field_key ?? "(ohne-feld)";
    const key = `${r.page_key}::${r.section_key}::${fk}`;
    let slot = map.get(key);
    if (!slot) {
      slot = {
        kind: "image",

        page_key: r.page_key,
        section_key: r.section_key,
        field_key: fk,
        page_title_de: r.page_title_de,
        page_status: r.page_status,
        page_is_active: r.page_is_active,
        page_route_path: r.page_route_path,
        section_type: r.section_type,
        section_is_active: r.section_is_active,
        parent_section_type: parentTypeFor(r.page_key, r.section_key),
        byViewport: { desktop: [], tablet: [], mobile: [] },
        active: { desktop: undefined, tablet: undefined, mobile: undefined },
        is_planned_only: false,
        meta_unknown: false,
      };
      map.set(key, slot);
    }
    const vp = (r.viewport as ViewportKey) ?? "desktop";
    slot.byViewport[vp].push(r);
    if (r.is_active && !slot.active[vp]) slot.active[vp] = r;
  }

  // Quelle 2: Whitelist — nur Bildplätze, dedupliziert auf (page,section,field)
  const wlSeen = new Set<string>();
  for (const w of whitelist) {
    if (!isImageFieldKey(w.field_key, assetKnownFieldKeys)) continue;
    const key = `${w.page_key}::${w.section_key}::${w.field_key}`;
    if (wlSeen.has(key)) continue;
    wlSeen.add(key);
    if (map.has(key)) continue;
    const pm = pageMeta.get(w.page_key);
    const sm = sectionMeta.get(`${w.page_key}::${w.section_key}`);
    map.set(key, {
      kind: "image",

      page_key: w.page_key,
      section_key: w.section_key,
      field_key: w.field_key,
      page_title_de: pm?.page_title_de ?? null,
      page_status: pm?.page_status ?? null,
      page_is_active: pm?.page_is_active ?? null,
      page_route_path: pm?.page_route_path ?? null,
      section_type: sm?.section_type ?? null,
      section_is_active: sm?.section_is_active ?? null,
      parent_section_type: parentTypeFor(w.page_key, w.section_key),
      byViewport: { desktop: [], tablet: [], mobile: [] },
      active: { desktop: undefined, tablet: undefined, mobile: undefined },
      is_planned_only: true,
      meta_unknown: !pm || !sm,
    });
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.page_key !== b.page_key) return a.page_key.localeCompare(b.page_key);
    if (a.section_key !== b.section_key) return a.section_key.localeCompare(b.section_key);
    return a.field_key.localeCompare(b.field_key);
  });
}

/**
 * Baut Icon-Slots aus `cms_section_fields`-Zeilen (field_key='icon').
 * Icons sind keine Asset-Uploads, sondern Textwerte (Lucide-Kebab-Name)
 * — werden hier aber als visuelle Medien-Plätze geführt, damit Karten
 * mit Icon im Medienbereich pflegbar sind.
 */
function buildIconSlots(iconRows: IconFieldRow[]): SlotRow[] {
  return iconRows.map((r) => ({
    kind: "icon" as const,
    page_key: r.page_key,
    section_key: r.section_key,
    field_key: r.field_key,
    page_title_de: r.page_title_de,
    page_status: r.page_status,
    page_is_active: r.page_is_active,
    page_route_path: r.page_route_path,
    section_type: r.section_type,
    section_is_active: r.section_is_active,
    parent_section_type: r.parent_section_type,
    byViewport: { desktop: [], tablet: [], mobile: [] },
    active: { desktop: undefined, tablet: undefined, mobile: undefined },
    is_planned_only: false,
    meta_unknown: r.section_type == null && r.section_is_active == null,
    icon_value_de: r.value_de,
    icon_value_en: r.value_en,
  }));
}


const Badge: React.FC<{ tone?: "ok" | "warn" | "muted" | "info" | "danger"; children: React.ReactNode }> = ({
  tone = "muted",
  children,
}) => {
  const cls =
    tone === "ok"
      ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
      : tone === "warn"
        ? "bg-amber-500/10 text-amber-700 border-amber-500/30"
        : tone === "danger"
          ? "bg-destructive/10 text-destructive border-destructive/30"
          : tone === "info"
            ? "bg-sky-500/10 text-sky-700 border-sky-500/30"
            : "bg-muted text-muted-foreground border-muted-foreground/20";
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>
      {children}
    </span>
  );
};

interface SlotEditDialogProps {
  slot: SlotRow;
  onClose: () => void;
  onAnyChange: () => void;
}

const SlotEditDialog: React.FC<SlotEditDialogProps> = ({ slot, onClose, onAnyChange }) => {
  const [pageAssets, setPageAssets] = useState<CmsAssetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const reload = () => {
    setLoading(true);
    return readAssets(slot.page_key)
      .then((rows) => setPageAssets(rows))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot.page_key]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div className="w-full max-w-3xl rounded-lg border bg-background shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <div className="text-xs font-mono text-muted-foreground">
              {slot.page_key} · {slot.section_key} · {slot.field_key}
            </div>
            <h3 className="truncate text-base font-semibold">
              {slot.page_title_de ?? slot.page_key}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border px-2 py-1 text-xs hover:bg-muted"
          >
            Schließen
          </button>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="text-sm text-muted-foreground">Lade Bilder…</div>
          ) : (
            <AssetUploader
              pageKey={slot.page_key}
              sectionKey={slot.section_key}
              fieldKey={slot.field_key}
              assets={pageAssets}
              onChanged={async () => {
                await reload();
                onAnyChange();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * IconEditDialog — bearbeitet das `icon`-Feld einer Section über den
 * bestehenden IconPickerDialog und speichert über `saveSectionField`
 * (gleicher Schreibweg wie im Inhalte-Bereich, beide Locales DE+EN).
 */
const IconEditDialog: React.FC<{
  slot: SlotRow;
  onClose: () => void;
  onAnyChange: () => void;
}> = ({ slot, onClose, onAnyChange }) => {
  const initial = (slot.icon_value_de ?? slot.icon_value_en ?? "").trim();
  const [value, setValue] = useState(initial);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const IconComp = resolveIcon(value || null);
  const dirty = value.trim() !== initial;

  // Abgeleiteter Bildicon-Slot:
  //   field_key = "icon"          → icon_image
  //   field_key endet auf ".icon" → ".icon" wird zu ".icon_image"
  const iconImageFieldKey =
    slot.field_key === "icon"
      ? "icon_image"
      : slot.field_key.endsWith(".icon")
        ? slot.field_key.slice(0, -".icon".length) + ".icon_image"
        : null;

  const [iconImageAssets, setIconImageAssets] = useState<CmsAssetRow[]>([]);
  const [iconImageLoading, setIconImageLoading] = useState(false);

  const reloadIconImage = async () => {
    if (!iconImageFieldKey) return;
    setIconImageLoading(true);
    try {
      const rows = await readAssets(slot.page_key);
      setIconImageAssets(rows);
    } finally {
      setIconImageLoading(false);
    }
  };

  useEffect(() => {
    void reloadIconImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot.page_key, iconImageFieldKey]);

  const handleSave = async () => {
    setSaving(true);
    const v = value.trim();
    const r1 = await saveSectionField({
      pageKey: slot.page_key,
      sectionKey: slot.section_key,
      fieldKey: slot.field_key,
      locale: "de",
      value: v,
    });
    const r2 = await saveSectionField({
      pageKey: slot.page_key,
      sectionKey: slot.section_key,
      fieldKey: slot.field_key,
      locale: "en",
      value: v,
    });
    setSaving(false);
    if (r1.success && r2.success) {
      toast.success("Icon gespeichert (DE + EN).");
      onAnyChange();
      onClose();
    } else {
      toast.error(`Speichern fehlgeschlagen: ${r1.error ?? r2.error ?? "?"}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div className="w-full max-w-2xl rounded-lg border bg-background shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <div className="text-xs font-mono text-muted-foreground">
              {slot.page_key} · {slot.section_key} · {slot.field_key}
            </div>
            <h3 className="truncate text-base font-semibold">
              Icon bearbeiten · {slot.page_title_de ?? slot.page_key}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="rounded border px-2 py-1 text-xs hover:bg-muted">
            Schließen
          </button>
        </div>

        <div className="space-y-5 p-4">
          {/* A) Lucide-Icon */}
          <section className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              A) Lucide-Icon
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded border bg-muted/30">
                <IconComp className="h-8 w-8 text-foreground" strokeWidth={1.75} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-muted-foreground">
                  Icon-Name (Kebab oder lowercase, z. B. <code className="font-mono">shield-check</code> oder <code className="font-mono">smartphone</code>)
                </div>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="mt-1 w-full rounded border border-input bg-background px-2 py-1 font-mono text-sm"
                  spellCheck={false}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="rounded border bg-background px-3 py-1 text-xs hover:bg-muted"
              >
                Icon auswählen…
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!dirty || saving}
                className="rounded border px-3 py-1 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Speichert…" : "Speichern (DE + EN)"}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Schreibweg: <code className="font-mono">rpc_admin_update_section_field</code>. Wert ist locale-neutral und wird in DE und EN identisch gespeichert.
            </p>
          </section>

          {/* B) TCS-Bildicon (optional) */}
          {iconImageFieldKey && (
            <section className="space-y-3 border-t pt-4">
              <div className="flex items-baseline justify-between gap-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  B) TCS-Bildicon (optional)
                </div>
                <code className="font-mono text-[11px] text-muted-foreground">
                  {slot.section_key} · {iconImageFieldKey}
                </code>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Wenn ein Bildicon hochgeladen und aktiv ist, gewinnt es im Renderer vor dem Lucide-Icon.
                Bestehender Upload-Weg (PNG/JPG/WebP über AssetUploader).
              </p>
              {iconImageLoading ? (
                <div className="text-sm text-muted-foreground">Lade Bildicon…</div>
              ) : (
                <AssetUploader
                  pageKey={slot.page_key}
                  sectionKey={slot.section_key}
                  fieldKey={iconImageFieldKey}
                  assets={iconImageAssets}
                  onChanged={async () => {
                    await reloadIconImage();
                    onAnyChange();
                  }}
                />
              )}
            </section>
          )}
        </div>
      </div>
      <IconPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        currentValue={value.trim() || null}
        onSelect={(kebab) => setValue(kebab)}
      />
    </div>
  );
};



const AssetWorkbench: React.FC = () => {
  const [rows, setRows] = useState<CmsAssetOverviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSlot, setOpenSlot] = useState<SlotRow | null>(null);
  /** Aktuell in der Live-Vorschau gezeigte Verwendung (Seite + Slot). */
  const [previewSlot, setPreviewSlot] = useState<SlotRow | null>(null);
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());

  // Wenn die in der Vorschau aktive Verwendung wechselt: Zeile in der
  // Bilder-Liste in den sichtbaren Bereich scrollen.
  useEffect(() => {
    if (!previewSlot) return;
    const key = `${previewSlot.page_key}::${previewSlot.section_key}::${previewSlot.field_key}`;
    const el = rowRefs.current.get(key);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [previewSlot]);

  // Filter
  const [search, setSearch] = useState("");
  const [pageFilter, setPageFilter] = useState<string>("");
  const [sectionTypeFilter, setSectionTypeFilter] = useState<string>("");
  const [fieldKeyFilter, setFieldKeyFilter] = useState<string>("");
  const [viewportFilter, setViewportFilter] = useState<string>(""); // leer = alle
  /** Alt-Text-Filter: "" = aus, "de" = DE fehlt, "en" = EN fehlt, "any" = DE oder EN fehlt. */
  const [altMissingFilter, setAltMissingFilter] = useState<"" | "de" | "en" | "any">("");
  /** Viewport-Präsenz-Filter (welche Variante fehlt / nur Desktop). */
  const [viewportPresenceFilter, setViewportPresenceFilter] = useState<
    "" | "desktop-missing" | "tablet-missing" | "mobile-missing" | "tm-missing" | "only-desktop"
  >("");
  /** Slotart-Filter: konkrete Medienart (Bild/Thumbnail/TCS-Bildicon/Lucide-Icon). */
  const [slotKindFilter, setSlotKindFilter] = useState<
    "" | "image" | "thumbnail" | "icon_image" | "icon"
  >("");
  const [showOnlyDuplicates, setShowOnlyDuplicates] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);
  const [inactiveOnly, setInactiveOnly] = useState(false);
  /**
   * Haupt-Toggle: Legacy- und Inaktiv-Slots einblenden.
   * Standard aus → Standardansicht zeigt nur Slots auf aktuellen,
   * veröffentlichten Seiten mit aktiver Section.
   */
  const [showLegacy, setShowLegacy] = useState(false);
  /** Optionale Detailfilter, greifen nur wenn `showLegacy` aktiv ist. */
  const [onlySectionInactive, setOnlySectionInactive] = useState(false);
  const [onlySectionMissing, setOnlySectionMissing] = useState(false);
  const [onlyPageDraft, setOnlyPageDraft] = useState(false);
  const [onlyPageArchived, setOnlyPageArchived] = useState(false);
  const [onlyPageInactive, setOnlyPageInactive] = useState(false);
  const [onlyPageMissing, setOnlyPageMissing] = useState(false);

  const [whitelist, setWhitelist] = useState<EditableFieldRow[]>([]);
  const [iconRows, setIconRows] = useState<IconFieldRow[]>([]);
  /** Medientyp-Filter: alle | nur Bilder | nur Icons. */
  const [mediaKindFilter, setMediaKindFilter] = useState<"" | "image" | "icon">("");
  /** Geöffneter Icon-Slot zum Bearbeiten (eigener Dialog mit IconPicker). */
  const [openIconSlot, setOpenIconSlot] = useState<SlotRow | null>(null);

  const reload = () => {
    setLoading(true);
    return Promise.all([
      readAssetsOverview(),
      readEditableFields(),
      readAllIconFields(),
    ])
      .then(([overview, wl, icons]) => {
        setRows(overview);
        setWhitelist(wl.rows);
        setIconRows(icons);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void reload();
  }, []);


  const slots = useMemo(() => {
    const imageSlots = buildSlots(rows, whitelist);
    const iconSlots = buildIconSlots(iconRows);
    const all = [...imageSlots, ...iconSlots];
    return all.sort((a, b) => {
      if (a.page_key !== b.page_key) return a.page_key.localeCompare(b.page_key);
      if (a.section_key !== b.section_key) return a.section_key.localeCompare(b.section_key);
      return a.field_key.localeCompare(b.field_key);
    });
  }, [rows, whitelist, iconRows]);


  /**
   * Präzise Statusflags je Slot. Trennt bewusst:
   *  - sectionMissing (kein Join in cms_sections)
   *  - sectionInactive (Section existiert, ist aber inaktiv)
   *  - pageMissing (kein Join in cms_pages)
   *  - pageDraft / pageArchived / pageInactive
   * Damit ist die frühere Sammelaussage "Page nicht public" nicht mehr nötig.
   */
  type SlotFlags = {
    sectionMissing: boolean;
    sectionInactive: boolean;
    pageMissing: boolean;
    pageDraft: boolean;
    pageArchived: boolean;
    pageInactive: boolean;
    legacyField: boolean;
    rendererIgnored: boolean;
    isLegacy: boolean;
  };
  const flagsOf = (s: SlotRow): SlotFlags => {
    const sectionMissing = (s.section_type == null && s.section_is_active == null) || s.meta_unknown;
    const sectionInactive = !sectionMissing && s.section_is_active === false;
    const pageMissing = (s.page_status == null && s.page_is_active == null) || s.meta_unknown;
    const pageDraft = !pageMissing && s.page_status === "draft";
    const pageArchived = !pageMissing && s.page_status === "archived";
    const pageInactive =
      !pageMissing &&
      s.page_is_active === false &&
      s.page_status !== "archived" &&
      s.page_status !== "draft";
    const legacyField = s.kind === "image" && isLegacyViewportFieldKey(s.field_key);
    // Icon-Slots werden NICHT als renderer-ignoriert markiert — der Renderer
    // (z. B. `feature_grid_v1`, `card_v1`) liest Icons über andere Wege als
    // `RENDERER_SLOT_MAP` (das ausschließlich Bild-Slots beschreibt).
    const rendererIgnored =
      s.kind === "image" &&
      !sectionMissing &&
      isRendererIgnoredSlot(s.section_type, s.field_key, s.parent_section_type);

    const isLegacy =
      legacyField ||
      rendererIgnored ||
      sectionMissing || sectionInactive || pageMissing || pageDraft || pageArchived || pageInactive;
    return {
      sectionMissing,
      sectionInactive,
      pageMissing,
      pageDraft,
      pageArchived,
      pageInactive,
      legacyField,
      rendererIgnored,
      isLegacy,
    };
  };


  const pages = useMemo(() => {
    const m = new Map<string, { title: string; route: string | null }>();
    for (const s of slots) {
      if (!m.has(s.page_key)) {
        m.set(s.page_key, {
          title: s.page_title_de ?? s.page_key,
          route: s.page_route_path ?? null,
        });
      }
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [slots]);

  const sectionTypes = useMemo(
    () => Array.from(new Set(slots.map((s) => s.section_type ?? "?"))).sort(),
    [slots],
  );
  const fieldKeys = useMemo(
    () => Array.from(new Set(slots.map((s) => s.field_key))).sort(),
    [slots],
  );

  /**
   * Editorial-Kind-Kontext je (page::section). Wird aus den geladenen
   * Daten (Asset-Zeilen, Icon-Felder, Whitelist) abgeleitet, damit
   * `getEditorialSectionKind` für `card_v1` zwischen Bild-/Thumbnail-/
   * Icon-/Textkarte unterscheiden kann.
   */
  const editorialCtxBySection = useMemo(() => {
    const m = new Map<string, { fieldKeys: Set<string>; assetSlots: Set<string>; whitelistFieldKeys: Set<string>; isInactive: boolean }>();
    const ensure = (page: string, section: string, isInactive: boolean) => {
      const k = `${page}::${section}`;
      let e = m.get(k);
      if (!e) {
        e = { fieldKeys: new Set(), assetSlots: new Set(), whitelistFieldKeys: new Set(), isInactive };
        m.set(k, e);
      }
      // Wenn neue Info inaktiv meldet, übernehmen (worst case).
      if (isInactive) e.isInactive = true;
      return e;
    };
    for (const r of rows) {
      const e = ensure(r.page_key, r.section_key, r.section_is_active === false);
      if (r.field_key && r.is_active) e.assetSlots.add(r.field_key);
      if (r.field_key) e.fieldKeys.add(r.field_key);
    }
    for (const r of iconRows) {
      const e = ensure(r.page_key, r.section_key, r.section_is_active === false);
      e.fieldKeys.add(r.field_key); // "icon" oder ".icon"
    }
    for (const w of whitelist) {
      const e = ensure(w.page_key, w.section_key, false);
      e.whitelistFieldKeys.add(w.field_key);
      e.fieldKeys.add(w.field_key);
    }
    return m;
  }, [rows, iconRows, whitelist]);

  const filteredSlots = useMemo(() => {
    const q = search.trim().toLowerCase();
    const anyDetailLegacyFilter =
      onlySectionInactive ||
      onlySectionMissing ||
      onlyPageDraft ||
      onlyPageArchived ||
      onlyPageInactive ||
      onlyPageMissing;
    return slots.filter((s) => {
      if (mediaKindFilter && s.kind !== mediaKindFilter) return false;
      const f = flagsOf(s);


      // Standardansicht: Legacy/Inaktiv-Slots ausblenden, außer ein
      // Detailfilter ist aktiv (dann zeigen wir genau diese Klasse).
      if (!showLegacy && !anyDetailLegacyFilter && f.isLegacy) return false;

      if (anyDetailLegacyFilter) {
        const matchAny =
          (onlySectionInactive && f.sectionInactive) ||
          (onlySectionMissing && f.sectionMissing) ||
          (onlyPageDraft && f.pageDraft) ||
          (onlyPageArchived && f.pageArchived) ||
          (onlyPageInactive && f.pageInactive) ||
          (onlyPageMissing && f.pageMissing);
        if (!matchAny) return false;
      }

      if (pageFilter && s.page_key !== pageFilter) return false;
      if (sectionTypeFilter && (s.section_type ?? "?") !== sectionTypeFilter) return false;
      if (fieldKeyFilter && s.field_key !== fieldKeyFilter) return false;

      const anyActive =
        s.kind === "icon"
          ? !!(s.icon_value_de?.trim() || s.icon_value_en?.trim())
          : VIEWPORTS.some((vp) => s.active[vp]);
      if (activeOnly && !anyActive) return false;
      if (inactiveOnly && anyActive) return false;

      // Slotart-Filter: konkrete Medienart prüfen.
      if (slotKindFilter) {
        if (slotKindFilter === "icon") {
          if (s.kind !== "icon") return false;
        } else {
          if (s.kind !== "image") return false;
          if (s.field_key !== slotKindFilter) return false;
        }
      }

      // Viewport-/Alt-/Dubletten-Filter sind Bild-spezifisch und blenden
      // Icon-Zeilen aus, sobald sie aktiv sind.
      if (viewportFilter) {
        if (s.kind === "icon") return false;
        const vp = viewportFilter as ViewportKey;
        if (!s.byViewport[vp] || s.byViewport[vp].length === 0) return false;
      }
      if (altMissingFilter) {
        if (s.kind === "icon") return false;
        const matches = VIEWPORTS.some((vp) => {
          const a = s.active[vp];
          if (!a) return false;
          const deMissing = !a.alt_de?.trim();
          const enMissing = !a.alt_en?.trim();
          if (altMissingFilter === "de") return deMissing;
          if (altMissingFilter === "en") return enMissing;
          return deMissing || enMissing;
        });
        if (!matches) return false;
      }
      if (viewportPresenceFilter) {
        if (s.kind === "icon") return false;
        const d = !!s.active.desktop;
        const t = !!s.active.tablet;
        const m = !!s.active.mobile;
        if (viewportPresenceFilter === "desktop-missing" && d) return false;
        if (viewportPresenceFilter === "tablet-missing" && t) return false;
        if (viewportPresenceFilter === "mobile-missing" && m) return false;
        if (viewportPresenceFilter === "tm-missing") {
          if (!d) return false;
          if (t && m) return false;
        }
        if (viewportPresenceFilter === "only-desktop") {
          if (!(d && !t && !m)) return false;
        }
      }
      if (showOnlyDuplicates) {
        if (s.kind === "icon") return false;
        const hasDup = VIEWPORTS.some(
          (vp) => s.byViewport[vp].filter((r) => r.is_active).length > 1,
        );
        if (!hasDup) return false;
      }

      if (q) {
        const hay = [
          s.page_key,
          s.section_key,
          s.field_key,
          s.page_title_de ?? "",
          s.section_type ?? "",
          s.icon_value_de ?? "",
          s.icon_value_en ?? "",
          ...VIEWPORTS.flatMap((vp) =>
            s.byViewport[vp].flatMap((r) => [r.file_name ?? "", r.alt_de ?? "", r.alt_en ?? ""]),
          ),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [
    slots,
    search,
    pageFilter,
    sectionTypeFilter,
    fieldKeyFilter,
    viewportFilter,
    altMissingFilter,
    viewportPresenceFilter,
    slotKindFilter,
    showOnlyDuplicates,
    showLegacy,
    onlySectionInactive,
    onlySectionMissing,
    onlyPageDraft,
    onlyPageArchived,
    onlyPageInactive,
    onlyPageMissing,
    activeOnly,
    inactiveOnly,
    mediaKindFilter,
  ]);


  const canonicalSlotForRoute = (pathname: string): SlotRow | undefined => {
    const norm = normalizeRoute(pathname);
    // Auto-Snap zur Route bezieht sich auf Bild-Slots (Hero/Thumbnail/…),
    // nicht auf Icons — die werden per Klick gezielt gewählt.
    const pageSlots = slots.filter(
      (s) => s.kind === "image" && normalizeRoute(s.page_route_path) === norm,
    );

    if (pageSlots.length === 0) return undefined;

    const visible = pageSlots.filter((s) => !flagsOf(s).isLegacy);
    const base = visible.length > 0 ? visible : pageSlots;
    const preferredFieldOrder = ["image", "hero_image", "background_image", "thumbnail", "logo"];
    const preferredSectionOrder = ["hero", "content", "overview", "intro", "header"];

    return [...base].sort((a, b) => {
      const aHero = a.section_key === "hero" ? 0 : 1;
      const bHero = b.section_key === "hero" ? 0 : 1;
      if (aHero !== bHero) return aHero - bHero;

      const aField = preferredFieldOrder.indexOf(a.field_key);
      const bField = preferredFieldOrder.indexOf(b.field_key);
      if ((aField === -1 ? 999 : aField) !== (bField === -1 ? 999 : bField)) {
        return (aField === -1 ? 999 : aField) - (bField === -1 ? 999 : bField);
      }

      const aSection = preferredSectionOrder.indexOf(a.section_key);
      const bSection = preferredSectionOrder.indexOf(b.section_key);
      if ((aSection === -1 ? 999 : aSection) !== (bSection === -1 ? 999 : bSection)) {
        return (aSection === -1 ? 999 : aSection) - (bSection === -1 ? 999 : bSection);
      }

      const aActiveScore = VIEWPORTS.some((vp) => a.active[vp]) ? 0 : 1;
      const bActiveScore = VIEWPORTS.some((vp) => b.active[vp]) ? 0 : 1;
      if (aActiveScore !== bActiveScore) return aActiveScore - bActiveScore;

      return `${a.section_key}.${a.field_key}`.localeCompare(`${b.section_key}.${b.field_key}`);
    })[0];
  };

  const totals = useMemo(() => {
    const totalAssets = rows.length;
    const activeAssets = rows.filter((r) => r.is_active).length;
    const imageSlotsCount = slots.filter((s) => s.kind === "image").length;
    const iconSlotsCount = slots.filter((s) => s.kind === "icon").length;
    const legacyCount = slots.filter((s) => flagsOf(s).isLegacy).length;
    const visibleSlotsTotal = slots.length - legacyCount;
    return {
      totalAssets,
      activeAssets,
      imageSlotsCount,
      iconSlotsCount,
      legacyCount,
      currentCount: visibleSlotsTotal,
    };
  }, [rows, slots]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b bg-muted/20 p-2">

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <strong className="text-sm">Medien (Bilder &amp; Icons)</strong>
          <span className="text-muted-foreground">
            {totals.currentCount} aktuelle Medienplätze · {totals.imageSlotsCount} Bilder · {totals.iconSlotsCount} Icons · {totals.activeAssets}/{totals.totalAssets} aktive Bilddateien
            {totals.legacyCount > 0 && (
              <> · {totals.legacyCount} Altbestand/Inaktiv ausgeblendet</>
            )}
          </span>
          <button
            type="button"
            onClick={() => void reload()}
            className="ml-auto rounded border bg-background px-2 py-1 hover:bg-muted"
          >
            {loading ? "Lade…" : "Neu laden"}
          </button>
        </div>

        <div className="mt-1 text-[11px] text-muted-foreground">
          Standardansicht zeigt sichtbare Medienplätze (Bilder aus <code className="font-mono">cms_assets</code>
          {" "}und Lucide-Icons aus <code className="font-mono">cms_section_fields</code>) auf veröffentlichten Seiten mit aktiver Section.
          Leere Bildslots aus der Whitelist sind sichtbar und bearbeitbar. Alte Uploads erscheinen nur als „Historie N".
          Icons werden über die bekannte Icon-Auswahl bearbeitet (gleicher Schreibweg wie im Inhalte-Bereich).
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <label className="flex items-center gap-1">
            <span>Medientyp:</span>
            <select
              value={mediaKindFilter}
              onChange={(e) => setMediaKindFilter(e.target.value as "" | "image" | "icon")}
              className="rounded border border-input bg-background px-1 py-0.5 text-[11px]"
            >
              <option value="">alle (Bilder + Icons)</option>
              <option value="image">nur Bilder</option>
              <option value="icon">nur Icons</option>
            </select>
          </label>
        </div>


        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suche: Dateiname, Page, Section, Alt-Text…"
            className="rounded border border-input bg-background px-2 py-1 text-xs"
          />
          <select
            value={pageFilter}
            onChange={(e) => setPageFilter(e.target.value)}
            className="rounded border border-input bg-background px-2 py-1 text-xs"
          >
            <option value="">Alle Seiten</option>
            {pages.map(([key, info]) => (
              <option key={key} value={key}>
                {info.title} · {key}{info.route ? ` · ${info.route}` : ""}
              </option>
            ))}
          </select>
          <select
            value={sectionTypeFilter}
            onChange={(e) => setSectionTypeFilter(e.target.value)}
            className="rounded border border-input bg-background px-2 py-1 text-xs"
          >
            <option value="">Alle Section-Typen</option>
            {sectionTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={fieldKeyFilter}
            onChange={(e) => setFieldKeyFilter(e.target.value)}
            className="rounded border border-input bg-background px-2 py-1 text-xs"
          >
            <option value="">Alle field_keys</option>
            {fieldKeys.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <label className="flex items-center gap-1">
            <span>Slotart:</span>
            <select
              value={slotKindFilter}
              onChange={(e) =>
                setSlotKindFilter(
                  e.target.value as "" | "image" | "thumbnail" | "icon_image" | "icon",
                )
              }
              className="rounded border border-input bg-background px-1 py-0.5 text-[11px]"
              title="Welche Medienart der Slot trägt"
            >
              <option value="">alle Slotarten</option>
              <option value="image">Bild (image)</option>
              <option value="thumbnail">Thumbnail (thumbnail)</option>
              <option value="icon_image">TCS-Bildicon (icon_image)</option>
              <option value="icon">Lucide-Icon (Textfeld)</option>
            </select>
          </label>
          <label className="flex items-center gap-1">
            <span>Viewport vorhanden:</span>
            <select
              value={viewportFilter}
              onChange={(e) => setViewportFilter(e.target.value)}
              className="rounded border border-input bg-background px-1 py-0.5 text-[11px]"
              title="Slots, die irgendein Asset in diesem Viewport haben"
            >
              <option value="">alle</option>
              <option value="desktop">desktop</option>
              <option value="tablet">tablet</option>
              <option value="mobile">mobile</option>
            </select>
          </label>
          <label className="flex items-center gap-1">
            <span>Viewport fehlt:</span>
            <select
              value={viewportPresenceFilter}
              onChange={(e) =>
                setViewportPresenceFilter(
                  e.target.value as
                    | ""
                    | "desktop-missing"
                    | "tablet-missing"
                    | "mobile-missing"
                    | "tm-missing"
                    | "only-desktop",
                )
              }
              className="rounded border border-input bg-background px-1 py-0.5 text-[11px]"
            >
              <option value="">aus</option>
              <option value="desktop-missing">Desktop fehlt</option>
              <option value="tablet-missing">Tablet fehlt</option>
              <option value="mobile-missing">Mobile fehlt</option>
              <option value="tm-missing">Tablet/Mobile fehlt</option>
              <option value="only-desktop">nur Desktop vorhanden</option>
            </select>
          </label>
          <label className="flex items-center gap-1">
            <span>Alt-Text:</span>
            <select
              value={altMissingFilter}
              onChange={(e) =>
                setAltMissingFilter(e.target.value as "" | "de" | "en" | "any")
              }
              className="rounded border border-input bg-background px-1 py-0.5 text-[11px]"
            >
              <option value="">aus</option>
              <option value="de">DE fehlt</option>
              <option value="en">EN fehlt</option>
              <option value="any">DE oder EN fehlt</option>
            </select>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
            nur Slots mit aktivem Bild
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={inactiveOnly} onChange={(e) => setInactiveOnly(e.target.checked)} />
            nur Slots ohne aktives Bild
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={showOnlyDuplicates} onChange={(e) => setShowOnlyDuplicates(e.target.checked)} />
            Dubletten (mehrfach aktiv im selben Viewport)
          </label>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3 rounded border border-dashed border-muted-foreground/30 bg-background/40 px-2 py-1 text-[11px] text-muted-foreground">
          <label className="flex items-center gap-1 font-medium text-foreground">
            <input type="checkbox" checked={showLegacy} onChange={(e) => setShowLegacy(e.target.checked)} />
            Altbestand / Inaktiv anzeigen
          </label>
          <span className="text-muted-foreground/80">
            (fehlende/inaktive Sections, Entwurf, archiviert, fehlende Pages)
          </span>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={onlySectionInactive} onChange={(e) => setOnlySectionInactive(e.target.checked)} />
            nur Section inaktiv
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={onlySectionMissing} onChange={(e) => setOnlySectionMissing(e.target.checked)} />
            nur Section fehlt
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={onlyPageDraft} onChange={(e) => setOnlyPageDraft(e.target.checked)} />
            nur Page Entwurf
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={onlyPageArchived} onChange={(e) => setOnlyPageArchived(e.target.checked)} />
            nur Page archiviert
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={onlyPageInactive} onChange={(e) => setOnlyPageInactive(e.target.checked)} />
            nur Page inaktiv
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={onlyPageMissing} onChange={(e) => setOnlyPageMissing(e.target.checked)} />
            nur Page fehlt
          </label>
        </div>
      </div>


      <div className="min-h-0 flex-1 overflow-auto">
        {loading && rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">Lade Bilder…</div>
        ) : filteredSlots.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">Keine Treffer mit aktuellem Filter.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-background shadow-[0_1px_0_hsl(var(--border))]">
              <tr className="text-left text-muted-foreground">
                <th className="px-2 py-1.5 font-medium">Vorschau</th>
                <th className="px-2 py-1.5 font-medium">Aktionen</th>
                <th className="px-2 py-1.5 font-medium">Seite</th>
                <th className="px-2 py-1.5 font-medium">Section · Feld</th>
                <th className="px-2 py-1.5 font-medium">Viewports (D/T/M)</th>
                <th className="px-2 py-1.5 font-medium">Status</th>
                <th className="px-2 py-1.5 font-medium">Alt-Text</th>
              </tr>
            </thead>
            <tbody>
              {filteredSlots.map((s) => {
                const isIcon = s.kind === "icon";
                const previewUrl = isIcon
                  ? null
                  : s.active.desktop?.public_url ??
                    s.active.tablet?.public_url ??
                    s.active.mobile?.public_url ??
                    null;
                const f = flagsOf(s);
                const dupVp = isIcon
                  ? undefined
                  : VIEWPORTS.find(
                      (vp) => s.byViewport[vp].filter((r) => r.is_active).length > 1,
                    );
                // Inaktive Vorgänger-Zeilen sind gesunde Historie und keine
                // eigene rote Warnung. Wir zeigen sie nur als kleine Info.
                const historyCount = isIcon
                  ? 0
                  : VIEWPORTS.reduce(
                      (n, vp) => n + s.byViewport[vp].filter((r) => !r.is_active).length,
                      0,
                    );
                const iconValue = (s.icon_value_de ?? s.icon_value_en ?? "").trim();
                const anyActive = isIcon
                  ? !!iconValue
                  : VIEWPORTS.some((vp) => s.active[vp]);
                const hasDesktop = !isIcon && !!s.active.desktop;
                const hasTablet = !isIcon && !!s.active.tablet;
                const hasMobile = !isIcon && !!s.active.mobile;
                const altMissing = !isIcon && VIEWPORTS.some((vp) => {
                  const a = s.active[vp];
                  return a && (!a.alt_de?.trim() || !a.alt_en?.trim());
                });
                const onlyDesktop = hasDesktop && !hasTablet && !hasMobile;
                const fullViewports = hasDesktop && hasTablet && hasMobile;
                const IconComp = isIcon ? resolveIcon(iconValue || null) : null;

                const rowKey = `${s.page_key}::${s.section_key}::${s.field_key}`;
                const isActiveInPreview =
                  previewSlot != null &&
                  previewSlot.page_key === s.page_key &&
                  previewSlot.section_key === s.section_key &&
                  previewSlot.field_key === s.field_key;

                // Redaktioneller Kartentyp (Bildkarte/Iconkarte/Textkarte/
                // Wechselteaser/Hero/...) — abgeleitet aus geladenen Slots.
                const ctxKey = `${s.page_key}::${s.section_key}`;
                const ctx = editorialCtxBySection.get(ctxKey);
                let editorialLabel: string | null = null;
                if (s.section_key === "hero") {
                  editorialLabel = "Hero";
                } else if (s.section_type) {
                  const ek = getEditorialSectionKind(s.section_type, ctx ?? {});
                  editorialLabel = ek.label;
                }

                // Vorschau-Blockierung mit klarem Grund.
                let previewBlockedReason: string | null = null;
                if (!s.page_route_path) {
                  previewBlockedReason = "Seite hat keine Route";
                } else if (f.pageMissing) {
                  previewBlockedReason = "Page fehlt in cms_pages";
                } else if (f.pageArchived) {
                  previewBlockedReason = "Page ist archiviert";
                } else if (f.pageInactive) {
                  previewBlockedReason = "Page ist inaktiv";
                } else if (f.sectionMissing) {
                  previewBlockedReason = "Section fehlt in cms_sections";
                } else if (f.sectionInactive) {
                  previewBlockedReason = "Section ist inaktiv";
                } else if (f.legacyField) {
                  previewBlockedReason = "Renderer ignoriert dieses Altbestand-Feld";
                } else if (f.rendererIgnored) {
                  previewBlockedReason = "Renderer liest diesen Slot nicht (Parent-Container)";
                }
                const previewBlocked = previewBlockedReason !== null;

                return (
                  <tr
                    key={rowKey}
                    ref={(el) => {
                      if (el) rowRefs.current.set(rowKey, el);
                      else rowRefs.current.delete(rowKey);
                    }}
                    className={`border-b align-top hover:bg-muted/30 ${
                      isActiveInPreview ? "bg-primary/10 ring-1 ring-primary/40" : ""
                    }`}
                  >
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => setPreviewSlot(s)}
                        title={isIcon ? "Klick: diese Icon-Verwendung in der Live-Vorschau anzeigen" : "Klick: diese Verwendung in der Live-Vorschau rechts anzeigen"}
                        className="flex h-14 w-20 items-center justify-center overflow-hidden rounded border bg-muted/30 hover:ring-2 hover:ring-primary/50 focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        {isIcon ? (
                          IconComp && iconValue ? (
                            <IconComp className="h-7 w-7 text-foreground" strokeWidth={1.75} aria-hidden="true" />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">kein Icon</span>
                          )
                        ) : previewUrl ? (
                          <img
                            src={previewUrl}
                            alt=""
                            loading="lazy"
                            className="block h-full w-full object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <span className="text-[10px] text-muted-foreground">leer</span>
                        )}
                      </button>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-col items-stretch gap-1">
                        <button
                          type="button"
                          onClick={() => (isIcon ? setOpenIconSlot(s) : setOpenSlot(s))}
                          className="rounded border bg-background px-2 py-1 text-xs hover:bg-muted"
                        >
                          {isIcon ? "Icon ändern" : "Bearbeiten"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (previewBlocked) return;
                            setPreviewSlot(s);
                          }}
                          disabled={previewBlocked}
                          className="rounded border bg-background px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                          title={
                            previewBlocked
                              ? `Vorschau nicht möglich: ${previewBlockedReason}`
                              : "Diese Verwendung in der Live-Vorschau rechts anzeigen"
                          }
                        >
                          In Vorschau
                        </button>
                      </div>
                    </td>
                    <td className="max-w-[18ch] px-2 py-2">
                      <div className="truncate font-medium">{s.page_title_de ?? s.page_key}</div>
                      <div className="truncate font-mono text-[10px] text-muted-foreground">{s.page_key}</div>
                      {s.page_route_path && (
                        <div className="truncate font-mono text-[10px] text-muted-foreground">{s.page_route_path}</div>
                      )}
                    </td>
                    <td className="max-w-[20ch] px-2 py-2">
                      <div className="truncate font-mono text-[11px]">{s.section_key}</div>
                      <div className="truncate font-mono text-[11px] text-muted-foreground">.{s.field_key}</div>
                      {editorialLabel && (
                        <div className="mt-0.5">
                          <Badge tone="info">{editorialLabel}</Badge>
                        </div>
                      )}
                      {s.section_type && (
                        <div className="truncate text-[10px] text-muted-foreground">Typ: {s.section_type}</div>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {isIcon ? (
                        <div className="text-[10px] text-muted-foreground">
                          <Badge tone="info">Lucide-Icon (Textfeld)</Badge>
                          {iconValue && (
                            <div className="mt-1 font-mono">{iconValue}</div>
                          )}
                        </div>
                      ) : (
                        <>
                          {s.field_key === "image" && (
                            <div className="mb-1">
                              <Badge tone="info">Bild</Badge>
                            </div>
                          )}
                          {s.field_key === "icon_image" && (
                            <div className="mb-1">
                              <Badge tone="info">TCS-Bildicon</Badge>
                            </div>
                          )}
                          {s.field_key === "thumbnail" && (
                            <div className="mb-1">
                              <Badge tone="info">Thumbnail</Badge>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1">
                            {VIEWPORTS.map((vp) => {
                              const a = s.active[vp];
                              const dup = s.byViewport[vp].filter((r) => r.is_active).length > 1;
                              return (
                                <Badge key={vp} tone={a ? (dup ? "warn" : "ok") : "muted"}>
                                  {vp === "desktop" ? "D" : vp === "tablet" ? "T" : "M"}
                                  {a ? " ✓" : " –"}
                                  {dup ? " ⚠" : ""}
                                </Badge>
                              );
                            })}
                          </div>
                          {!hasDesktop && (hasTablet || hasMobile) && (
                            <div className="mt-1 text-[10px] text-amber-700">Kein Desktop-Fallback</div>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-1">
                        {isIcon ? (
                          anyActive ? (
                            <Badge tone="ok">Icon gesetzt</Badge>
                          ) : (
                            <Badge tone="warn">Icon leer</Badge>
                          )
                        ) : anyActive ? (
                          <Badge tone="ok">Bild vorhanden</Badge>
                        ) : s.section_type === "card_v1" && s.field_key === "image" ? (
                          <Badge tone="info">Optionaler Bildslot · aktuell Icon/Fallback</Badge>
                        ) : s.is_planned_only ? (
                          <Badge tone="info">leer · pflegbar</Badge>
                        ) : (
                          <Badge tone="warn">leer</Badge>
                        )}
                        {fullViewports && <Badge tone="ok">vollständig</Badge>}
                        {onlyDesktop && <Badge tone="info">nur Desktop</Badge>}
                        {altMissing && <Badge tone="warn">Alt fehlt</Badge>}
                        {dupVp && <Badge tone="warn">Dublette ({dupVp})</Badge>}
                        {f.sectionInactive && <Badge tone="warn">Altbestand / inaktiv (Section)</Badge>}
                        {f.sectionMissing && <Badge tone="danger">Altbestand / Quelle fehlt (Section)</Badge>}
                        {f.pageDraft && <Badge tone="info">Page Entwurf</Badge>}
                        {f.pageArchived && <Badge tone="muted">Altbestand / inaktiv (Page archiviert)</Badge>}
                        {f.pageInactive && <Badge tone="warn">Altbestand / inaktiv (Page)</Badge>}
                        {f.pageMissing && <Badge tone="danger">Altbestand / Quelle fehlt (Page)</Badge>}
                        {f.legacyField && <Badge tone="muted">Altbestand / Renderer ignoriert (Feldname)</Badge>}
                        {f.rendererIgnored && !f.legacyField && (
                          <Badge tone="muted">Altbestand / Renderer ignoriert (Parent-Slot)</Badge>
                        )}
                        {!isIcon && anyActive && historyCount > 0 && (
                          <Badge tone="muted">Historie {historyCount}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="max-w-[24ch] px-2 py-2 text-[10px]">
                      {isIcon ? (
                        <span className="text-muted-foreground">— (Icons haben keinen Alt-Text)</span>
                      ) : (
                        VIEWPORTS.map((vp) => {
                          const a = s.active[vp];
                          if (!a) return null;
                          return (
                            <div key={vp} className="truncate">
                              <span className="text-muted-foreground">{vp[0].toUpperCase()}:</span>{" "}
                              <span className={a.alt_de?.trim() ? "" : "text-amber-700"}>DE</span>{" / "}
                              <span className={a.alt_en?.trim() ? "" : "text-amber-700"}>EN</span>
                            </div>
                          );
                        })
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {openSlot && (
        <SlotEditDialog
          slot={openSlot}
          onClose={() => setOpenSlot(null)}
          onAnyChange={() => void reload()}
        />
      )}

      {openIconSlot && (
        <IconEditDialog
          slot={openIconSlot}
          onClose={() => setOpenIconSlot(null)}
          onAnyChange={() => void reload()}
        />
      )}


      <AdminPreviewDrawer
        routePath={previewSlot?.page_route_path ?? null}
        highlightSectionKey={previewSlot?.section_key ?? null}
        highlightSectionType={previewSlot?.section_type ?? null}
        highlightFieldKey={previewSlot?.field_key ?? null}
        storageKey="cms-admin.preview.sheet.assets"
        contextLabel={
          previewSlot
            ? `Bild-Verwendung: ${previewSlot.page_title_de ?? previewSlot.page_key} · ${previewSlot.section_key} · ${previewSlot.field_key}`
            : null
        }
        onSectionSelect={(sectionKey, pageKey, assetUrl, fieldKey, pathname) => {
          // Klick in der Live-Vorschau → exakten Bild-Slot in der Liste
          // wählen. Wenn der Treffer durch den Standardfilter ausgeblendet
          // wäre (Legacy/Inaktiv), blenden wir Legacy automatisch ein,
          // damit die Zeile sichtbar wird.
          const pickSlot = (slot: SlotRow) => {
            if (flagsOf(slot).isLegacy && !showLegacy) setShowLegacy(true);
            setPreviewSlot(slot);
          };
          const pathOf = (u: string | null | undefined): string | null => {
            if (!u) return null;
            try { return new URL(u, window.location.origin).pathname; } catch { return u; }
          };
          // Fallback: pageKey aus pathname herleiten, wenn die Seite kein
          // data-cms-page-Marker geliefert hat.
          let effectivePageKey: string | null = pageKey ?? null;
          if (!effectivePageKey && pathname) {
            const norm = normalizeRoute(pathname);
            const match = slots.find((s) => normalizeRoute(s.page_route_path) === norm);
            effectivePageKey = match?.page_key ?? null;
          }
          const clickedPath = pathOf(assetUrl);
          const candidates = slots.filter((s) => {
            if (effectivePageKey && s.page_key !== effectivePageKey) return false;
            if (sectionKey && s.section_key !== sectionKey) return false;
            if (fieldKey && s.field_key !== fieldKey) return false;
            return true;
          });

          const byExactKeys =
            candidates.find((s) => effectivePageKey && sectionKey && fieldKey && s.page_key === effectivePageKey && s.section_key === sectionKey && s.field_key === fieldKey) ||
            candidates.find((s) => effectivePageKey && sectionKey && s.page_key === effectivePageKey && s.section_key === sectionKey) ||
            candidates.find((s) => effectivePageKey && fieldKey && s.page_key === effectivePageKey && s.field_key === fieldKey) ||
            candidates.find((s) => sectionKey && fieldKey && s.section_key === sectionKey && s.field_key === fieldKey) ||
            candidates[0];
          if (byExactKeys) {
            pickSlot(byExactKeys);
            return;
          }

          if (clickedPath) {
            const urlCandidates = (candidates.length > 0 ? candidates : slots).filter((s) =>
              (["desktop", "tablet", "mobile"] as const).some(
                (vp) => pathOf(s.active[vp]?.public_url) === clickedPath,
              ),
            );
            const byUrl =
              urlCandidates.find((s) => pageKey && s.page_key === pageKey && fieldKey && s.field_key === fieldKey) ||
              urlCandidates.find((s) => pageKey && s.page_key === pageKey && sectionKey && s.section_key === sectionKey) ||
              urlCandidates.find((s) => pageKey && s.page_key === pageKey) ||
              urlCandidates.find((s) => fieldKey && s.field_key === fieldKey) ||
              urlCandidates[0];
            if (byUrl) {
              pickSlot(byUrl);
              return;
            }
          }

          if (!sectionKey && !fieldKey) return;
          const hit =
            (pageKey && fieldKey && slots.find((s) => s.page_key === pageKey && s.section_key === sectionKey && s.field_key === fieldKey)) ||
            (pageKey && sectionKey && slots.find((s) => s.page_key === pageKey && s.section_key === sectionKey)) ||
            (pageKey && fieldKey && slots.find((s) => s.page_key === pageKey && s.field_key === fieldKey)) ||
            (sectionKey && fieldKey && slots.find((s) => s.section_key === sectionKey && s.field_key === fieldKey)) ||
            (sectionKey && slots.find((s) => s.section_key === sectionKey)) ||
            (fieldKey && slots.find((s) => s.field_key === fieldKey));
          if (hit) pickSlot(hit);
        }}
        onRouteChange={(pathname) => {
          const norm = normalizeRoute(pathname);
          if (
            previewSlot &&
            normalizeRoute(previewSlot.page_route_path) === norm &&
            !flagsOf(previewSlot).isLegacy
          ) {
            return;
          }
          const hit = canonicalSlotForRoute(norm);
          if (hit) {
            if (flagsOf(hit).isLegacy && !showLegacy) setShowLegacy(true);
            setPreviewSlot(hit);
          }
        }}
      />

    </div>
  );
};

export default AssetWorkbench;
