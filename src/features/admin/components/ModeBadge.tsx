/**
 * ModeBadge — visuell einheitlicher Hinweis, ob ein Bereich
 * nur gelesen oder auch bearbeitet werden kann.
 *
 * - "readonly"  → grauer Rahmen, ruhig (Daten nur ansehen)
 * - "editable"  → grüner Rahmen mit Punkt (Daten können gespeichert werden)
 * - "prototype" → bernsteinfarbener Hinweis (Prototyp ohne Login)
 *
 * Wird in jedem Tab oben rechts gesetzt, damit Mitarbeiter sofort
 * erkennen: „Hier darf ich klicken/ändern“ oder „Das ist nur Anzeige“.
 */

import { Term } from "@/features/admin/components/Term";

type Mode = "readonly" | "editable" | "prototype";

const STYLES: Record<Mode, string> = {
  readonly:
    "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
  editable:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  prototype:
    "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

interface ModeBadgeProps {
  mode: Mode;
  /** Optionaler Zusatztext, z. B. „nur DE/EN-Labels“. */
  detail?: string;
}

const ModeBadge = ({ mode, detail }: ModeBadgeProps) => {
  const cls =
    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium " +
    STYLES[mode];
  return (
    <span className={cls}>
      <span
        aria-hidden
        className={
          "inline-block h-2 w-2 rounded-full " +
          (mode === "editable"
            ? "bg-emerald-500"
            : mode === "prototype"
            ? "bg-amber-500"
            : "bg-muted-foreground/60")
        }
      />
      {mode === "readonly" && <Term term="readonly" />}
      {mode === "editable" && <Term term="editable" />}
      {mode === "prototype" && <span>Prototyp ohne Login</span>}
      {detail && <span className="opacity-70">· {detail}</span>}
    </span>
  );
};

export default ModeBadge;
