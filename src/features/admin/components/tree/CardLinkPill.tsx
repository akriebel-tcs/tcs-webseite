/**
 * CardLinkPill — kleine, einheitliche Anzeige für aufgelöste Linkziele
 * im CMS-Light Admin-Baum.
 *
 * Etappe `cms-admin-link-pills-all-nav-areas-1`: aus dem zuvor inline
 * in `SectionRowView` enthaltenen IIFE extrahiert, damit sowohl Section-
 * Zeilen (Karten / Inhaltsblöcke) als auch Navigations-Knoten (MainNav,
 * Footer, Persona, …) dieselbe Pille rendern. Eine Quelle der Wahrheit,
 * eine Darstellung, ein Klickverhalten.
 *
 * Reine Anzeige — kein Edit, kein Schreibweg.
 */
import type { SectionCardLink } from "./SectionRowView";

export interface CardLinkPillProps {
  link: SectionCardLink;
  /**
   * Zusätzliche Tailwind-Klassen für Einrückung / Abstand.
   * Standard ist auf Section-Zeilen abgestimmt (`ml-7`), Navigations-
   * Knoten können hier z. B. `ml-9` setzen.
   */
  className?: string;
}

const CardLinkPill = ({ link, className }: CardLinkPillProps) => {
  const isFound = link.kind === "internal-found";
  const isMissing = link.kind === "internal-missing";
  const isExternal = link.kind === "external";
  const baseCls =
    "inline-flex max-w-full items-center gap-1 self-start rounded border px-2 py-0.5 text-[10px] focus-visible:ring-2 focus-visible:ring-ring";
  const colorCls = isMissing
    ? "border-destructive/40 bg-destructive/10 text-destructive"
    : isExternal
      ? "border-muted-foreground/30 bg-muted/40 text-muted-foreground"
      : "border-primary/30 bg-primary/5 text-primary hover:bg-primary/15";
  const cls = `${baseCls} ${colorCls} ${className ?? "ml-7"}`;
  const statusHint =
    isFound && link.status && link.status !== "published" ? ` · ${link.status}` : "";
  const activeHint = isFound && link.isActive === false ? " · inaktiv" : "";
  const fieldHint = `Feld in DB: ${link.fieldKey}`;
  const title = isFound
    ? `Verlinkt auf ${link.routePath}${statusHint}${activeHint}. Klick öffnet die Zielseite im Arbeitsbereich. (${fieldHint})`
    : isExternal
      ? `Externer Link: ${link.routePath} (${fieldHint})`
      : `Zielseite nicht gefunden: ${link.routePath}. Der Knoten/Block verweist auf eine Seite, die im CMS nicht existiert. (${fieldHint})`;
  const icon = isMissing ? "⚠" : isExternal ? "↗" : "→";
  const showJump = isFound && typeof link.onJump === "function";
  const inner = (
    <>
      <span aria-hidden="true">{icon}</span>
      {isFound && link.pageNo != null && (
        <span className="font-mono">{`P${String(link.pageNo).padStart(3, "0")}`}</span>
      )}
      {isExternal && <span className="font-mono">extern</span>}
      {isMissing && <span className="font-mono">404</span>}
      <span className="truncate">{link.label}</span>
      {(statusHint || activeHint) && (
        <span className="font-mono text-[9px] opacity-70">
          {statusHint}
          {activeHint}
        </span>
      )}
    </>
  );
  return showJump ? (
    <button type="button" onClick={link.onJump} className={cls} title={title}>
      {inner}
    </button>
  ) : (
    <span className={cls} title={title}>
      {inner}
    </span>
  );
};

export default CardLinkPill;
