/**
 * Wahrheits-Check — Datensammler.
 *
 * Vergleicht für jeden Bildslot (page_key · section_key · field_key) **vier**
 * mögliche Wahrheitsquellen und liefert eine konsolidierte Zeile, die im
 * Admin-Tab „Wahrheits-Check" angezeigt wird.
 *
 * Vier Quellen:
 *  1. DB-Inhalt         → cms_assets (aktive/inaktive Bilder)
 *  2. Whitelist         → cms_admin_editable_fields (Admin darf pflegen?)
 *  3. Renderer          → statische Karte rendererSlotMap (Code liest Slot?)
 *  4. UI-Code-Fallback  → bekannte hardcodierte Bilder in Page-Komponenten
 *                        (statisch gepflegte Liste; optional erweiterbar)
 *
 * „Eine Wahrheit" liegt vor, wenn:
 *   - genau ein aktives DB-Asset existiert
 *   - die Whitelist diesen Slot freigibt
 *   - der Renderer genau diesen field_key liest
 *   - **kein** UI-Code-Fallback dieses Slots bekannt ist
 *
 * Read-only. Keine Schreibwege, keine Migrationen.
 */

import {
  readAssetsOverview,
  type CmsAssetOverviewRow,
} from "@/features/admin/api/cmsAdminAssets";
import { readEditableFields, type EditableFieldRow } from "@/features/admin/api/cmsAdminEditableFields";
import {
  RENDERER_SLOT_MAP,
  RENDERER_COMPONENT_HINT,
  KNOWN_SECTION_TYPES,
  normalizeSectionType,
  type RendererSlotSpec,
} from "@/features/admin/lib/rendererSlotMap";
// Karten-Wahrheit (containerbewusst) wird aus der gemeinsamen Resolver-Bibliothek
// gelesen. Reine Funktionen, kein React-Import, keine Public-Komponente — daher
// keine zyklische Abhängigkeit Admin → Public.
import {
  effectiveContainerKindOf,
  expectedSlotOf,
} from "@/features/cms/lib/cardVisibility";
import {
  getKnownPageObjectContractStatus,
  type PageObjectContractStatus,
  type PageObjectContractKind,
} from "@/features/admin/lib/knownPageObjectContracts";
// Allowlist auto-generiert aus den hartkodierten Page-Komponenten
// (cms.asset-Aufrufe). Slots in dieser Liste werden vom Wahrheits-Check
// nicht als „Renderer ignoriert" geflaggt, sondern als „Page-Component liest".
import { KNOWN_PAGE_COMPONENT_READS } from "@/features/admin/lib/knownPageComponentReads";
import {
  OBJECT_CONTRACTS,
  fieldMatchesContract,
} from "@/features/admin/lib/objectContracts";


export interface SectionRow {
  page_key: string;
  section_key: string;
  section_type: string | null;
  parent_section_key: string | null;
  is_active: boolean;
  sort_order: number;
}

/**
 * Statisch gepflegte Liste bekannter UI-Code-Fallbacks für Bildslots.
 * Quelle: docs/04-betrieb/renderer-fallback-inventar-latest.md sowie
 * direkter Code-Import in Page-Komponenten (z. B. `import heroImg from …`).
 *
 * Format: `${page_key}|${section_key}|${field_key}` (field_key '*' = alle Felder
 * der Section werden vom Code überschrieben).
 *
 *
 * Diese Liste ist **manuell gepflegt** — der Wahrheits-Check scannt nicht
 * automatisch den gesamten Code. Quelle/Pflegehilfe:
 * `docs/04-betrieb/renderer-fallback-inventar-latest.md` (Spalte „local assets")
 * sowie direkte Sichtprüfung in Page-Komponenten (`import xyzImg from …`).
 *
 * Stand 2026-06-02: das Inventar weist für keine Page-Komponente einen direkten
 * Bild-Import in einen CMS-gepflegten Slot aus (`local assets`-Spalte komplett
 * leer). Deshalb ist die Liste leer. Sobald ein hartcodiertes Bild auftaucht,
 * Eintrag ergänzen — der Check schlägt dann beim nächsten Laden Alarm.
 */
export const KNOWN_UI_FALLBACKS: ReadonlySet<string> = new Set<string>([
  // Beispiele (bewusst leer — Einträge folgen, sobald Hardcodes auftauchen):
  // "anwendungen.pflege|hero|image",
]);

export type TruthLevel = "ok" | "warn" | "error";

export type TruthStatus =
  | "one_truth" // alle vier Quellen stimmen überein, CMS steuert alleine
  | "editable_empty" // Whitelist + Renderer + Pflege möglich, aber kein Inhalt
  | "not_yet_configured" // optionaler Slot ohne Inhalt UND ohne Whitelist — noch nicht eingerichtet
  | "page_component_read" // V1-Renderer liest nicht, aber eine hartkodierte Page-Komponente liest diesen Slot — legitim
  | "missing_whitelist" // DB hat Inhalt, Renderer liest — aber Admin sieht/pflegt nicht
  | "renderer_orphan" // DB hat Inhalt, Renderer liest field_key nicht → ignoriert
  | "ui_fallback" // bekannter UI-Code-Fallback (manuell gepflegt)
  | "db_dupes" // mehrere aktive DB-Bilder im selben Slot/Viewport
  | "unknown_section_type" // section_type nicht im Renderer-Katalog
  | "section_missing" // DB-Asset ohne zugehörige Section
  | "section_inactive"; // Section deaktiviert → wird nicht gerendert


export const TRUTH_STATUS_META: Record<TruthStatus, { level: TruthLevel; label: string; explain: string }> = {
  one_truth: {
    level: "ok",
    label: "Eine Wahrheit",
    explain:
      "DB hat Inhalt, Whitelist erlaubt Pflege, Renderer liest genau diesen Slot. Keine bekannten UI-Code-Fallbacks. Alles wird ausschließlich vom CMS gesteuert.",
  },
  editable_empty: {
    level: "ok",
    label: "Pflegbar, aber leer (optional)",
    explain:
      "Whitelist und Renderer sind bereit, im CMS ist aber noch kein Inhalt hinterlegt. Optionaler Slot — technisch in Ordnung, auf der Website bleibt er einfach leer/ausgeblendet.",
  },
  not_yet_configured: {
    level: "ok",
    label: "Noch nicht eingerichtet (optional)",
    explain:
      "Optionaler Slot: weder Inhalt in der DB noch Whitelist-Eintrag. Der Renderer würde lesen, sobald beides angelegt ist. Technisch in Ordnung — bis dahin bleibt der Slot stumm.",
  },
  page_component_read: {
    level: "ok",
    label: "Page-Komponente liest",
    explain:
      "Der zentrale V1-Renderer dieses Section-Typs liest diesen field_key nicht — aber eine hartkodierte Page-Komponente (z. B. ReferenzprojektDetailPage, TuersprechanlagenPage) liest den Slot über cms.asset(...). Quelle: scripts/cms/harvest-page-component-reads.mjs → src/features/admin/lib/knownPageComponentReads.ts. Technisch in Ordnung; sobald die Seite auf den CMS-Body-Renderer migriert ist, wandert der Slot in den V1-Slot-Map.",
  },
  missing_whitelist: {
    level: "warn",
    label: "Whitelist fehlt",
    explain:
      "DB hat Inhalt und der Renderer liest ihn — aber der Admin-Whitelist-Eintrag fehlt. Im /admin ist dieser Slot nicht sichtbar/pflegbar.",
  },

  renderer_orphan: {
    level: "error",
    label: "Renderer ignoriert",
    explain:
      "DB hat Inhalt, der Renderer dieses Section-Typs liest aber genau diesen field_key nicht. Der Inhalt ist verwaist und wird nicht angezeigt.",
  },
  ui_fallback: {
    level: "error",
    label: "Bekannter Code-Fallback (manuell gepflegt)",
    explain:
      "Für diesen Slot ist in der manuell gepflegten Liste KNOWN_UI_FALLBACKS (truthSources.ts) ein hartcodiertes Bild eingetragen. Der Wahrheits-Check scannt den Code nicht automatisch — Einträge müssen hier gepflegt werden. Steht der Slot drin, gibt es zwei Wahrheiten gleichzeitig (CMS + Code).",
  },
  db_dupes: {
    level: "error",
    label: "Mehrere aktive DB-Bilder",
    explain:
      "Es liegen mehrere aktive Assets im selben (page_key, section_key, field_key, viewport). Welches Bild öffentlich gerendert wird, ist nicht eindeutig. Genau ein Asset aktiv lassen, die übrigen deaktivieren oder löschen.",
  },
  unknown_section_type: {
    level: "error",
    label: "Unbekannter Section-Typ",
    explain:
      "Der section_type ist nicht im Renderer-Katalog. Es gibt keine Komponente, die diesen Slot liest.",
  },
  section_missing: {
    level: "error",
    label: "Section fehlt",
    explain: "Zu diesem DB-Bildslot gibt es keine passende Section. Vermutlich gelöscht — Bild ist verwaist.",
  },
  section_inactive: {
    level: "warn",
    label: "Section inaktiv",
    explain:
      "Die zugehörige Section ist auf is_active=false geschaltet — wird auf der öffentlichen Website nicht gerendert, egal was im Slot liegt.",
  },
};

