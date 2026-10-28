/**
 * SectionRowView + SortableSectionWrapper — eine Inhalts-Block-Zeile.
 * Mechanisch aus NavigationTreeEditor ausgelagert (Split-1).
 * Aktionen (Ausblenden / Duplizieren / Löschen) liegen in einem
 * 3-Punkte-Menü, damit die Zeile ruhiger wirkt. Pfeile + Drag-Handle
 * bleiben sichtbar.
 */
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ShortIdBadge from "@/features/admin/components/ShortIdBadge";
import type { SectionRow } from "@/features/admin/api/cmsAdminSectionOrder";
import { blockTypeStyle } from "@/features/admin/lib/blockTypeStyle";
import CardLinkPill from "./CardLinkPill";

/**
 * Optionaler Link, der von einem Inhaltsblock (z. B. Karte `card_v1` oder
 * Content-Block `content_v1` mit `cta_link`) auf ein anderes Ziel zeigt.
 * Wenn gesetzt, rendert die Zeile darunter eine kleine Pille, z. B.
 *   „→ P015 Elektronische Drückergarnitur"  (internes Ziel gefunden)
 *   „⚠ Zielseite nicht gefunden: /…"        (interner Link, keine Seite)
 *   „↗ extern: https://…"                   (externer Link)
 *
 * Reine Anzeige — kein Edit, kein Schreibweg. Wird im Admin-Tree von
 * `SectionList` aus `cms_section_fields` (Felder `href` / `cta_link`)
 * aufgebaut und gegen `cms_pages` aufgelöst.
 */
export type SectionCardLinkKind = "internal-found" | "internal-missing" | "external";

export interface SectionCardLink {
  /** Welche Art Link es ist — bestimmt Farbe/Icon der Pille. */
  kind: SectionCardLinkKind;
  /** Aus welchem DB-Feld der Link stammt (für Tooltip/Diagnose). */
  /**
   * DB-Feld, aus dem der Link stammt. War ursprünglich auf
   * `"href" | "cta_link"` begrenzt; seit Etappe
   * `cms-admin-link-pills-all-nav-areas-1` als generischer String typisiert,
   * damit auch verschachtelte Karten-Felder (`items.0.href`, `cta_href`)
   * und Navigations-Knoten-Felder (`page_key`, `route_path`, `external_url`)
   * dieselbe Pille rendern können.
   */
  fieldKey: string;
  /** Anzeigename: Seitentitel (internal-found) oder roher Pfad/URL sonst. */
  label: string;
  /** Kurz-ID der Zielseite, z. B. 15 → wird als „P015" gerendert. */
  pageNo: number | null;
  /** Ziel-Route oder URL (für Tooltip / Anzeige bei externen Links). */
  routePath: string;
  /** Lifecycle der Zielseite, falls intern und gefunden. */
  status?: "published" | "draft" | "archived";
  /** Ob die Zielseite aktiv ist (gilt zusätzlich zu `status`). */
  isActive?: boolean;
  /** Klick-Handler. Bei externen/kaputten Links nicht gesetzt. */
  onJump?: () => void;
}

export interface SectionRowViewProps {
  s: SectionRow;
  reorderAllowed: boolean;
  canUp: boolean;
  canDown: boolean;
  busy: boolean;
  selected: boolean;
  duplicable: boolean;
  /** Liste möglicher Eltern für das „Teil von"-Dropdown
   *  (Schlüssel + Anzeige-Label). */
  parentOptions: { value: string; label: string }[];
  /** Aktueller Eltern-Schlüssel oder leer = oberste Ebene. */
  currentParentKey: string;
  onSelect: () => void;
  onToggleActive: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onChangeParent: (newParentKey: string) => void;
  /** Etappe `cms-admin-rename-card-section-key-1` — nur für card_v1 sichtbar. */
  onRename?: () => void;
  dragHandle: React.ReactNode;
  /**
   * Optionale Sprung-Links von einem Inhaltsblock auf andere CMS-Seiten /
   * externe Ziele. Seit Batch 42 als Liste — Karten mit mehreren Slots
   * (`link_1_href`, `link_2_href`, …) rendern entsprechend mehrere Pillen
   * untereinander. Leere oder fehlende Liste = keine Pille.
   */
  cardLinks?: SectionCardLink[] | null;
  /**
   * Etappe „Tranche 19 — Admin-Baum-Kartenlabels": optionales redaktionelles
   * Label (z. B. „Bildkarte" / „Iconkarte" / „Textkarte" für eine `card_v1`).
   * Ersetzt nur die Beschriftung des Typ-Badges — Farbstreifen und
   * Familien-Tooltip bleiben aus `blockTypeStyle`.
   */
  editorialLabel?: { label: string; hint: string; warning?: string } | null;
  /**
   * Etappe `cms-light-standardkarte-admin-maske-vereinheitlichen-1`:
   * redaktioneller Anzeigewert des Eltern-Containers (z. B. „Kartenraster",
   * „Kartenscroller", „Hub-Raster"). Optional die Kurz-ID (z. B. „B-082").
   * Reine Anzeige — Parent bleibt technisch via `currentParentKey`
   * referenziert.
   */
  parentInfo?: {
    editorialLabel: string;
    shortId: string | null;
  } | null;
}

