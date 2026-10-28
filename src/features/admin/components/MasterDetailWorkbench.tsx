/**
 * MasterDetailWorkbench — Sub-Tab „Seiten" unter „Struktur & Inhalte".
 *
 * Etappe `cms-light-admin-master-detail-1` + I.7 (Lebenszyklus).
 *
 * Layout: Links kollabierbare Baum-Sidebar, rechts großflächiger PageEditor.
 * Über dem Editor liegt eine Toolbar mit den Lebenszyklus-Aktionen
 * „Duplizieren", „Archivieren / Wiederherstellen" und „Endgültig löschen".
 *
 * Schreibpfade ausschließlich über Whitelist-RPCs in
 * `cmsAdminPagesLifecycle.ts`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import NavigationTreeEditor from "@/features/admin/components/NavigationTreeEditor";
import AdminActivityLog from "@/features/admin/components/AdminActivityLog";
import PageEditor from "@/features/admin/components/PageEditor";
import FooterLinkEditor from "@/features/admin/components/FooterLinkEditor";
import AdminLivePreview from "@/features/admin/components/AdminLivePreview";
import ColumnsLayout from "@/features/admin/components/ColumnsLayout";
import PreviewSheet from "@/features/admin/components/PreviewSheet";
import HelpDrawer from "@/features/admin/components/HelpDrawer";
import ClipboardBanner, {
  type ClipboardItem,
} from "@/features/admin/components/ClipboardBanner";
import DuplicatePageDialog from "@/features/admin/components/DuplicatePageDialog";
import CreateNavigationNodeDialog from "@/features/admin/components/CreateNavigationNodeDialog";
import ConfirmDeleteDialog from "@/features/admin/components/ConfirmDeleteDialog";
import AdminHardeningNotice from "@/features/admin/components/AdminHardeningNotice";
import { evaluatePasteRisk } from "@/features/admin/lib/sectionContractStatus";
import { readPageSections } from "@/features/admin/api/cmsAdminSectionOrder";
import type { NavigationNodeRow } from "@/features/admin/api/cmsAdminNavigation";
import { readNavigationNodes } from "@/features/admin/api/cmsAdminNavigation";
import {
  pasteSection,
  type SectionRow,
} from "@/features/admin/api/cmsAdminSectionOrder";
import type { PilotBundle } from "@/features/admin/api/cmsAdminRead";
import type { EditableFieldRow } from "@/features/admin/api/cmsAdminEditableFields";
import type { JumpTarget } from "@/features/admin/components/GoToShortIdBar";
import { readPagesWithNav, type CmsPageRow } from "@/features/admin/api/cmsAdminPages";
import {
  archivePage,
  deletePage,
  restorePage,
} from "@/features/admin/api/cmsAdminPagesLifecycle";
import { logActivity } from "@/features/admin/lib/activityLog";
import { pickEditorialNodeForPage } from "@/features/admin/lib/pickEditorialNode";
import { writeLastPreviewRoute } from "@/features/admin/lib/previewRouteMemory";

/**
 * Hotfix-Tranche 25 — eine einzige Auswahlregel für „Seite öffnen":
 * Jeder Sprung, der eine `page_key`/`P-ID` meint (Kurz-ID, Kartenlink,
 * Vorschauklick, Breadcrumb, „Zielseite bearbeiten"), führt über
 * `pickEditorialNodeForPage` zum redaktionellen Inhaltsknoten. Footer-/
 * Footer-Bottom-Aliase werden dort hart deklassiert und erscheinen nur
 * dann als Auswahl, wenn KEIN redaktioneller Knoten existiert.
 *
 * Der frühere „sticky nav_area"-Pfad (mit dem ein Footer-Alias kleben
 * blieb, sobald der Nutzer einmal einen Footer-Knoten angeklickt hatte)
 * wurde bewusst entfernt.
 */

function createSyntheticPageNode(
  pageKey: string,
  label: string,
  preferredArea?: NavigationNodeRow["nav_area"] | null,
): NavigationNodeRow {
  return {
    id: `synthetic:${pageKey}`,
    node_no: null,
    nav_area: preferredArea ?? "main",
    node_key: pageKey,
    parent_id: null,
    parent_node_key: null,
    page_key: pageKey,
    label,
    label_de: label,
    label_en: null,
    description_de: null,
    description_en: null,
    node_type: "page",
    external_url: null,
    route_path: null,
    sort_order: 0,
    is_active: true,
    show_in_public_nav: false,
  };
}

function isSyntheticNode(node: NavigationNodeRow | null | undefined): boolean {
  return !!node?.id?.startsWith("synthetic:");
}

interface Props {
  pilotBundle: PilotBundle | null;
  pilotLoading: boolean;
  onPilotSaved: () => void | Promise<void>;
  cmsManagedPageKeys: ReadonlySet<string>;
  editableFields: EditableFieldRow[];
  onEditableFieldsChanged: () => void | Promise<void>;
  /** Sprung aus „Gehe zu Kurz-ID" (Header). Token-Inkrement triggert Auswahl. */
  pendingJump?: { target: JumpTarget; token: number } | null;
}