export interface TruthRecord {
  page_key: string;
  page_title: string | null;
  page_route: string | null;
  page_status: string | null;
  section_key: string;
  section_type_raw: string | null;
  section_type_normalized: string | null;
  section_is_active: boolean;
  field_key: string;
  /** Quelle 1: DB */
  db_active_count: number;
  db_inactive_count: number;
  /** Maximale Anzahl aktiver Assets in einem (page,section,field,viewport)-Bucket. >1 = Dublette. */
  db_active_max_per_viewport: number;
  /** Viewports mit Dubletten (z. B. ['desktop']). Leer, wenn keine Dubletten. */
  db_dupe_viewports: string[];
  /** True = Slot ist ein Text/Toggle (cms_section_fields), False = Bild (cms_assets). */
  is_text_slot: boolean;
  /** Wahrheit „DB hat Inhalt" — bei Text-Slots aus cms_section_fields, sonst aus cms_assets. */
  has_content: boolean;
  /** Anzahl Locales mit nicht-leerem Wert (nur Text-Slots). */
  text_nonempty_locales: number;
  /** Quelle 2: Whitelist (mind. eine Locale aktiv) */
  whitelist_enabled: boolean;
  whitelist_locales: string[];
  /** Quelle 3: Renderer-Erwartung */
  renderer_reads: boolean;
  renderer_spec: RendererSlotSpec | null;
  renderer_component_hint: string;
  /** Quelle 4: bekannter UI-Code-Fallback */
  ui_fallback: boolean;
  /** Abgeleiteter Status */
  status: TruthStatus;
}

export interface NavBereich {
  /** Stabiler Schlüssel (z. B. „main:eingangssysteme", „footer", „rest:detail"). */
  key: string;
  /** Anzeigetext (klartext, deutsch). */
  label: string;
}

/** Fallback-Bucket für Seiten ohne Eintrag in cms_navigation_nodes. */
export const NAV_FALLBACK_KEY = "rest:detail";
export const NAV_FALLBACK_LABEL = "Detail-/Sonstige Seiten";

export interface NavProgress {
  key: string;
  label: string;
  total: number;
  one_truth: number;
  warn: number;
  error: number;
  /** Anteil „Eine Wahrheit" in Prozent (0–100, gerundet). */
  percent: number;
}

export interface SectionAggregate {
  page_key: string;
  page_title: string | null;
  page_route: string | null;
  section_key: string;
  section_type_raw: string | null;
  section_type_normalized: string | null;
  section_is_active: boolean;
  /** Alle Feld-Records dieser Section. */
  records: TruthRecord[];
  ok: number;
  warn: number;
  error: number;
  /** Schlimmster Status der Section (für Sammelbadge). */
  worst_status: TruthStatus;
}

/**
 * Objekt-Arten, die der Wahrheits-Check als „eine Wahrheit pro Objekt"
 * bewertet. Wir decken damit den vollständigen Baustein-Katalog ab, der
 * im Admin-Vorlagenbereich angeboten wird — nicht nur CTA/FAQ/Karten.
 *
 * Mapping kind → section_type (kanonisch normalisiert):
 *   cta              → cta_v1
 *   faq              → faq_v1
 *   card             → card_v1 (Standardkarte als Kind eines Containers)
 *   cards_grid       → cards_v1 (Kartenraster ohne Scroller-Variante)
 *   cards_scroller   → product_scroller_v1 ODER cards_v1 mit section_key=products
 *   feature_grid     → feature_grid_v1 (Icon-Raster)
 *   teaser           → teaser_2col_v1 (Wechselteaser)
 *   stats            → stats_v1 (Kennzahlen)
 *   tabs             → tabs_v1
 *   rich             → rich_v1 (Freitext)
 *   downloads        → download_list_v1
 *   contact          → contact_block_v1
 *   content          → content_v1
 *   hero             → hero_v1
 *
 * Page-Contract-Status (KNOWN_PAGE_OBJECT_CONTRACTS) gibt es zur Zeit
 * nur für CTA und FAQ — sie sind die einzigen Bausteine, deren öffentliche
 * Wirksamkeit am Page-Pfad hängt (Tail-CTA vs. CmsBodyRenderer). Für alle
 * anderen Arten leiten wir den Status rein technisch aus der Section-
 * Aggregation (Felder rot/gelb/grün + Section aktiv?) ab.
 */
export type TruthObjectKind =
  | "cta"
  | "faq"
  | "card"
  | "cards_grid"
  | "cards_scroller"
  | "feature_grid"
  | "teaser"
  | "stats"
  | "tabs"
  | "rich"
  | "downloads"
  | "contact"
  | "content"
  | "hero";
export type TruthObjectStatus = "green" | "yellow" | "red";

export const TRUTH_OBJECT_STATUS_META: Record<TruthObjectStatus, { label: string; explain: string }> = {
  green: {
    label: "Grün",
    explain: "Das Objekt hängt öffentlich wirksam am CMS. Änderungen im CMS sind die führende Wahrheit für dieses Objekt.",
  },
  yellow: {
    label: "Gelb",
    explain: "Für dieses Objekt fehlt noch eine eindeutige Vertragsaussage im Public-Pfad. Nicht kaputt, aber noch nicht belastbar grün.",
  },
  red: {
    label: "Rot",
    explain: "Dieses Objekt ist noch keine verlässliche CMS-Wahrheit für die Website.",
  },
};

/**
 * Schwereklassen (Abnahme-relevant). Die alte rot/gelb/grün-Achse bleibt
 * für Kompatibilität bestehen — Schwereklassen sind die *trennscharfe*
 * Sicht für die Abnahme:
 *
 *   critical    → echter Launch-Blocker. Nur das darf die Abnahme-Ampel
 *                 rot machen (Public zeigt falsch oder rendert nicht,
 *                 obwohl Admin sichtbar sagt; Dubletten; aktiver Baustein
 *                 ohne Renderpfad).
 *   restschuld  → technische Schuld, kein Live-Fehler. Optionaler
 *                 Renderslot nicht angebunden, Sonderrenderer mit
 *                 registrierter Ausnahme, etc. Sollte aufgeräumt werden,
 *                 blockiert aber keine Abnahme.
 *   warning     → Hinweis. Whitelist fehlt, Section ausgeblendet (Admin
 *                 hat bewusst ausgeschaltet — Public rendert korrekt
 *                 nichts), Feld optional leer, bekannter Code-Fallback.
 *   green       → vollständige Wahrheit. DB · Whitelist · Renderer ·
 *                 Public stimmen überein.
 */
export type TruthSeverity = "critical" | "restschuld" | "warning" | "green";

export const TRUTH_SEVERITY_META: Record<
  TruthSeverity,
  { label: string; short: string; tone: "destructive" | "amber" | "muted" | "emerald"; explain: string }
> = {
  critical: {
    label: "Kritisch / Launch-Blocker",
    short: "Kritisch",
    tone: "destructive",
    explain:
      "Public zeigt falsch oder rendert nicht, obwohl Admin sichtbar sagt. Dubletten im DB-Slot. Aktiver Standardbaustein ohne Renderpfad. Nur diese Klasse blockiert die Abnahme.",
  },
  restschuld: {
    label: "Technische Restschuld",
    short: "Restschuld",
    tone: "amber",
    explain:
      "Feld existiert, der Renderer nutzt es bewusst nicht (optionaler Asset-/Icon-Slot, Sonderrenderer mit registrierter Ausnahme). Kein Live-Fehler, sollte aber aufgeräumt werden.",
  },
  warning: {
    label: "Warnung",
    short: "Warnung",
    tone: "muted",
    explain:
      "Whitelist fehlt, Section vom Admin ausgeblendet (Public rendert korrekt nichts), optionales Feld leer, bekannter Code-Fallback. Hinweis, kein Blocker.",
  },
  green: {
    label: "Grün — eine Wahrheit",
    short: "Grün",
    tone: "emerald",
    explain: "DB, Admin, Renderer und Public stimmen überein. Das CMS steuert die Website wirksam.",
  },
};

