/**
 * SectionContractStatus — kompaktes Statuspanel je Section im Admin.
 *
 * Sprint-0: zeigt nur Diagnose-Badges (Vertrag/Renderer/Felder/Struktur).
 * Schreibt nichts, blockiert nichts — Redaktion kann weiter editieren.
 */
import { useMemo } from "react";
import {
  evaluateSectionStatus,
  type SectionStatusBadge,
  type SectionStatusInput,
  type SectionStatusLevel,
} from "@/features/admin/lib/sectionContractStatus";

const COLORS: Record<SectionStatusLevel, string> = {
  ok: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  info: "bg-sky-500/10 text-sky-700 border-sky-500/30",
  warn: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  error: "bg-destructive/10 text-destructive border-destructive/30",
};

interface Props extends SectionStatusInput {
  /** Optional: kompakter Modus (nur Badges, keine Hinweisliste). */
  compact?: boolean;
}

const SectionContractStatus: React.FC<Props> = ({ compact, ...input }) => {
  const result = useMemo(() => evaluateSectionStatus(input), [input]);
  const badges: SectionStatusBadge[] = result.badges;
  if (badges.length === 0) return null;

  return (
    <div className="mt-2 rounded-md border border-dashed border-muted-foreground/30 bg-muted/5 p-2">
      <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Vertrag &amp; Renderer (Sprint-0, nur Diagnose)</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {badges.map((b, i) => (
          <span
            key={i}
            className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${COLORS[b.level]}`}
            title={b.hint}
          >
            {b.label}
          </span>
        ))}
      </div>
      {!compact && badges.some((b) => b.level === "warn" || b.level === "error") && (
        <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[11px] text-muted-foreground">
          {badges
            .filter((b) => b.level === "warn" || b.level === "error")
            .map((b, i) => (
              <li key={i}>
                <span className="font-medium text-foreground/80">{b.label}:</span> {b.hint}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
};

export default SectionContractStatus;
