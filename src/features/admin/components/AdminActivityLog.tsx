/**
 * AdminActivityLog — UI-Panel, das den letzten Verlauf an Änderungen
 * (Verschieben, Kopieren, Aus-/Einblenden, Löschen) anzeigt.
 *
 * Quelle: `src/features/admin/lib/activityLog.ts` (Module-Singleton).
 *
 * Anzeige pro Eintrag:
 *   • Status-Badge (Entwurf/Gespeichert/Fehler — „draft" tritt selten auf,
 *     da unsere RPCs synchron speichern; bleibt aber als Modell-Hülse).
 *   • Zeit (HH:MM:SS), Aktionstyp, betroffene Seite + Block/Knoten.
 *   • Bei Fehler die Fehlermeldung darunter.
 */
import { useEffect, useState } from "react";
import {
  type ActivityEntry,
  activityKindLabel,
  clearActivityLog,
  getActivityLog,
  subscribeActivityLog,
} from "@/features/admin/lib/activityLog";

function useActivityLog(): ReadonlyArray<ActivityEntry> {
  const [snap, setSnap] = useState<ReadonlyArray<ActivityEntry>>(() => getActivityLog());
  useEffect(() => subscribeActivityLog(() => setSnap(getActivityLog())), []);
  return snap;
}

const STATUS_STYLE: Record<ActivityEntry["status"], string> = {
  draft: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40",
  saved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40",
  error: "bg-destructive/15 text-destructive border-destructive/40",
};

const STATUS_LABEL: Record<ActivityEntry["status"], string> = {
  draft: "Entwurf",
  saved: "Gespeichert",
  error: "Fehler",
};

function fmtTime(d: Date): string {
  return d.toLocaleTimeString("de-DE", { hour12: false });
}

export const AdminActivityLog = () => {
  const entries = useActivityLog();

  return (
    <section className="rounded border bg-card/30 p-3" aria-label="Änderungs-Verlauf">
      <header className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">
          Änderungs-Verlauf{" "}
          <span className="text-muted-foreground font-normal">
            ({entries.length}/50)
          </span>
        </h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span title="Aktionen aus dieser Sitzung. Wird beim Seiten-Reload geleert.">
            seit Sitzungsstart
          </span>
          {entries.length > 0 && (
            <button
              type="button"
              onClick={() => clearActivityLog()}
              className="rounded border px-2 py-0.5 text-[11px] hover:bg-muted"
              title="Verlauf in der Anzeige zurücksetzen (löscht keine Daten in der Datenbank)"
            >
              leeren
            </button>
          )}
        </div>
      </header>

      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          Noch keine Änderungen in dieser Sitzung. Sobald du Blöcke verschiebst,
          ein-/ausblendest, duplizierst oder löschst, erscheinen sie hier.
        </p>
      ) : (
        <ol className="flex max-h-72 flex-col gap-1 overflow-y-auto pr-1">
          {entries.map((e) => (
            <li
              key={e.id}
              className="rounded border border-border bg-background/60 p-2 text-xs"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium ${STATUS_STYLE[e.status]}`}
                >
                  {STATUS_LABEL[e.status]}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {fmtTime(e.at)}
                </span>
                <span className="font-medium">{activityKindLabel(e.kind)}</span>
              </div>
              <div className="mt-1 text-foreground">{e.summary}</div>
              {(e.pageKey || e.sectionKey || e.nodeKey) && (
                <div className="mt-1 flex flex-wrap gap-1 font-mono text-[10px] text-muted-foreground">
                  {e.pageKey && (
                    <span
                      className="rounded bg-muted px-1.5 py-0.5"
                      title="Betroffene Seite (page_key)"
                    >
                      Seite: {e.pageKey}
                    </span>
                  )}
                  {e.sectionKey && (
                    <span
                      className="rounded bg-muted px-1.5 py-0.5"
                      title="Betroffener Inhaltsblock (section_key)"
                    >
                      Block: {e.sectionKey}
                    </span>
                  )}
                  {e.relatedSectionKey && (
                    <span
                      className="rounded bg-muted px-1.5 py-0.5"
                      title="Quelle/Partner-Block"
                    >
                      Quelle: {e.relatedSectionKey}
                    </span>
                  )}
                  {e.nodeKey && (
                    <span
                      className="rounded bg-muted px-1.5 py-0.5"
                      title="Betroffener Navigations-Knoten (node_key)"
                    >
                      Knoten: {e.nodeKey}
                    </span>
                  )}
                </div>
              )}
              {e.error && (
                <div className="mt-1 text-[11px] text-destructive">
                  Fehlerdetails: {e.error}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};

export default AdminActivityLog;