/**
 * Klassifiziert einen einzelnen TruthRecord in eine Schwereklasse.
 * Wichtig: `renderer_orphan` wird nur dann zum Launch-Blocker, wenn der
 * Renderer-Slot als `required` deklariert ist. Bei optionalen Slots
 * (`_icon_image`, `thumbnail`, `image` auf Karten, …) ist es Restschuld.
 */
export function recordSeverity(rec: TruthRecord): TruthSeverity {
  const status = rec.status;
  const fk = rec.field_key;

  // Optional = Renderer-Spec sagt explizit optional ODER es gibt gar
  // keinen Spec-Eintrag (Slot ist im Renderer-Vertrag nicht vorgesehen).
  // Zusätzlich Heuristik nach field_key: typische optionale Asset-Slots.
  const specOptional = rec.renderer_spec ? rec.renderer_spec.expectation === "optional" : true;
  const looksOptionalByName =
    /(^|_)icon_image$|^icon_image$|^thumbnail$|_image_alt$|^image_alt$/.test(fk);
  const isOptionalSlot = specOptional || looksOptionalByName;

  switch (status) {
    case "one_truth":
    case "page_component_read":
      return "green";

    case "editable_empty":
    case "not_yet_configured":
    case "missing_whitelist":
    case "section_inactive":
    case "ui_fallback":
      return "warning";

    case "renderer_orphan":
      // Kalibrierung (Batch 15): leer + optional ist kein Fehler, sondern
      // höchstens Hinweis. Restschuld nur, wenn der Slot tatsächlich
      // befüllt ist und der Renderer ihn ignoriert.
      if (isOptionalSlot) {
        return rec.has_content ? "restschuld" : "warning";
      }
      return "critical";

    case "db_dupes":
    case "unknown_section_type":
    case "section_missing":
      return "critical";
  }
}

const SEVERITY_RANK: Record<TruthSeverity, number> = {
  green: 0,
  warning: 1,
  restschuld: 2,
  critical: 3,
};

/**
 * Aggregiert die Schwereklasse eines kompletten Objekts (Section).
 * Regeln:
 *  - Section vom Admin ausgeblendet → max. „warning" (Public rendert
 *    korrekt nichts; ausgeblendet ist beabsichtigt, kein Blocker).
 *  - Page-Pfad rot bei aktiver Section → „critical" (Admin sagt sichtbar,
 *    Public rendert nicht).
 *  - Sonst: worst-of der Record-Schwereklassen.
 */
export function objectSeverity(agg: TruthObjectAggregate): TruthSeverity {
  if (!agg.section_is_active) {
    // Worst-record berechnen, aber auf „warning" deckeln.
    let worst: TruthSeverity = "green";
    for (const r of agg.records) {
      const s = recordSeverity(r);
      if (SEVERITY_RANK[s] > SEVERITY_RANK[worst]) worst = s;
    }
    return SEVERITY_RANK[worst] > SEVERITY_RANK.warning ? "warning" : worst;
  }
  if (agg.page_path.status === "red") return "critical";

  let worst: TruthSeverity = "green";
  for (const r of agg.records) {
    const s = recordSeverity(r);
    if (SEVERITY_RANK[s] > SEVERITY_RANK[worst]) worst = s;
  }
  // Page-Pfad gelb (unknown) hebt mindestens auf warning.
  if (agg.page_path.status === "yellow" && SEVERITY_RANK[worst] < SEVERITY_RANK.warning) {
    worst = "warning";
  }
  return worst;
}

export type ObjectGroupStatus = "green" | "yellow" | "red" | "inactive";

export interface ObjectGroupAggregate {
  /** Gruppenschlüssel aus dem Vertrag (z. B. "primary_button"). */
  key: string;
  /** Anzeigetext. */
  label: string;
  hint?: string;
  required: boolean;
  /** True, wenn die Gruppe vom Vertrag her „aktiv" ist (Pflicht, oder Toggle/Inhalt vorhanden). */
  active: boolean;
  status: ObjectGroupStatus;
  /** Kurze, lesbare Begründung. */
  reason: string;
  /** Die Feld-Records (Inhalt + Hilfsfelder), die zu dieser Gruppe gehören. */
  records: TruthRecord[];
}

export interface ObjectPagePath {
  status: ObjectGroupStatus;
  label: string;
  reason: string;
  /** Welche Page-Komponente liest? (best-effort, kann leer sein). */
  page_route?: string | null;
}

export interface TruthObjectAggregate {
  page_key: string;
  page_title: string | null;
  page_route: string | null;
  section_key: string;
  section_type_raw: string | null;
  section_type_normalized: string | null;
  section_is_active: boolean;
  kind: TruthObjectKind;
  label: string;
  records: TruthRecord[];
  status: TruthObjectStatus;
  status_reason: string;
  page_contract_status: PageObjectContractStatus | null;
  /** Vertragsgruppen (z. B. CTA → 7 Bausteine). */
  groups: ObjectGroupAggregate[];
  /** Records, die zu keiner Vertragsgruppe gehören (Diagnose-Bereich). */
  extra_records: TruthRecord[];
  /** Page-Pfad-Zeile (immer vorhanden, auch wenn kein Page-Pfad-Vertrag existiert). */
  page_path: ObjectPagePath;
  /** Schwereklasse für die Abnahme — siehe `TRUTH_SEVERITY_META`. */
  severity: TruthSeverity;
}

export interface TruthReport {
  records: TruthRecord[];
  pageMeta: Map<string, { title: string | null; route: string | null; status: string | null }>;
  totals: {
    pages: number;
    slots: number;
    sections: number;
    one_truth: number;
    warn: number;
    error: number;
    byStatus: Record<TruthStatus, number>;
  };
  objectTotals: {
    total: number;
    byStatus: Record<TruthObjectStatus, number>;
    bySeverity: Record<TruthSeverity, number>;
    byKind: Record<TruthObjectKind, number>;
  };
  /** Sortierte Liste aller Bereich-Buckets, die in den Records vorkommen. */
  navBereiche: NavBereich[];
  /** Mapping page_key → Navigationsbereich-Key. */
  pageToNav: Record<string, string>;
  /** Fortschritt je Bereich. */
  navProgress: NavProgress[];
  /** Section-zentrierte Sicht (eine Zeile pro Section, schmales Akkordeon). */
  sectionAggregates: SectionAggregate[];
  /** Objekt-zentrierte Sicht für CTA, FAQ und Karten. */
  objectAggregates: TruthObjectAggregate[];
}

interface RawSection {
  id: string;
  page_key: string;
  section_key: string;
  section_type: string | null;
  sort_order: number;
  is_active: boolean;
  parent_section_id: string | null;
}

