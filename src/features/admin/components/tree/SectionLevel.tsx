/**
 * SectionLevel + SectionList — rekursive Section-Baum-Ebenen.
 * Etappe `cms-light-admin-card-link-1`: jede Karten-Zeile (card_v1) zeigt
 * unter sich einen Sprung-Link auf ihre verlinkte CMS-Unterseite, falls
 * das Feld `href` gesetzt ist und ein passender Nav-Knoten existiert.
 */
import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { SectionRow } from "@/features/admin/api/cmsAdminSectionOrder";
import type { ClipboardItem } from "@/features/admin/components/ClipboardBanner";
import { readPageCardLinks, type PageLookup } from "@/features/admin/api/cmsAdminCardLinks";
import { resolveCardLink } from "@/features/admin/lib/resolveCardLink";
import type { NavigationNodeRow } from "@/features/admin/api/cmsAdminNavigation";
import { SectionRowView, SortableSectionWrapper, type SectionCardLink } from "./SectionRowView";
import { blockTypeStyle } from "@/features/admin/lib/blockTypeStyle";
import { buildSectionTree, collectDescendantIds } from "./treeUtils";
import type { SectionTreeNode } from "./types";
import {
  getEditorialSectionKind,
  type EditorialSectionKind,
} from "@/features/admin/lib/editorialSectionKind";
import { readAssets } from "@/features/admin/api/cmsAdminAssets";
import { getCmsSupabaseClient } from "@/lib/cmsSupabase/client";


export interface SectionListProps {
  pageKey: string;
  pageNo: number | undefined;
  sections: SectionRow[] | undefined;
  loading: boolean;
  busy: boolean;
  onToggleActive: (s: SectionRow) => void;
  onMove: (s: SectionRow, dir: "up" | "down") => void;
  onDelete: (s: SectionRow) => void;
  onDuplicate: (s: SectionRow) => void;
  /** Etappe `cms-admin-rename-card-section-key-1`. Optional. */
  onRename?: (s: SectionRow) => void;
  onSelect: (s: SectionRow) => void;
  selectedSectionKey: string | null;
  onApplyOrder: (pageKey: string, orderedSectionKeys: string[]) => void | Promise<void>;
  onSetParent: (
    pageKey: string,
    sectionKey: string,
    newParentSectionKey: string | null,
    position: number | null,
  ) => void | Promise<void>;
  /** Klemmbrett (Etappe `cms-light-admin-clipboard-1`). */
  clipboard?: ClipboardItem | null;
  /** Aus Zwischenablage in (parent, position) einfügen. */
  onPasteFromClipboard?: (
    targetPageKey: string,
    parentSectionKey: string | null,
    position: number,
  ) => void | Promise<void>;
  /** Etappe card-link-1: alle Nav-Knoten (heute nicht mehr genutzt — Auflösung
   *  läuft über `pagesByRoute`). Optional, für Rückwärtskompatibilität. */
  navNodes?: NavigationNodeRow[];
  /** Etappe `cms-admin-card-links-visible-audit-1`: Auflösung Link → Zielseite
   *  über `cms_pages.route_path`. Liefert Titel, page_no und Status. */
  pagesByRoute?: Map<string, PageLookup>;
  /** Klick auf den Sprung-Link einer Karte. */
  onJumpToPage?: (pageKey: string) => void;
  /** Zähler aus dem Workbench-Sprung — erzwingt Re-Expand der Vorfahren
   *  und Scroll auf den Ziel-Block, auch wenn dieser bereits ausgewählt war. */
  externalSelectionToken?: number;
  /** Batch 47a (`cms-admin-link-pillen-sync-fix`): Zähler, der nach jedem
   *  Feld-Save im Arbeitsbereich erhöht wird. Erzwingt das Neu-Lesen der
   *  Karten-Linkfelder (`link_N_href`, `cta_href`, …), damit die graue
   *  Link-Pille im Baum immer dem **aktuellen** Linkziel folgt — sonst
   *  bleibt sie auf dem zuletzt gelesenen Wert (z. B. dem alten
   *  `/kontakt`-Default) hängen, obwohl der Arbeitsbereich bereits das
   *  neue Ziel zeigt. Keine eigene Auflösungslogik — nutzt denselben
   *  Pfad (`readPageCardLinks` → `resolveCardLink`). */
  linksRefreshToken?: number;
}

