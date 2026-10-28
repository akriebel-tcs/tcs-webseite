/**
 * <Term term="eyebrow">Eyebrow</Term>
 *
 * Zeigt einen Fachbegriff im UI an. Beim ERSTEN Auftritt innerhalb
 * eines <GlossaryScope> wird automatisch eine kurze Klammer-Erklärung
 * eingeblendet (z. B. „Eyebrow (kleine Zeile über der Überschrift)").
 *
 * Daneben erscheint immer ein kleines Fragezeichen-Symbol (?). Erst
 * ein KLICK auf dieses Symbol öffnet die ausführliche Erklärung als
 * Popover. Es gibt bewusst KEIN automatisches Hover-Tooltip mehr —
 * Erklärungen sind eine bewusste Entscheidung des Nutzers.
 *
 * Pflege der Begriffe: src/features/admin/lib/glossary.ts
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getGlossary } from "@/features/admin/lib/glossary";

interface ScopeState {
  seen: Set<string>;
}

const GlossaryScopeContext = createContext<ScopeState | null>(null);

/**
 * Scope für Erstauftritts-Hinweise „(…)". Innerhalb eines Scopes wird
 * jede Klammer-Erklärung pro Begriff nur EINMAL gezeigt. Per `resetKey`
 * (z. B. der aktive Admin-Tab) wird der Scope neu aufgebaut, sodass die
 * Hinweise auf jeder neuen Seite wieder erscheinen.
 *
 * Das eigentliche Klick-Popover am Fragezeichen funktioniert IMMER und
 * unabhängig vom Scope — auch wenn kein Scope vorhanden ist.
 */
export const GlossaryScope = ({
  children,
  resetKey,
}: {
  children: ReactNode;
  resetKey?: string | number;
}) => {
  const value = useMemo<ScopeState>(() => ({ seen: new Set() }), [resetKey]);
  return (
    <GlossaryScopeContext.Provider value={value}>{children}</GlossaryScopeContext.Provider>
  );
};


interface TermProps {
  /** Schlüssel im Glossar (z. B. "eyebrow", "nav_area"). */
  term: string;
  /** Optional: abweichender Anzeigetext (Standard: term aus Glossar). */
  children?: ReactNode;
  /** Erklärung trotz vorigem Auftritt erneut zeigen. */
  forceExplain?: boolean;
}

export const Term = ({ term, children, forceExplain }: TermProps) => {
  const entry = getGlossary(term);
  const scope = useContext(GlossaryScopeContext);
  const key = term.toLowerCase();

  // Erstauftritt im Scope erkennen — nur einmal pro Render-Baum.
  let firstHit = forceExplain ?? false;
  if (scope && !scope.seen.has(key)) {
    scope.seen.add(key);
    firstHit = true;
  }

  if (!entry) {
    return <span>{children ?? term}</span>;
  }

  const label = children ?? entry.term;

  return (
    <span className="inline-flex items-baseline gap-1">
      <span>{label}</span>
      {firstHit && (
        <span className="text-xs font-normal text-muted-foreground">
          ({entry.short})
        </span>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            // Klicks niemals an umliegende Buttons / Tab-Header / Tabellen-
            // Zeilen weiterreichen — sonst würde z. B. ein Tab-Wechsel
            // ausgelöst, bevor das Popover öffnen kann.
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground/70 hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
            aria-label={`Erklärung zu ${entry.term} anzeigen`}
            title="Erklärung anzeigen"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-72 text-sm z-[60]"
          side="top"
          align="start"
          collisionPadding={8}
          onClick={(e) => e.stopPropagation()}
        >
          <strong className="block mb-1">{entry.term}</strong>
          <span className="text-muted-foreground">{entry.long ?? entry.short}</span>
        </PopoverContent>
      </Popover>
    </span>
  );
};
