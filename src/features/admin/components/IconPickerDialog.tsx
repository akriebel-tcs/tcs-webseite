/**
 * IconPickerDialog — visueller Picker für Lucide-Icons.
 *
 * Eingesetzt im EditableField, wenn ein Feld einen Icon-Namen aufnimmt
 * (`field_key === "icon"` oder endet auf `.icon`). Speichert in der DB den
 * Kebab-Case-Namen (z. B. `shield-check`) — exakt das Format, das der
 * `iconResolver` (src/features/cms/components/iconResolver.tsx) erwartet.
 *
 * Tranche 23:
 * - Kein hartes 240er-Limit mehr. Alle Icons sind erreichbar.
 * - Chunked Rendering (Default 240, „Mehr anzeigen" lädt 240 mehr).
 *   Bei Suche werden alle Treffer gezeigt, bis 240 — und kann erweitert werden.
 * - Deutsche Synonyme: Tür → door, Schloss → lock, Schlüssel → key …
 *   Sowohl deutscher Begriff als auch englischer Lucide-Name treffen.
 */
import { useEffect, useMemo, useState } from "react";
import { icons, type LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/** PascalCase → kebab-case ("ShieldCheck" → "shield-check"). */
function pascalToKebab(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

/**
 * Deutsche Suchhilfen → englische Lucide-Begriffe.
 * Wird auf den Suchquery angewendet: ein DE-Treffer ergibt einen
 * EN-Synonym-Match, sodass Redakteure „Tür", „Schlüssel", „Warnung"
 * tippen können, ohne den englischen Lucide-Namen zu kennen.
 */
const DE_SYNONYMS: Array<[RegExp, string[]]> = [
  [/^tür|tueren?$|^tueren?$|^tuer$/i, ["door"]],
  [/^schloss$|^schlösser$|^schloesser$/i, ["lock"]],
  [/^schlüssel$|^schluessel$/i, ["key"]],
  [/^gebäude$|^gebaeude$|^haus$/i, ["building", "home"]],
  [/^nutzer$|^benutzer$|^user$/i, ["user"]],
  [/^telefon$|^anruf$/i, ["phone"]],
  [/^mail$|^brief$|^nachricht$/i, ["mail", "message"]],
  [/^kalender$|^termin$/i, ["calendar"]],
  [/^download$|^herunterladen$/i, ["download"]],
  [/^upload$|^hochladen$/i, ["upload"]],
  [/^warnung$|^achtung$|^alarm$/i, ["alert", "triangle"]],
  [/^karte$|^standort$|^ort$/i, ["map"]],
  [/^barrierefrei|^rollstuhl/i, ["accessibility"]],
  [/^pfeil$/i, ["arrow"]],
  [/^haken$|^check$|^erledigt$/i, ["check"]],
  [/^kreuz$|^schließen$|^schliessen$/i, ["x"]],
  [/^auge$|^anschauen$|^vorschau$/i, ["eye"]],
  [/^kamera$|^foto$/i, ["camera"]],
  [/^einstellung|^zahnrad/i, ["settings", "cog"]],
  [/^suche$|^lupe$/i, ["search"]],
  [/^plus$|^hinzufügen$|^hinzufuegen$/i, ["plus"]],
  [/^minus$|^entfernen$/i, ["minus"]],
  [/^stern$|^favorit$/i, ["star"]],
  [/^herz$|^like$/i, ["heart"]],
  [/^info$|^information$/i, ["info"]],
  [/^frage|^fragezeichen/i, ["help", "question"]],
  [/^müll$|^muell$|^löschen$|^loeschen$/i, ["trash", "x"]],
  [/^bearbeiten$|^stift$/i, ["edit", "pen", "pencil"]],
  [/^speichern$|^diskette$/i, ["save"]],
  [/^chat$|^sprechblase$/i, ["message", "chat"]],
  [/^uhr$|^zeit$/i, ["clock"]],
  [/^paket$|^lieferung$/i, ["package", "truck"]],
  [/^auto$|^fahrzeug$/i, ["car", "truck"]],
  [/^fahrstuhl|^aufzug/i, ["arrow-up-down", "elevator"]],
  [/^kontakt$/i, ["user", "phone", "mail"]],
  [/^schild$|^sicherheit$/i, ["shield"]],
];

/** Erweitert eine Suchanfrage um englische Synonyme. */
function expandQuery(raw: string): string[] {
  const q = raw.trim().toLowerCase();
  if (!q) return [];
  const out = new Set<string>([q]);
  for (const [pattern, words] of DE_SYNONYMS) {
    if (pattern.test(q)) words.forEach((w) => out.add(w));
  }
  return Array.from(out);
}

/** Einmalig: alle Lucide-Icons als sortierte Liste mit Kebab-Namen. */
const ALL_ICONS: Array<{ kebab: string; pascal: string; Comp: LucideIcon }> = Object.entries(
  icons as Record<string, LucideIcon>,
)
  .map(([pascal, Comp]) => ({ pascal, kebab: pascalToKebab(pascal), Comp }))
  .sort((a, b) => a.kebab.localeCompare(b.kebab));

const CHUNK = 240;

export interface IconPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentValue?: string | null;
  onSelect: (kebabName: string) => void;
}

export const IconPickerDialog = ({
  open,
  onOpenChange,
  currentValue,
  onSelect,
}: IconPickerDialogProps) => {
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(CHUNK);

  // Beim erneuten Öffnen / neuer Suche von vorne starten.
  useEffect(() => {
    setVisible(CHUNK);
  }, [query, open]);

  const allHits = useMemo(() => {
    const terms = expandQuery(query);
    if (terms.length === 0) return ALL_ICONS;
    return ALL_ICONS.filter((it) => {
      const k = it.kebab;
      const p = it.pascal.toLowerCase();
      return terms.some((t) => k.includes(t) || p.includes(t));
    });
  }, [query]);

  const shown = allHits.slice(0, visible);
  const hasMore = allHits.length > shown.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Icon auswählen</DialogTitle>
          <DialogDescription>
            Bibliothek: <code className="font-mono text-xs">lucide-react</code> · gespeichert
            wird der Name in Kebab-Schreibweise (z. B. <code className="font-mono">shield-check</code>).
            Suche auf Deutsch oder Englisch möglich (z. B. „Tür", „Schlüssel", „Warnung", „door", „key", „alert").
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            autoFocus
            placeholder="Suchen (z. B. Tür, Schloss, shield, mail)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="text-[11px] text-muted-foreground">
            {shown.length} von {allHits.length} Treffern
            {allHits.length !== ALL_ICONS.length && ` (gesamt: ${ALL_ICONS.length})`}
          </div>
          <div className="grid max-h-[60vh] grid-cols-6 gap-2 overflow-y-auto rounded border bg-muted/20 p-2 sm:grid-cols-8 md:grid-cols-10">
            {shown.map(({ kebab, Comp }) => {
              const isCurrent = currentValue === kebab;
              return (
                <button
                  key={kebab}
                  type="button"
                  onClick={() => {
                    onSelect(kebab);
                    onOpenChange(false);
                  }}
                  className={
                    "flex aspect-square flex-col items-center justify-center gap-1 rounded border p-1 text-[9px] leading-tight transition hover:bg-background hover:shadow-sm " +
                    (isCurrent
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-transparent text-muted-foreground")
                  }
                  title={kebab}
                >
                  <Comp className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                  <span className="w-full truncate font-mono">{kebab}</span>
                </button>
              );
            })}
            {shown.length === 0 && (
              <div className="col-span-full p-6 text-center text-xs text-muted-foreground">
                Keine Icons gefunden. Suchbegriff anpassen.
              </div>
            )}
          </div>
          {hasMore && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setVisible((n) => n + CHUNK)}
                className="rounded border bg-background px-3 py-1 text-xs font-medium hover:bg-muted"
              >
                Mehr anzeigen ({allHits.length - shown.length} weitere)
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IconPickerDialog;
