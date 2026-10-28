/**
 * DetailPanel — vereinheitlichte Bearbeitungs-Ansicht für eine
 * Seite oder einen Seitenabschnitt.
 *
 * Trennt bewusst zwei Bereiche:
 *
 *  1) „Sichtbare Texte" (oben, grüner Rahmen):
 *     Genau das, was Besucher der Webseite tatsächlich sehen —
 *     Headline, Intro, Bilder, Button-Texte. Hier wird editiert.
 *
 *  2) „Technische Details" (unten, eingeklappt):
 *     Alles Strukturelle (page_key, section_key, section_type,
 *     is_active, …) — nur sichtbar, wenn man es bewusst aufklappt.
 *
 * Ziel: Mitarbeiter sehen sofort „Das ist, was der Nutzer sieht",
 * der technische Hintergrund verschwindet aus dem Blickfeld, ohne
 * verloren zu gehen.
 */
import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Eye, Settings2 } from "lucide-react";
import { Term } from "@/features/admin/components/Term";

interface DetailPanelProps {
  title: string;
  /** Optionaler Glossar-Schlüssel, der den Titel erklärt. */
  titleTerm?: string;
  /** Kurzer Untertitel/Hinweis (z. B. „Pilotsektion, DE/EN editierbar"). */
  subtitle?: ReactNode;
  /** Felder mit sichtbaren Texten (werden im grünen Bereich gerendert). */
  visible: ReactNode;
  /** Optionale technische Metadaten (werden in den Aufklapp-Bereich gelegt). */
  technical?: ReactNode;
  /** „Sektion nicht vorhanden"-Hinweis o. ä. */
  status?: ReactNode;
  /** Zustand des Panels (true = nichts gefunden). */
  notFound?: boolean;
  /** Initial geöffnet? Standard: geschlossen. */
  technicalOpenInitial?: boolean;
}

const DetailPanel = ({
  title,
  titleTerm,
  subtitle,
  visible,
  technical,
  status,
  notFound,
  technicalOpenInitial = false,
}: DetailPanelProps) => {
  const [open, setOpen] = useState(technicalOpenInitial);

  return (
    <section className="rounded-lg border bg-card">
      {/* Kopf: Titel + Untertitel */}
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b px-4 py-3">
        <div className="flex flex-col">
          <h4 className="text-sm font-semibold">
            {titleTerm ? <Term term={titleTerm}>{title}</Term> : title}
          </h4>
          {subtitle ? (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {notFound ? (
          <span className="text-xs text-destructive">Sektion nicht vorhanden</span>
        ) : null}
      </header>

      {/* Sichtbare Texte — hervorgehoben */}
      <div className="px-4 py-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          <Eye className="h-3.5 w-3.5" aria-hidden />
          <span>Sichtbare Texte</span>
          <span className="text-muted-foreground font-normal">
            — das sieht der Nutzer auf der Webseite
          </span>
        </div>
        <div className="rounded-md border-2 border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/10">
          {visible}
        </div>
      </div>

      {/* Technische Details — eingeklappt */}
      {(technical || status) && (
        <div className="border-t bg-muted/20">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex w-full items-center gap-2 px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            aria-expanded={open}
          >
            {open ? (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            )}
            <Settings2 className="h-3.5 w-3.5" aria-hidden />
            <span>Technische Details</span>
            <span className="font-normal">
              — interne Schlüssel, nicht für Besucher sichtbar
            </span>
          </button>
          {open && (
            <div className="space-y-3 px-4 pb-4 pt-1">
              {status}
              {technical}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default DetailPanel;