const MasterDetailWorkbench: React.FC<Props> = ({
  pilotBundle,
  pilotLoading,
  onPilotSaved,
  cmsManagedPageKeys,
  editableFields,
  onEditableFieldsChanged,
  pendingJump,
}) => {
  const [selected, setSelected] = useState<NavigationNodeRow | null>(null);
  const [focusedSection, setFocusedSection] = useState<SectionRow | null>(null);

  // Drei unabhängige Spalten-Toggles (Etappe 3 der UI-Konsolidierung).
  // Persistenz pro Spalte in localStorage; Default je nach Bildschirmbreite.
  // Migration: alter Schlüssel `cms-admin-preview-open` wird als Initialwert
  // für `cms-admin.col.preview` übernommen, falls neuer Schlüssel fehlt.
  const readColPref = (key: string, fallback: boolean): boolean => {
    if (typeof window === "undefined") return fallback;
    const v = window.localStorage.getItem(key);
    if (v === "0") return false;
    if (v === "1") return true;
    return fallback;
  };
  const [treeOpen, setTreeOpen] = useState<boolean>(() => readColPref("cms-admin.col.tree", true));
  const [workOpen, setWorkOpen] = useState<boolean>(() => readColPref("cms-admin.col.work", true));
  // Spalten-Gewichte (flex-grow). Default: Baum 2, Arbeit 3, Vorschau 2.
  // Drag-Trennlinie zwischen zwei offenen Spalten passt diese Gewichte an
  // und persistiert sie in localStorage (`cms-admin.col.weights`).
  const [weights, setWeights] = useState<{ tree: number; work: number; preview: number }>(() => {
    if (typeof window === "undefined") return { tree: 2, work: 3, preview: 2 };
    try {
      const raw = window.localStorage.getItem("cms-admin.col.weights");
      if (raw) {
        const parsed = JSON.parse(raw) as { tree?: number; work?: number; preview?: number };
        return {
          tree: typeof parsed.tree === "number" && parsed.tree > 0 ? parsed.tree : 2,
          work: typeof parsed.work === "number" && parsed.work > 0 ? parsed.work : 3,
          preview: typeof parsed.preview === "number" && parsed.preview > 0 ? parsed.preview : 2,
        };
      }
    } catch {
      /* fällt auf Default zurück */
    }
    return { tree: 2, work: 3, preview: 2 };
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("cms-admin.col.weights", JSON.stringify(weights));
  }, [weights]);
  // Vorschau ist seit `cms-light-admin-preview-overlay-1` keine Spalte mehr,
  // sondern eine Schublade vom rechten Rand. State und localStorage-Key
  // bleiben gleich, damit die letzte Nutzerentscheidung erhalten bleibt.
  // Default ist im Overlay-Modus „zu" — sonst klappt die Schublade beim
  // Öffnen des Admin direkt über den Editor.
  const [previewOpen, setPreviewOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const neu = window.localStorage.getItem("cms-admin.preview.sheet");
    if (neu === "0") return false;
    if (neu === "1") return true;
    return false;
  });
  // Hilfe-Schublade (links). Default zu.
  const [helpOpen, setHelpOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("cms-admin.help.drawer") === "1";
  });

  const editorScrollRef = useRef<HTMLDivElement | null>(null);

  // Editor-Spalte beim Wechsel von Seite oder Block automatisch nach oben
  // scrollen — sonst landet man bei einem zuvor heruntergescrollten Editor
  // mitten im Inhalt, ohne den Kopf des neuen Blocks zu sehen.
  //
  // WICHTIG: Nur springen, wenn sich der Wert TATSÄCHLICH geändert hat.
  // useEffect mit Primitiv-Deps reagiert zwar normalerweise nur auf Diffs,
  // aber durch Save-Reloads (`reloadKey`) wird der gesamte Effekt-Tree
  // gelegentlich nochmal abgefragt — wir vergleichen darum explizit gegen
  // den zuletzt gesehenen Wert.
  const lastScrollKeyRef = useRef<string>("");
  useEffect(() => {
    const pageId = selected?.id ?? "";
    const secKey = focusedSection?.section_key ?? "";
    const key = `${pageId}|${secKey}`;
    const prev = lastScrollKeyRef.current;
    if (prev === key) return;
    const [prevPage, prevSec] = prev.split("|");
    // Nicht nach oben springen, wenn nur die fokussierte Section kurz
    // „verschwindet" (z. B. während eines Reloads nach Feld-Toggle) und
    // gleich wieder dieselbe ist. Springen nur bei echtem Page- oder
    // Section-Wechsel mit konkretem Ziel.
    const samePage = prevPage === pageId;
    const sectionTransientlyEmpty = samePage && prev !== "" && secKey === "";
    lastScrollKeyRef.current = key;
    if (sectionTransientlyEmpty) return;
    if (samePage && prevSec && secKey && prevSec === secKey) return;
    editorScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [selected?.id, focusedSection?.section_key]);


  const [pages, setPages] = useState<CmsPageRow[]>([]);
  const [navNodes, setNavNodes] = useState<NavigationNodeRow[]>([]);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [createNodeOpen, setCreateNodeOpen] = useState(false);
  const [createNodeDefaults, setCreateNodeDefaults] = useState<{
    pageKey: string | null;
    parentNodeKey: string | null;
    navArea: NavigationNodeRow["nav_area"] | null;
  }>({ pageKey: null, parentNodeKey: null, navArea: null });
  const [deletePageOpen, setDeletePageOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [treeRefreshToken, setTreeRefreshToken] = useState(0);
  // Batch 47a: getrennter Zähler nur für die Karten-Link-Pillen im Baum.
  // Wird nach jedem Feld-Save im Arbeitsbereich erhöht, damit die Pille
  // dem aktuellen `link_N_href`/`cta_href` folgt — ohne den ganzen Baum
  // neu zu laden (kein Reset von Expand-Zuständen).
  const [linksRefreshToken, setLinksRefreshToken] = useState(0);
  const [pendingHighlightNodeId, setPendingHighlightNodeId] = useState<string | null>(null);
  // Klemmbrett (Etappe `cms-light-admin-clipboard-1`): genau ein Block.
  const [clipboard, setClipboard] = useState<ClipboardItem | null>(null);

  useEffect(() => {
    if (!pendingHighlightNodeId) return;
    if (selected?.id !== pendingHighlightNodeId) return;
    const t = window.setTimeout(() => setPendingHighlightNodeId(null), 250);
    return () => window.clearTimeout(t);
  }, [pendingHighlightNodeId, selected?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("cms-admin.col.tree", treeOpen ? "1" : "0");
  }, [treeOpen]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("cms-admin.col.work", workOpen ? "1" : "0");
  }, [workOpen]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("cms-admin.preview.sheet", previewOpen ? "1" : "0");
  }, [previewOpen]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("cms-admin.help.drawer", helpOpen ? "1" : "0");
  }, [helpOpen]);

  // Mindestens eine Spalte (Baum oder Arbeitsbereich) muss offen bleiben —
  // sonst sieht der Nutzer nichts. Vorschau zählt nicht mehr mit, da sie als
  // Overlay außerhalb der Spalten lebt.
  const openCount = (treeOpen ? 1 : 0) + (workOpen ? 1 : 0);
  const lastOpenColumn = openCount === 1;

  const handleCopyToClipboard = useCallback((s: SectionRow) => {
    setClipboard({
      pageKey: s.page_key,
      sectionKey: s.section_key,
      sectionUid: s.section_uid ?? null,
      sectionType: s.section_type,
      label: s.section_key,
    });
    toast.success(
      `„${s.section_key}" in Zwischenablage gelegt — Panel rechts. Wechsle zur Zielseite und klicke auf „Hier einfügen".`,
    );
  }, []);

  const handleClearClipboard = useCallback(() => {
    setClipboard(null);
  }, []);

  /**
   * Einfügen aus der Zwischenablage. Cross-Page erlaubt
   * (Etappe `cms-light-admin-clipboard-2`).
   *
   * Ablauf:
   *  1) `pasteSection` ohne neuen Namen — versucht Original-Schlüssel.
   *  2) Bei Konflikt (`target_section_key_exists`) wird ein Dialog für
   *     einen alternativen Namen geöffnet und erneut aufgerufen.
   */
  const handlePasteFromClipboard = useCallback(
    async (
      targetPageKey: string,
      parentSectionKey: string | null,
      position: number,
    ): Promise<{ ok: boolean; newSectionKey?: string }> => {
      if (!clipboard) return { ok: false };

      // Sprint-0 „Eine Wahrheit": Vor dem Einfügen Vertrag prüfen und bei
      // wahrscheinlicher Strukturverletzung eine bewusste Bestätigung
      // verlangen. Kein Schreibzugriff, kein Block — nur Warnung + Confirm.
      try {
        let parentType: string | null = null;
        if (parentSectionKey) {
          const res = await readPageSections(targetPageKey);
          parentType = res.sections.find((s) => s.section_key === parentSectionKey)?.section_type ?? null;
        }
        const risk = evaluatePasteRisk({
          clipboardSectionType: clipboard.sectionType,
          targetParentSectionKey: parentSectionKey,
          targetParentSectionType: parentType,
        });
        if (risk) {
          const ok = window.confirm(
            `Vertragsprüfung (Sprint-0):\n\n${risk}\n\nTrotzdem einfügen? (Empfehlung: Abbrechen und Struktur prüfen.)`,
          );
          if (!ok) {
            toast.message("Einfügen abgebrochen — Strukturprüfung verlangte Bestätigung.");
            return { ok: false };
          }
        }
      } catch {
        /* Vertragscheck darf den Paste-Flow niemals hart blockieren. */
      }

      // Erst Original-Name versuchen; bei Konflikt bis zu 20× automatisch
      // _kopie / _kopie_2 / … anhängen — kein Dialog mehr nötig.
      const candidates: (string | null)[] = [null];
      for (let i = 1; i <= 20; i += 1) {
        candidates.push(i === 1 ? `${clipboard.sectionKey}_kopie` : `${clipboard.sectionKey}_kopie_${i}`);
      }
      let result: Awaited<ReturnType<typeof pasteSection>> | null = null;
      for (const candidate of candidates) {
        result = await pasteSection({
          sourcePageKey: clipboard.pageKey,
          sourceSectionKey: clipboard.sectionKey,
          targetPageKey,
          targetParentSectionKey: parentSectionKey,
          targetPosition: position,
          newSectionKey: candidate,
        });
        if (result.success || result.error !== "target_section_key_exists") break;
      }
      if (!result) return { ok: false };
      if (!result.success) {
        const raw = result.error ?? "unbekannt";
        // Verständliche Meldung für Redaktion — DB-Constraint nicht roh anzeigen.
        let friendly = `Einfügen fehlgeschlagen: ${raw}`;
        if (raw === "paste_unique_conflict" || /cms_assets_active_slot_idx|duplicate key/i.test(raw)) {
          friendly =
            "Einfügen fehlgeschlagen: Ein Bildslot wäre doppelt aktiv geworden. " +
            "Bitte melden — Copy/Paste sollte diesen Konflikt automatisch auflösen.";
        } else if (raw === "target_section_key_exists") {
          friendly = "Einfügen fehlgeschlagen: Ziel-Blockname existiert bereits (auto-Suffixe ausgeschöpft).";
        } else if (raw === "source_not_found") {
          friendly = "Einfügen fehlgeschlagen: Quellblock wurde nicht mehr gefunden.";
        } else if (raw === "target_page_not_found") {
          friendly = "Einfügen fehlgeschlagen: Zielseite existiert nicht.";
        } else if (raw === "parent_not_found") {
          friendly = "Einfügen fehlgeschlagen: Elternblock existiert nicht.";
        }
        toast.error(friendly);
        return { ok: false };
      }

      const targetIsCmsManaged = cmsManagedPageKeys.has(targetPageKey);
      if (!targetIsCmsManaged) {
        toast.warning(
          `Eingefügt als „${result.newSectionKey}" — wird auf der Live-Seite aber noch nicht angezeigt.`,
          {
            description:
              `Die Zielseite „${targetPageKey}" ist eine Code-Seite (Inhalte kommen aus React/i18n). Der Block liegt jetzt in der CMS-Datenbank, der öffentliche Renderer iteriert dort aber noch nicht. Erst wenn diese Seite auf den dynamischen Renderer (Spiegel-Regel) umgestellt wurde, erscheint der Block.`,
            duration: 12000,
          },
        );
      } else {
        const parts: string[] = [];
        if (result.sectionsCopied && result.sectionsCopied > 1) parts.push(`${result.sectionsCopied} Blöcke`);
        if (result.fieldsCopied) parts.push(`${result.fieldsCopied} Texte`);
        if (result.assetsCopied) parts.push(`${result.assetsCopied} Bilder`);
        const summary = parts.length ? ` (${parts.join(", ")})` : "";
        toast.success(`Eingefügt als „${result.newSectionKey}"${summary}.`);
      }
      return { ok: true, newSectionKey: result.newSectionKey };
    },
    [clipboard, cmsManagedPageKeys],
  );

  // Marker: Wenn der Knotenwechsel von einem Section-Klick ausgelöst wurde,
  // soll der Block-Fokus erhalten bleiben. Bei einem direkten Klick auf einen
  // Knoten ist dieser Marker leer und der Block-Fokus wird konsequent gelöscht.
  const sectionSyncRef = useRef<SectionRow | null>(null);

  const handleSelectNode = useCallback((n: NavigationNodeRow | null) => {
    setSelected(n);
    const pending = sectionSyncRef.current;
    if (pending && n && pending.page_key === n.page_key) {
      setFocusedSection(pending);
    } else {
      setFocusedSection(null);
    }
    sectionSyncRef.current = null;
  }, []);

  const handleSelectSection = useCallback((s: SectionRow) => {
    sectionSyncRef.current = s;
    setFocusedSection(s);
  }, []);

  // Wird unten nach `handlePreviewRouteChange` mit der echten Funktion belegt.
  // Über die Ref umgehen wir die TDZ-Reihenfolge, ohne den Datei-Aufbau
  // umsortieren zu müssen.
  const previewRouteChangeRef = useRef<((p: string) => void) | null>(null);

  // Klick aus der Live-Vorschau: section_key + page_key + optional pathname.
  // Wir
  //  1. stellen sicher, dass der passende Navigationsknoten im Baum
  //     ausgewählt ist (sonst springt der Baum nicht zum richtigen Eintrag),
  //  2. erzeugen einen minimalen SectionRow-Stub und lassen PageEditor
  //     via focusSectionKey scrollen. Die echte Zeile mit korrekter
  //     Farbe/Type liest der Baum beim nächsten Re-Load.
  const handlePreviewSelectSection = useCallback(
    (
      sectionKey: string,
      pageKey: string | null,
      _assetUrl?: string | null,
      _fieldKey?: string | null,
      pathname?: string | null,
    ) => {
      if (!sectionKey) return;
      // Schritt 1 — Navigationsknoten passend zur geklickten Seite setzen.
      // Bevorzugt über die echte Route (eindeutiger Treffer auch bei
      // Bereichswechsel), Fallback über page_key.
      if (pathname && previewRouteChangeRef.current) {
        previewRouteChangeRef.current(pathname);
      } else if (pageKey && pageKey !== selected?.page_key) {
        const canonical = pickEditorialNodeForPage(navNodes, pageKey);
        if (canonical) setSelected(canonical);
      }
      // Schritt 2 — Block im Editor fokussieren (Baum scrollt via
      // externalSelectedNodeId, PageEditor via focusSectionKey).
      const stub: SectionRow = {
        id: `preview-${sectionKey}`,
        page_key: pageKey ?? selected?.page_key ?? "",
        section_key: sectionKey,
        section_type: "content_v1",
        section_no: null,
        section_uid: null,
        sort_order: 0,
        is_active: true,
        parent_section_id: null,
        parent_section_key: null,
        updated_at: new Date().toISOString(),
      } as SectionRow;
      sectionSyncRef.current = stub;
      setFocusedSection(stub);
    },
    [navNodes, selected?.page_key],
  );

  const loadPages = useCallback(async () => {
    const b = await readPagesWithNav();
    setPages(b.pages);
    // Nav-Knoten gleich mit cachen — wird für Vorschau→Admin-Routen-Mapping
    // gebraucht (sonst müssten wir bei jedem Klick im iFrame neu laden).
    try {
      const { nodes } = await readNavigationNodes();
      setNavNodes(nodes);
    } catch {
      /* nicht kritisch — Mapping fällt dann leise aus. */
    }
  }, []);

  useEffect(() => {
    void loadPages();
  }, [loadPages, reloadKey]);

  /**
   * Wird gerufen, wenn der Nutzer im iFrame der echten Webseite navigiert
   * (z. B. via Hauptmenü). Mappt den Pfad auf einen Navigationsknoten
   * (exakter `route_path`-Match) und stellt Baum + Editor entsprechend um.
   * Block-Fokus geht dabei verloren — der hängt ja seitenspezifisch.
   */
  const handlePreviewRouteChange = useCallback(
    (pathname: string) => {
      // Pfad normalisieren: trailing slash weg, kein Query/Hash, ggf. /de- oder /en-Präfix
      // entfernen, damit auch sprachpräfigierte Routen matchen.
      const norm = (p: string | null | undefined) => {
        if (!p) return "";
        let s = p.split("#")[0].split("?")[0];
        s = s.replace(/^\/(de|en)(?=\/|$)/, "");
        if (s.length > 1) s = s.replace(/\/+$/, "");
        if (!s) s = "/";
        return s;
      };
      const target = norm(pathname);
      // Auch dann merken, wenn unten kein passender Knoten gefunden wird —
      // andere Admin-Bereiche sollen den iFrame-Stand trotzdem wiederfinden.
      writeLastPreviewRoute(target);
      if (norm(selected?.route_path) === target) return;
      // Mehrere Knoten können denselben `route_path` haben (z. B. die
      // echte Seite im `main`-Baum UND ein Footer-Spalten-Eintrag, der
      // auf dieselbe Seite verlinkt). Wir öffnen IMMER den redaktionellen
      // Knoten (kein Footer-Alias, sofern Alternativen existieren).
      const candidates = navNodes.filter(
        (n) => norm(n.route_path) === target || n.route_path === pathname,
      );
      if (candidates.length === 0) return;
      // Über `pickEditorialNodeForPage` auflösen, sobald ein `page_key`
      // sicher bestimmt werden kann — sonst lokal nur Footer hart
      // deklassieren.
      const pageKey = candidates.find((c) => c.page_key)?.page_key ?? null;
      let match: NavigationNodeRow | null = null;
      if (pageKey) {
        match = pickEditorialNodeForPage(navNodes, pageKey);
      }
      if (!match) {
        const editorial = candidates.filter(
          (n) => n.nav_area !== "footer" && n.nav_area !== "footer_bottom",
        );
        match = (editorial.length > 0 ? editorial : candidates)[0];
      }
      if (!match) return;
      setSelected(match);
      setFocusedSection(null);
      sectionSyncRef.current = null;
    },
    [navNodes, selected?.route_path],
  );

  // Ref-Belegung: ab jetzt kann `handlePreviewSelectSection` (oben) die
  // aktuelle Routen-Logik aufrufen, ohne die Datei umzusortieren.
  previewRouteChangeRef.current = handlePreviewRouteChange;



  const handlePreviewPersonaChange = useCallback(
    (personaId: string | null, pathname: string) => {
      if (personaId) {
        const candidates = [
          `persona.${personaId}`,
          `persona.${personaId.replace(/ten$/, "t")}`,
          `persona.${personaId.replace(/en$/, "")}`,
          `persona.${personaId.replace(/herren$/, "herr")}`,
        ];
        const directMatch =
          candidates
            .map((key) => navNodes.find((n) => n.node_key === key) ?? null)
            .find(Boolean) ?? null;
        if (directMatch) {
          setSelected(directMatch);
          setFocusedSection(null);
          sectionSyncRef.current = null;
          return;
        }
      }

      handlePreviewRouteChange(pathname || "/");
    },
    [handlePreviewRouteChange, navNodes],
  );

  /**
   * Sprung-Wunsch aus „Gehe zu Kurz-ID" verarbeiten:
   * - N-…  → Knoten direkt setzen (alle Felder bekannt).
   * - P/B/A-… → ersten Navigationsknoten suchen, der auf page_key zeigt;
   *   bei B/A zusätzlich Block fokussieren.
   * Fällt zurück auf einen synthetischen Knoten, wenn keine Navigation
   * den page_key referenziert (z. B. Seite ohne Menüeintrag).
   */
  useEffect(() => {
    if (!pendingJump) return;
    let cancelled = false;
    const { target } = pendingJump;
    (async () => {
      const { nodes } = await readNavigationNodes();
      if (cancelled) return;
      let node: NavigationNodeRow | null = null;
      if (target.node_id) {
        node = nodes.find((n) => n.id === target.node_id) ?? null;
      }
      if (!node && target.page_key) {
        // Bei P-/B-/A-Sprüngen NICHT am aktuellen Bereich kleben — sonst
        // landet man im Footer-Link-Editor statt im Inhaltseditor. Wir
        // wählen explizit den redaktionellen Knoten (kein Footer-Alias,
        // sofern andere Knoten existieren).
        node = pickEditorialNodeForPage(nodes, target.page_key);
      }
      if (!node && target.page_key) {
        // Synthetischer Knoten — Seite ohne Navigationseintrag.
        node = createSyntheticPageNode(target.page_key, target.label, "main");
      }
      if (!node) return;
      setSelected(node);
      if (target.section_key && target.page_key) {
        setFocusedSection({
          id: `synthetic:${target.page_key}:${target.section_key}`,
          page_key: target.page_key,
          section_key: target.section_key,
          section_type: "",
          section_no: null,
          section_uid: null,
          sort_order: 0,
          is_active: true,
          parent_section_id: null,
          parent_section_key: null,
          updated_at: new Date().toISOString(),
          display_label_de: null,
        });
      } else {
        setFocusedSection(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pendingJump]);

  const reloadAll = useCallback(async () => {
    // Whitelist (`cms_admin_editable_fields`) muss mitgeladen werden, damit
    // umbenannte/duplizierte/eingefügte Sections im PageEditor sofort als
    // „CMS-gepflegt" erscheinen — sonst zeigt der Cache den alten section_key
    // und die Karte wirkt fälschlich aus der Whitelist entfernt.
    await Promise.all([
      loadPages(),
      Promise.resolve(onPilotSaved()),
      Promise.resolve(onEditableFieldsChanged()),
    ]);
    setTreeRefreshToken((k) => k + 1);
    setReloadKey((k) => k + 1);
  }, [loadPages, onPilotSaved, onEditableFieldsChanged]);

  const selectedPage = selected?.page_key
    ? pages.find((p) => p.page_key === selected.page_key) ?? null
    : null;

  // Lookup für Footer-Link-Editor (Route → Seiten-Stammdaten).
  const pagesByRoute = useMemo(() => {
    const m = new Map<string, { page_key: string; page_no: number | null; title_de: string | null; status: string; is_active: boolean }>();
    for (const p of pages) {
      if (p.route_path) {
        m.set(p.route_path, {
          page_key: p.page_key,
          page_no: p.page_no,
          title_de: p.title_de,
          status: p.status,
          is_active: p.is_active,
        });
      }
    }
    return m;
  }, [pages]);

  // Footer-/Footer-Bottom-Eintraege sind reine Link-Zeilen — eigener Editor.
  const isFooterLinkLeaf =
    !!selected &&
    !isSyntheticNode(selected) &&
    (selected.nav_area === "footer" || selected.nav_area === "footer_bottom") &&
    (!!selected.page_key || !!selected.external_url);

  const handleJumpToFooterTarget = useCallback(
    (pageKey: string) => {
      const target = pickEditorialNodeForPage(navNodes, pageKey);
      const targetIsFooterOnly =
        !!target && (target.nav_area === "footer" || target.nav_area === "footer_bottom");
      if (target && !targetIsFooterOnly) {
        handleSelectNode(target);
        return;
      }
      // Seiten, die NUR im Footer verlinkt sind (z. B. Impressum, Datenschutz,
      // AGB, Sitemap), haben keinen redaktionellen Navigationsknoten. Für sie
      // wird ein Ersatzknoten gebaut, damit „Zielseite bearbeiten" den echten
      // Inhaltseditor (Blöcke/Felder) öffnet statt wieder den Footer-Link.
      const page = pages.find((p) => p.page_key === pageKey) ?? null;
      if (page) {
        handleSelectNode({
          ...createSyntheticPageNode(page.page_key, page.title_de ?? page.page_key, "main"),
          route_path: page.route_path ?? null,
        });
        return;
      }
      if (target) {
        handleSelectNode(target);
        return;
      }
      toast.error("Zielseite konnte nicht gefunden werden.");
    },
    [navNodes, handleSelectNode, pages],
  );
  const previewPersonaId = selected?.node_key?.startsWith("persona.")
    ? selected.node_key.slice("persona.".length)
    : null;
  // Personas haben zwar eine eigene `cms_pages`-Zeile (z. B. /personas/bauherr),
  // aber KEINE eigene React-Route — Persona-Inhalt wird auf der Startseite via
  // PersonaContext gerendert. Deshalb für Persona-Knoten immer "/" zeigen,
  // sonst läuft die Live-Vorschau in einen 404.
  const effectivePreviewRoutePath = previewPersonaId
    ? "/"
    : (selected?.route_path ?? selectedPage?.route_path ?? null);

  // Den aktuell geladenen Vorschau-Pfad bereichsübergreifend merken, damit
  // beim Wechsel in Bilder/Templates/Strukturkarte die Vorschau dort nicht
  // mehr auf die Startseite zurückfällt.
  useEffect(() => {
    if (effectivePreviewRoutePath) {
      writeLastPreviewRoute(effectivePreviewRoutePath);
    }
  }, [effectivePreviewRoutePath]);

  const handleArchivePage = async () => {
    if (!selectedPage) return;
    setBusy(true);
    const r = await archivePage(selectedPage.page_key);
    setBusy(false);
    if (r.success) {
      toast.success(`Seite archiviert: ${selectedPage.page_key}`);
      await reloadAll();
    } else {
      toast.error(`Archivieren fehlgeschlagen: ${r.error ?? "unbekannt"}`);
    }
  };

  const handleRestorePage = async () => {
    if (!selectedPage) return;
    setBusy(true);
    const r = await restorePage(selectedPage.page_key);
    setBusy(false);
    if (r.success) {
      toast.success(`Seite wiederhergestellt (Status: Entwurf): ${selectedPage.page_key}`);
      await reloadAll();
    } else {
      toast.error(`Wiederherstellen fehlgeschlagen: ${r.error ?? "unbekannt"}`);
    }
  };

  // handleArchiveNode entfernt — Knoten ausblenden/löschen passiert im Baum.

  const isArchived = selectedPage?.status === "archived";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
        {(() => {
          const cols: Array<{
            key: "tree" | "work";
            label: string;
            open: boolean;
            toggle: () => void;
          }> = [
            { key: "tree", label: "Baum", open: treeOpen, toggle: () => setTreeOpen((v) => !v) },
            { key: "work", label: "Arbeitsbereich", open: workOpen, toggle: () => setWorkOpen((v) => !v) },
          ];
          return cols.map((c) => {
            const wouldClose = c.open && lastOpenColumn;
            return (
              <button
                key={c.key}
                type="button"
                onClick={c.toggle}
                disabled={wouldClose}
                aria-pressed={c.open}
                className={
                  "rounded border px-2 py-1 transition-colors " +
                  (c.open ? "bg-muted/50 hover:bg-muted" : "hover:bg-muted") +
                  (wouldClose ? " cursor-not-allowed opacity-50" : "")
                }
                title={
                  wouldClose
                    ? "Mindestens eine Spalte muss offen sein."
                    : c.open
                      ? `${c.label} einklappen (bleibt als Streifen sichtbar)`
                      : `${c.label} einblenden`
                }
              >
                {c.open ? "▣" : "▢"} {c.label} {c.open ? "einklappen" : "einblenden"}
              </button>
            );
          });
        })()}
        {selected && (
          <span className="text-muted-foreground">
            Bearbeite:{" "}
            <strong className="text-foreground">
              {selected.label_de ?? selected.node_key}
            </strong>
            {selectedPage?.page_no != null && (
              <button
                type="button"
                onClick={() => {
                  const padded = String(selectedPage.page_no).padStart(3, "0");
                  void navigator.clipboard.writeText(padded);
                  toast.success(`Seiten-Nr. ${padded} kopiert`);
                }}
                className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary hover:bg-primary/20"
                title={`Seiten-Nummer (kurze Adresse für Redaktion/Prompts, z. B. „kopiere Seite ${String(selectedPage.page_no).padStart(3, "0")} …"). Klicken zum Kopieren.`}
              >
                #{String(selectedPage.page_no).padStart(3, "0")}
              </button>
            )}
            {selectedPage && (
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(selectedPage.page_key);
                  toast.success(`page_key kopiert: ${selectedPage.page_key}`);
                }}
                className="ml-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] hover:bg-muted/70"
                title="Fachlicher Seitenschlüssel (page_key). Klicken zum Kopieren."
              >
                {selectedPage.page_key}
              </button>
            )}
            {selectedPage && (
              <span className="ml-2 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase">
                {selectedPage.status}
              </span>
            )}
            <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px]">
              Änderungen im Admin erscheinen links im Baum sofort. Gespeicherte Inhalte können auch die veröffentlichte Website beeinflussen. Vorschau nach dem Speichern aktualisieren und prüfen.
            </span>
          </span>
        )}
        {!selected && treeOpen && (
          <span className="text-muted-foreground">
            Klicke links auf einen Knoten — der Editor öffnet sich rechts.
          </span>
        )}
      </div>

      {/* Lebenszyklus-Toolbar (I.7) */}
      {selected && (
        <div className="flex flex-wrap items-center gap-2 rounded border bg-muted/30 px-2 py-1.5 text-xs">
          <span className="text-muted-foreground">Aktionen:</span>
          <button
            type="button"
            disabled={!selectedPage || busy}
            onClick={() => setDuplicateOpen(true)}
            className="rounded border bg-background px-2 py-1 hover:bg-muted disabled:opacity-40"
            title={
              selectedPage
                ? "Diese Seite als Kopie anlegen (Texte, Blöcke, Freigaben UND Bilder werden geklont)"
                : "Knoten ohne verknüpfte Seite — nichts zu duplizieren"
            }
          >
            ⧉ Seite duplizieren
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setCreateNodeDefaults({
                pageKey: selectedPage?.page_key ?? null,
                parentNodeKey: selected?.parent_node_key ?? null,
                navArea: (selected?.nav_area as NavigationNodeRow["nav_area"]) ?? "main",
              });
              setCreateNodeOpen(true);
            }}
            className="rounded border bg-background px-2 py-1 hover:bg-muted disabled:opacity-40"
            title="Neuen Menüeintrag anlegen — z. B. um eine duplizierte Seite ins Menü zu hängen. Wird inaktiv angelegt; Freigabe im Baum links."
          >
            ＋ Knoten anlegen
          </button>

          {selectedPage && !isArchived && (
            <button
              type="button"
              disabled={busy}
              onClick={handleArchivePage}
              className="rounded border bg-background px-2 py-1 hover:bg-muted disabled:opacity-40"
              title="Soft-Delete: Seite wird inaktiv und auf 'archived' gesetzt"
            >
              📦 Seite archivieren
            </button>
          )}
          {selectedPage && isArchived && (
            <button
              type="button"
              disabled={busy}
              onClick={handleRestorePage}
              className="rounded border bg-background px-2 py-1 hover:bg-muted disabled:opacity-40"
              title="Status zurück auf 'draft'"
            >
              ↩ Seite wiederherstellen
            </button>
          )}
          {selectedPage && isArchived && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setDeletePageOpen(true)}
              className="rounded border border-destructive/40 bg-destructive/5 px-2 py-1 text-destructive hover:bg-destructive/10 disabled:opacity-40"
              title="Hard-Delete: nur möglich wenn kein Navigationsknoten mehr verweist"
            >
              ✕ Seite endgültig löschen
            </button>
          )}

          <span className="ml-2 border-l pl-2 text-[10px] text-muted-foreground">
            Knoten ausblenden / löschen: direkt im Baum links. Falls etwas neu angelegt wurde, springt der Baum automatisch dorthin.
          </span>
        </div>
      )}

      <AdminHardeningNotice />

      <ClipboardBanner
        clipboard={clipboard}
        currentPageKey={selected?.page_key ?? null}
        onClear={handleClearClipboard}
      />

      {/*
        Drei-Spalten-Layout (Etappe 3 + Drag-Resize-Nachzug):
        Jede Spalte ist entweder voll sichtbar (mit individuellem flex-grow) ODER
        als 40px-Streifen eingeklappt. Zwischen je zwei offenen Spalten liegt
        eine ziehbare Trennlinie, die die `weights` der beiden Nachbarn anpasst.
        Mindestens eine Spalte bleibt offen.
      */}
      <ColumnsLayout
        treeOpen={treeOpen}
        workOpen={workOpen}
        previewOpen={previewOpen}
        previewMode="overlay"
        weights={weights}
        setWeights={setWeights}
        onCollapseTree={() => !lastOpenColumn && setTreeOpen(false)}
        onCollapseWork={() => !lastOpenColumn && setWorkOpen(false)}
        onCollapsePreview={() => setPreviewOpen(false)}
        onExpandTree={() => setTreeOpen(true)}
        onExpandWork={() => setWorkOpen(true)}
        onExpandPreview={() => setPreviewOpen(true)}
        lastOpenColumn={lastOpenColumn}
        treeContent={
          <>
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Navigations-Baum
              </span>
              <button
                type="button"
                onClick={() => !lastOpenColumn && setTreeOpen(false)}
                disabled={lastOpenColumn}
                className="rounded px-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                title={lastOpenColumn ? "Mindestens eine Spalte muss offen sein." : "Baum einklappen"}
                aria-label="Baum einklappen"
              >
                ◀
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <NavigationTreeEditor
                onSelectionChange={handleSelectNode}
                onSectionSelect={handleSelectSection}
                selectedSectionKey={focusedSection?.section_key ?? null}
                onSectionsMutated={() => void reloadAll()}
                clipboard={clipboard}
                onCopySectionToClipboard={handleCopyToClipboard}
                onPasteFromClipboard={handlePasteFromClipboard}
                hideInternalDetail
                externalSelectedNodeId={pendingHighlightNodeId ?? selected?.id ?? null}
                externalSelectedSectionKey={focusedSection?.section_key ?? null}
                externalSelectionToken={pendingJump?.token ?? 0}
                refreshToken={treeRefreshToken}
                linksRefreshToken={linksRefreshToken}
                onJumpToPage={(pageKey) => {
                  // Karten-/Footer-Pille öffnet immer den redaktionellen
                  // Inhaltsknoten der Zielseite — nie einen Footer-Alias,
                  // sofern eine redaktionelle Alternative existiert.
                  const target = pickEditorialNodeForPage(navNodes, pageKey);
                  if (target) {
                    handleSelectNode(target);
                    return;
                  }
                  const page = pages.find((p) => p.page_key === pageKey) ?? null;
                  if (page) {
                    handleSelectNode(
                      createSyntheticPageNode(
                        page.page_key,
                        page.title_de ?? page.page_key,
                        "main",
                      ),
                    );
                  }
                }}
              />
              <div className="mt-3">
                <AdminActivityLog />
              </div>
            </div>
          </>
        }
        workContent={
          <>
            <div className="flex items-center justify-between gap-2 px-2 pt-2">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Arbeitsbereich
              </span>
              <button
                type="button"
                onClick={() => !lastOpenColumn && setWorkOpen(false)}
                disabled={lastOpenColumn}
                className="rounded px-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                title={lastOpenColumn ? "Mindestens eine Spalte muss offen sein." : "Arbeitsbereich einklappen"}
                aria-label="Arbeitsbereich einklappen"
              >
                ⇔
              </button>
            </div>
            <div ref={editorScrollRef} className="min-h-0 flex-1 overflow-y-auto p-2">
              {isFooterLinkLeaf && selected ? (
                <FooterLinkEditor
                  node={selected}
                  pagesByRoute={pagesByRoute}
                  onReload={reloadAll}
                  onJumpToTarget={handleJumpToFooterTarget}
                />
              ) : (
                <PageEditor
                  node={selected}
                  pilotBundle={pilotBundle}
                  pilotLoading={pilotLoading}
                  onPilotSaved={onPilotSaved}
                  cmsManagedPageKeys={cmsManagedPageKeys}
                  editableFields={editableFields}
                  onEditableFieldsChanged={onEditableFieldsChanged}
                  focusSectionKey={focusedSection?.section_key ?? null}
                  onClearFocus={() => setFocusedSection(null)}
                  onJumpToPage={handleJumpToFooterTarget}
                  scrollContainerRef={editorScrollRef}
                  onSectionFieldsMutated={() => setLinksRefreshToken((t) => t + 1)}
                />

              )}
            </div>
          </>
        }
        previewContent={
          // Wird im Overlay-Modus von ColumnsLayout nicht mehr gerendert —
          // die Live-Vorschau zieht über <PreviewSheet> weiter unten ein.
          // Trotzdem zur Sicherheit als Placeholder hier lassen.
          <div className="hidden" />
        }
      />


      {/* Dialoge */}
      {selectedPage && (
        <DuplicatePageDialog
          open={duplicateOpen}
          sourcePageKey={selectedPage.page_key}
          sourceRoutePath={selectedPage.route_path}
          onClose={() => setDuplicateOpen(false)}
          onDuplicated={async (newPageKey) => {
            await reloadAll();
            const newPage = (await readPagesWithNav()).pages.find((p) => p.page_key === newPageKey) ?? null;
            if (newPage) {
              setSelected({
                id: `synthetic:${newPage.page_key}`,
                node_no: null,
                nav_area: (selected?.nav_area as NavigationNodeRow["nav_area"]) ?? "main",
                node_key: newPage.page_key,
                parent_id: null,
                parent_node_key: null,
                page_key: newPage.page_key,
                label: newPage.title_de ?? newPage.page_key,
                label_de: newPage.title_de ?? newPage.page_key,
                label_en: newPage.title_en ?? null,
                description_de: null,
                description_en: null,
                node_type: "page",
                external_url: null,
                route_path: newPage.route_path,
                sort_order: 0,
                is_active: newPage.is_active,
                show_in_public_nav: false,
              });
            }
            // Direkt anbieten, einen Navigationsknoten für die Kopie anzulegen.
            setCreateNodeDefaults({
              pageKey: newPageKey,
              parentNodeKey: selected?.parent_node_key ?? null,
              navArea: (selected?.nav_area as NavigationNodeRow["nav_area"]) ?? "main",
            });
            setCreateNodeOpen(true);
          }}
        />
      )}
      {selectedPage && (
        <ConfirmDeleteDialog
          open={deletePageOpen}
          title="Seite endgültig löschen"
          description={
            <>
              Diese Seite (<code className="font-mono">{selectedPage.page_key}</code>) wird
              mit allen Sections, Texten und Freigaben unwiderruflich entfernt.
              Bilder bleiben im Speicher erhalten (nur als inaktiv markiert).
              Voraussetzung: <strong>kein Navigationsknoten</strong> verweist
              mehr auf diese Seite.
            </>
          }
          confirmToken={selectedPage.page_key}
          onConfirm={async () => {
            const r = await deletePage(selectedPage.page_key);
            if (!r.success) {
              if (r.error === "page_in_use_by_navigation") {
                return `Es zeigen noch ${(r as { navigation_node_count?: number }).navigation_node_count ?? "?"} Navigationsknoten auf diese Seite. Bitte erst dort entfernen.`;
              }
              return r.error ?? "Unbekannter Fehler.";
            }
            toast.success(`Seite gelöscht: ${selectedPage.page_key}`);
            await reloadAll();
            setSelected(null);
            return null;
          }}
          onClose={() => setDeletePageOpen(false)}
        />
      )}
      <CreateNavigationNodeDialog
        open={createNodeOpen}
        defaultPageKey={createNodeDefaults.pageKey}
        defaultParentNodeKey={createNodeDefaults.parentNodeKey}
        defaultNavArea={createNodeDefaults.navArea ?? "main"}
        navigationNodes={navNodes}
        onClose={() => setCreateNodeOpen(false)}
        onCreated={async (newNodeId) => {
          await reloadAll();
          setPendingHighlightNodeId(newNodeId);
          const fresh = await readNavigationNodes();
          const created = fresh.nodes.find((node) => node.id === newNodeId) ?? null;
          if (created) {
            setSelected(created);
            toast.success(`Knoten im Baum markiert: ${created.label_de ?? created.node_key}`);
          }
        }}
      />
      {/* Knoten-Lösch-Dialog entfernt — passiert direkt im Baum (🗑 in Zeile). */}

      {/* Vorschau als Schublade vom rechten Rand. */}
      <PreviewSheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <AdminLivePreview
          routePath={effectivePreviewRoutePath}
          previewPersonaId={previewPersonaId}
          highlightSectionKey={focusedSection?.section_key ?? null}
          highlightSectionType={focusedSection?.section_type ?? null}
          reloadToken={reloadKey}
          onRouteChange={handlePreviewRouteChange}
          onPersonaChange={handlePreviewPersonaChange}
          onSectionSelect={handlePreviewSelectSection}
        />
      </PreviewSheet>

      {/* Hilfe & Legende als Schublade vom linken Rand. */}
      <HelpDrawer open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
};

export default MasterDetailWorkbench;
