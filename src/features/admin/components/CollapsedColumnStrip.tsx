/**
 * CollapsedColumnStrip — schmaler 40px-Streifen für eine eingeklappte Spalte.
 *
 * Etappe `cms-light-admin-three-col-toggle-1` (Etappe 3 der UI-Konsolidierung):
 * Wenn der Nutzer eine der drei Spalten (Baum / Arbeitsbereich / Vorschau)
 * einklappt, soll sie nicht spurlos verschwinden, sondern als vertikaler
 * Streifen mit Pfeil und Spaltenname stehen bleiben. Klick darauf klappt sie
 * wieder auf — der Nutzer weiß so jederzeit, dass es noch zwei weitere
 * Spalten gibt und wo sie liegen.
 */
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  label: string;
  /** Zeigt der Pfeil nach links (Spalte links) oder rechts (Spalte rechts/mitte)? */
  arrow: "left" | "right";
  onExpand: () => void;
  title?: string;
}

const CollapsedColumnStrip: React.FC<Props> = ({ label, arrow, onExpand, title }) => {
  const Arrow = arrow === "left" ? ChevronRight : ChevronLeft;
  return (
    <button
      type="button"
      onClick={onExpand}
      title={title ?? `${label} einblenden`}
      className="group flex h-full w-10 shrink-0 flex-col items-center justify-between border-r bg-muted/40 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground last:border-l last:border-r-0"
      aria-label={`${label} einblenden`}
    >
      <Arrow className="h-4 w-4" />
      <span
        className="select-none text-[10px] font-medium uppercase tracking-wider"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        {label}
      </span>
      <Arrow className="h-4 w-4" />
    </button>
  );
};

export default CollapsedColumnStrip;