async function readSections(): Promise<SectionRow[]> {
  const mod = await import("@/lib/cmsSupabase/client");
  if (!mod.isCmsSupabaseConfigured()) return [];
  const sb = mod.getCmsSupabaseClient();
  // PostgREST cappt pro Request bei 1000 Zeilen. cms_sections hat > 1600 Zeilen,
  // daher seitenweise lesen — sonst fehlen Sektionen, die alphabetisch hinten
  // liegen (z. B. ein Großteil der CTA-Blöcke), und der Wahrheits-Check zeigt
  // sie nicht an.
  const PAGE_SIZE = 1000;
  const all: RawSection[] = [];
  let from = 0;
  for (let guard = 0; guard < 50; guard += 1) {
    const { data, error } = await sb
      .from("cms_sections")
      .select("id, page_key, section_key, section_type, sort_order, is_active, parent_section_id")
      .order("page_key", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error || !data) {
      console.warn("[truthSources] readSections failed:", error?.message);
      break;
    }
    const chunk = data as RawSection[];
    all.push(...chunk);
    if (chunk.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  const idToKey = new Map(all.map((r) => [r.id, r.section_key]));
  return all.map((r) => ({
    page_key: r.page_key,
    section_key: r.section_key,
    section_type: r.section_type,
    parent_section_key: r.parent_section_id ? idToKey.get(r.parent_section_id) ?? null : null,
    is_active: r.is_active,
    sort_order: r.sort_order,
  }));
}

interface NavNodeRow {
  id: string;
  nav_area: string;
  node_key: string;
  parent_id: string | null;
  page_key: string | null;
  label_de: string | null;
  label: string | null;
  sort_order: number;
}

interface SectionFieldRow {
  page_key: string;
  section_key: string;
  field_key: string;
  locale: string;
  value: string | null;
}

async function readSectionFields(): Promise<SectionFieldRow[]> {
  const mod = await import("@/lib/cmsSupabase/client");
  if (!mod.isCmsSupabaseConfigured()) return [];
  const sb = mod.getCmsSupabaseClient();
  // Tabelle hat aktuell > 90.000 Zeilen (94 Seiten × Felder × 2 Locales).
  // Pagination ist Pflicht — Guard großzügig, damit der Wahrheits-Check
  // niemals abgeschnitten wird (Folge sonst: alle Karten ab „z…"
  // alphabetisch ohne Inhalt → falsch-rot „Pflichtbaustein hat noch
  // keinen Inhalt im CMS").
  const PAGE_SIZE = 1000;
  const HARD_CAP_PAGES = 500; // = 500.000 Zeilen Spielraum
  const all: SectionFieldRow[] = [];
  let from = 0;
  for (let guard = 0; guard < HARD_CAP_PAGES; guard += 1) {
    const { data, error } = await sb
      .from("cms_section_fields")
      .select("page_key, section_key, field_key, locale, value")
      .order("page_key", { ascending: true })
      .order("section_key", { ascending: true })
      .order("field_key", { ascending: true })
      .order("locale", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error || !data) {
      console.warn("[truthSources] readSectionFields failed:", error?.message);
      break;
    }
    const chunk = data as SectionFieldRow[];
    all.push(...chunk);
    if (chunk.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
    if (guard === HARD_CAP_PAGES - 1) {
      console.warn(
        `[truthSources] readSectionFields: HARD_CAP_PAGES (${HARD_CAP_PAGES}) erreicht — Tabelle ist evtl. größer als erwartet.`,
      );
    }
  }
  return all;
}

interface NavLookup {
  bereiche: NavBereich[];
  pageToNav: Map<string, string>;
}

/**
 * Anzeigenamen der bekannten Navigationsbereiche (nav_area = Spalte in
 * cms_navigation_nodes). Werden im Wahrheits-Check als Bereichs-Chips genutzt.
 */
const NAV_AREA_LABEL: Record<string, string> = {
  main: "Hauptnavigation",
  footer: "Footer",
  footer_bottom: "Footer (unten)",
  meta: "Meta-Navigation",
  persona: "Persona-Navigation",
  home: "Startseite",
};

/**
 * Liest alle Navigationsknoten und liefert je page_key den passenden
 * Bereich-Schlüssel. Priorität:
 *   1. `main` → eigener Bucket je Top-Level-Eintrag (z. B. „main:eingangssysteme").
 *   2. andere `nav_area` → ein gemeinsamer Bucket (Footer, Meta, Persona, Home).
 *   3. Seiten ohne Nav-Eintrag → Fallback `rest:detail` („Detail-/Sonstige Seiten").
 */
async function readAllNavLookup(): Promise<NavLookup> {
  const empty: NavLookup = { bereiche: [], pageToNav: new Map() };
  try {
    const mod = await import("@/lib/cmsSupabase/client");
    if (!mod.isCmsSupabaseConfigured()) return empty;
    const sb = mod.getCmsSupabaseClient();
    const { data, error } = await sb
      .from("cms_navigation_nodes")
      .select("id, nav_area, node_key, parent_id, page_key, label_de, label, sort_order");
    if (error || !data) return empty;
    const rows = data as NavNodeRow[];
    const byId = new Map(rows.map((r) => [r.id, r]));

    // Top-Level je nav_area = parent_id IS NULL
    function topAncestor(node: NavNodeRow): NavNodeRow {
      let cur: NavNodeRow = node;
      while (cur.parent_id) {
        const next = byId.get(cur.parent_id);
        if (!next) break;
        cur = next;
      }
      return cur;
    }

    const bereicheByKey = new Map<string, NavBereich>();
    const pageToNav = new Map<string, string>();

    // Schritt 1: Main-Top-Level-Einträge bekommen jeweils einen eigenen Bucket.
    const mainTops = rows
      .filter((r) => r.nav_area === "main" && r.parent_id === null)
      .sort((a, b) => a.sort_order - b.sort_order);
    for (const t of mainTops) {
      const key = `main:${t.node_key}`;
      bereicheByKey.set(key, {
        key,
        label: t.label_de ?? t.label ?? t.node_key,
      });
    }

    // Schritt 2: Seitenzuordnung. Main → Top-Bucket, andere nav_area → Sammelbucket.
    for (const r of rows) {
      if (!r.page_key) continue;
      if (pageToNav.has(r.page_key)) continue; // Erste Treffer-Priorität gewinnt.
      if (r.nav_area === "main") {
        const top = topAncestor(r);
        pageToNav.set(r.page_key, `main:${top.node_key}`);
      } else {
        const label = NAV_AREA_LABEL[r.nav_area] ?? r.nav_area;
        const key = `area:${r.nav_area}`;
        if (!bereicheByKey.has(key)) bereicheByKey.set(key, { key, label });
        pageToNav.set(r.page_key, key);
      }
    }

    return { bereiche: Array.from(bereicheByKey.values()), pageToNav };
  } catch (e) {
    console.warn("[truthSources] readAllNavLookup failed:", e);
    return empty;
  }
}

// =============================================================================
// Vertragsgruppen + Page-Pfad-Zeile pro Objekt
// =============================================================================

/** Truthy-Prüfung für Toggle-Felder im CMS (z. B. "1" / "true"). */
function isToggleOn(rec: TruthRecord | undefined): boolean {
  if (!rec) return false;
  // Wenn der Renderer den Toggle gar nicht hat, ist `has_content` = false. Reicht uns hier.
  return rec.has_content && rec.text_nonempty_locales > 0;
}

/**
 * Page-Pfad-Zeile pro Objekt.
 *
 * - Für CTA/FAQ basiert sie auf der spezifischen KNOWN_PAGE_OBJECT_CONTRACTS-
 *   Inventur (Tail-CTA vs. CmsBodyRenderer, FaqV1, Legacy <CTASection/>).
 * - Für alle anderen Bausteine (Karten, Stats, Tabs, Downloads, Hero, …)
 *   wird der generische `body`-Pfad geprüft: nur Seiten, deren Page-Code
 *   ihren Body über `CmsBodyRenderer` oder `CmsOnlyShell` aufbaut, dürfen
 *   pauschal als grün gelten. Alle anderen bleiben gelb („unbekannt") —
 *   nicht falsch grün.
 */
function computePagePath(
  kind: TruthObjectKind,
  pageContractStatus: PageObjectContractStatus | null,
  bodyContractStatus: PageObjectContractStatus | null,
  pageRoute: string | null,
): ObjectPagePath {
  const hasSpecificContract = kind === "cta" || kind === "faq";

  if (!hasSpecificContract) {
    if (bodyContractStatus === "ok") {
      return {
        status: "green",
        label: "Page-Pfad",
        reason:
          "Page-Komponente baut ihren Body über `CmsBodyRenderer` / `CmsOnlyShell` — Sections werden generisch aus dem CMS gerendert.",
        page_route: pageRoute,
      };
    }
    // unknown oder null
    return {
      status: "yellow",
      label: "Page-Pfad",
      reason:
        "Kein generischer CMS-Body-Pfad (`CmsBodyRenderer` / `CmsOnlyShell`) im Page-Code nachgewiesen. Solange das nicht inventarisiert ist, kann nicht garantiert werden, dass diese Section öffentlich wirkt.",
      page_route: pageRoute,
    };
  }

  if (pageContractStatus === "ok") {
    return {
      status: "green",
      label: "Page-Pfad",
      reason: "Die Page-Komponente liest dieses CMS-Objekt sauber aus dem CMS.",
      page_route: pageRoute,
    };
  }
  if (pageContractStatus === "ok_dedup_only") {
    return {
      status: "yellow",
      label: "Page-Pfad",
      reason:
        "Page rendert den Inhalt inline aus dem Code. `CmsInlineSectionMarker` verhindert nur den Doppel-Render durch CmsTail*. Admin-Toggle wirkt NICHT auf den sichtbaren Inhalt — bewusste Restschuld.",
      page_route: pageRoute,
    };
  }
  if (pageContractStatus === "orphan") {
    return {
      status: "red",
      label: "Page-Pfad",
      reason: "Page-Pfad ignoriert dieses CMS-Objekt — die Page-Komponente rendert es nicht.",
      page_route: pageRoute,
    };
  }
  if (pageContractStatus === "mixed") {
    return {
      status: "red",
      label: "Page-Pfad",
      reason: "Page-Pfad mischt CMS-Objekt mit Legacy-Code — keine eindeutige Wahrheit.",
      page_route: pageRoute,
    };
  }
  // unknown oder null
  return {
    status: "yellow",
    label: "Page-Pfad",
    reason: "Page-Komponente wurde noch nicht eindeutig inventarisiert.",
    page_route: pageRoute,
  };
}

/**
 * Daten einer Kind-Section, die für einen `childSectionType`-Baustein
 * (z. B. `stat_v1` unter `stats_v1`) gebraucht werden.
 */
interface ChildSectionInfo {
  section_key: string;
  section_type: string | null;
  records: TruthRecord[];
}

/**
 * Verteilt die Records eines Section-Aggregats auf die Vertragsgruppen.
 * - Felder, die kein Vertrag aufnimmt, landen in `extraRecords` (Diagnose).
 * - Pro Gruppe wird Aktiv-/Statusberechnung gemacht.
 * - Für Bausteine mit `childSectionType` werden die übergebenen
 *   `childrenSections` ausgewertet (Pflicht-Container ohne passende Kinder
 *   sind rot; mit Kindern ohne befüllte Inhaltsfelder gelb).
 */
function computeGroups(
  kind: TruthObjectKind,
  records: TruthRecord[],
  childrenSections: ChildSectionInfo[],
): { groups: ObjectGroupAggregate[]; extraRecords: TruthRecord[] } {
  const contract = OBJECT_CONTRACTS[kind];
  const byField = new Map<string, TruthRecord>();
  for (const r of records) byField.set(r.field_key, r);

  const used = new Set<string>();
  const groups: ObjectGroupAggregate[] = [];

  for (const g of contract.groups) {
    // -------------------- Kind-Section-Baustein --------------------
    if (g.childSectionType) {
      const matchingChildren = childrenSections.filter(
        (c) => (c.section_type ?? "") === g.childSectionType,
      );
      // Sammelt alle Records der Kinder für die Diagnose-Ansicht.
      const childRecordsFlat: TruthRecord[] = [];
      for (const c of matchingChildren) {
        for (const r of c.records) childRecordsFlat.push(r);
      }

      const fields = g.childContentFields ?? [];
      const childrenWithContent = matchingChildren.filter((c) =>
        c.records.some(
          (r) => r.has_content && fieldMatchesContract(r.field_key, fields),
        ),
      );

      const active = g.required || matchingChildren.length > 0;

      let status: ObjectGroupStatus;
      let reason: string;
      if (!active) {
        status = "inactive";
        reason = "Optionaler Container, derzeit keine Kind-Sections angelegt.";
      } else if (matchingChildren.length === 0) {
        status = "red";
        reason = `Container braucht mindestens eine Kind-Section vom Typ \`${g.childSectionType}\`, aktuell ist keine angelegt.`;
      } else if (childrenWithContent.length === 0) {
        status = "yellow";
        reason = `${matchingChildren.length} Kind-Section(s) vom Typ \`${g.childSectionType}\` vorhanden, aber noch keine mit befülltem Inhaltsfeld (${fields.join(", ") || "—"}).`;
      } else if (childrenWithContent.length < matchingChildren.length) {
        status = "yellow";
        reason = `${childrenWithContent.length} von ${matchingChildren.length} Kind-Section(s) sind inhaltlich befüllt — die übrigen sind noch leer.`;
      } else {
        status = "green";
        reason = `${matchingChildren.length} Kind-Section(s) vom Typ \`${g.childSectionType}\` sind im CMS gepflegt.`;
      }

      groups.push({
        key: g.key,
        label: g.label,
        hint: g.hint,
        required: g.required,
        active,
        status,
        reason,
        records: childRecordsFlat,
      });
      continue;
    }

    // -------------------- Feld-Baustein der eigenen Section --------------------
    const groupRecords: TruthRecord[] = [];
    const contentRecords: TruthRecord[] = [];

    for (const r of records) {
      if (fieldMatchesContract(r.field_key, g.contentFields)) {
        groupRecords.push(r);
        contentRecords.push(r);
        used.add(r.field_key);
      }
    }
    for (const aux of g.auxFields ?? []) {
      const r = byField.get(aux);
      if (r) {
        groupRecords.push(r);
        used.add(aux);
      }
    }
    const toggleRec = g.activeIfToggle ? byField.get(g.activeIfToggle) : undefined;
    if (toggleRec) {
      groupRecords.push(toggleRec);
      used.add(g.activeIfToggle!);
    }

    const anyContent = contentRecords.some((r) => r.has_content);
    const active = g.required || isToggleOn(toggleRec) || anyContent;

    let status: ObjectGroupStatus;
    let reason: string;
    if (!active) {
      status = "inactive";
      reason = "Optionaler Baustein, derzeit nicht aktiviert.";
    } else {
      const hasError =
        groupRecords.some((r) => TRUTH_STATUS_META[r.status].level === "error") ||
        (g.required && !anyContent);
      const hasWarn =
        groupRecords.some((r) => TRUTH_STATUS_META[r.status].level === "warn") ||
        (isToggleOn(toggleRec) && !anyContent);

      if (hasError) {
        status = "red";
        if (g.required && !anyContent) {
          reason = "Pflichtbaustein hat noch keinen Inhalt im CMS.";
        } else {
          const bad = groupRecords.find((r) => TRUTH_STATUS_META[r.status].level === "error");
          reason = bad
            ? `Feld „${bad.field_key}" ist nicht sauber angebunden (${TRUTH_STATUS_META[bad.status].label}).`
            : "Mindestens ein Feld ist nicht sauber angebunden.";
        }
      } else if (hasWarn) {
        status = "yellow";
        if (isToggleOn(toggleRec) && !anyContent) {
          reason = "Schalter ist an, aber Inhalte fehlen noch.";
        } else {
          const bad = groupRecords.find((r) => TRUTH_STATUS_META[r.status].level === "warn");
          reason = bad
            ? `Feld „${bad.field_key}": ${TRUTH_STATUS_META[bad.status].label}.`
            : "Baustein ist teilweise gepflegt.";
        }
      } else {
        status = "green";
        reason = g.required
          ? "Pflichtbaustein ist im CMS gepflegt und wirksam."
          : "Optionaler Baustein ist aktiviert und im CMS gepflegt.";
      }
    }

    groups.push({
      key: g.key,
      label: g.label,
      hint: g.hint,
      required: g.required,
      active,
      status,
      reason,
      records: groupRecords,
    });
  }

  const extraRecords = records.filter((r) => !used.has(r.field_key));
  return { groups, extraRecords };
}

export function buildTruthReport(
  assets: CmsAssetOverviewRow[],
  sections: SectionRow[],
  whitelist: EditableFieldRow[],
  nav: NavLookup = { bereiche: [], pageToNav: new Map() },
  sectionFields: SectionFieldRow[] = [],
): TruthReport {
  const sectionsByKey = new Map<string, SectionRow>();
  for (const s of sections) sectionsByKey.set(`${s.page_key}|${s.section_key}`, s);

  // Text-Inhalte aus cms_section_fields. Pro Slot: hat irgendeine Locale
  // einen nicht-leeren Wert? → wertet als „DB hat Inhalt" für Text-Felder.
  const textBySlot = new Map<string, { nonEmpty: Set<string>; locales: Set<string> }>();
  for (const f of sectionFields) {
    const k = `${f.page_key}|${f.section_key}|${f.field_key}`;
    let g = textBySlot.get(k);
    if (!g) {
      g = { nonEmpty: new Set<string>(), locales: new Set<string>() };
      textBySlot.set(k, g);
    }
    g.locales.add(f.locale);
    if ((f.value ?? "").trim().length > 0) g.nonEmpty.add(f.locale);
  }

  // DB-Assets pro Slot (gesamt) und pro (Slot × Viewport) für Dubletten-Erkennung.
  const dbBySlot = new Map<string, { active: number; inactive: number }>();
  const dbByViewport = new Map<string, Map<string, number>>(); // slot → viewport → activeCount
  const pageMeta = new Map<string, { title: string | null; route: string | null; status: string | null }>();
  for (const a of assets) {
    if (!pageMeta.has(a.page_key)) {
      pageMeta.set(a.page_key, {
        title: a.page_title_de,
        route: a.page_route_path,
        status: a.page_status,
      });
    }
    if (!a.field_key) continue;
    const k = `${a.page_key}|${a.section_key}|${a.field_key}`;
    const g = dbBySlot.get(k) ?? { active: 0, inactive: 0 };
    if (a.is_active) g.active += 1;
    else g.inactive += 1;
    dbBySlot.set(k, g);
    if (a.is_active) {
      const vp = a.viewport ?? "desktop";
      let perVp = dbByViewport.get(k);
      if (!perVp) {
        perVp = new Map<string, number>();
        dbByViewport.set(k, perVp);
      }
      perVp.set(vp, (perVp.get(vp) ?? 0) + 1);
    }
  }

  // Whitelist pro Slot (eine Aggregation über alle Locales)
  const wlBySlot = new Map<string, { enabled: boolean; locales: Set<string> }>();
  for (const w of whitelist) {
    const k = `${w.page_key}|${w.section_key}|${w.field_key}`;
    const g = wlBySlot.get(k) ?? { enabled: false, locales: new Set<string>() };
    if (w.is_enabled) {
      g.enabled = true;
      g.locales.add(w.locale);
    }
    wlBySlot.set(k, g);
  }

  // Erwartete Slots aus Renderer-Karte (pro aktiver Section).
  // Sonderfall `card_v1`: der erwartete Slot hängt vom Eltern-Container ab
  // (Raster, Scroller, Hub-Grid, Feature-Grid) — ermittelt über die gemeinsame
  // Karten-Wahrheit `effectiveContainerKindOf` / `expectedSlotOf`.
  const expectedSlots = new Map<string, RendererSlotSpec>();
  for (const s of sections) {
    if (!s.is_active) continue;
    const t = normalizeSectionType(s.section_type);
    if (!t) continue;
    let specs: RendererSlotSpec[] = RENDERER_SLOT_MAP[t] ?? [];
    if (t === "card_v1") {
      const parent = s.parent_section_key
        ? sectionsByKey.get(`${s.page_key}|${s.parent_section_key}`)
        : null;
      const parentType = normalizeSectionType(parent?.section_type ?? null);
      const kind = effectiveContainerKindOf(parentType, parent?.section_key ?? null);
      const exp = expectedSlotOf(kind);
      // Standardkarten-Vertrag (siehe docs/04-betrieb/audit-snapshot/batch15-
      // standardkarten-slotvertrag.md): die zentralen Karten-Renderer
      // (CardsSectionV1, ProductScrollerV1, ProductShowcaseListV1,
      // FeatureGridV1) lesen image / thumbnail / icon_image als Fallback-
      // Kette. Wir markieren daher IMMER alle drei Slots als bekannt und
      // setzen nur den container-erwarteten Slot ggf. auf `required`.
      const ALL_CARD_IMAGE_SLOTS = ["image", "thumbnail", "icon_image"] as const;
      specs = ALL_CARD_IMAGE_SLOTS.map((slot) => {
        const isExpected = exp.slot === slot;
        return {
          fieldKey: slot,
          purpose: isExpected
            ? `Karten-Slot im Container ${kind} (containerbewusst, aus resolveCardVisibility)`
            : `Karten-Slot ${slot} (Fallback-Kette in card_v1-Renderern, optional)`,
          expectation: isExpected && exp.required ? "required" : "optional",
        };
      });
    }
    for (const spec of specs) {
      expectedSlots.set(`${s.page_key}|${s.section_key}|${spec.fieldKey}`, spec);
    }
  }

  // Bekannte Image-Felder pro section_type (zur Trennung Bild/Text).
  const IMAGE_FIELDS_BY_TYPE: Record<string, Set<string>> = {};
  for (const [t, specs] of Object.entries(RENDERER_SLOT_MAP)) {
    IMAGE_FIELDS_BY_TYPE[t] = new Set(specs.map((s) => s.fieldKey));
  }
  // card_v1: alle drei möglichen Bildslots als „bekannt" markieren.
  IMAGE_FIELDS_BY_TYPE.card_v1 = new Set(["image", "thumbnail", "icon_image"]);

  // Union: Slots aus DB + Whitelist + Renderer-Erwartungen + Text-Felder.
  const allKeys = new Set<string>([
    ...dbBySlot.keys(),
    ...wlBySlot.keys(),
    ...expectedSlots.keys(),
    ...textBySlot.keys(),
  ]);

  const records: TruthRecord[] = [];
  for (const k of allKeys) {
    const [page_key, section_key, field_key] = k.split("|");
    const section = sectionsByKey.get(`${page_key}|${section_key}`);
    const rawType = section?.section_type ?? null;
    const normType = normalizeSectionType(rawType);
    const db = dbBySlot.get(k) ?? { active: 0, inactive: 0 };
    const wl = wlBySlot.get(k) ?? { enabled: false, locales: new Set<string>() };
    const txt = textBySlot.get(k) ?? null;
    const imageSpec = expectedSlots.get(k) ?? null;
    // Text-Slot = bekannter section_type + field_key NICHT in der Bildliste
    // dieses Typs. Diese Felder werden vom Renderer über den generischen
    // f(ctx, fieldKey)-Helper gelesen (Titel, Buttons, Telefon, Toggles …).
    //
    // BEWUSSTE HEURISTIK: Wir prüfen NICHT, ob der Renderer dieses konkrete
    // field_key tatsächlich liest — V1-Renderer lesen Textfelder generisch,
    // pro Typ existiert keine kuratierte Whitelist. Folge: Legacy- oder
    // Dotted-Textfelder (z. B. alte `items.X.title`) werden hier ebenfalls
    // als `renderer_reads=true` markiert, auch wenn keine Komponente sie
    // konkret rendert. Wenn diese Großzügigkeit zum Problem wird, müsste
    // pro section_type eine explizite Text-Feld-Liste gepflegt werden (vgl.
    // RENDERER_SLOT_MAP für Bilder). Bis dahin: Status `one_truth` auf
    // Textfeldern bedeutet „technisch sauber + im erwarteten Schema", nicht
    // „garantiert öffentlich sichtbar". Die Objekt-Ampel (CTA/FAQ/Karten)
    // im Wahrheits-Check liefert dafür die belastbare Aussage.
    const knownType = normType ? KNOWN_SECTION_TYPES.has(normType) : false;
    const isImageField = knownType
      ? (IMAGE_FIELDS_BY_TYPE[normType!]?.has(field_key) ?? false)
      : false;
    const isTextSlot = knownType && !isImageField;
    const spec: RendererSlotSpec | null =
      imageSpec ??
      (isTextSlot
        ? {
            fieldKey: field_key,
            purpose: "Text/Toggle, generischer Renderer-Read über f(ctx, fieldKey) (heuristisch, nicht pro Feld verifiziert)",
            expectation: "optional",
          }
        : null);
    const rendererReads = Boolean(spec);
    const hasContent = isTextSlot ? (txt?.nonEmpty.size ?? 0) > 0 : db.active > 0;
    const uiFallback = KNOWN_UI_FALLBACKS.has(k) || KNOWN_UI_FALLBACKS.has(`${page_key}|${section_key}|*`);
    const perVp = dbByViewport.get(k);
    let maxPerVp = 0;
    const dupeViewports: string[] = [];
    if (perVp) {
      for (const [vp, n] of perVp) {
        if (n > maxPerVp) maxPerVp = n;
        if (n > 1) dupeViewports.push(vp);
      }
      dupeViewports.sort();
    }
    const hasDupes = maxPerVp > 1;

    let status: TruthStatus;
    const isOptional = spec ? spec.expectation === "optional" : true;
    if (!section) {
      status = "section_missing";
    } else if (!section.is_active) {
      status = "section_inactive";
    } else if (!normType || !KNOWN_SECTION_TYPES.has(normType)) {
      status = "unknown_section_type";
    } else if (uiFallback) {
      status = "ui_fallback";
    } else if (hasDupes) {
      // Vor renderer_orphan und one_truth: Dubletten sind immer ein Konflikt.
      status = "db_dupes";
    } else if (!rendererReads) {
      // V1-Renderer liest field_key nicht. Bevor wir „verwaist" sagen, prüfen
      // wir die Allowlist hartkodierter Page-Komponenten (cms.asset-Aufrufe).
      // Treffer: exakter Schlüssel, Section-Wildcard ODER page_key-Prefix-Glob
      // (z. B. `anwendungen.referenzprojekte.*|gallery|img_0` für Detail-Seiten
      // mit Slug-page_key).
      const exact = `${page_key}|${section_key}|${field_key}`;
      const wildSection = `${page_key}|${section_key}|*`;
      const matched =
        KNOWN_PAGE_COMPONENT_READS.has(exact) ||
        KNOWN_PAGE_COMPONENT_READS.has(wildSection) ||
        Array.from(KNOWN_PAGE_COMPONENT_READS).some((entry) => {
          if (!entry.includes("*|")) return false;
          const [pkPat, skPat, fkPat] = entry.split("|");
          if (!pkPat.endsWith(".*")) return false;
          const prefix = pkPat.slice(0, -2);
          if (page_key !== prefix && !page_key.startsWith(prefix + ".")) return false;
          if (skPat !== "*" && skPat !== section_key) return false;
          if (fkPat !== "*" && fkPat !== field_key) return false;
          return true;
        });
      status = matched ? "page_component_read" : "renderer_orphan";


    } else if (hasContent && !wl.enabled) {
      // Inhalt liegt da, aber Admin sieht ihn nicht zum Pflegen.
      status = "missing_whitelist";
    } else if (!hasContent && !wl.enabled) {
      // Weder Inhalt noch Whitelist — bei optionalen Slots der Normalfall „noch
      // nicht eingerichtet", bei Pflicht-Slots eine echte Lücke.
      status = isOptional ? "not_yet_configured" : "missing_whitelist";
    } else if (!hasContent) {
      status = "editable_empty";
    } else {
      status = "one_truth";
    }

    const meta = pageMeta.get(page_key);
    records.push({
      page_key,
      page_title: meta?.title ?? null,
      page_route: meta?.route ?? null,
      page_status: meta?.status ?? null,
      section_key,
      section_type_raw: rawType,
      section_type_normalized: normType,
      section_is_active: section?.is_active ?? false,
      field_key,
      db_active_count: db.active,
      db_inactive_count: db.inactive,
      db_active_max_per_viewport: maxPerVp,
      db_dupe_viewports: dupeViewports,
      is_text_slot: isTextSlot,
      has_content: hasContent,
      text_nonempty_locales: txt?.nonEmpty.size ?? 0,
      whitelist_enabled: wl.enabled,
      whitelist_locales: Array.from(wl.locales).sort(),
      renderer_reads: rendererReads,
      renderer_spec: spec,
      renderer_component_hint: normType ? RENDERER_COMPONENT_HINT[normType] ?? "—" : "—",
      ui_fallback: uiFallback,
      status,
    });
  }

  // Sortieren: Status (Probleme zuerst), dann Seite, Section, Feld
  const statusOrder: Record<TruthStatus, number> = {
    db_dupes: 0,
    ui_fallback: 1,
    renderer_orphan: 2,
    unknown_section_type: 3,
    section_missing: 4,
    missing_whitelist: 5,
    section_inactive: 6,
    editable_empty: 7,
    page_component_read: 7,

    not_yet_configured: 8,
    one_truth: 9,
  };
  records.sort((a, b) => {
    const s = statusOrder[a.status] - statusOrder[b.status];
    if (s !== 0) return s;
    const p = a.page_key.localeCompare(b.page_key);
    if (p !== 0) return p;
    const sec = a.section_key.localeCompare(b.section_key);
    if (sec !== 0) return sec;
    return a.field_key.localeCompare(b.field_key);
  });

  // Totals
  const byStatus = Object.fromEntries(
    (Object.keys(TRUTH_STATUS_META) as TruthStatus[]).map((s) => [s, 0]),
  ) as Record<TruthStatus, number>;
  let okN = 0;
  let warnN = 0;
  let errN = 0;
  const pages = new Set<string>();
  for (const r of records) {
    pages.add(r.page_key);
    byStatus[r.status] += 1;
    const lvl = TRUTH_STATUS_META[r.status].level;
    if (lvl === "ok") okN += 1;
    else if (lvl === "warn") warnN += 1;
    else errN += 1;
  }

  // Navigationsbereiche: nur die behalten, die in den records vorkommen.
  const usedNavKeys = new Set<string>();
  const pageToNavOut: Record<string, string> = {};
  for (const r of records) {
    const navKey = nav.pageToNav.get(r.page_key) ?? NAV_FALLBACK_KEY;
    pageToNavOut[r.page_key] = navKey;
    usedNavKeys.add(navKey);
  }
  const navBereiche: NavBereich[] = nav.bereiche.filter((b) => usedNavKeys.has(b.key));
  if (usedNavKeys.has(NAV_FALLBACK_KEY)) {
    navBereiche.push({ key: NAV_FALLBACK_KEY, label: NAV_FALLBACK_LABEL });
  }

  // Fortschritt je Navigationsbereich (für die kurze Auswertung oben im Tab).
  const progressMap = new Map<string, NavProgress>();
  for (const b of navBereiche) {
    progressMap.set(b.key, {
      key: b.key,
      label: b.label,
      total: 0,
      one_truth: 0,
      warn: 0,
      error: 0,
      percent: 0,
    });
  }
  for (const r of records) {
    const navKey = pageToNavOut[r.page_key] ?? NAV_FALLBACK_KEY;
    let p = progressMap.get(navKey);
    if (!p) {
      p = { key: navKey, label: navKey, total: 0, one_truth: 0, warn: 0, error: 0, percent: 0 };
      progressMap.set(navKey, p);
    }
    p.total += 1;
    const lvl = TRUTH_STATUS_META[r.status].level;
    if (lvl === "ok") p.one_truth += 1;
    else if (lvl === "warn") p.warn += 1;
    else p.error += 1;
  }
  const navProgress: NavProgress[] = Array.from(progressMap.values())
    .map((p) => ({ ...p, percent: p.total > 0 ? Math.round((p.one_truth / p.total) * 100) : 0 }))
    .sort((a, b) => {
      // Fallback-Bereich ans Ende, sonst nach Fortschritt aufsteigend (Baustellen oben).
      if (a.key === NAV_FALLBACK_KEY) return 1;
      if (b.key === NAV_FALLBACK_KEY) return -1;
      if (a.percent !== b.percent) return a.percent - b.percent;
      return a.label.localeCompare(b.label);
    });

  // Section-Aggregation (eine Zeile je page_key|section_key, schlimmster Feld-Status gewinnt).
  const statusRank: Record<TruthLevel, number> = { ok: 0, warn: 1, error: 2 };
  const sectionMap = new Map<string, SectionAggregate>();
  for (const r of records) {
    const k = `${r.page_key}|${r.section_key}`;
    let agg = sectionMap.get(k);
    if (!agg) {
      agg = {
        page_key: r.page_key,
        page_title: r.page_title,
        page_route: r.page_route,
        section_key: r.section_key,
        section_type_raw: r.section_type_raw,
        section_type_normalized: r.section_type_normalized,
        section_is_active: r.section_is_active,
        records: [],
        ok: 0,
        warn: 0,
        error: 0,
        worst_status: r.status,
      };
      sectionMap.set(k, agg);
    }
    agg.records.push(r);
    const lvl = TRUTH_STATUS_META[r.status].level;
    if (lvl === "ok") agg.ok += 1;
    else if (lvl === "warn") agg.warn += 1;
    else agg.error += 1;
    if (statusRank[lvl] > statusRank[TRUTH_STATUS_META[agg.worst_status].level]) {
      agg.worst_status = r.status;
    }
  }
  const sectionAggregates = Array.from(sectionMap.values()).sort((a, b) => {
    const la = TRUTH_STATUS_META[a.worst_status].level;
    const lb = TRUTH_STATUS_META[b.worst_status].level;
    const d = statusRank[lb] - statusRank[la]; // Probleme zuerst
    if (d !== 0) return d;
    const p = a.page_key.localeCompare(b.page_key);
    if (p !== 0) return p;
    return a.section_key.localeCompare(b.section_key);
  });

  const OBJECT_LABEL: Record<TruthObjectKind, string> = {
    cta: "CTA",
    faq: "FAQ",
    card: "Karte (Standardkarte)",
    cards_grid: "Kartenraster",
    cards_scroller: "Kartenscroller",
    feature_grid: "Icon-Raster",
    teaser: "Wechselteaser",
    stats: "Kennzahlen",
    tabs: "Tabs",
    rich: "Freitext",
    downloads: "Download-Liste",
    contact: "Kontaktblock",
    content: "Inhaltsabschnitt",
    hero: "Hero",
  };
  // Nur diese Kinds haben einen Page-Pfad-Vertrag (Tail-CTA vs. CmsBodyRenderer).
  // Alle anderen Bausteine werden vom CmsBodyRenderer direkt iteriert; ihre
  // öffentliche Wirksamkeit hängt allein an Section.is_active + Feldstatus.
  const PAGE_CONTRACT_KINDS = new Set<TruthObjectKind>(["cta", "faq"]);
  /**
   * Batch 49d — Legacy/Bespoke-Sections, die zwar in der DB existieren,
   * aber öffentlich NICHT vom CMS-Renderer ausgegeben werden (Sonderpfad
   * in der Page-Komponente, archivierte Seite, i18n-Fallback). Sie dürfen
   * weder als aktive Kartenscroller noch als andere Wahrheits-Objekte
   * gezählt werden, sonst entsteht eine Phantom-Zeile im Admin/Audit.
   *
   * Pflege: nur ergänzen, wenn nachweislich keine öffentliche Wirkung.
   *   - signage.root|products → `signage.root` ist `status='archived' /
   *     is_active=false`; SignagePage.tsx rendert eigene FeatureBlocks
   *     aus i18n. Siehe Batch 49c + 49d.
   */
  const LEGACY_BESPOKE_SECTIONS = new Set<string>([
    "signage.root|products",
  ]);
  const objectKindsBySection = (section: SectionAggregate): TruthObjectKind[] => {
    const raw = section.section_type_raw ?? "";
    const norm = section.section_type_normalized ?? "";
    const key = section.section_key;
    if (LEGACY_BESPOKE_SECTIONS.has(`${section.page_key}|${key}`)) return [];
    if (key === "faq" || norm === "faq_v1" || raw === "faq_v1") return ["faq"];
    if (key === "standard_cta" || key === "cta" || norm === "cta_v1" || raw === "cta_v1") return ["cta"];
    if (norm === "card_v1" || raw === "card_v1") return ["card"];

    if (norm === "product_scroller_v1") return ["cards_scroller"];
    if (norm === "cards_v1") {
      // Scroller-Variante: cards_v1 mit section_key=products wird im Renderer
      // als Produkt-Scroller behandelt. Sonst klassisches Kartenraster.
      return [key === "products" ? "cards_scroller" : "cards_grid"];
    }
    if (norm === "feature_grid_v1") return ["feature_grid"];
    if (norm === "teaser_2col_v1") return ["teaser"];
    if (norm === "stats_v1") return ["stats"];
    if (norm === "tabs_v1") return ["tabs"];
    if (norm === "rich_v1") return ["rich"];
    if (norm === "download_list_v1") return ["downloads"];
    if (norm === "contact_block_v1") return ["contact"];
    if (norm === "content_v1") return ["content"];
    if (norm === "hero_v1") return ["hero"];
    return [];
  };
  // Kind-Sections pro Eltern-Section (für child-basierte Bausteine).
  const childrenByParent = new Map<string, ChildSectionInfo[]>();
  for (const s of sections) {
    if (!s.parent_section_key) continue;
    const parentKey = `${s.page_key}|${s.parent_section_key}`;
    const childAgg = sectionMap.get(`${s.page_key}|${s.section_key}`);
    const arr = childrenByParent.get(parentKey) ?? [];
    arr.push({
      section_key: s.section_key,
      section_type: s.section_type,
      records: childAgg?.records ?? [],
    });
    childrenByParent.set(parentKey, arr);
  }

  const objectAggregates: TruthObjectAggregate[] = [];
  for (const section of sectionAggregates) {
    const kinds = objectKindsBySection(section);
    if (kinds.length === 0) continue;
    const bodyContractStatus = getKnownPageObjectContractStatus(
      "body" as PageObjectContractKind,
      section.page_key,
    );
    const children = childrenByParent.get(`${section.page_key}|${section.section_key}`) ?? [];
    for (const kind of kinds) {
      const pageContractStatus = PAGE_CONTRACT_KINDS.has(kind)
        ? getKnownPageObjectContractStatus(kind as PageObjectContractKind, section.page_key)
        : null;

      // --- Page-Pfad-Zeile ---
      const pagePath = computePagePath(kind, pageContractStatus, bodyContractStatus, section.page_route);

      // --- Vertragsgruppen + Restfelder ---
      const { groups, extraRecords } = computeGroups(kind, section.records, children);

      // --- Außenampel: strenge UND-Verknüpfung ---
      let status: TruthObjectStatus = "green";
      let statusReason = "CMS-Objekt steuert die Website wirksam.";
      if (!section.section_is_active) {
        status = "red";
        statusReason = "Section ist ausgeblendet und wirkt deshalb öffentlich nicht.";
      } else if (pagePath.status === "red") {
        status = "red";
        statusReason = pagePath.reason;
      } else if (groups.some((g) => g.active && g.status === "red")) {
        status = "red";
        const g = groups.find((x) => x.active && x.status === "red")!;
        statusReason = `Baustein „${g.label}" ist nicht als Wahrheit angebunden: ${g.reason}`;
      } else if (pagePath.status === "yellow" || groups.some((g) => g.active && g.status === "yellow")) {
        status = "yellow";
        statusReason = pagePath.status === "yellow"
          ? pagePath.reason
          : "Mindestens ein aktiver Baustein ist noch nicht belastbar grün.";
      }

      const objectAgg: TruthObjectAggregate = {
        page_key: section.page_key,
        page_title: section.page_title,
        page_route: section.page_route,
        section_key: section.section_key,
        section_type_raw: section.section_type_raw,
        section_type_normalized: section.section_type_normalized,
        section_is_active: section.section_is_active,
        kind,
        label: OBJECT_LABEL[kind],
        records: section.records,
        status,
        status_reason: statusReason,
        page_contract_status: pageContractStatus,
        groups,
        extra_records: extraRecords,
        page_path: pagePath,
        severity: "green", // wird gleich überschrieben
      };
      objectAgg.severity = objectSeverity(objectAgg);
      objectAggregates.push(objectAgg);
    }
  }
  objectAggregates.sort((a, b) => {
    const rank: Record<TruthObjectStatus, number> = { red: 0, yellow: 1, green: 2 };
    const d = rank[a.status] - rank[b.status];
    if (d !== 0) return d;
    const k = a.kind.localeCompare(b.kind);
    if (k !== 0) return k;
    const p = a.page_key.localeCompare(b.page_key);
    if (p !== 0) return p;
    return a.section_key.localeCompare(b.section_key);
  });
  const objectTotals = {
    total: objectAggregates.length,
    byStatus: { green: 0, yellow: 0, red: 0 } as Record<TruthObjectStatus, number>,
    bySeverity: { critical: 0, restschuld: 0, warning: 0, green: 0 } as Record<TruthSeverity, number>,
    byKind: {
      cta: 0,
      faq: 0,
      card: 0,
      cards_grid: 0,
      cards_scroller: 0,
      feature_grid: 0,
      teaser: 0,
      stats: 0,
      tabs: 0,
      rich: 0,
      downloads: 0,
      contact: 0,
      content: 0,
      hero: 0,
    } as Record<TruthObjectKind, number>,
  };
  for (const object of objectAggregates) {
    objectTotals.byStatus[object.status] += 1;
    objectTotals.bySeverity[object.severity] += 1;
    objectTotals.byKind[object.kind] += 1;
  }

  return {
    records,
    pageMeta,
    totals: {
      pages: pages.size,
      slots: records.length,
      sections: sectionAggregates.length,
      one_truth: okN,
      warn: warnN,
      error: errN,
      byStatus,
    },
    objectTotals,
    navBereiche,
    pageToNav: pageToNavOut,
    navProgress,
    sectionAggregates,
    objectAggregates,
  };
}

export async function loadTruthReport(): Promise<TruthReport> {
  const [assets, sections, wlRes, nav, sectionFields] = await Promise.all([
    readAssetsOverview(),
    readSections(),
    readEditableFields(),
    readAllNavLookup(),
    readSectionFields(),
  ]);
  if (wlRes.error) {
    console.warn("[truthSources] readEditableFields warning:", wlRes.error);
  }
  return buildTruthReport(assets, sections, wlRes.rows ?? [], nav, sectionFields);
}
