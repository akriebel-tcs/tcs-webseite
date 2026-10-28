/**
 * CardLinkInfoBox — read-only Anzeige der Verlinkung eines Inhaltsblocks
 * im Arbeitsbereich des CMS-Light-Admins.
 *
 * Etappe `cms-admin-card-links-workspace-visible-1`.
 *
 * Bewusst keine Edit-Funktion: keine Bearbeitung, kein Page-Picker, kein
 * Speichern. Quelle ist `cms_section_fields.value` für die Felder `href`,
 * `cta_link`, `cta_href` (und optional `items.N.href`). Die Auflösung
 * gegen `cms_pages.route_path` liefert dieselbe `SectionCardLink`-Struktur
 * wie im Navigations-Baum (siehe `resolveCardLink`). Damit zeigen Baum
 * und Arbeitsbereich exakt die gleiche Aussage.
 */
import type { SectionCardLink } from "@/features/admin/components/tree/SectionRowView";

export interface CardLinkInfoBoxItem {
  /** Welches DB-Feld liefert den Link (für Anzeige & Tooltip). */
  fieldKey: string;
  /** Aufgelöster Link-Zustand (intern/extern/fehlend). */
  link: SectionCardLink;
}

interface Props {
  items: CardLinkInfoBoxItem[];
}

const ICON: Record<SectionCardLink["kind"], string> = {
  "internal-found": "→",
  "internal-missing": "⚠",
  external: "↗",
};

const KIND_LABEL: Record<SectionCardLink["kind"], string> = {
  "internal-found": "Interner Link",
  "internal-missing": "Zielseite nicht gefunden",
  external: "Externer Link",
};

const KIND_PILL_CLASS: Record<SectionCardLink["kind"], string> = {
  "internal-found": "border-primary/30 bg-primary/10 text-primary",
  "internal-missing": "border-destructive/40 bg-destructive/10 text-destructive",
  external: "border-muted-foreground/30 bg-muted text-muted-foreground",
};

const CardLinkInfoBox = ({ items }: Props) => {
  if (items.length === 0) return null;
  return (
    <div className="mb-3 rounded-md border border-primary/20 bg-primary/[0.04] px-3 py-2">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-primary">
        <span aria-hidden>🔗</span>
        <span>Verlinkung</span>
        <span className="font-normal text-muted-foreground">
          — Read-only. Linkziele werden in einer späteren Etappe editierbar.
        </span>
      </div>
      <ul className="space-y-2">
        {items.map(({ fieldKey, link }, i) => {
          const isFound = link.kind === "internal-found";
          const isMissing = link.kind === "internal-missing";
          const pillCls =
            "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] " +
            KIND_PILL_CLASS[link.kind];
          return (
            <li key={`${fieldKey}-${i}`} className="text-xs">
              <div className="flex flex-wrap items-baseline gap-2">
                <code
                  className="font-mono text-[11px] text-foreground"
                  title={`DB-Feld in cms_section_fields: ${fieldKey}`}
                >
                  {fieldKey}
                </code>
                <span className="break-all text-muted-foreground">{link.routePath || "—"}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className={pillCls} title={KIND_LABEL[link.kind]}>
                  <span aria-hidden>{ICON[link.kind]}</span>
                  {isFound && link.pageNo != null && (
                    <span className="font-mono">{`P${String(link.pageNo).padStart(3, "0")}`}</span>
                  )}
                  {isMissing && <span className="font-mono">404</span>}
                  {link.kind === "external" && <span className="font-mono">extern</span>}
                  <span className="max-w-[28ch] truncate">{link.label}</span>
                </span>
                {isFound && (
                  <span className="text-[10px] text-muted-foreground">
                    {link.status === "published"
                      ? "veröffentlicht"
                      : link.status === "draft"
                        ? "Entwurf"
                        : link.status === "archived"
                          ? "archiviert"
                          : link.status}
                    {link.isActive === false ? " · inaktiv" : ""}
                  </span>
                )}
                {isMissing && (
                  <span className="text-[10px] text-destructive">
                    Pfad existiert nicht in <code className="font-mono">cms_pages.route_path</code>.
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default CardLinkInfoBox;