/* Eine Ebene des Section-Baums: SortableContext + rekursive Kinder. */
interface SectionLevelProps {
  pageKey: string;
  
  reorderAllowed: boolean;
  busy: boolean;
  nodes: SectionTreeNode[];
  allSections: SectionRow[];
  selectedSectionKey: string | null;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  onSelect: (s: SectionRow) => void;
  onToggleActive: (s: SectionRow) => void;
  onMove: (s: SectionRow, dir: "up" | "down") => void;
  onDelete: (s: SectionRow) => void;
  onDuplicate: (s: SectionRow) => void;
  onRename?: (s: SectionRow) => void;
  onApplySiblingOrder: (orderedSectionKeys: string[]) => void;
  onChangeParent: (s: SectionRow, newParentKey: string) => void;
  parentOptionsFor: (s: SectionRow) => { value: string; label: string }[];
  depth: number;
  /** Eltern-section_key dieser Ebene (null = oberste Ebene). */
  parentSectionKey: string | null;
  clipboard?: ClipboardItem | null;
  onPasteFromClipboard?: (
    targetPageKey: string,
    parentSectionKey: string | null,
    position: number,
  ) => void | Promise<void>;
  /** Map section_key → Liste aufgelöster Linkziele (mind. 1, sonst nicht gesetzt). */
  cardLinks?: Map<string, SectionCardLink[]>;
  /**
   * Tranche 19: redaktionelle Variante pro Section (Bildkarte/Iconkarte/…),
   * abgeleitet aus geladenen Feldern + Asset-Slots.
   */
  kindBySection?: Map<string, EditorialSectionKind>;
}

/**
 * Kompakter „Hier einfügen"-Slot zwischen zwei Geschwister-Blöcken.
 * Sichtbar nur, wenn die Zwischenablage gefüllt ist UND die Quelle
 * dieselbe Seite ist (v1).
 */
const PasteSlot = ({
  visible,
  label,
  onClick,
  busy,
}: {
  visible: boolean;
  label: string;
  onClick: () => void;
  busy: boolean;
}) => {
  if (!visible) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="my-0.5 flex w-full items-center justify-center gap-1 rounded border border-dashed border-primary/50 bg-primary/5 px-2 py-1 text-[10px] text-primary hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
      title={label}
    >
      ➕ {label}
    </button>
  );
};

