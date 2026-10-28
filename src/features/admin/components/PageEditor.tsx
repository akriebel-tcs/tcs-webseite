/**
 * PageEditor — Großer Seiten-Editor (rechte Spalte) im Master-Detail-Layout
 * unter Tab „Struktur & Inhalte" → Sub-Tab „Seiten".
 *
 * Etappe `cms-light-admin-master-detail-1` (UI-Konsolidierung).
 *
 * Zeigt für den im Baum gewählten Knoten **alles auf einer Fläche**:
 *   1. Kopf — page_key, route_path, status, is_active (read-only).
 *   2. Navigations-Label DE/EN (RPC `rpc_admin_update_navigation_label`).
 *   3. Sections & Felder mit Freigabe-Schalter pro Feld+Sprache
 *      (RPCs `rpc_admin_update_section_field` und
 *       `rpc_admin_set_editable_field_enabled`).
 *   4. Hinweis-Box, falls keine CMS-Pflege möglich (Code-Seite oder Nav-only).
 *
 * Schreibwege: ausschließlich bestehende whitelisted RPCs. Kein direkter
 * Tabellenschreibzugriff. Kein Statuswechsel, keine Veröffentlichung.
 */
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import EditableField from "@/features/admin/components/EditableField";
import {
  readTargetLocales,
  type TargetLocaleOption,
} from "@/features/admin/api/cmsTranslationUnits";
import { saveSectionField } from "@/features/admin/api/cmsAdminWrite";
import { SECTION_TYPE_CONTRACTS, supportsSectionBg } from "@/features/cms/contract/sectionTypes";
import NavigationLabelCell from "@/features/admin/components/NavigationLabelCell";
import AssetUploader, { useAssetsForPage } from "@/features/admin/components/AssetUploader";
import ShortIdBadge from "@/features/admin/components/ShortIdBadge";
import { Term } from "@/features/admin/components/Term";
import { blockTypeStyle } from "@/features/admin/lib/blockTypeStyle";
import { getEditorialSectionKind } from "@/features/admin/lib/editorialSectionKind";
import {
  resolveSeitentyp,
  abgleichBausteine,
  bausteinLabel,
} from "@/features/admin/lib/pageTypeMatrix";
import { resolveRendererPath } from "@/features/admin/lib/rendererPath";
import {
  readNavigationNodes,
  type NavigationNodeRow,
} from "@/features/admin/api/cmsAdminNavigation";
import {
  readPilotPflege,
  type PilotBundle,
} from "@/features/admin/api/cmsAdminRead";
import {
  setEditableFieldEnabled,
  type EditableFieldRow,
} from "@/features/admin/api/cmsAdminEditableFields";
// Section-Mutationen (verschieben, ausblenden, duplizieren) liegen jetzt
// ausschließlich im Navigations-Baum (NavigationTreeEditor → SectionList).
// Hier werden nur noch Inhalte (Texte, Bilder, Freigaben) bearbeitet.
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type {
  PilotFieldKey,
  PilotSectionKey,
} from "@/features/admin/api/cmsAdminWrite";
import { PAGE_REGISTRY } from "@/navigation/pageRegistry";
// fieldDisplay-Helfer werden ab Sprint-1a nur noch innerhalb von
// buildAdminFieldPlan verwendet (Vertragsfelder bringen eigene Labels mit).
import { readPagesWithNav } from "@/features/admin/api/cmsAdminPages";
import { renamePageKey } from "@/features/admin/api/cmsAdminPagesLifecycle";
import { readPageSections, setSectionActive } from "@/features/admin/api/cmsAdminSectionOrder";
import type { PageLookup } from "@/features/admin/api/cmsAdminCardLinks";
import { resolveCardLink } from "@/features/admin/lib/resolveCardLink";
import CardLinkInfoBox, {
  type CardLinkInfoBoxItem,
} from "@/features/admin/components/CardLinkInfoBox";
import BildkartenCardWorkspace from "@/features/admin/components/BildkartenCardWorkspace";
import StandardBausteinWorkspace from "@/features/admin/components/StandardBausteinWorkspace";
import { isStandardBausteinSectionType } from "@/features/admin/lib/sectionWorkspaceGroups";
import CtaKindSelect from "@/features/admin/components/CtaKindSelect";
import CtaToggleSwitch from "@/features/admin/components/CtaToggleSwitch";
import VisibilityFieldSwitch from "@/features/admin/components/VisibilityFieldSwitch";
import { Switch } from "@/components/ui/switch";
import CtaBackgroundSelect from "@/features/admin/components/CtaBackgroundSelect";
import SectionBackgroundSelect from "@/features/admin/components/SectionBackgroundSelect";
import CardDividerSelect from "@/features/admin/components/CardDividerSelect";
import TeaserBackgroundSelect from "@/features/admin/components/TeaserBackgroundSelect";
import CtaButtonColorSelect from "@/features/admin/components/CtaButtonColorSelect";
import SectionContractStatus from "@/features/admin/components/SectionContractStatus";
import CardPresetBadge from "@/features/admin/components/CardPresetBadge";
import CardFieldsWorkspace from "@/features/admin/components/CardFieldsWorkspace";
import {
  buildAdminFieldPlanForSection,
  type AdminFieldPlanEntry,
} from "@/features/admin/lib/buildAdminFieldPlan";

const DEFAULT_PILOT_PAGE_KEY = "anwendungen.pflege";

type EditableFieldKey = string; // `${page}|${section}|${field}|${locale}`
const efKey = (p: string, s: string, f: string, l: string): EditableFieldKey =>
  `${p}|${s}|${f}|${l}`;

interface Props {
  node: NavigationNodeRow | null;
  /** Bereits in AdminPage geladenes Bundle für die Default-Pilotseite. */
  pilotBundle: PilotBundle | null;
  pilotLoading: boolean;
  /** Reload nach Speichern in der Default-Pilotseite. */
  onPilotSaved: () => void | Promise<void>;
  /** Set aller Page-Keys, die in der Whitelist mind. eine Zeile haben. */
  cmsManagedPageKeys: ReadonlySet<string>;
  /** Aktuelle Whitelist-Zeilen (für Freigabe-Schalter). */
  editableFields: EditableFieldRow[];
  /** Reload der Whitelist nach Toggle. */
  onEditableFieldsChanged: () => void | Promise<void>;
  /** Reload der Navigations-Liste nach Label-Speichern (optional). */
  onNavigationChanged?: () => void | Promise<void>;
  /** Wenn gesetzt: nur diesen Block (Section) anzeigen — Fokus-Modus. */
  focusSectionKey?: string | null;
  /** Callback, um den Fokus-Modus zu beenden (zurück zur ganzen Seite). */
  onClearFocus?: () => void;
  /**
   * Sprung zur Inhaltsseite eines Kindknotens. Wird vom Container-Editor
   * verwendet ("Bearbeiten"-Buttons). Der Aufrufer wählt den redaktionellen
   * Zielknoten (siehe `pickEditorialNodeForPage`).
   */
  onJumpToPage?: (pageKey: string) => void;
  /**
   * Echter Scrollcontainer der rechten Editor-Spalte. Wird in den
   * Pilot-Arbeitsbereich (Bildkarten B-026/B-027) weitergereicht, damit
   * dort die Scrollposition nach Save stabil bleibt — statt per DOM-Suche
   * geraten oder auf `window` zurückzufallen.
   */
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  /** Batch 47a: wird nach jedem erfolgreichen Feld-Save aufgerufen.
   *  Der Workbench erhöht damit `linksRefreshToken`, damit die
   *  Link-Pillen im Navigationsbaum (`SectionList`) das aktuelle
   *  `link_N_href`/`cta_href` neu lesen — sonst zeigt der Baum den
   *  zuletzt geladenen Wert (z. B. den alten `/kontakt`-Default). */
  onSectionFieldsMutated?: () => void;
}


const Card: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, children }) => (
  <section className="rounded-lg border-2 border-border bg-card shadow-md">
    <header className="border-b-2 border-border bg-muted/30 px-4 py-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {subtitle && (
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      )}
    </header>
    <div className="px-4 py-3">{children}</div>
  </section>
);

/**
 * CollapsibleCard — Akkordeon-Variante von Card.
 *
 * Etappe `cms-light-admin-redaktioneller-arbeitsbereich-1`:
 * Jeder Seitenabschnitt im Bearbeitungsmodus ist standardmäßig eingeklappt
 * (außer der erste, damit Redaktion sofort etwas sieht). Trigger ist der
 * Kopf-Bereich; Inhalte werden über CollapsibleContent aus dem Layout
 * gehalten, solange der Block zugeklappt ist.
 */