export const SectionRowView = ({
  s,
  reorderAllowed,
  canUp,
  canDown,
  busy,
  selected,
  duplicable,
  // parentOptions / onChangeParent: Reparenting-Dropdown ist entfernt; Props
  // bleiben Teil der Schnittstelle, werden aber hier nicht gerendert.
  parentOptions: _parentOptions,
  currentParentKey,
  onSelect,
  onToggleActive,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onChangeParent: _onChangeParent,
  onRename,
  dragHandle,
  cardLinks,
  editorialLabel,
  parentInfo,
}: SectionRowViewProps) => {
  const tapBtn =
    "inline-flex h-8 min-w-[32px] items-center justify-center rounded border px-2 text-[11px] " +
    "active:scale-95 transition disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-ring";
  const typeStyle = blockTypeStyle(s.section_type);
  // Klick auf die ganze Zeile öffnet den Arbeitsbereich — außer der Klick
  // landete bewusst auf einem Knopf (Pfeile, 3-Punkte-Menü, Drag-Handle,
  // Sprung-Link). Inner-Button + Outer-Handler bleiben kompatibel, weil
  // ein Klick auf den Inner-Button via `closest('button')` abgefangen wird.
  const handleRowClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, a, [role="menuitem"], [data-no-row-select="true"]')) return;
    onSelect();
  };
  // Admin-Baum-Label: für FAQ-Sections immer „FAQ" anzeigen (statt
  // „Häufige Fragen" oder der jeweiligen Headline). Rein kosmetisch im
  // Admin — DB-Inhalte und öffentliche Anzeige bleiben unverändert.
  const isFaqSection =
    s.section_type === "faq_v1" || s.section_type === "faq";
  const displayLabel = isFaqSection
    ? "FAQ"
    : (s.display_label_de ?? s.section_key);
  const showSectionKeyChip = isFaqSection || !!s.display_label_de;
  return (
    <div className="flex flex-col gap-0.5">
    <div
      role="button"
      tabIndex={-1}
      onClick={handleRowClick}
      data-tree-section-key={s.section_key}
      data-tree-page-key={s.page_key}
      title={`Klick auf die Zeile öffnet „${displayLabel}" im Arbeitsbereich`}
      className={
        "group flex flex-wrap items-center gap-1.5 rounded border border-l-4 px-2 py-1.5 text-xs transition-colors cursor-pointer " +
        typeStyle.borderClass + " " +
        (selected ? "border-foreground bg-primary/10 " : "border-border bg-muted/20 hover:bg-muted/40 ") +
        (s.is_active ? "" : "border-dashed opacity-60")
      }
    >
      {dragHandle}
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 basis-[160px] items-center gap-2 text-left rounded px-1 py-1 focus-visible:ring-2 focus-visible:ring-ring"
        title={`Nur diesen Block anzeigen: ${s.section_key}`}
      >
        <ShortIdBadge kind="B" value={s.section_uid ?? null} hint={`Block ${s.section_key}`} />
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate font-medium" title={displayLabel}>
            {displayLabel}
          </span>
          {showSectionKeyChip && (
            <span
              className="truncate font-mono text-[10px] text-muted-foreground"
              title={`Technischer Schlüssel (section_key): ${s.section_key}`}
            >
              {s.section_key}
            </span>
          )}
        </span>
        <span
          className={"shrink-0 rounded px-1.5 text-[10px] font-medium " + typeStyle.badgeClass}
          title={
            editorialLabel
              ? `${editorialLabel.label} — ${editorialLabel.hint}\n\nBlock-Familie: ${typeStyle.label} (${typeStyle.description})\nTechnischer Typ: ${s.section_type}`
              : `${typeStyle.label} — ${typeStyle.description}\n\nTechnischer Typ: ${s.section_type}`
          }
        >
          {editorialLabel?.label ?? typeStyle.label}
        </span>
        {editorialLabel?.warning && (
          <span
            className="shrink-0 rounded bg-amber-500/20 px-1 text-[10px] text-amber-700 dark:text-amber-300"
            title={editorialLabel.hint}
          >
            ⚠ {editorialLabel.warning}
          </span>
        )}
        {currentParentKey && (
          <span
            className="shrink-0 rounded bg-primary/10 px-1 text-[10px] text-primary"
            title={
              parentInfo
                ? `Dieser Block liegt unter „${parentInfo.editorialLabel}"${parentInfo.shortId ? ` (${parentInfo.shortId})` : ""} — technischer Schlüssel: ${currentParentKey}. Auf der Website wird er direkt nach dem Container gerendert.`
                : `Dieser Block ist Teil von „${currentParentKey}" und wird in der Website direkt nach ihm gerendert.`
            }
          >
            Teil von {parentInfo?.editorialLabel ?? currentParentKey}
            {parentInfo?.shortId ? ` ${parentInfo.shortId}` : ""}
          </span>
        )}
        {!s.is_active && (() => {
          const firstLink = cardLinks && cardLinks.length > 0 ? cardLinks[0] : null;
          return (
            <span
              className="shrink-0 rounded bg-amber-500/20 px-1 text-[10px] text-amber-700 dark:text-amber-300"
              title={
                firstLink
                  ? `Ausgeblendet: dieser Karten-Block (und damit der Sprung-Link auf „${firstLink.label}") wird auf der öffentlichen Seite nicht mehr angezeigt. Im Admin bleibt er an seiner Position sichtbar (ausgegraut), damit du ihn jederzeit wieder einblenden kannst.`
                  : "Ausgeblendet: dieser Block wird auf der öffentlichen Seite nicht angezeigt. Im Admin bleibt er an seiner Position sichtbar (ausgegraut), damit du ihn jederzeit wieder einblenden kannst."
              }
            >
              Ausgeblendet
            </span>
          );
        })()}
      </button>
      {/* „Teil von"-Dropdown wurde entfernt — Reparenting kommt als eigene Etappe (Cross-Parent-DnD). */}
      <button type="button" disabled={!canUp || busy} onClick={onMoveUp} className={tapBtn} title={reorderAllowed ? "Eine Position hoch" : "Neuordnen aktuell deaktiviert."} aria-label="Nach oben">↑</button>
      <button type="button" disabled={!canDown || busy} onClick={onMoveDown} className={tapBtn} title={reorderAllowed ? "Eine Position runter" : "Neuordnen aktuell deaktiviert."} aria-label="Nach unten">↓</button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={busy}
            className={tapBtn}
            title="Weitere Aktionen"
            aria-label="Weitere Aktionen"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={() => onToggleActive()}>
            {s.is_active ? "👁  Block ausblenden" : "🚫  Block einblenden"}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!duplicable}
            onSelect={() => duplicable && onDuplicate()}
            title={
              duplicable
                ? "Block in Zwischenablage legen — danach erscheinen oben ein blauer Hinweis und „Hier einfügen\"-Stellen zwischen den Blöcken."
                : `„${s.section_key}" ist der technische Grundblock dieser Seite und bleibt bewusst vom Kopieren ausgenommen.`
            }
          >
            📋  In Zwischenablage kopieren
          </DropdownMenuItem>
          {onRename && (s.section_type === "card_v1" || s.section_type === "teaser_2col_v1" || s.section_type === "cards_v1") && (
            <DropdownMenuItem
              onSelect={() => onRename()}
              title={'Den technischen Schlüssel dieses Blocks (Standardkarte, Wechselteaser oder Kartenraster) umbenennen. Inhalte, Bilder, Reihenfolge und untergeordnete Karten bleiben erhalten.'}
            >
              ✏️  Schlüssel umbenennen…
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => onDelete()}
            className="text-destructive focus:text-destructive focus:bg-destructive/10"
          >
            🗑  Block löschen…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    {cardLinks && cardLinks.length > 0 && (
      <div className="flex flex-col gap-0.5">
        {cardLinks.map((link, i) => (
          <CardLinkPill key={`${link.fieldKey}-${i}`} link={link} />
        ))}
      </div>
    )}
    </div>
  );
};

/* Sortierbare Wrapper für DnD */
export const SortableSectionWrapper = ({
  id,
  children,
  disabled,
}: {
  id: string;
  children: (handle: React.ReactNode) => React.ReactNode;
  disabled?: boolean;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const handle = (
    <button
      type="button"
      className="cursor-grab touch-none select-none rounded px-1.5 py-1 text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30 disabled:cursor-not-allowed"
      disabled={disabled}
      {...attributes}
      {...listeners}
      title={disabled ? "Verschieben aktuell nicht möglich" : "Ziehen zum Neuordnen"}
      aria-label="Verschieben"
    >
      ⋮⋮
    </button>
  );
  return (
    <div ref={setNodeRef} style={style}>
      {children(handle)}
    </div>
  );
};