const SectionLevel = ({
  pageKey,
  reorderAllowed,
  busy,
  nodes,
  allSections,
  selectedSectionKey,
  expanded,
  onToggleExpand,
  onSelect,
  onToggleActive,
  onMove,
  onDelete,
  onDuplicate,
  onRename,
  onApplySiblingOrder,
  onChangeParent,
  parentOptionsFor,
  depth,
  parentSectionKey,
  clipboard,
  onPasteFromClipboard,
  cardLinks,
  kindBySection,
}: SectionLevelProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = nodes.map((n) => n.section_key);

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldI = ids.indexOf(String(active.id));
    const newI = ids.indexOf(String(over.id));
    if (oldI < 0 || newI < 0) return;
    const next = arrayMove(nodes, oldI, newI).map((n) => n.section_key);
    onApplySiblingOrder(next);
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= nodes.length) return;
    onApplySiblingOrder(arrayMove(nodes, index, targetIndex).map((node) => node.section_key));
  };

  // Klemmbrett-Slot: sichtbar sobald die Zwischenablage gefüllt ist.
  // Cross-Page erlaubt (Etappe `cms-light-admin-clipboard-2`).
  const pasteVisible = !!clipboard && !!onPasteFromClipboard;
  const handlePaste = (position: number) => {
    if (!onPasteFromClipboard) return;
    void onPasteFromClipboard(pageKey, parentSectionKey, position);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-1" role="group" aria-label={`Ebene ${depth}`}>
          <PasteSlot
            visible={pasteVisible}
            label={`Hier einfügen (Position 1${parentSectionKey ? ` als Kind von „${parentSectionKey}"` : " auf oberster Ebene"})`}
            onClick={() => handlePaste(0)}
            busy={busy}
          />
          {nodes.map((node, idx) => {
            const isOpen = expanded.has(node.id);
            const childCount = node.children.length;
            const canUp = reorderAllowed && idx > 0;
            const canDown = reorderAllowed && idx < nodes.length - 1;
            const duplicable = !node.section_key.startsWith("content");
            return (
              <div key={node.section_key}>
                <div className="flex items-center gap-1">
                  {childCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => onToggleExpand(node.id)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded border border-primary/30 bg-primary/10 text-[10px] text-primary hover:bg-primary/20 focus-visible:ring-2 focus-visible:ring-ring"
                      aria-expanded={isOpen}
                      aria-label={isOpen ? "Unter-Blöcke zuklappen" : "Unter-Blöcke aufklappen"}
                      title={
                        isOpen
                          ? `${childCount} Unter-Block${childCount === 1 ? "" : "e"} zuklappen`
                          : `${childCount} Unter-Block${childCount === 1 ? "" : "e"} aufklappen`
                      }
                    >
                      {isOpen ? "▾" : "▸"}
                    </button>
                  ) : (
                    <span className="inline-block w-6" aria-hidden="true" />
                  )}
                  <div className="flex-1 min-w-0">
                    <SortableSectionWrapper
                      id={node.section_key}
                      disabled={!reorderAllowed}
                    >
                      {(handle) => {
                        // Etappe `cms-light-standardkarte-admin-maske-vereinheitlichen-1`:
                        // redaktioneller Parent-Hinweis (Container-Label + Kurz-ID).
                        const parentKey = node.parent_section_key ?? null;
                        const parentRow = parentKey
                          ? allSections.find((s) => s.section_key === parentKey) ?? null
                          : null;
                        const parentInfo = parentRow
                          ? {
                              editorialLabel: blockTypeStyle(parentRow.section_type, parentRow.section_key).label,
                              shortId:
                                typeof parentRow.section_uid === "number"
                                  ? `B-${String(parentRow.section_uid).padStart(3, "0")}`
                                  : null,
                            }
                          : null;

                        return (
                          <SectionRowView
                            s={node}
                            reorderAllowed={reorderAllowed}
                            canUp={canUp}
                            canDown={canDown}
                            busy={busy}
                            selected={selectedSectionKey === node.section_key}
                            duplicable={duplicable}
                            parentOptions={parentOptionsFor(node)}
                            currentParentKey={node.parent_section_key ?? ""}
                            onSelect={() => onSelect(node)}
                            onToggleActive={() => onToggleActive(node)}
                            onMoveUp={() => handleMove(idx, "up")}
                            onMoveDown={() => handleMove(idx, "down")}
                            onDuplicate={() => onDuplicate(node)}
                            onDelete={() => onDelete(node)}
                            onChangeParent={(newKey) => onChangeParent(node, newKey)}
                            onRename={onRename ? () => onRename(node) : undefined}
                            dragHandle={handle}
                            cardLinks={cardLinks?.get(node.section_key) ?? null}
                            editorialLabel={kindBySection?.get(node.section_key) ?? null}
                            parentInfo={parentInfo}
                          />
                        );
                      }}
                    </SortableSectionWrapper>
                  </div>
                </div>
                {isOpen && childCount > 0 && (
                  <div className="ml-7 mt-1 border-l-2 border-primary/30 pl-2">
                    <SectionLevel
                      pageKey={pageKey}
                      reorderAllowed={reorderAllowed}
                      busy={busy}
                      nodes={node.children}
                      allSections={allSections}
                      selectedSectionKey={selectedSectionKey}
                      expanded={expanded}
                      onToggleExpand={onToggleExpand}
                      onSelect={onSelect}
                      onToggleActive={onToggleActive}
                      onMove={onMove}
                      onDelete={onDelete}
                      onDuplicate={onDuplicate}
                      onRename={onRename}
                      onApplySiblingOrder={onApplySiblingOrder}
                      onChangeParent={onChangeParent}
                      parentOptionsFor={parentOptionsFor}
                      depth={depth + 1}
                      parentSectionKey={node.section_key}
                      clipboard={clipboard}
                      onPasteFromClipboard={onPasteFromClipboard}
                      cardLinks={cardLinks}
                      kindBySection={kindBySection}
                    />
                  </div>
                )}
                <PasteSlot
                  visible={pasteVisible}
                  label={`Hier einfügen (nach „${node.section_key}")`}
                  onClick={() => handlePaste(idx + 1)}
                  busy={busy}
                />
              </div>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export const SectionList = ({
  pageKey,
  pageNo,
  sections,
  loading,
  busy,
  onToggleActive,
  onMove,
  onDelete,
  onDuplicate,
  onRename,
  onSelect,
  selectedSectionKey,
  onApplyOrder,
  onSetParent,
  clipboard,
  onPasteFromClipboard,
  navNodes: _navNodes,
  pagesByRoute,
  onJumpToPage,
  externalSelectionToken,
  linksRefreshToken,
}: SectionListProps) => {
  // Eltern-Blöcke (z. B. „Personas") starten eingeklappt. Der Nutzer öffnet
  // gezielt den gewünschten Bereich per Klick auf das Akkordeon-Icon.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  // Etappe Batch 42 (`cms-admin-link-pillen-standardbausteine-1`): pro Section
  // ALLE gesetzten Linkfelder cachen — `href`, `cta_link`, `cta_href`,
  // `link_1_href` / `link_2_href` / `link_3_href` (Slot-Disable berücksichtigt).
  // Mehrere Links pro Section rendern wir untereinander als eigene Pillen.
  type CachedLink = { fieldKey: string; href: string };
  const [linksByKey, setLinksByKey] = useState<Map<string, CachedLink[]>>(() => new Map());
  // Ausgeblendete Sections bleiben IMMER inline an ihrer Position im
  // Baum (ausgegraut + Badge „Ausgeblendet"). Es gibt KEINEN
  // Altbestand-Bucket — Ausblenden ≠ Löschen, aber Position bleibt.
  // Tranche 19: redaktionelle Kartenvariante (Bildkarte/Iconkarte/Textkarte/…)
  // pro Section ableiten. Dazu pro Seite einmalig die vorhandenen
  // `cms_section_fields.field_key`s und aktiven `cms_assets.field_key`-Slots
  // laden. Reines Lesen — keine Schreibwege.
  const [fieldKeysBySection, setFieldKeysBySection] = useState<Map<string, Set<string>>>(
    () => new Map(),
  );
  const [assetSlotsBySection, setAssetSlotsBySection] = useState<Map<string, Set<string>>>(
    () => new Map(),
  );

  useEffect(() => {
    let cancelled = false;
    if (!pageKey || !sections || sections.length === 0) {
      setFieldKeysBySection(new Map());
      setAssetSlotsBySection(new Map());
      return;
    }
    // Felder (alle Locales — uns interessieren nur die distinct field_keys).
    void (async () => {
      try {
        const sb = await getCmsSupabaseClient();
        const { data } = await (sb as unknown as {
          from: (t: string) => {
            select: (cols: string) => {
              eq: (
                c: string,
                v: string,
              ) => { range: (a: number, b: number) => Promise<{ data: unknown }> };
            };
          };
        })
          .from("cms_section_fields")
          .select("section_key,field_key")
          .eq("page_key", pageKey)
          .range(0, 9999);
        if (cancelled) return;
        const rows = (Array.isArray(data) ? data : []) as Array<{
          section_key: string;
          field_key: string;
        }>;
        const map = new Map<string, Set<string>>();
        for (const r of rows) {
          if (!r.section_key || !r.field_key) continue;
          let s = map.get(r.section_key);
          if (!s) {
            s = new Set();
            map.set(r.section_key, s);
          }
          s.add(r.field_key);
        }
        setFieldKeysBySection(map);
      } catch {
        // Bei Lesefehler bleibt die Map leer — Heuristik fällt auf den
        // technischen Typ-Label zurück (keine UI-Regression).
      }
    })();
    // Aktive Assets pro Seite (Slot = field_key).
    void readAssets(pageKey).then((rows) => {
      if (cancelled) return;
      const map = new Map<string, Set<string>>();
      for (const a of rows) {
        if (!a.is_active) continue;
        if (!a.section_key || !a.field_key) continue;
        let s = map.get(a.section_key);
        if (!s) {
          s = new Set();
          map.set(a.section_key, s);
        }
        s.add(a.field_key);
      }
      setAssetSlotsBySection(map);
    });
    return () => {
      cancelled = true;
    };
  }, [pageKey, sections]);

  useEffect(() => {
    let cancelled = false;
    // Wir laden nur, wenn die Seite mindestens eine Section hat, die typischer-
    // weise verlinkt. Seit Batch 42 zählen dazu auch `cta_v1`/`teaser_2col_v1`
    // und alles, was Standard-Karten-Linkfelder (`link_N_href`) trägt — also
    // praktisch jede Karten-/CTA-haltige Seite. Wir nehmen einen breiten Filter,
    // weil der einzelne Lese-Call billig ist und sonst Pillen fehlen.
    const linkableTypes = new Set([
      "card_v1",
      "content_v1",
      "cta_v1",
      "teaser_2col_v1",
      "cards_v1",
      "card",
    ]);
    const hasLinkable = (sections ?? []).some((s) => linkableTypes.has(s.section_type));
    if (!pageKey || !hasLinkable) {
      setLinksByKey(new Map());
      return;
    }
    void readPageCardLinks(pageKey).then((rows) => {
      if (cancelled) return;
      const m = new Map<string, CachedLink[]>();
      for (const r of rows) {
        const list = m.get(r.section_key) ?? [];
        list.push({ fieldKey: r.field_key, href: r.href });
        m.set(r.section_key, list);
      }
      setLinksByKey(m);
    });
    return () => {
      cancelled = true;
    };
    // `linksRefreshToken` wird vom Workbench nach jedem Feld-Save
    // erhöht (Batch 47a). Damit liest dieser Effekt die aktuellen
    // `link_N_href`/`cta_href`-Werte neu — die Pille folgt dem Ziel.
  }, [pageKey, sections, linksRefreshToken]);

  // Externer Sprung (Kurz-ID-Bar im Workbench): Vorfahren des Ziel-Blocks
  // ausklappen und Zeile in den sichtbaren Bereich scrollen.
  //
  // Etappe `cms-light-tree-single-open-und-kein-rueckspring-1`:
  // Auto-Scroll feuert NUR noch, wenn sich der `externalSelectionToken`
  // ändert (also bei explizitem „Gehe zu Kurz-ID …"). In-Tree-Klicks
  // selektieren weiterhin (rechter Arbeitsbereich), aber der Baum
  // scrollt dabei NICHT mehr von alleine — sonst springt er nach jedem
  // Klick/Reload an die alte Position zurück.
  const lastJumpTokenRef = useRef<number | string | null>(null);
  useEffect(() => {
    if (!selectedSectionKey || !sections || sections.length === 0) return;
    // Nur reagieren, wenn ein NEUER externer Sprung vorliegt.
    if (externalSelectionToken === lastJumpTokenRef.current) return;
    lastJumpTokenRef.current = externalSelectionToken ?? null;
    const byKey = new Map<string, SectionRow>();
    for (const s of sections) byKey.set(s.section_key, s);
    const target = byKey.get(selectedSectionKey);
    if (!target) return;
    const ancestorIds: string[] = [];
    let cur: SectionRow | undefined = target.parent_section_key
      ? byKey.get(target.parent_section_key) ?? undefined
      : undefined;
    while (cur) {
      if (cur.id) ancestorIds.push(cur.id);
      cur = cur.parent_section_key ? byKey.get(cur.parent_section_key) : undefined;
    }
    if (ancestorIds.length > 0) {
      setExpanded((prev) => {
        let changed = false;
        const next = new Set(prev);
        for (const id of ancestorIds) {
          if (!next.has(id)) {
            next.add(id);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }
    const t = window.setTimeout(() => {
      // Bugfix `cms-admin-tree-no-cross-page-hero-jump-1`:
      // Mehrere Seiten haben Sections mit identischen Schlüsseln (z. B. „hero",
      // „faq", „standard_cta"). Wir scopen daher zwingend auf den page_key der
      // gerade gerenderten Section-Liste, damit kein Hero einer anderen Seite
      // (z. B. anwendungen.root → B-246) angesprungen wird.
      const el = document.querySelector<HTMLElement>(
        `[data-tree-page-key="${CSS.escape(pageKey)}"][data-tree-section-key="${CSS.escape(selectedSectionKey)}"]`,
      );
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    return () => window.clearTimeout(t);
  }, [externalSelectionToken, selectedSectionKey, sections]);


  if (loading && !sections) {
    return <div className="px-2 py-1 text-xs text-muted-foreground">Lade Inhaltsblöcke…</div>;
  }
  if (!sections || sections.length === 0) {
    return (
      <div className="px-2 py-1 text-xs text-muted-foreground italic">
        Diese Seite enthält noch keine Inhaltsblöcke.
      </div>
    );
  }

  // Spiegel-Regel: Reihenfolge der Inhaltsblöcke ist auf jeder CMS-Seite editierbar.
  // Code-Seiten (z. B. Briefkastenanlagen, solange sie noch hartcodiert sind) zeigen
  // die Änderung erst, wenn ihr Renderer auf cms.sections-Iteration umgestellt wurde
  // (siehe Pilot Türsprechanlagen). Die DB-RPCs erlauben Reordern bereits seitenübergreifend.
  const reorderAllowed = true;
  const tree = buildSectionTree(sections);

  // Hinweis: Eltern-Blöcke starten bewusst eingeklappt – kein Auto-Expand.


  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      // Single-Open pro Eltern-Ebene: Geschwister-Zweige automatisch
      // schließen, damit immer nur ein Branch je Ebene offen ist.
      // Vorfahren bleiben offen (sonst klappt sich der gerade geöffnete
      // Zweig im selben Schritt wieder zu).
      const me = sections.find((s) => s.id === id);
      const parentId = me?.parent_section_id ?? null;
      for (const s of sections) {
        if (!s.id || s.id === id) continue;
        const sParent = s.parent_section_id ?? null;
        if (sParent === parentId) next.delete(s.id);
      }
      next.add(id);
      return next;
    });
  };


  const parentOptionsFor = (s: SectionRow) => {
    const node = tree
      .flatMap(function flatten(n): SectionTreeNode[] {
        return [n, ...n.children.flatMap(flatten)];
      })
      .find((n) => n.id === s.id);
    const blocked = new Set<string>();
    if (node) collectDescendantIds(node, blocked);
    return sections
      .filter((cand) => !blocked.has(cand.id))
      .map((cand) => ({
        value: cand.section_key,
        label: cand.section_key,
      }));
  };

  const handleApplySiblingOrder = (orderedKeys: string[]) => {
    void onApplyOrder(pageKey, orderedKeys);
  };

  const handleChangeParent = (s: SectionRow, newParentKey: string) => {
    const normalized = newParentKey.trim() === "" ? null : newParentKey;
    void onSetParent(pageKey, s.section_key, normalized, null);
  };

  // Karten-/Block-Link-Map aufbauen. Auflösungs-Logik gemeinsam mit dem
  // Arbeitsbereich (siehe `src/features/admin/lib/resolveCardLink.ts`).
  // Seit Batch 42: pro Section eine Liste von Pillen (kann mehrere
  // Links enthalten, z. B. `link_1_href` + `link_2_href`).
  const cardLinks = (() => {
    if (linksByKey.size === 0) return undefined;
    const out = new Map<string, SectionCardLink[]>();
    const byRoute = pagesByRoute ?? new Map<string, PageLookup>();
    for (const [sectionKey, links] of linksByKey.entries()) {
      const resolved = links.map(({ fieldKey, href }) =>
        resolveCardLink({
          href,
          fieldKey,
          pagesByRoute: byRoute,
          onJump: onJumpToPage,
        }),
      );
      if (resolved.length > 0) out.set(sectionKey, resolved);
    }
    // `pageNo` der **Quellseite** wird in dieser Pille bewusst nicht
    // angezeigt — sie steht bereits oben in der Section-Zeile.
    void pageNo;
    return out;
  })();

  // Alle Root-Sections bleiben IMMER inline im Hauptbaum — aktive wie
  // ausgeblendete. Ausgeblendete werden in der Zeile als „Ausgeblendet"
  // markiert (ausgegraut + Badge). Es gibt KEINEN Altbestand-Bucket mehr.
  const rootsForMain = tree;

  // Tranche 19: redaktionelle Variante pro Section vorab berechnen.
  const kindBySection = (() => {
    const m = new Map<string, EditorialSectionKind>();
    // Eltern-Typ-Lookup, damit `card_v1` weiß, ob sie in einem
    // Bildkarten-Container (z. B. `product_scroller_v1`) liegt.
    const typeById = new Map<string, string>();
    const keyById = new Map<string, string>();
    for (const s of sections) {
      if (s.id) {
        typeById.set(s.id, s.section_type);
        keyById.set(s.id, s.section_key);
      }
    }
    for (const s of sections) {
      const parentType = s.parent_section_id ? typeById.get(s.parent_section_id) ?? null : null;
      const parentKey = s.parent_section_id ? keyById.get(s.parent_section_id) ?? null : null;
      m.set(
        s.section_key,
        getEditorialSectionKind(s.section_type, {
          fieldKeys: fieldKeysBySection.get(s.section_key),
          assetSlots: assetSlotsBySection.get(s.section_key),
          isInactive: !s.is_active,
          parentSectionType: parentType,
          sectionKey: s.section_key,
          parentSectionKey: parentKey,
        }),
      );
    }
    return m;
  })();


  const commonLevelProps = {
    pageKey,
    reorderAllowed,
    busy,
    allSections: sections,
    selectedSectionKey,
    expanded,
    onToggleExpand: toggleExpand,
    onSelect,
    onToggleActive,
    onMove,
    onDelete,
    onDuplicate,
    onRename,
    onApplySiblingOrder: handleApplySiblingOrder,
    onChangeParent: handleChangeParent,
    parentOptionsFor,
    clipboard,
    onPasteFromClipboard,
    cardLinks,
    kindBySection,
  } as const;

  return (
    <div className="flex flex-col gap-2">
      <SectionLevel
        {...commonLevelProps}
        nodes={rootsForMain}
        depth={0}
        parentSectionKey={null}
      />
    </div>
  );
};