const CollapsibleCard: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  defaultOpen?: boolean;
  /** Optionaler Inhalt am rechten Rand des Kopfes (z. B. „ausgeblendet"-Badge). */
  rightMeta?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, defaultOpen = false, rightMeta, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <section className="rounded-lg border-2 border-border bg-card shadow-md">
        {/* Header: Trigger und rightMeta sind GESCHWISTER, nicht verschachtelt.
            Nested buttons (Switch im CollapsibleTrigger) führen dazu, dass der
            innere Schalter im Browser nicht klickbar/sichtbar ist. */}
        <div className="flex items-start justify-between gap-3 border-b-2 border-border bg-muted/30 px-4 py-3">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-start gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold hover:underline">{title}</h3>
                {subtitle && (
                  <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>
                )}
              </div>
              <ChevronDown
                className={`mt-0.5 h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
          </CollapsibleTrigger>
          {rightMeta && (
            <div className="flex shrink-0 items-center gap-2">{rightMeta}</div>
          )}
        </div>
        <CollapsibleContent>
          <div className="px-4 py-3">{children}</div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
};

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero",
  stats: "Kennzahlen",
  content_blocks_intro: "Überschrift Lösungsbereiche",
  block_communication: "Block 1 · Türkommunikation",
  block_access: "Block 2 · Zutrittskontrolle",
  block_entry: "Block 3 · Entry-System",
  block_signage: "Block 4 · Signage",
  block_solutions: "Block 5 · Objektlösungen",
  block_gebaeudemanagement: "Block 6 · Gebäudemanagement",
  personas_intro: "Überschrift Personas",
  persona_bauherren: "Persona 1 · Bauherren & Eigentümer",
  persona_architekten: "Persona 2 · Architekten & Gestalter",
  persona_wohnungswirtschaft: "Persona 3 · Wohnungswirtschaft",
  persona_fachplaner: "Persona 4 · Fachplaner & Integratoren",
  persona_handwerk: "Persona 5 · Elektro-Handwerk",
  persona_fachhandel: "Persona 6 · Fachhandel",
  cta: "Abschluss-Call-to-Action",
};

const SECTION_DESCRIPTIONS: Record<string, string> = {
  hero: "Einstieg oben auf der Seite mit Hauptüberschrift, Einleitung und Hero-Bild.",
  stats: "Vier einzelne Kennzahl-Blöcke direkt unter dem Hero.",
  content_blocks_intro: "Zwischenüberschrift und Intro-Text über den Lösungsblöcken. Die Button-Beschriftung (Mehr erfahren / Learn more) wird pro Block direkt an der jeweiligen Karte unten gepflegt — Feld cta.",
  block_communication: "Erster Lösungsblock mit Text und zugehörigem Bild.",
  block_access: "Zweiter Lösungsblock mit Text und zugehörigem Bild.",
  block_entry: "Dritter Lösungsblock mit Text und zugehörigem Bild.",
  block_signage: "Vierter Lösungsblock mit Text und zugehörigem Bild.",
  block_solutions: "Fünfter Lösungsblock mit Text und zugehörigem Bild.",
  block_gebaeudemanagement: "Sechster Lösungsblock mit Text und zugehörigem Bild.",
  personas_intro: "Zwischenüberschrift und Intro-Text über den folgenden Persona-Kacheln. Die Button-Beschriftung kommt aus den Sprachdateien (Mehr erfahren / Learn more).",
  persona_bauherren: "Persona-Kachel mit Titel und Kurzbeschreibung.",
  persona_architekten: "Persona-Kachel mit Titel und Kurzbeschreibung.",
  persona_wohnungswirtschaft: "Persona-Kachel mit Titel und Kurzbeschreibung.",
  persona_fachplaner: "Persona-Kachel mit Titel und Kurzbeschreibung.",
  persona_handwerk: "Persona-Kachel mit Titel und Kurzbeschreibung.",
  persona_fachhandel: "Persona-Kachel mit Titel und Kurzbeschreibung.",
  cta: "Abschlussbereich am Seitenende.",
};

// Reihenfolge wird zur Laufzeit aus groupedSections (sort_order) abgeleitet,
// damit verschobene oder duplizierte Blöcke immer korrekt angezeigt werden.

const STATS_CONFIG = [
  {
    stem: "experience",
    title: "Kennzahl 1 · 30+ Jahre Erfahrung",
    description: "Erster Kennzahl-Block direkt unter dem Hero.",
  },
  {
    stem: "madeInGermany",
    title: "Kennzahl 2 · 100% Made in Germany",
    description: "Zweiter Kennzahl-Block direkt unter dem Hero.",
  },
  {
    stem: "support",
    title: "Kennzahl 3 · 24/7 technischer Support",
    description: "Dritter Kennzahl-Block direkt unter dem Hero.",
  },
  {
    stem: "technology",
    title: "Kennzahl 4 · IP & 2-Draht Technologie",
    description: "Vierter Kennzahl-Block direkt unter dem Hero.",
  },
] as const;

function getSectionTitle(sectionKey: string): string {
  return SECTION_LABELS[sectionKey] ?? sectionKey;
}

function getSectionDescription(sectionKey: string): string | null {
  return SECTION_DESCRIPTIONS[sectionKey] ?? null;
}

function usePilotBundleForPage(
  pageKey: string | null,
  defaultBundle: PilotBundle | null,
  defaultLoading: boolean,
): { bundle: PilotBundle | null; loading: boolean; reload: () => void } {
  const [localBundle, setLocalBundle] = useState<PilotBundle | null>(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!pageKey || pageKey === DEFAULT_PILOT_PAGE_KEY) {
      setLocalBundle(null);
      setLocalLoading(false);
      return;
    }
    let cancelled = false;
    setLocalLoading(true);
    readPilotPflege(pageKey)
      .then((b) => {
        if (!cancelled) setLocalBundle(b);
      })
      .finally(() => {
        if (!cancelled) setLocalLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pageKey, tick]);

  if (pageKey === DEFAULT_PILOT_PAGE_KEY) {
    return { bundle: defaultBundle, loading: defaultLoading, reload: () => setTick((t) => t + 1) };
  }
  return { bundle: localBundle, loading: localLoading, reload: () => setTick((t) => t + 1) };
}

const FreigabeSwitch: React.FC<{
  row: EditableFieldRow | null;
  onChanged: () => void | Promise<void>;
}> = ({ row, onChanged }) => {
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!row) {
    return (
      <span
        className="text-[10px] text-muted-foreground"
        title="Diese Sprache ist nicht in der Freigabeliste (Whitelist) eingetragen."
      >
        nicht in Whitelist
      </span>
    );
  }
  const handle = async (next: boolean) => {
    setPending(true);
    setErr(null);
    const res = await setEditableFieldEnabled({
      pageKey: row.page_key,
      sectionKey: row.section_key,
      fieldKey: row.field_key,
      locale: row.locale,
      isEnabled: next,
    });
    setPending(false);
    if (!res.success) {
      setErr(res.error ?? "Fehler");
      return;
    }
    await onChanged();
  };
  return (
    <label
      className="inline-flex cursor-pointer items-center gap-1.5 text-[10px]"
      title="Freigabe (steuert nur, ob dieses Feld hier bearbeitbar ist — verändert keine Live-Inhalte)."
    >
      <input
        type="checkbox"
        checked={row.is_enabled}
        disabled={pending}
        onChange={(e) => void handle(e.target.checked)}
        className="h-3.5 w-3.5"
      />
      <span className={row.is_enabled ? "text-emerald-700" : "text-muted-foreground"}>
        {row.is_enabled ? "freigegeben" : "gesperrt"}
      </span>
      {err && <span className="text-destructive">· {err}</span>}
    </label>
  );
};

// SectionToolbar entfernt — alle Block-Aktionen (verschieben, ausblenden,
// duplizieren, löschen) leben jetzt im NavigationTreeEditor.

/**
 * PageKeyEditor — Textfeld zum Umbenennen des Seitenschlüssels (`page_key`).
 *
 * Schreibweg: whitelisted RPC `rpc_admin_rename_page_key` (siehe
 * `renamePageKey`). Verschiebt Blöcke, Texte, Bilder, Freigaben und den
 * Navigationsknoten mit — Inhalte bleiben unverändert.
 */
const PageKeyEditor: React.FC<{
  pageKey: string;
  onRenamed?: (newPageKey: string) => void | Promise<void>;
}> = ({ pageKey, onRenamed }) => {
  const [draft, setDraft] = useState(pageKey);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(pageKey);
  }, [pageKey]);

  const dirty = draft.trim() !== pageKey;
  const valid = /^[a-z0-9]+([._-][a-z0-9]+)*$/.test(draft.trim());

  const save = async () => {
    const next = draft.trim();
    if (!dirty || !valid || saving) return;
    setSaving(true);
    const res = await renamePageKey(pageKey, next);
    setSaving(false);
    if (!res.success) {
      const map: Record<string, string> = {
        page_key_already_exists: "Dieser Seitenschlüssel ist schon vergeben.",
        invalid_page_key_format:
          "Ungültiger Schlüssel. Erlaubt: Kleinbuchstaben, Zahlen, Punkt, Bindestrich, Unterstrich.",
        page_not_found: "Seite nicht gefunden.",
      };
      toast.error(map[res.error ?? ""] ?? res.error ?? "Umbenennen fehlgeschlagen.");
      setDraft(pageKey);
      return;
    }
    const c = res.updated_counts;
    toast.success(
      `Seitenschlüssel geändert: ${pageKey} → ${next}` +
        (c ? ` (${c.sections} Blöcke, ${c.fields} Texte, ${c.assets} Bilder mitgezogen)` : ""),
    );
    await onRenamed?.(next);
  };

  return (
    <div className="min-w-0">
      <label className="text-muted-foreground" htmlFor="page-key-input">
        <Term term="page_key" />
        <span className="ml-1 text-muted-foreground/70">(Seitenschlüssel)</span>
      </label>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <input
          id="page-key-input"
          value={draft}
          spellCheck={false}
          disabled={saving}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void save();
            if (e.key === "Escape") setDraft(pageKey);
          }}
          className="min-w-0 flex-1 rounded border bg-background px-2 py-1 font-mono text-[11px]"
        />
        <button
          type="button"
          disabled={!dirty || !valid || saving}
          onClick={() => void save()}
          className="rounded border bg-background px-2 py-1 text-[11px] hover:bg-muted disabled:opacity-40"
        >
          {saving ? "Speichert…" : "Umbenennen"}
        </button>
      </div>
      {dirty && !valid && (
        <p className="mt-1 text-[10px] text-destructive">
          Erlaubt sind Kleinbuchstaben, Zahlen sowie Punkt, Bindestrich und Unterstrich als Trenner
          (Beispiel: <code className="font-mono">anwendungen.pflege</code>).
        </p>
      )}
      <p className="mt-1 text-[10px] text-muted-foreground">
        Blöcke, Texte, Bilder, Freigaben und der Menüknoten werden automatisch mitgezogen. Achtung:
        Seiten, die im Code fest auf ihren Schlüssel verweisen, müssen danach angepasst werden.
      </p>
    </div>
  );
};

const TechnicalDetails: React.FC<{
  node: NavigationNodeRow;
  onPageKeyRenamed?: (newPageKey: string) => void | Promise<void>;
}> = ({ node, onPageKeyRenamed }) => (
  <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-[11px] sm:grid-cols-2 lg:grid-cols-4">
    {node.page_key ? (
      <PageKeyEditor pageKey={node.page_key} onRenamed={onPageKeyRenamed} />
    ) : (
      <div className="min-w-0">
        <dt className="text-muted-foreground"><Term term="page_key" /></dt>
        <dd className="font-mono break-all">–</dd>
      </div>
    )}
    <div className="min-w-0">
      <dt className="text-muted-foreground">
        <Term term="route_path" />
        <span className="ml-1 text-muted-foreground/70">(Slug)</span>
      </dt>
      <dd className="font-mono break-all">{node.route_path ?? "–"}</dd>
    </div>
    <div className="min-w-0">
      <dt className="text-muted-foreground"><Term term="nav_area" /></dt>
      <dd className="break-all">{node.nav_area}</dd>
    </div>
    <div className="min-w-0">
      <dt className="text-muted-foreground">aktiv im Menü</dt>
      <dd className="break-words">
        {String(node.is_active)}
        <span className="text-muted-foreground"> · public: </span>
        {String(node.show_in_public_nav)}
      </dd>
    </div>
  </dl>
);


/**
 * SectionAssetsBlock — Bilder, die zu genau einer Section gehören (Etappe J.2).
 *
 * Wird inline am Ende der Section-Karte eingeblendet, damit Texte und Bilder
 * derselben Section direkt nebeneinander stehen und in der gleichen Reihenfolge
 * wie auf der Seite erscheinen.
 *
 * Asset-Modell (vereinheitlicht 2026-05-16):
 *   Ein einzelner field_key (z. B. "image") trägt drei Viewport-Varianten
 *   (mobile / tablet / desktop). Die alten Slot-Namen image_desktop /
 *   image_tablet / image_mobile sind tot und werden nicht mehr als
 *   eigene redaktionelle Slots angeboten. Der Renderer liest
 *   cms.assetSet(section, "image") und fällt automatisch auf die
 *   Desktop-Variante zurück, wenn eine Viewport-Variante fehlt.
 */
/**
 * Konvention: Felder mit diesen Namen sind Bild-Slots (kein Text).
 * Wenn ein solcher Slot in `cms_admin_editable_fields` whitelisted ist,
 * blendet der Editor den Upload-Button ein — auch wenn in der DB noch
 * kein Asset hochgeladen wurde.
 *
 * WICHTIG: `icon` gehört NICHT hierher. `icon` ist ein Textfeld mit dem
 * Lucide-Icon-Namen (z. B. „Shield") und wird über den normalen Text-Editor
 * gepflegt — nicht als Bild-Upload. Echte Bild-Slots heißen `image`, `logo`,
 * `thumbnail`, `hero_image`, `background`, `poster`.
 */
const ASSET_FIELD_KEYS = new Set([
  "image",
  "logo",
  "thumbnail",
  "icon_image",
  "hero_image",
  "background",
  "poster",
]);

const SectionAssetsBlock: React.FC<{
  pageKey: string;
  sectionKey: string;
  assets: import("@/features/admin/api/cmsAdminAssets").CmsAssetRow[];
  editableFields: EditableFieldRow[];
  onChanged: () => void;
}> = ({ pageKey, sectionKey, assets, editableFields, onChanged }) => {
  // Polish-Etappe 2026-05-15: Redaktion darf KEINE neuen technischen field_keys
  // mehr erfinden. Neue Bild-Slots werden ausschliesslich technisch (Migration /
  // Template-Erweiterung) angelegt. Auf true setzen ist Technikfunktion.
  const ENABLE_TECH_ASSET_SLOT_CREATION = false;
  const [adding, setAdding] = useState(false);
  const [newFieldKey, setNewFieldKey] = useState("");

  const isHero = sectionKey === "hero";

  // Bestehende Slots aus den vorhandenen Asset-Zeilen ableiten.
  // Legacy-Slots (image_desktop/tablet/mobile) werden bewusst unterdrückt,
  // damit Redakteure dort kein Bild mehr hochladen — der Renderer ignoriert
  // sie. Wenn auf einer Hero-Section noch alte Daten unter diesen Slots
  // liegen, bleibt die Zeile in der DB erhalten (nicht blind löschen) und
  // ist im Admin sichtbar nur über Datenpflege / Migration.
  const LEGACY_HERO_SLOTS = new Set(["image_desktop", "image_tablet", "image_mobile"]);
  const existingSlots = Array.from(
    new Set(
      assets
        .filter((a) => a.section_key === sectionKey && a.field_key)
        .map((a) => a.field_key as string)
        .filter((fk) => !(isHero && LEGACY_HERO_SLOTS.has(fk))),
    ),
  );

  // Whitelisted Bild-Slots aus cms_admin_editable_fields lesen.
  // Damit erscheint der Upload-Button auch dann, wenn noch nie ein Bild
  // hochgeladen wurde. Vorher war der Slot „unsichtbar", solange er leer
  // war — Redaktion konnte kein erstes Bild einsetzen.
  const whitelistedAssetSlots = Array.from(
    new Set(
      editableFields
        .filter(
          (f) =>
            f.section_key === sectionKey &&
            f.is_enabled &&
            ASSET_FIELD_KEYS.has(f.field_key),
        )
        .map((f) => f.field_key),
    ),
  );

  // Hero-Sections bekommen genau einen Slot "image". Die drei Geräte-Varianten
  // (Desktop/Tablet/Mobil) liegen darunter als Viewport-Varianten desselben
  // Slots und werden vom AssetUploader selbst gerendert.
  //
  // Kachel-Sections (Kategorie-Kacheln `filter-grid.<slug>` und
  // Serien-Kacheln `series-override.<slug>`) bekommen einen festen
  // Slot "thumbnail", damit Redaktion das Bild sehen und tauschen kann,
  // auch wenn noch keine Asset-Zeile in der DB liegt.
  const isTileSection =
    sectionKey.startsWith("filter-grid.") ||
    sectionKey.startsWith("series-override.");
  const slots = isHero
    ? Array.from(new Set(["image", ...existingSlots]))
    : isTileSection
      ? Array.from(new Set(["thumbnail", ...existingSlots])).sort()
      : Array.from(new Set([...whitelistedAssetSlots, ...existingSlots])).sort();

  return (
    <div className="mt-4 space-y-3 rounded border border-dashed bg-muted/10 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Bilder dieses Blocks
        </div>
        {ENABLE_TECH_ASSET_SLOT_CREATION && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded border bg-background px-2 py-0.5 text-[11px] hover:bg-muted"
            title="Technikfunktion: legt einen neuen Bild-Slot mit freiem field_key an. Standardmaessig deaktiviert."
          >
            + Bild-Slot hinzufügen (Technik)
          </button>
        )}
      </div>

      {isHero && (
        <div className="rounded bg-muted/30 px-2 py-1.5 text-[11px] leading-snug text-muted-foreground">
          Hero-Bild mit bis zu drei Geräte-Varianten (Mobil/Tablet/Desktop).
          Fehlt eine Variante, zeigt die Website automatisch die Desktop-Variante.
        </div>
      )}

      {!isHero && !isTileSection && slots.length === 0 && !adding && (
        <div className="text-[11px] text-muted-foreground">
          Noch keine Bilder in diesem Block.
        </div>
      )}


      {slots.map((fk) => (
        <AssetUploader
          key={fk}
          pageKey={pageKey}
          sectionKey={sectionKey}
          fieldKey={fk}
          assets={assets}
          onChanged={onChanged}
        />
      ))}


      {adding && ENABLE_TECH_ASSET_SLOT_CREATION && (
        <div className="rounded border bg-background p-2">
          <label className="mb-1 block text-[10px] text-muted-foreground">
            Bild-Feld-Name (z. B. „image", „hero_image") — Kennung des Bild-Slots
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={newFieldKey}
              onChange={(e) =>
                setNewFieldKey(e.target.value.replace(/[^a-zA-Z0-9_-]/g, "_"))
              }
              placeholder="image"
              className="rounded border bg-background px-2 py-1 font-mono text-xs"
            />
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setNewFieldKey("");
              }}
              className="rounded border px-2 py-1 text-[11px] hover:bg-muted"
            >
              Abbrechen
            </button>
          </div>
          {newFieldKey && (
            <div className="mt-2">
              <AssetUploader
                pageKey={pageKey}
                sectionKey={sectionKey}
                fieldKey={newFieldKey}
                assets={assets}
                onChanged={() => {
                  onChanged();
                  setNewFieldKey("");
                  setAdding(false);
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * OrphanAssetsCard — Bilder, die einer Section zugeordnet sind, die es im
 * aktuellen Bundle nicht (mehr) gibt. Reine Sicherheitsnetz-Anzeige.
 */
const OrphanAssetsCard: React.FC<{
  pageKey: string;
  knownSectionKeys: string[];
  assets: import("@/features/admin/api/cmsAdminAssets").CmsAssetRow[];
  onChanged: () => void;
}> = ({ pageKey, knownSectionKeys, assets, onChanged }) => {
  const known = new Set(knownSectionKeys);
  const orphans = assets.filter((a) => a.field_key && !known.has(a.section_key));
  if (orphans.length === 0) return null;

  const bySection = new Map<string, Set<string>>();
  for (const a of orphans) {
    if (!a.field_key) continue;
    if (!bySection.has(a.section_key)) bySection.set(a.section_key, new Set());
    bySection.get(a.section_key)!.add(a.field_key);
  }

  return (
    <section className="rounded-lg border bg-card shadow-sm">
      <header className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Weitere Bilder</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Bilder, die einem Block zugeordnet sind, der in dieser Seite nicht
          existiert. Bitte prüfen oder entfernen.
        </p>
      </header>
      <div className="space-y-4 px-4 py-3">
        {Array.from(bySection.entries()).map(([sec, slots]) => (
          <div key={sec} className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Block: {sec}
            </div>
            {Array.from(slots).map((fk) => (
              <AssetUploader
                key={`${sec}|${fk}`}
                pageKey={pageKey}
                sectionKey={sec}
                fieldKey={fk}
                assets={assets}
                onChanged={onChanged}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
};

const PageEditor: React.FC<Props> = ({
  node,
  pilotBundle,
  pilotLoading,
  onPilotSaved,
  cmsManagedPageKeys,
  editableFields,
  onEditableFieldsChanged,
  onNavigationChanged,
  focusSectionKey,
  onClearFocus,
  onJumpToPage,
  scrollContainerRef,
  onSectionFieldsMutated,
}) => {

  const pageKey = node?.page_key ?? null;

  // „Eine Wahrheit" — der Admin-Editor lädt das Section/Feld-Bundle für JEDE
  // Seite mit `page_key`, nicht nur für Seiten in `cmsManagedPageKeys`.
  // Dadurch sehen wir auch CMS-Inhalte, die per Migration ohne Eintrag in
  // der alten Code-Whitelist angelegt wurden (z. B. alle Sub-Knoten der
  // Pilot-Seiten). Bisherige `cmsManagedPageKeys` bleibt nur als
  // „Pilot-Flag" für UI-Komfort-Features (Technik-Schalter, Debug-Anzeige)
  // erhalten.
  const { bundle, loading, reload } = usePilotBundleForPage(
    pageKey,
    pilotBundle,
    pilotLoading,
  );

  // Pro Section merken, ob technische Felder (Slugs/URLs) eingeblendet sind.
  const [showTechBySection, setShowTechBySection] = useState<Record<string, boolean>>({});
  const toggleTech = (sectionKey: string) =>
    setShowTechBySection((s) => ({ ...s, [sectionKey]: !s[sectionKey] }));

  /**
   * Etappe `cms-light-admin-redaktioneller-arbeitsbereich-1`:
   * Globaler „Technik / Diagnose"-Schalter. Standard: aus → Redaktionsmodus.
   * An: zeigt Vertrags-Badges, Block-IDs, Renderer-/Whitelist-Diagnostik,
   * Slot-Hinweise, „Weitere Bilder"/Orphan-Sektion und inaktive Datenquellen
   * direkt zwischen den anderen Blöcken.
   */
  const [debugMode, setDebugMode] = useState(false);

  /**
   * Sprachumschalter des Inhalte-Bereichs. Die Liste kommt aus der
   * Sprachtabelle der Datenbank (`cms_locales`, aktiv, ohne Quellsprache) —
   * es gibt keine feste Sprachliste im Code. Der Umschalter steuert nur die
   * Sichtbarkeit der Zielspalten; gespeichert werden immer dieselben
   * Datenbankwerte wie im Arbeitsbereich „Übersetzungen".
   */
  const [targetLocales, setTargetLocales] = useState<TargetLocaleOption[] | null>(null);
  const [localesError, setLocalesError] = useState<string | null>(null);
  const [visibleTargets, setVisibleTargets] = useState<string[] | null>(null);
  useEffect(() => {
    let alive = true;
    readTargetLocales()
      .then((rows) => {
        if (!alive) return;
        setTargetLocales(rows);
        setLocalesError(null);
        setVisibleTargets((cur) => cur ?? rows.map((r) => r.locale));
      })
      .catch((e) => {
        if (!alive) return;
        setTargetLocales([]);
        setLocalesError(e instanceof Error ? e.message : "Sprachliste nicht geladen");
      });
    return () => {
      alive = false;
    };
  }, []);
  const toggleTarget = (loc: string) =>
    setVisibleTargets((cur) => {
      const base = cur ?? (targetLocales ?? []).map((r) => r.locale);
      return base.includes(loc) ? base.filter((l) => l !== loc) : [...base, loc];
    });

  const {
    assets,
    reload: reloadAssets,
  } = useAssetsForPage(pageKey);
  const efByKey = useMemo(() => {
    const m = new Map<EditableFieldKey, EditableFieldRow>();
    for (const r of editableFields) {
      m.set(efKey(r.page_key, r.section_key, r.field_key, r.locale), r);
    }
    return m;
  }, [editableFields]);

  const sections = bundle?.sections ?? [];
  const fields = bundle?.fields ?? [];

  // „Eine Wahrheit" — eine Seite zählt als CMS-gepflegt, sobald sie
  // entweder (a) im historischen Pilot-Whitelist steht oder
  // (b) tatsächlich aktive Sections/Felder in der DB hat. Damit greift der
  // gesamte Editor inkl. Block-Liste und Whitelist-Bearbeitung auf jeder
  // Seite, deren Inhalt schon migriert wurde.
  const hasDbContent = sections.length > 0 || fields.length > 0;
  const isCmsManaged =
    !!pageKey &&
    (cmsManagedPageKeys.has(pageKey) ||
      pageKey === DEFAULT_PILOT_PAGE_KEY ||
      hasDbContent);


  // Öffentliche URL für „Seite ansehen": eigener route_path oder, falls leer,
  // der nächst-höhere Eltern-Knoten mit route_path. Bei Eltern-Treffer wird
  // ein Anker (#node_key) angehängt — die öffentliche Seite kann ihn als
  // Sprungmarke verwenden, sonst landet man oben auf der Seite.
  const [allNodes, setAllNodes] = useState<NavigationNodeRow[]>([]);
  useEffect(() => {
    let cancelled = false;
    readNavigationNodes()
      .then((b) => {
        if (!cancelled) setAllNodes(b.nodes);
      })
      .catch(() => { /* ignore — Link bleibt dann nur bei eigenem route_path sichtbar */ });
    return () => {
      cancelled = true;
    };
  }, []);

  // Etappe `cms-admin-card-links-workspace-visible-1`: gleiche Auflösungs-
  // logik wie im Baum — `cms_pages.route_path` → `PageLookup` (Titel,
  // page_no, status, is_active). Wird einmal pro Mount geladen.
  const [pagesByRoute, setPagesByRoute] = useState<Map<string, PageLookup>>(
    () => new Map(),
  );
  useEffect(() => {
    let cancelled = false;
    void readPagesWithNav().then((b) => {
      if (cancelled) return;
      const m = new Map<string, PageLookup>();
      for (const p of b.pages) {
        if (!p.route_path) continue;
        m.set(p.route_path, {
          page_key: p.page_key,
          page_no: p.page_no,
          title_de: p.title_de,
          status: p.status,
          is_active: p.is_active,
        });
      }
      setPagesByRoute(m);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Etappe `cms-admin-bildkarten-workspace-pilot-1`: Eltern-Block-Lookup
  // für `card_v1`-Karten unter den Pilot-Scrollern B-026/B-027 (Seite
  // `gebaeudekommunikation.tuersprechanlagen`). Liest die Sections der
  // aktuellen Seite über die bestehende `rpc_admin_read_page_sections`
  // und baut eine Map section_key → parent_section_key. Nur lesend.
  const [parentBySectionKey, setParentBySectionKey] = useState<Map<string, string | null>>(
    () => new Map(),
  );
  useEffect(() => {
    if (!pageKey) {
      setParentBySectionKey(new Map());
      return;
    }
    let cancelled = false;
    void readPageSections(pageKey).then((res) => {
      if (cancelled) return;
      const m = new Map<string, string | null>();
      for (const s of res.sections) {
        m.set(s.section_key, s.parent_section_key ?? null);
      }
      setParentBySectionKey(m);
    });
    return () => {
      cancelled = true;
    };
  }, [pageKey]);

  const publicHref = useMemo<{ href: string; isParent: boolean } | null>(() => {
    if (!node) return null;
    if (node.route_path) return { href: node.route_path, isParent: false };
    if (allNodes.length === 0) return null;
    const byId = new Map(allNodes.map((n) => [n.id, n]));
    let cur: NavigationNodeRow | null = node.parent_id ? byId.get(node.parent_id) ?? null : null;
    let depth = 0;
    while (cur && depth < 12) {
      if (cur.route_path) {
        const anchor = node.node_key || node.page_key || "";
        return {
          href: anchor ? `${cur.route_path}#${anchor}` : cur.route_path,
          isParent: true,
        };
      }
      cur = cur.parent_id ? byId.get(cur.parent_id) ?? null : null;
      depth++;
    }
    return null;
  }, [node, allNodes]);


  // Hook MUSS vor jedem early return aufgerufen werden (Rules of Hooks).
  const groupedSections = useMemo(() => {
    const out: Array<{
      section_key: string;
      section_type: string | null;
      sort_order?: number | null;
      section_uid?: number | null;
      section_no?: number | null;
      is_active: boolean;
      fieldKeys: string[];
    }> = [];
    for (const sec of sections) {
      const fieldKeys = Array.from(
        new Set(
          fields
            .filter((f) => f.section_key === sec.section_key)
            .map((f) => f.field_key),
        ),
      );
      out.push({
        section_key: sec.section_key,
        section_type: sec.section_type,
        sort_order: sec.sort_order,
        section_uid: (sec as { section_uid?: number | null }).section_uid ?? null,
        section_no: (sec as { section_no?: number | null }).section_no ?? null,
        is_active: sec.is_active !== false,
        fieldKeys,
      });
    }
    // Stabile Sortierung: zuerst nach sort_order (NULL=letzt), dann nach
    // section_uid/section_key — damit der erste sichtbare Block (Hero) oben
    // landet und nicht-gerenderte/legacy-Daten am Ende einsortiert werden.
    out.sort((a, b) => {
      const ao = a.sort_order ?? Number.POSITIVE_INFINITY;
      const bo = b.sort_order ?? Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao - bo;
      const au = a.section_uid ?? Number.POSITIVE_INFINITY;
      const bu = b.section_uid ?? Number.POSITIVE_INFINITY;
      if (au !== bu) return au - bu;
      return a.section_key.localeCompare(b.section_key);
    });
    return out;
  }, [sections, fields]);

  // Ausgeblendete Sections bleiben inline an ihrer Position im Workspace
  // (ausgegraut, mit Schalter „Ausgeblendet") und im Navigationsbaum.
  // Es gibt KEINEN Altbestand-/Inaktiv-Bucket mehr.


  if (!node) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed bg-muted/20 p-10 text-sm text-muted-foreground">
        Wähle links im Baum einen Knoten, um die Seite hier zu bearbeiten.
      </div>
    );
  }

  const headerTitle = node.label_de ?? node.label ?? node.node_key;
  const registryEntry = node.page_key
    ? PAGE_REGISTRY.find((p) => p.pageKey === node.page_key)
    : null;
  // „Eine Wahrheit" — Banner-/Badge-Logik leitet sich aus dem oben
  // berechneten `isCmsManaged` ab (das jetzt DB-Inhalt einbezieht). Eine
  // Seite ist „Code-Seite" nur dann, wenn sie weder im Pilot-Whitelist
  // steht NOCH irgendwelchen DB-Inhalt hat. Das „CMS-gepflegt
  // (Sections)"-Etikett bleibt für Seiten reserviert, die zwar Inhalt in
  // der DB führen, aber (noch) nicht im historischen Pilot-Eintrag
  // stehen — rein informativ.
  const hasAnyCmsContent = hasDbContent;
  const isCodePage = !isCmsManaged && !!node.page_key;
  const isPartiallyCmsManaged =
    !!node.page_key &&
    hasDbContent &&
    !cmsManagedPageKeys.has(node.page_key) &&
    node.page_key !== DEFAULT_PILOT_PAGE_KEY;
  const isNavOnly = !node.page_key;



  const rowFor = (sectionKey: string, fieldKey: string, locale: "de" | "en" | "pl") =>
    fields.find(
      (r) =>
        r.section_key === sectionKey &&
        r.field_key === fieldKey &&
        r.locale === locale,
    ) ?? null;

  const valueFor = (
    sectionKey: string,
    fieldKey: string,
    locale: "de" | "en" | "pl",
  ): string | null => rowFor(sectionKey, fieldKey, locale)?.value ?? null;

  /** Prüfstatus (geprüft / maschinell / veraltet) eines Zielwertes. */
  const statusFor = (
    sectionKey: string,
    fieldKey: string,
    locale: "en" | "pl",
  ): string | null => rowFor(sectionKey, fieldKey, locale)?.review_status ?? null;

  // Etappe `cms-admin-card-links-workspace-visible-1`: liefert für eine
  // Section alle Linkfelder als bereits aufgelöste `CardLinkInfoBoxItem`.
  // Unterstützt direkte Top-Level-Felder (`href`, `cta_link`, `cta_href`)
  // und verschachtelte Karten-Felder `items.N.href`. DE bevorzugt, EN als
  // Fallback. Mehrfacheinträge je Feld werden zusammengefasst (gleicher
  // (field_key, value) erscheint nur einmal).
  const TOP_LEVEL_LINK_FIELDS = ["href", "cta_link", "cta_href"] as const;
  const isItemsHrefKey = (fk: string) => /^items\.\d+\.href$/.test(fk);
  const linkItemsFor = (sectionKey: string): CardLinkInfoBoxItem[] => {
    const buckets = new Map<string, { de: string | null; en: string | null }>();
    for (const r of fields) {
      if (r.section_key !== sectionKey) continue;
      const fk = r.field_key;
      const matches =
        (TOP_LEVEL_LINK_FIELDS as readonly string[]).includes(fk) || isItemsHrefKey(fk);
      if (!matches) continue;
      const bucket = buckets.get(fk) ?? { de: null, en: null };
      if (r.locale === "de") bucket.de = r.value ?? null;
      else if (r.locale === "en") bucket.en = r.value ?? null;
      buckets.set(fk, bucket);
    }
    const items: CardLinkInfoBoxItem[] = [];
    // Stabile Reihenfolge: erst Top-Level (in Reihenfolge der Liste), dann
    // items.N.href numerisch sortiert.
    const order: string[] = [];
    for (const fk of TOP_LEVEL_LINK_FIELDS) if (buckets.has(fk)) order.push(fk);
    const nested = Array.from(buckets.keys())
      .filter(isItemsHrefKey)
      .sort((a, b) => {
        const na = Number(a.split(".")[1] ?? 0);
        const nb = Number(b.split(".")[1] ?? 0);
        return na - nb;
      });
    order.push(...nested);
    for (const fk of order) {
      const b = buckets.get(fk)!;
      const raw = (b.de ?? b.en ?? "").trim();
      if (!raw) continue;
      const fieldKeyForResolver: "href" | "cta_link" =
        fk === "cta_link" ? "cta_link" : "href";
      const link = resolveCardLink({
        href: raw,
        fieldKey: fieldKeyForResolver,
        pagesByRoute,
      });
      items.push({ fieldKey: fk, link });
    }
    return items;
  };


  const handleSavedField = async () => {
    if (pageKey === DEFAULT_PILOT_PAGE_KEY) {
      await onPilotSaved();
    } else {
      reload();
    }
    // Batch 47a: Workbench signalisieren, dass die Link-Pillen im
    // Navigationsbaum die aktuellen `link_N_href`/`cta_href` neu lesen
    // sollen — sonst bleibt die Pille auf dem zuletzt geladenen Wert
    // hängen, obwohl der Arbeitsbereich bereits das neue Ziel zeigt.
    onSectionFieldsMutated?.();
  };

  const isFocus = !!focusSectionKey;
  const focusedGroup = isFocus
    ? groupedSections.find((g) => g.section_key === focusSectionKey)
    : null;
  const focusedIdx = isFocus
    ? groupedSections.findIndex((g) => g.section_key === focusSectionKey)
    : -1;

  return (
    <div className="space-y-6">
      {isFocus && (() => {
        // Link „Block ansehen": eigene route_path bevorzugt, sonst übergeordneter
        // Knoten (publicHref). Anker = aktueller Block (focusSectionKey),
        // damit der Browser direkt zum Block-Wrapper springt, sofern dieser
        // auf der öffentlichen Seite eine entsprechende ID trägt.
        const baseRoute = node.route_path
          ?? (publicHref ? publicHref.href.split("#")[0] : null);
        const focusHref = baseRoute && focusSectionKey
          ? `${baseRoute}#${focusSectionKey}`
          : null;
        const focusStyle = blockTypeStyle(focusedGroup?.section_type ?? null);
        // Tranche 19: redaktionelle Variante (Bildkarte/Iconkarte/Textkarte/…)
        // im Detailkopf konsistent zum Admin-Baum anzeigen.
        const focusFieldKeys = new Set<string>();
        const focusAssetSlots = new Set<string>();
        if (focusedGroup) {
          for (const f of fields) {
            if (f.section_key === focusedGroup.section_key && f.field_key) {
              focusFieldKeys.add(f.field_key);
            }
          }
          for (const a of assets) {
            if (a.section_key === focusedGroup.section_key && a.is_active && a.field_key) {
              focusAssetSlots.add(a.field_key);
            }
          }
        }
        const focusKind = getEditorialSectionKind(focusedGroup?.section_type ?? null, {
          fieldKeys: focusFieldKeys,
          assetSlots: focusAssetSlots,
          isInactive: focusedGroup ? focusedGroup.is_active === false : false,
        });
        return (
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-l-4 bg-muted/20 px-4 py-3"
            style={{ borderLeftColor: focusStyle.cssColor }}
          >
            <div className="min-w-0">
              <div
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: focusStyle.cssColor }}
              >
                Fokus auf einen Block
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span
                  className={"shrink-0 rounded px-1.5 text-[10px] font-medium " + focusStyle.badgeClass}
                  title={`${focusKind.label} — ${focusKind.hint}\n\nBlock-Familie: ${focusStyle.label} (${focusStyle.description})`}
                >
                  {focusKind.label}
                </span>
                <span className="font-medium truncate">
                  {focusedGroup ? getSectionTitle(focusedGroup.section_key) : focusSectionKey}
                </span>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                  {focusSectionKey}
                </code>
                {focusHref && (
                  <a
                    href={focusHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={
                      node.route_path
                        ? "Diesen Block auf der öffentlichen Seite ansehen (Sprungmarke) — neuer Tab"
                        : "Übergeordnete Seite mit Sprungmarke zu diesem Block in neuem Tab öffnen"
                    }
                    className="inline-flex items-center gap-1 rounded border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Block ansehen</span>
                  </a>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onClearFocus?.()}
              className="shrink-0 rounded border bg-background px-3 py-1.5 text-xs hover:bg-muted"
              title="Zurück zur ganzen Seite"
            >
              ← Alle Blöcke der Seite zeigen
            </button>
          </div>
        );
      })()}

      {isFocus && focusedGroup && focusedGroup.is_active === false && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-destructive">
            Dieser Bereich ist ausgeblendet
          </div>
          <div className="mt-1 text-foreground/80">
            Er wird öffentlich nicht angezeigt. Vermutlich alte Migrationsquelle
            oder Fallback aus einer früheren Karten-Migration. Inhalte bleiben
            erhalten — der Block lässt sich bei Bedarf über den Schalter
            „Sichtbar" links im Baum wieder aktivieren.
          </div>
        </div>
      )}


      {!isFocus && (
      <Card
        title={
          <span className="flex flex-wrap items-baseline gap-2">
            <ShortIdBadge kind="N" value={node.node_no} hint={`Knoten ${node.node_key}`} />
            <ShortIdBadge
              kind="P"
              value={(bundle?.page as { page_no?: number | null } | null)?.page_no ?? null}
              hint={node.page_key ?? undefined}
            />
            <span className="text-base">{headerTitle}</span>
            {publicHref && (
              <a
                href={publicHref.href}
                target="_blank"
                rel="noopener noreferrer"
                title={
                  publicHref.isParent
                    ? "Dieser Knoten hat keine eigene URL — öffnet die übergeordnete Seite (mit Sprungmarke) in neuem Tab"
                    : "Öffentliche Seite in neuem Tab öffnen"
                }
                className="inline-flex items-center gap-1 rounded border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
                <span>{publicHref.isParent ? "Übergeordnete Seite" : "Seite ansehen"}</span>
              </a>
            )}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
              {node.node_key}
            </code>
            {isCmsManaged && (
              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                CMS-gepflegt
              </span>
            )}
            {isPartiallyCmsManaged && (
              <span
                className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700"
                title="Diese Seite hat aktive Sections/Feldwerte in der DB, aber noch keinen Whitelist-Eintrag auf Page-Ebene. Inhalte werden bereits aus dem CMS gerendert."
              >
                CMS-gepflegt (Sections)
              </span>
            )}
            {isCodePage && (
              <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                Code-Seite
              </span>
            )}
            {isNavOnly && (
              <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">
                Navigation-only
              </span>
            )}
          </span>
        }
        subtitle="Bearbeitung in der Reihenfolge der Website. Technische Stammdaten sind unten einklappbar." 
      >
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="rounded border bg-muted/10 p-3">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Navigations-Label
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                Beschriftung des Knotens im Menü. Wird über die Whitelist-RPC <code className="font-mono">rpc_admin_update_navigation_label</code> gespeichert.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    DE
                  </div>
                  <NavigationLabelCell
                    nodeId={node.id}
                    locale="de"
                    dbValue={node.label_de}
                    i18nValue={null}
                    onSaved={() => onNavigationChanged?.()}
                  />
                </div>
                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    EN
                  </div>
                  <NavigationLabelCell
                    nodeId={node.id}
                    locale="en"
                    dbValue={node.label_en}
                    i18nValue={null}
                    onSaved={() => onNavigationChanged?.()}
                  />
                </div>
              </div>

              <div className="mt-4 border-t pt-3">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Navigations-Untertitel
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  Kurzer Zusatztext unter der Beschriftung im Aufklapp-Menü (Dropdown). Wird über die
                  Whitelist-RPC <code className="font-mono">rpc_admin_update_navigation_description</code> gespeichert.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      DE
                    </div>
                    <NavigationLabelCell
                      nodeId={node.id}
                      locale="de"
                      field="description"
                      multiline
                      dbValue={node.description_de}
                      i18nValue={null}
                      onSaved={() => onNavigationChanged?.()}
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      EN
                    </div>
                    <NavigationLabelCell
                      nodeId={node.id}
                      locale="en"
                      field="description"
                      multiline
                      dbValue={node.description_en}
                      i18nValue={null}
                      onSaved={() => onNavigationChanged?.()}
                    />
                  </div>
                </div>
              </div>
            </div>

            {registryEntry?.note && (
              <p className="text-xs text-muted-foreground">{registryEntry.note}</p>
            )}
          </div>

          {(() => {
            const pageType = (bundle?.page as { page_type?: string | null } | null)?.page_type ?? null;
            const seitentyp = resolveSeitentyp(pageType);
            const rp = resolveRendererPath(pageKey);
            if (!seitentyp && !rp.entry) return null;
            // Nur Top-Level-Sections, aktiv, ohne Hero-Doppelung.
            const topTypes = groupedSections
              .filter((g) => g.is_active)
              .map((g) => g.section_type);
            const abgleich = seitentyp
              ? abgleichBausteine(seitentyp, topTypes)
              : { present: [], missingExpected: [], unexpected: [] };
            return (
              <div className="rounded border bg-muted/5 p-3">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Seitentyp & Bausteine
                  </span>
                  {seitentyp && (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                      {seitentyp.label}
                    </span>
                  )}
                  {pageType && (
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {pageType}
                    </code>
                  )}
                </div>
                {seitentyp && (
                  <p className="mt-1 text-xs text-muted-foreground">{seitentyp.description}</p>
                )}
                <div className="mt-2 flex flex-wrap items-baseline gap-2">
                  <span
                    className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                    title="Technischer Renderer-Pfad: wie die Seite im Code gerendert wird. Nicht zu verwechseln mit dem fachlichen Seitentyp (T-Code)."
                  >
                    Technischer Renderpfad
                  </span>
                  <span className="rounded border bg-background px-1.5 py-0.5 text-[11px]">
                    {rp.rendererLabel}
                  </span>
                  <span
                    className={`rounded border px-1.5 py-0.5 text-[11px] ${rp.statusTone.bg} ${rp.statusTone.text} ${rp.statusTone.border}`}
                    title="Standardisiert = generischer DB-Renderpfad; Gemischt = teilweise generisch, teilweise hartcodiert; Sonderlogik = eigene Page-Komponente."
                  >
                    {rp.statusLabel}
                  </span>
                  {rp.entry && (
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {rp.entry.renderer_path}
                    </code>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Hinweis: T-Code = fachlicher Seitentyp. Renderpfad = technische
                  Umsetzung. Beides darf nicht verwechselt werden.
                </p>

                {seitentyp && (
                  <>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="text-muted-foreground">Vorhanden:</span>
                      {abgleich.present.length === 0 && (
                        <span className="text-muted-foreground">—</span>
                      )}
                      {abgleich.present.map((t) => (
                        <span
                          key={`p-${t}`}
                          className="rounded border bg-background px-1.5 py-0.5"
                          title={t}
                        >
                          {bausteinLabel(t)}
                        </span>
                      ))}
                    </div>
                    {abgleich.missingExpected.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="text-muted-foreground">Fehlt vs. Sollbild:</span>
                        {abgleich.missingExpected.map((t) => (
                          <span
                            key={`m-${t}`}
                            className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-amber-800"
                            title={t}
                          >
                            {bausteinLabel(t)}
                          </span>
                        ))}
                      </div>
                    )}
                    {abgleich.unexpected.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="text-muted-foreground">Zusätzlich (außerhalb Sollbild):</span>
                        {abgleich.unexpected.map((t) => (
                          <span
                            key={`u-${t}`}
                            className="rounded border bg-background px-1.5 py-0.5 text-muted-foreground"
                            title={t}
                          >
                            {bausteinLabel(t)}
                          </span>
                        ))}
                      </div>
                    )}
                    {abgleich.missingExpected.length === 0 && abgleich.unexpected.length === 0 && (
                      <p className="mt-1.5 text-[11px] text-emerald-700">
                        Abweichungen: keine — Sollbild und Inhalt passen zusammen.
                      </p>
                    )}
                  </>
                )}
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Hinweis: rein zur Orientierung. Keine Validierung, kein automatischer Umbau.
                </p>

              </div>
            );
          })()}

          <Collapsible className="rounded border bg-muted/5">
            <div className="flex items-center justify-between gap-3 px-3 py-2">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Technische Stammdaten
                </div>
                <p className="text-xs text-muted-foreground">
                  Read-only Angaben wie <Term term="page_key" />, Slug und Menüstatus.
                </p>
              </div>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded border bg-background px-2 py-1 text-xs hover:bg-muted"
                >
                  Ein-/ausklappen
                  <ChevronDown className="h-4 w-4" />
                </button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="border-t px-3 py-3">
              <TechnicalDetails
                node={node}
                onPageKeyRenamed={async (next) => {
                  await onNavigationChanged?.();
                  onJumpToPage?.(next);
                }}
              />
            </CollapsibleContent>
          </Collapsible>
        </div>
      </Card>
      )}

      {/* 2b) Redaktion / Technik-Schalter — global für diese Seite. */}
      {!isFocus && isCmsManaged && pageKey && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed bg-muted/10 px-3 py-2 text-xs">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Ansicht
            </div>
            <p className="text-muted-foreground">
              {debugMode
                ? "Technik-Ansicht: zeigt Vertrag, Block-IDs, Whitelist, Renderer-Hinweise und nicht gerenderte Datenquellen."
                : "Redaktions-Ansicht: zeigt nur, was sinnvoll gepflegt werden kann. Inaktive und technische Datenquellen liegen unten gesammelt."}
            </p>
          </div>
          <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded border bg-background px-2 py-1">
            <input
              type="checkbox"
              checked={debugMode}
              onChange={(e) => setDebugMode(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            <span className="text-xs font-medium">Technik / Diagnose</span>
          </label>
        </div>
      )}

      {/* 2c) Sprachen (aus der Sprachtabelle der Datenbank). */}
      {!isFocus && isCmsManaged && pageKey && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed bg-muted/10 px-3 py-2 text-xs">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Sprachen
            </div>
            <p className="text-muted-foreground">
              Deutsch ist immer die Quelle. Hier wählen Sie, welche Zielsprachen
              daneben angezeigt und bearbeitet werden. Die Auswahl kommt aus der
              Sprachliste der Datenbank; die Werte sind dieselben wie im
              Arbeitsbereich „Übersetzungen".
            </p>
            {localesError && (
              <p className="mt-1 text-destructive">
                Sprachliste konnte nicht geladen werden ({localesError}). Es gilt
                die bisherige Anzeige.
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className="rounded border bg-background px-2 py-1 text-xs font-medium">
              DE (Quelle)
            </span>
            {targetLocales === null && (
              <span className="text-muted-foreground">Lade Sprachen…</span>
            )}
            {(targetLocales ?? []).map((row) => (
              <label
                key={row.locale}
                className="inline-flex cursor-pointer items-center gap-2 rounded border bg-background px-2 py-1"
              >
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5"
                  checked={(visibleTargets ?? []).includes(row.locale)}
                  onChange={() => toggleTarget(row.locale)}
                />
                <span className="text-xs font-medium">
                  {row.locale.toUpperCase()} · {row.label_de}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* 3) Sections & Felder */}
      {isCmsManaged && pageKey && (
        <>
          {loading && (
            <div className="rounded border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              Lade Inhalte…
            </div>
          )}

          {!loading && groupedSections.length === 0 && (
            <div className="rounded border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              Für diese Seite sind noch keine Blöcke (Seitenblöcke) angelegt.
            </div>
          )}

          {!loading && (() => {
            // Im Fokus-Modus: nur den gewählten Block. Im Redaktionsmodus:
            // nur aktive Blöcke (inaktive landen unten im Technik-Bereich).
            // In Technik-Ansicht: alle Blöcke inline, wie früher.
            // Redaktionsmodus: nur aktive Top-Level-Blöcke zeigen.
            // `card_v1`-Kindkarten gehören in den Container-/Workspace-
            // Bereich und nicht zwischen die Seiten-Hauptblöcke — sie
            // werden hier ausgeblendet (Container-Workspace übernimmt).
            // Ausgeblendete Blöcke bleiben inline an ihrer Position sichtbar
            // (ausgegraut, mit Schalter „Ausgeblendet"). Kein separater
            // Altbestand-/Inaktiv-Bucket mehr — nur Card-Kinder werden hier
            // ausgeblendet, weil sie zum Container-Workspace gehören.
            const visible = isFocus
              ? groupedSections.filter((g) => g.section_key === focusSectionKey)
              : groupedSections.filter((g) => {
                  if (debugMode) return true;
                  const isCardChild =
                    g.section_type === "card_v1" &&
                    !!(parentBySectionKey.get(g.section_key) ?? null);
                  return !isCardChild;
                });
            return visible.map((grp, idx) => {
              const defaultOpen = isFocus;
              return (
              <CollapsibleCard
                key={grp.section_key}
                defaultOpen={defaultOpen}
                rightMeta={
                  <span className="flex items-center gap-3">
                    {supportsSectionBg(grp.section_type) && (
                      <SectionBackgroundSelect
                        pageKey={pageKey}
                        sectionKey={grp.section_key}
                        value={valueFor(grp.section_key, "section_bg", "de")}
                        editable={
                          !!efByKey.get(efKey(pageKey, grp.section_key, "section_bg", "de"))
                            ?.is_enabled
                        }
                        onSaved={handleSavedField}
                      />
                    )}
                    {!!efByKey.get(efKey(pageKey, grp.section_key, "card_dividers", "de"))
                      ?.is_enabled && (
                      <CardDividerSelect
                        pageKey={pageKey}
                        sectionKey={grp.section_key}
                        value={valueFor(grp.section_key, "card_dividers", "de")}
                        editable
                        onSaved={handleSavedField}
                      />
                    )}
                    <span

                      className={
                        "text-[11px] font-medium " +
                        (grp.is_active ? "text-emerald-700" : "text-amber-700")
                      }
                    >
                      {grp.is_active ? "Sichtbar" : "Ausgeblendet"}
                    </span>
                    <Switch
                      checked={grp.is_active}
                      onCheckedChange={async (next) => {
                        const res = await setSectionActive({
                          pageKey,
                          sectionKey: grp.section_key,
                          isActive: next,
                        });
                        if (!res.success) {
                          if (res.reason === "section_not_renderable" && (res.missing?.length ?? 0) > 0) {
                            const lines = (res.missing ?? [])
                              .map((m) => `• ${m.locale.toUpperCase()}: ${m.field_keys.join(", ")} (${m.reason})`)
                              .join("\n");
                            toast.error(
                              `Block „${grp.section_key}" kann nicht eingeblendet werden — Pflichtfelder fehlen:\n${lines}`,
                              { duration: 10000 },
                            );
                          } else {
                            toast.error(res.error ?? "Sichtbarkeit konnte nicht geändert werden.");
                          }
                        } else {
                          toast.success(
                            next
                              ? `Block „${grp.section_key}" ist sichtbar.`
                              : `Block „${grp.section_key}" ist ausgeblendet.`,
                          );
                          reload();
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={grp.is_active ? "Block ausblenden" : "Block einblenden"}
                      title={
                        grp.is_active
                          ? "Block ist sichtbar — Schalter umlegen zum Ausblenden (synchron mit Navigations-Baum und öffentlicher Website)."
                          : "Block ist ausgeblendet — Schalter umlegen zum Einblenden (synchron mit Navigations-Baum und öffentlicher Website)."
                      }
                    />
                  </span>
                }
                title={
                  <span className={"flex flex-wrap items-center gap-2 " + (grp.is_active ? "" : "opacity-60")}>
                    {debugMode && (
                      <ShortIdBadge kind="B" value={grp.section_uid ?? null} hint={`Block ${grp.section_key}`} />
                    )}
                    <span>{getSectionTitle(grp.section_key)}</span>
                  </span>
                }
                subtitle={
                  <span className="block break-words">
                    {getSectionDescription(grp.section_key) ?? ""}
                    {debugMode && (
                      <span className="ml-1 inline-flex flex-wrap items-center gap-1">
                        <span>·</span>
                        <Term term="section_key">Block</Term>
                        <code className="font-mono">{grp.section_key}</code>
                        {grp.section_type && (
                          <>
                            <span>· Typ</span>
                            <code className="font-mono">{grp.section_type}</code>
                          </>
                        )}
                      </span>
                    )}
                    {debugMode && (
                      <span className="ml-1 block text-[11px] text-muted-foreground/70">
                        Verschieben, ausblenden, duplizieren oder löschen — alles im Navigations-Baum links.
                      </span>
                    )}
                  </span>
                }
              >
                {debugMode && <CardLinkInfoBox items={linkItemsFor(grp.section_key)} />}
                {debugMode && (
                <SectionContractStatus
                  pageKey={pageKey}
                  sectionKey={grp.section_key}
                  sectionType={grp.section_type}
                  parentSectionKey={parentBySectionKey.get(grp.section_key) ?? null}
                  parentSectionType={
                    (() => {
                      const pk = parentBySectionKey.get(grp.section_key) ?? null;
                      if (!pk) return null;
                      return groupedSections.find((g) => g.section_key === pk)?.section_type ?? null;
                    })()
                  }
                  fieldKeys={grp.fieldKeys}
                  whitelistFieldKeys={editableFields
                    .filter((f) => f.page_key === pageKey && f.section_key === grp.section_key)
                    .map((f) => f.field_key)}
                  assetSlots={Array.from(
                    new Set(
                      assets
                        .filter((a) => a.section_key === grp.section_key && a.is_active && a.field_key)
                        .map((a) => a.field_key as string),
                    ),
                  )}
                  isActive={grp.is_active}
                />
                )}
                {debugMode && grp.section_type === "card_v1" && (
                  <CardPresetBadge
                    parentSectionType={(() => {
                      const pk = parentBySectionKey.get(grp.section_key) ?? null;
                      if (!pk) return null;
                      return groupedSections.find((g) => g.section_key === pk)?.section_type ?? null;
                    })()}
                    dbFieldKeys={grp.fieldKeys}
                    assetFieldKeys={Array.from(
                      new Set(
                        assets
                          .filter((a) => a.section_key === grp.section_key && a.is_active && a.field_key)
                          .map((a) => a.field_key as string),
                      ),
                    )}
                  />
                )}
                {/* card_v1: container-aware Bildkarten-Workspace.
                    Wird seit Etappe `cms-light-bildkarten-workspace-fuer-alle-card-v1-1`
                    für ALLE Standardkarten verwendet (nicht mehr nur Pilot
                    B-026/B-027). Slot-Hiding ist aufgehoben — der Container-
                    Hinweis im Workspace nennt den jeweils wirksamen Slot. */}
                {(() => {
                  if (grp.section_type !== "card_v1") return null;
                  const parentKey = parentBySectionKey.get(grp.section_key) ?? null;
                  const parentType = parentKey
                    ? groupedSections.find((g) => g.section_key === parentKey)?.section_type ?? null
                    : null;
                  const cardAssets = assets.filter((a) => a.section_key === grp.section_key && a.is_active);
                  const hasImage = cardAssets.some((a) => a.field_key === "image");
                  const hasThumbnail = cardAssets.some((a) => a.field_key === "thumbnail");
                  const hasIconImage = cardAssets.some((a) => a.field_key === "icon_image");
                  // Freundliches Parent-Label: es zählt der Text, den die
                  // öffentliche Seite tatsächlich als Blocktitel ausgibt.
                  // Bei Karten-Containern (cards_v1 & Co.) ist das „title";
                  // „headline" ist nur ein Altbestand aus kopierten Blöcken
                  // und darf die Anzeige nicht überschreiben.
                  const parentLabel = parentKey
                    ? (valueFor(parentKey, "title", "de") ??
                       valueFor(parentKey, "title", "en") ??
                       valueFor(parentKey, "headline", "de") ??
                       valueFor(parentKey, "headline", "en") ??
                       parentKey)
                    : null;
                  return (
                    <BildkartenCardWorkspace
                      pageKey={pageKey}
                      sectionKey={grp.section_key}
                      parentSectionKey={parentKey}
                      parentSectionLabel={parentLabel}
                      parentSectionType={parentType}
                      fieldKeys={grp.fieldKeys}
                      hasImage={hasImage}
                      hasThumbnail={hasThumbnail}
                      hasIconImage={hasIconImage}
                      valueFor={valueFor}
                      efGet={(s, f, l) => efByKey.get(efKey(pageKey, s, f, l)) ?? null}
                      renderFreigabeSwitch={(row) => (
                        <FreigabeSwitch row={row} onChanged={onEditableFieldsChanged} />
                      )}
                      assetsSlot={
                        <SectionAssetsBlock
                          pageKey={pageKey}
                          sectionKey={grp.section_key}
                          assets={assets}
                          editableFields={editableFields}
                          onChanged={reloadAssets}
                        />
                      }
                      onSaved={handleSavedField}
                      scrollContainerRef={scrollContainerRef}
                    />
                  );
                })()}
                {(() => {
                  // Für card_v1 ist der gesamte Workspace oben gerendert
                  // (BildkartenCardWorkspace). Damit die alte flache Liste
                  // / der CardFieldsWorkspace nicht doppelt erscheint, ab hier
                  // früh aussteigen.
                  if (grp.section_type === "card_v1") return null;

                  // Standardbausteine (hero_v1 / teaser_2col_v1 / content_v1)
                  // bekommen einen kuratierten Workspace, der nur die vom
                  // Renderer wirklich gelesenen Felder anzeigt — inkl.
                  // Wirksamkeits-Hinweis pro Feld.
                  if (isStandardBausteinSectionType(grp.section_type)) {
                    return (
                      <StandardBausteinWorkspace
                        pageKey={pageKey}
                        sectionKey={grp.section_key}
                        sectionType={grp.section_type}
                        dbFieldKeys={grp.fieldKeys}
                        valueFor={valueFor}
                        efGet={(s, f, l) => efByKey.get(efKey(pageKey, s, f, l)) ?? null}
                        renderFreigabeSwitch={(row) => (
                          <FreigabeSwitch row={row} onChanged={onEditableFieldsChanged} />
                        )}
                        assetsSlot={
                          <SectionAssetsBlock
                            pageKey={pageKey}
                            sectionKey={grp.section_key}
                            assets={assets}
                            editableFields={editableFields}
                            onChanged={reloadAssets}
                          />
                        }
                        onSaved={handleSavedField}
                        debugMode={debugMode}
                      />
                    );
                  }




                  if (grp.fieldKeys.length === 0) {
                    return (
                      <div className="text-xs text-muted-foreground">
                        Keine Felder in diesem Block.
                      </div>
                    );
                  }

                  if (grp.section_key === "stats") {
                    // Sonder-Render: Stats werden als 4 Paare (Wert + Bezeichnung)
                    // gruppiert, statt 8 Einzelfelder. DB-Struktur bleibt gleich.
                    const stems = Array.from(
                      new Set(
                        grp.fieldKeys
                          .map((fk) => fk.replace(/_(value|label)$/, ""))
                          .filter((s) => s.length > 0),
                      ),
                    );
                    return (
                      <div className="space-y-4">
                        {STATS_CONFIG.filter((item) => stems.includes(item.stem)).map((item) => {
                          const valueKey = `${item.stem}_value`;
                          const labelKey = `${item.stem}_label`;
                          const hasValue = grp.fieldKeys.includes(valueKey);
                          const hasLabel = grp.fieldKeys.includes(labelKey);
                          return (
                            <div key={item.stem} className="rounded border bg-muted/10 p-3">
                              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                {item.title}
                              </div>
                              <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                                {item.description}
                              </p>
                              {hasValue && (
                                <div className="mb-3">
                                  <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-xs">
                                    <span className="font-mono text-muted-foreground">
                                      Wert (z. B. „30+")
                                    </span>
                                    <div className="flex items-center gap-3">
                                      <span className="text-[10px] text-muted-foreground">DE:</span>
                                      <FreigabeSwitch
                                        row={efByKey.get(efKey(pageKey, "stats", valueKey, "de")) ?? null}
                                        onChanged={onEditableFieldsChanged}
                                      />
                                      <span className="ml-2 text-[10px] text-muted-foreground">EN:</span>
                                      <FreigabeSwitch
                                        row={efByKey.get(efKey(pageKey, "stats", valueKey, "en")) ?? null}
                                        onChanged={onEditableFieldsChanged}
                                      />
                                    </div>
                                  </div>
                                  <EditableField
                                    pageKey={pageKey}
                                    label={`stats.${valueKey}`}
                                    sectionKey={"stats" as PilotSectionKey}
                                    fieldKey={valueKey as PilotFieldKey}
                                    de={valueFor("stats", valueKey, "de")}
                                    en={valueFor("stats", valueKey, "en")}
                                    deEditable={!!efByKey.get(efKey(pageKey, "stats", valueKey, "de"))?.is_enabled}
                                    enEditable={!!efByKey.get(efKey(pageKey, "stats", valueKey, "en"))?.is_enabled}
                                    onSaved={handleSavedField}
                                  />
                                </div>
                              )}
                              {hasLabel && (
                                <div>
                                  <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-xs">
                                    <span className="font-mono text-muted-foreground">
                                      Bezeichnung (z. B. „Jahre Erfahrung")
                                    </span>
                                    <div className="flex items-center gap-3">
                                      <span className="text-[10px] text-muted-foreground">DE:</span>
                                      <FreigabeSwitch
                                        row={efByKey.get(efKey(pageKey, "stats", labelKey, "de")) ?? null}
                                        onChanged={onEditableFieldsChanged}
                                      />
                                      <span className="ml-2 text-[10px] text-muted-foreground">EN:</span>
                                      <FreigabeSwitch
                                        row={efByKey.get(efKey(pageKey, "stats", labelKey, "en")) ?? null}
                                        onChanged={onEditableFieldsChanged}
                                      />
                                    </div>
                                  </div>
                                  <EditableField
                                    pageKey={pageKey}
                                    label={`stats.${labelKey}`}
                                    sectionKey={"stats" as PilotSectionKey}
                                    fieldKey={labelKey as PilotFieldKey}
                                    de={valueFor("stats", labelKey, "de")}
                                    en={valueFor("stats", labelKey, "en")}
                                    deEditable={!!efByKey.get(efKey(pageKey, "stats", labelKey, "de"))?.is_enabled}
                                    enEditable={!!efByKey.get(efKey(pageKey, "stats", labelKey, "en"))?.is_enabled}
                                    onSaved={handleSavedField}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  // Sprint-1a: Vertrag wird zur sichtbaren Feldquelle. Felder
                  // ohne DB-Zeile erscheinen als „laut Vertrag erwartet",
                  // Felder ohne Vertrag bleiben sichtbar, aber als „Legacy /
                  // nicht im Vertrag" markiert. Aliase werden separat geführt.
                  // Asset-Slots werden NICHT hier behandelt (SectionAssetsBlock).
                  // Sprint 2l: Parent-Typ und Asset-Slots übergeben, damit
                  // der Plan für card_v1 die fachliche Variante erkennen und
                  // nicht relevante optionale Felder nicht mehr als
                  // „fehlt in DB" ausweisen kann.
                  const parentKeyForPlan = parentBySectionKey.get(grp.section_key) ?? null;
                  const parentTypeForPlan = parentKeyForPlan
                    ? groupedSections.find((g) => g.section_key === parentKeyForPlan)?.section_type ?? null
                    : null;
                  const assetSlotsForPlan = Array.from(
                    new Set(
                      assets
                        .filter((a) => a.section_key === grp.section_key && a.is_active && a.field_key)
                        .map((a) => a.field_key as string),
                    ),
                  );
                  const plan = buildAdminFieldPlanForSection({
                    sectionType: grp.section_type,
                    dbFieldKeys: grp.fieldKeys,
                    parentSectionType: parentTypeForPlan,
                    assetFieldKeys: assetSlotsForPlan,
                  });
                  // Stabile Reihenfolge: Vertrag-Reihenfolge bleibt, danach
                  // Legacy/Dynamic-Reste — innerhalb der Reste sortieren wir
                  // alphabetisch nach fieldKey, damit die Ansicht ruhig wirkt.
                  const contractEntries = plan.entries.filter((e) =>
                    e.source === "contract" || e.source === "contract_alias" || e.source === "missing",
                  );
                  const restEntries = plan.entries
                    .filter((e) => e.source === "legacy" || e.source === "dynamic")
                    .sort((a, b) => a.fieldKey.localeCompare(b.fieldKey));
                  const ordered: AdminFieldPlanEntry[] = [...contractEntries, ...restEntries];

                  const techEntries = ordered.filter((e) => e.isTechnical);
                  // Im Redaktionsmodus sind technische Felder grundsätzlich
                  // ausgeblendet; der Per-Section-Toggle wirkt nur in der
                  // Technik-/Diagnoseansicht.
                  const showTech = debugMode && !!showTechBySection[grp.section_key];
                  const visibleEntries = showTech
                    ? ordered
                    : ordered.filter((e) => !e.isTechnical);
                  // Render-Closure für genau einen Eintrag. Wird sowohl vom
                  // flachen Listen-Layout (alle Section-Typen != card_v1) als
                  // auch vom neuen CardFieldsWorkspace (card_v1) genutzt.
                  // Damit bleibt die Speichersicherheit identisch:
                  // DB-Zeile + Whitelist sind weiterhin Voraussetzung,
                  // sonst zeigt EditableField nur ReadOnly-Boxen.
                  const computeSavable = (entry: AdminFieldPlanEntry) => {
                    const fk = entry.fieldKey;
                    const deRow = efByKey.get(efKey(pageKey, grp.section_key, fk, "de")) ?? null;
                    const enRow = efByKey.get(efKey(pageKey, grp.section_key, fk, "en")) ?? null;
                    const inWhitelist = !!deRow || !!enRow;
                    const dbHasField = entry.source !== "missing";
                    return inWhitelist && dbHasField;
                  };
                  const renderEntry = (entry: AdminFieldPlanEntry) => {
                    const fk = entry.fieldKey;
                    const deRow = efByKey.get(efKey(pageKey, grp.section_key, fk, "de")) ?? null;
                    const enRow = efByKey.get(efKey(pageKey, grp.section_key, fk, "en")) ?? null;
                    const plRow = efByKey.get(efKey(pageKey, grp.section_key, fk, "pl")) ?? null;
                    const friendly = entry.label;
                    const inWhitelist = !!deRow || !!enRow;
                    const dbHasField = entry.source !== "missing";
                    const canSave = inWhitelist && dbHasField;
                    return (
                      <>
                        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-xs">
                          <span className="inline-flex max-w-full flex-wrap items-baseline gap-2 break-words">
                            <span className="text-sm font-medium text-foreground">
                              {friendly}
                            </span>
                            {debugMode && entry.source === "contract" && (
                              <span
                                className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700"
                                title="Feld ist im Section-Type-Vertrag definiert."
                              >
                                Vertrag
                              </span>
                            )}
                            {debugMode && entry.source === "contract_alias" && (
                              <span
                                className="rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-700"
                                title={`Alias des Vertragsfeldes „${entry.canonicalKey ?? "?"}" — Inhalt wird nicht stillschweigend umbenannt.`}
                              >
                                Alias
                              </span>
                            )}
                            {debugMode && entry.source === "missing" && (
                              <span
                                className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
                                title="Laut Vertrag erwartet, in der DB noch nicht vorhanden. Wird ohne Migration nicht automatisch angelegt."
                              >
                                fehlt in DB
                              </span>
                            )}
                            {debugMode && entry.source === "legacy" && (
                              <span
                                className="rounded border border-muted-foreground/30 bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                                title="In der DB vorhanden, im Vertrag nicht erfasst (Altbestand)."
                              >
                                Altbestand / nicht im Vertrag
                              </span>
                            )}
                            {debugMode && entry.source === "dynamic" && (
                              <span
                                className="rounded border border-muted-foreground/20 bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                                title="Dynamisches Vertragsfeld (items.* / features.*)."
                              >
                                dynamisch
                              </span>
                            )}
                            {debugMode && entry.isTechnical && (
                              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                technisch
                              </span>
                            )}
                            {debugMode && !canSave && (
                              <span
                                className="rounded border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive"
                                title={
                                  !inWhitelist && !dbHasField
                                    ? "Weder DB-Zeile noch Whitelist-Eintrag vorhanden — Speichern hier nicht möglich."
                                    : !inWhitelist
                                      ? "Kein Whitelist-Eintrag — Speichern hier nicht möglich."
                                      : "Keine DB-Zeile — ohne Migration nicht speicherbar."
                                }
                              >
                                nicht speicherbar
                              </span>
                            )}
                            {debugMode && (
                              <span className="font-mono text-[10px] text-muted-foreground/70 break-all">
                                {grp.section_key}.{fk}
                              </span>
                            )}
                          </span>
                          {debugMode && (
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] text-muted-foreground">DE:</span>
                              <FreigabeSwitch row={deRow} onChanged={onEditableFieldsChanged} />
                              <span className="ml-2 text-[10px] text-muted-foreground">EN:</span>
                              <FreigabeSwitch row={enRow} onChanged={onEditableFieldsChanged} />
                            </div>
                          )}
                        </div>
                        {(() => {
                          // Sichtbarkeits-Felder als physischer An/Aus-Schalter:
                          //   plain:   enabled | is_active | visible | <prefix>_enabled
                          //   invert:  hidden
                          // Greift auch für FAQ-Items (`items.<slug>.<suffix>`).
                          const last = fk.includes(".") ? fk.slice(fk.lastIndexOf(".") + 1) : fk;
                          let invert: boolean | null = null;
                          if (last === "hidden") invert = true;
                          else if (last === "enabled" || last === "is_active" || last === "visible") invert = false;
                          else if (last.endsWith("_enabled")) invert = false;
                          if (invert !== null && canSave) {
                            const writeLocales: ("de" | "en")[] = [];
                            if (deRow?.is_enabled) writeLocales.push("de");
                            if (enRow?.is_enabled) writeLocales.push("en");
                            return (
                              <VisibilityFieldSwitch
                                pageKey={pageKey}
                                sectionKey={grp.section_key}
                                fieldKey={fk}
                                valueDe={valueFor(grp.section_key, fk, "de") ?? null}
                                invert={invert}
                                locales={writeLocales}
                                onSaved={handleSavedField}
                              />
                            );
                          }
                          return (
                            <EditableField
                              pageKey={pageKey}
                              label={friendly}
                              sectionKey={grp.section_key as PilotSectionKey}
                              fieldKey={fk as PilotFieldKey}
                              de={valueFor(grp.section_key, fk, "de")}
                              en={valueFor(grp.section_key, fk, "en")}
                              pl={valueFor(grp.section_key, fk, "pl")}
                              enStatus={statusFor(grp.section_key, fk, "en")}
                              plStatus={statusFor(grp.section_key, fk, "pl")}
                              deEditable={canSave && !!deRow?.is_enabled}
                              enEditable={canSave && !!enRow?.is_enabled}
                              plEditable={canSave && !!plRow?.is_enabled}
                              visibleTargets={visibleTargets}
                              onSaved={handleSavedField}
                            />
                          );
                        })()}
                      </>
                    );
                  };

                  // Etappe „Gruppenschalter Admin": Bulk-Schalter im
                  // Akkordeon-Kopf soll alle Sichtbarkeits-Felder einer
                  // Gruppe gemeinsam an/aus schalten. Whitelist der
                  // Sichtbarkeits-Feldsuffixe/-namen:
                  //   *_enabled, enabled, is_active, visible   (1=an, 0=aus)
                  //   hidden                                   (invertiert: 0=an, 1=aus)
                  // Inhaltsfelder (Texte/Links/Bilder/Labels) werden NIE
                  // angefasst. Schreibwege bleiben die normalen
                  // `saveSectionField`-RPCs.
                  type VisKind = "plain" | "hidden";
                  const visibilityKind = (fk: string): VisKind | null => {
                    if (fk === "hidden") return "hidden";
                    if (fk === "enabled" || fk === "is_active" || fk === "visible") return "plain";
                    if (fk.endsWith("_enabled")) return "plain";
                    return null;
                  };
                  const isFieldOn = (entry: AdminFieldPlanEntry): boolean | null => {
                    const kind = visibilityKind(entry.fieldKey);
                    if (!kind) return null;
                    const raw =
                      valueFor(grp.section_key, entry.fieldKey, "de") ??
                      valueFor(grp.section_key, entry.fieldKey, "en") ??
                      "";
                    const v = (raw ?? "").trim();
                    if (kind === "hidden") return v !== "1"; // versteckt? -> aus, sonst an
                    return v === "1";
                  };
                  const localesForWrite = (sectionKey: string, fk: string): ("de" | "en")[] => {
                    // Strenge Regel: Schreibe nur in Locales, in denen
                    //   (a) eine DB-Zeile in `cms_section_fields` existiert
                    //   UND
                    //   (b) der Whitelist-Eintrag in `cms_admin_editable_fields`
                    //       für genau diese Locale `is_enabled = true` ist.
                    // Kein Whitelist-only-Fallback, weil
                    // `rpc_admin_update_section_field` ausschließlich bestehende
                    // Feldzeilen aktualisiert und keine neuen anlegt. So wird
                    // nicht freigegebenes Schreiben gar nicht erst versucht.
                    const out: ("de" | "en")[] = [];
                    for (const loc of ["de", "en"] as const) {
                      const hasRow = fields.some(
                        (r) =>
                          r.section_key === sectionKey &&
                          r.field_key === fk &&
                          r.locale === loc,
                      );
                      if (!hasRow) continue;
                      const wl = efByKey.get(efKey(pageKey, sectionKey, fk, loc));
                      if (!wl?.is_enabled) continue;
                      out.push(loc);
                    }
                    return out;
                  };
                  const groupEnabledState: NonNullable<Parameters<typeof CardFieldsWorkspace>[0]["groupEnabledState"]> =
                    (_groupKey, entries) => {
                      let relevant = 0, on = 0, off = 0;
                      for (const e of entries) {
                        if (!visibilityKind(e.fieldKey)) continue;
                        if (!computeSavable(e)) continue;
                        relevant += 1;
                        const state = isFieldOn(e);
                        if (state === true) on += 1;
                        else off += 1;
                      }
                      if (relevant === 0) return null;
                      return { relevant, on, off };
                    };
                  const onToggleGroup: NonNullable<Parameters<typeof CardFieldsWorkspace>[0]["onToggleGroup"]> =
                    async (_groupKey, target, entries) => {
                      const writes: Promise<{ success: boolean; error: string | null }>[] = [];
                      const skipped: string[] = [];
                      for (const e of entries) {
                        const kind = visibilityKind(e.fieldKey);
                        if (!kind) continue;
                        if (!computeSavable(e)) { skipped.push(e.fieldKey); continue; }
                        const raw =
                          kind === "hidden"
                            ? target === "1" ? "0" : "1"
                            : target;
                        const locales = localesForWrite(grp.section_key, e.fieldKey);
                        if (locales.length === 0) { skipped.push(e.fieldKey); continue; }
                        for (const loc of locales) {
                          writes.push(
                            saveSectionField({
                              pageKey,
                              sectionKey: grp.section_key,
                              fieldKey: e.fieldKey,
                              locale: loc,
                              value: raw,
                            }),
                          );
                        }
                      }
                      if (writes.length === 0) {
                        toast.error("Kein Sichtbarkeits-Feld speicherbar.");
                        return;
                      }
                      const results = await Promise.all(writes);
                      const failed = results.filter((r) => !r.success);
                      if (failed.length > 0) {
                        toast.error(`${failed.length} Feld(er) nicht gespeichert.`);
                      } else {
                        toast.success(
                          target === "1" ? "Gruppe eingeblendet." : "Gruppe ausgeblendet.",
                        );
                      }
                      if (skipped.length > 0) {
                        toast.message(`Übersprungen (nicht speicherbar): ${skipped.join(", ")}`);
                      }
                      await handleSavedField();
                    };

                  // Für `card_v1` (außerhalb des Bildkarten-Pilots, der oben
                  // schon abgefangen wurde) den neuen Akkordeon-Arbeitsbereich
                  // einsetzen. Alle anderen Section-Typen bleiben unverändert
                  // in der flachen divide-y-Liste inkl. Technik-Toggle.
                  if (grp.section_type === "card_v1") {
                    return (
                      <CardFieldsWorkspace
                        entries={ordered}
                        variantKey={plan.cardVariant?.variant_key}
                        parentSectionType={parentTypeForPlan}
                        isSavable={computeSavable}
                        renderEntry={renderEntry}
                        groupEnabledState={groupEnabledState}
                        onToggleGroup={onToggleGroup}
                      />
                    );
                  }

                  // Akkordeon-Render für cta_v1 (Etappe D2): Felder werden
                  // nach Vertrag-Gruppen einklappbar gebündelt. Pflichtgruppen
                  // (Kopf / Inhalt / Primär-Button) sind offen, optionale
                  // Gruppen (Sekundär-Button / Kontakt / Medien / Technik)
                  // sind eingeklappt. Toggles steuern, ob Sekundär-/Kontakt-
                  // Bereiche im Public-Renderer überhaupt sichtbar werden.
                  if (grp.section_type === "cta_v1") {
                    const contract = SECTION_TYPE_CONTRACTS["cta_v1"];
                    const groupDefs = contract?.admin_groups ?? [];
                    const fieldGroupByKey = new Map<string, string>();
                    if (contract) {
                      for (const f of [...contract.text_fields, ...contract.technical_fields]) {
                        if (f.group) fieldGroupByKey.set(f.field_key, f.group);
                      }
                    }
                    const bucketByLabel = new Map<string, AdminFieldPlanEntry[]>();
                    const unassigned: AdminFieldPlanEntry[] = [];
                    for (const e of ordered) {
                      // Toggle-Schalter (show_secondary/show_phone/show_email)
                      // sind zwar `technical_fields`, sollen aber IMMER sichtbar
                      // sein — sonst kann Redaktion die optionalen Bereiche
                      // nicht ein-/ausschalten. Andere technische Felder bleiben
                      // wie bisher hinter dem Debug-Tech-Toggle.
                      if (e.isTechnical && e.role !== "toggle" && !showTech) continue;
                      const label = fieldGroupByKey.get(e.fieldKey);
                      if (label) {
                        if (!bucketByLabel.has(label)) bucketByLabel.set(label, []);
                        bucketByLabel.get(label)!.push(e);
                      } else {
                        unassigned.push(e);
                      }
                    }
                    return (
                      <>
                        <div className="space-y-2">
                          {groupDefs.map((g) => {
                            const entries = bucketByLabel.get(g.label) ?? [];
                            if (entries.length === 0 && !g.alwaysVisible) return null;
                            // Header-Einträge: Toggles + Hintergrund-Schalter
                            // werden bereits in der Akkordeon-Kopfzeile gezeigt
                            // und NICHT noch einmal im Body wiederholt.
                            const isHeaderField = (k: string) =>
                              k === "background_variant" ||
                              k === "cta_primary_color" ||
                              k === "cta_secondary_color";
                            const headerEntries = entries.filter(
                              (e) => e.role === "toggle" || isHeaderField(e.fieldKey),
                            );
                            const bodyEntries = entries.filter(
                              (e) => e.role !== "toggle" && !isHeaderField(e.fieldKey),
                            );
                            const bodyCount = bodyEntries.length;
                            return (
                              <details
                                key={g.id}
                                open={g.alwaysVisible}
                                className="rounded border bg-muted/10 [&[open]>summary>svg]:rotate-180"
                              >
                                <summary className="flex cursor-pointer select-none items-center gap-2 px-3 py-2 text-sm font-medium">
                                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform" />
                                  <span>{g.label}</span>
                                  {bodyCount > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                      ({bodyCount} {bodyCount === 1 ? "Feld" : "Felder"})
                                    </span>
                                  )}
                                  {headerEntries.length > 0 && (
                                    <div
                                      className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1"
                                      // Klicks innerhalb der Schalter sollen das
                                      // Akkordeon NICHT auf-/zuklappen.
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {headerEntries.map((entry) => {
                                        const deRow = efByKey.get(
                                          efKey(pageKey, grp.section_key, entry.fieldKey, "de"),
                                        ) ?? null;
                                        const editable = !!deRow?.is_enabled;
                                        const value = valueFor(grp.section_key, entry.fieldKey, "de");
                                        if (entry.fieldKey === "background_variant") {
                                          if (grp.section_type === "teaser_2col_v1") {
                                            return (
                                              <TeaserBackgroundSelect
                                                key={entry.fieldKey}
                                                pageKey={pageKey}
                                                sectionKey={grp.section_key}
                                                value={value}
                                                editable={editable}
                                                onSaved={handleSavedField}
                                              />
                                            );
                                          }
                                          return (
                                            <CtaBackgroundSelect
                                              key={entry.fieldKey}
                                              pageKey={pageKey}
                                              sectionKey={grp.section_key}
                                              value={value}
                                              editable={editable}
                                              onSaved={handleSavedField}
                                            />
                                          );
                                        }
                                        if (
                                          entry.fieldKey === "cta_primary_color" ||
                                          entry.fieldKey === "cta_secondary_color"
                                        ) {
                                          return (
                                            <CtaButtonColorSelect
                                              key={entry.fieldKey}
                                              pageKey={pageKey}
                                              sectionKey={grp.section_key}
                                              fieldKey={entry.fieldKey}
                                              value={value}
                                              editable={editable}
                                              onSaved={handleSavedField}
                                            />
                                          );
                                        }
                                        return (
                                          <label
                                            key={entry.fieldKey}
                                            className="flex items-center gap-2 text-xs font-normal text-muted-foreground"
                                          >
                                            <span>{entry.label}</span>
                                            <CtaToggleSwitch
                                              pageKey={pageKey}
                                              sectionKey={grp.section_key}
                                              fieldKey={entry.fieldKey}
                                              value={value}
                                              editable={editable}
                                              onSaved={handleSavedField}
                                            />
                                          </label>
                                        );
                                      })}
                                    </div>
                                  )}
                                </summary>
                                {g.note && (
                                  <p className="px-3 pb-1 text-[11px] leading-relaxed text-muted-foreground">
                                    {g.note}
                                  </p>
                                )}
                                {bodyCount > 0 && (
                                  <div className="divide-y px-3 pb-3">
                                    {bodyEntries.map((entry) => {
                                      // Linkart-Dropdown (intern · extern · shortid)
                                      if (
                                        entry.fieldKey === "cta_kind" ||
                                        entry.fieldKey === "cta_secondary_kind"
                                      ) {
                                        const deRow = efByKey.get(
                                          efKey(pageKey, grp.section_key, entry.fieldKey, "de"),
                                        ) ?? null;
                                        const editable = !!deRow?.is_enabled;
                                        return (
                                          <div
                                            key={`${entry.source}|${entry.fieldKey}`}
                                            className="py-3 first:pt-2 last:pb-0"
                                          >
                                            <div className="mb-1 text-sm font-medium text-foreground">
                                              {entry.label}
                                            </div>
                                            <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">
                                              Hilft beim Eingeben des Ziels: <strong>intern</strong> für
                                              interne Pfade (z. B. <code className="font-mono">/produkte/eingangssysteme</code>),
                                              <strong> extern</strong> für vollständige URLs
                                              (<code className="font-mono">https://…</code>) und
                                              <strong> shortid</strong> für eine Kurz-ID
                                              (<code className="font-mono">P-203</code> für eine Seite,
                                              <code className="font-mono"> B-014</code> für einen Block).
                                              Auf der öffentlichen Seite wird nur das Ziel-URL-Feld darunter gerendert.
                                            </p>
                                            <CtaKindSelect
                                              pageKey={pageKey}
                                              sectionKey={grp.section_key}
                                              fieldKey={entry.fieldKey}
                                              value={valueFor(grp.section_key, entry.fieldKey, "de")}
                                              editable={editable}
                                              onSaved={handleSavedField}
                                            />
                                          </div>
                                        );
                                      }
                                      return (
                                        <div
                                          key={`${entry.source}|${entry.fieldKey}`}
                                          className="py-3 first:pt-2 last:pb-0"
                                        >
                                          {renderEntry(entry)}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </details>
                            );
                          })}
                          {unassigned.length > 0 && (
                            <details className="rounded border bg-muted/10">
                              <summary className="cursor-pointer px-3 py-2 text-sm font-medium select-none">
                                Weitere Felder ({unassigned.length})
                              </summary>
                              <div className="divide-y px-3 pb-3">
                                {unassigned.map((entry) => (
                                  <div key={`${entry.source}|${entry.fieldKey}`} className="py-3 first:pt-2 last:pb-0">
                                    {renderEntry(entry)}
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                        {debugMode && techEntries.length > 0 && (
                          <div className="mt-3 border-t pt-2 text-right">
                            <button
                              type="button"
                              onClick={() => toggleTech(grp.section_key)}
                              className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                            >
                              {showTech
                                ? `technische Felder ausblenden (${techEntries.length})`
                                : `technische Felder einblenden (${techEntries.length}, z. B. Link-Ziele)`}
                            </button>
                          </div>
                        )}
                      </>
                    );
                  }

                  return (
                    <>
                      <div className="divide-y">
                        {visibleEntries.map((entry) => (
                          <div key={`${entry.source}|${entry.fieldKey}`} className="py-3 first:pt-0 last:pb-0">
                            {renderEntry(entry)}
                          </div>
                        ))}
                      </div>
                      {debugMode && techEntries.length > 0 && (
                        <div className="mt-3 border-t pt-2 text-right">
                          <button
                            type="button"
                            onClick={() => toggleTech(grp.section_key)}
                            className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                          >
                            {showTech
                              ? `technische Felder ausblenden (${techEntries.length})`
                              : `technische Felder einblenden (${techEntries.length}, z. B. Link-Ziele)`}
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
                {(() => {
                  // Für ALLE `card_v1` rendert der BildkartenCardWorkspace
                  // den Assets-Slot bereits selbst — nicht doppelt darunter
                  // anzeigen (Eine-Wahrheit-Etappe).
                  if (grp.section_type === "card_v1") return null;
                  // StandardBausteinWorkspace bettet den Asset-Slot bereits
                  // selbst ein — Doppelausgabe vermeiden.
                  if (isStandardBausteinSectionType(grp.section_type)) return null;
                  return (
                    <SectionAssetsBlock
                      pageKey={pageKey}
                      sectionKey={grp.section_key}
                      assets={assets}
                      editableFields={editableFields}
                      onChanged={reloadAssets}
                    />
                  );
                })()}

              </CollapsibleCard>
              );
            });
          })()}

          {/* 3b) Bilder ohne passenden Block / ungenutzte Datenquellen.
                 Ausgeblendete Blöcke werden NICHT mehr separat gelistet —
                 sie bleiben oben inline an ihrer Position (ausgegraut). */}
          {!isFocus && !debugMode && (() => {
            const known = new Set(groupedSections.map((g) => g.section_key));
            return assets.some((a) => a.field_key && !known.has(a.section_key));
          })() && (
            <Collapsible className="rounded-lg border border-dashed bg-muted/5">
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Technik &amp; Diagnose
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Bilder ohne passenden Block und ungenutzte Datenquellen.
                    Wird auf der Website nicht angezeigt.
                  </p>
                </div>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded border bg-background px-2 py-1 text-xs hover:bg-muted"
                  >
                    Ein-/ausklappen
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="space-y-3 border-t px-3 py-3">
                <OrphanAssetsCard
                  pageKey={pageKey}
                  knownSectionKeys={groupedSections.map((g) => g.section_key)}
                  assets={assets}
                  onChanged={reloadAssets}
                />
              </CollapsibleContent>
            </Collapsible>
          )}


          {/* In Technik-Ansicht: Orphan-Bilder inline (wie früher). */}
          {!isFocus && debugMode && (
            <OrphanAssetsCard
              pageKey={pageKey}
              knownSectionKeys={groupedSections.map((g) => g.section_key)}
              assets={assets}
              onChanged={reloadAssets}
            />
          )}
        </>
      )}

      {isCodePage && (
        <Card title="Inhalte aus Code & i18n">
          <p className="text-sm text-muted-foreground">
            Diese Seite ist <strong>noch nicht CMS-gepflegt</strong>. Inhalte werden
            aus dem Code (React-Page) und den i18n-JSON-Dateien geladen. Damit sie
            hier editierbar wird, müssen Whitelist-Einträge per Migration angelegt
            werden (Etappe „weitere Pilotseite").
          </p>
        </Card>
      )}
      {isNavOnly && (
        <Card title="Container / Spalte — keine eigene Inhaltsseite">
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Dieser Knoten ist nur ein <strong>Gliederungspunkt</strong>
              {" "}(Container bzw. Menüspalte) und hat <strong>keine eigene
              Inhaltsseite</strong> (kein <code className="font-mono">page_key</code>).
              Hier gibt es nichts zu redigieren außer der Beschriftung
              oben unter „Navigations-Label".
            </p>
            {(() => {
              const children = allNodes.filter((n) => n.parent_id === node.id);
              if (children.length === 0) {
                return (
                  <p className="text-xs text-muted-foreground">
                    Dieser Container hat aktuell keine Unterknoten.
                  </p>
                );
              }
              return (
                <div className="rounded border bg-muted/10 p-3">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Unterknoten ({children.length})
                  </div>
                  <ul className="space-y-1">
                    {children
                      .slice()
                      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                      .map((c) => {
                        const label = c.label_de ?? c.label ?? c.node_key;
                        const canEdit = !!c.page_key && !!onJumpToPage;
                        return (
                          <li
                            key={c.id}
                            className="flex items-center justify-between gap-2 rounded border bg-background px-2 py-1.5 text-xs"
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <ShortIdBadge kind="N" value={c.node_no ?? null} />
                              <span className="truncate font-medium">{label}</span>
                              {c.page_key && (
                                <code className="truncate font-mono text-[10px] text-muted-foreground">
                                  {c.page_key}
                                </code>
                              )}
                              {!c.page_key && (
                                <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">
                                  Container
                                </span>
                              )}
                            </span>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => onJumpToPage?.(c.page_key!)}
                                className="shrink-0 rounded border bg-background px-2 py-0.5 text-[11px] hover:bg-muted"
                              >
                                Zielseite bearbeiten
                              </button>
                            )}
                          </li>
                        );
                      })}
                  </ul>
                </div>
              );
            })()}
          </div>
        </Card>
      )}
    </div>
  );
};

export default PageEditor;
