import { useCallback } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Kurz-ID-Badge für das Admin-UI.
 *
 * Zeigt eine kurze, redaktionstaugliche Adresse für ein CMS-Objekt:
 *   - N-… Navigationsknoten (`cms_navigation_nodes.node_no`)
 *   - P-… Seite             (`cms_pages.page_no`)
 *   - B-… Block / Sektion   (`cms_sections.section_uid`)
 *   - A-… Asset / Bild      (`cms_assets.asset_no`)
 *
 * Klick auf das Badge kopiert die formatierte ID (z. B. „B-014") in die
 * Zwischenablage. Reine Anzeige- und Kopierfunktion, keine Schreiboperation.
 */

export type ShortIdKind = "N" | "P" | "B" | "A";

const KIND_LABEL: Record<ShortIdKind, string> = {
  N: "Navigations-Kurz-ID (Knoten)",
  P: "Seiten-Kurz-ID",
  B: "Block-Kurz-ID (Block auf einer Seite)",
  A: "Asset-Kurz-ID (Bild/Datei)",
};

const KIND_TONE: Record<ShortIdKind, string> = {
  N: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  P: "bg-primary/10 text-primary border-primary/20",
  B: "bg-amber-500/10 text-amber-800 border-amber-500/20",
  A: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
};

function format(kind: ShortIdKind, n: number | null | undefined): string | null {
  if (n == null || Number.isNaN(n)) return null;
  return `${kind}-${String(n).padStart(3, "0")}`;
}

interface Props {
  kind: ShortIdKind;
  value: number | null | undefined;
  /** Optionaler Zusatztext im Tooltip (z. B. „node_key: main/produkte"). */
  hint?: string;
  className?: string;
}

const ShortIdBadge = ({ kind, value, hint, className }: Props) => {
  const formatted = format(kind, value);

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (!formatted) return;
      try {
        await navigator.clipboard.writeText(formatted);
        toast.success(`Kurz-ID „${formatted}" als Text kopiert (nicht der Block selbst — dafür das 📋-Symbol in der Block-Zeile nutzen).`);
      } catch {
        toast.error("Konnte nicht kopieren.");
      }
    },
    [formatted],
  );

  if (!formatted) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded border border-dashed border-border bg-muted/30 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground",
          className,
        )}
        title={`${KIND_LABEL[kind]} – noch nicht vergeben`}
      >
        {kind}-—
      </span>
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          void handleClick(e as unknown as React.MouseEvent);
        }
      }}
      title={`${KIND_LABEL[kind]} · Klick zum Kopieren${hint ? ` · ${hint}` : ""}`}
      className={cn(
        "inline-flex shrink-0 cursor-pointer select-none items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        KIND_TONE[kind],
        className,
      )}
    >
      {formatted}
    </span>
  );
};

export default ShortIdBadge;
