import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  readAutopilotStatus,
  readLocaleCounts,
  setAutopilotEnabled,
  setAutopilotPaused,
  type AutopilotStatus,
  type LocaleCounts,
} from "@/features/admin/api/cmsTranslationAutopilot";

/**
 * Anzeige und Schalter der Übersetzungs-Automatik.
 *
 * - Eine deutsche Speicherung übersetzt nie sofort. Sie merkt nur serverseitig
 *   „fehlt/veraltet" an und kehrt sofort zurück.
 * - Der Server übersetzt danach von selbst nach einer kurzen Ruhezeit; bei
 *   mehreren schnellen Überarbeitungen zählt nur die letzte deutsche Fassung.
 * - „Verarbeitung anhalten" stoppt nur das Übersetzen. Fehlende und veraltete
 *   Texte werden weiterhin erkannt und vorgemerkt.
 * Der Browser beobachtet nur — er übersetzt nichts.
 */
const AutopilotPanel = () => {
  const [status, setStatus] = useState<AutopilotStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [counts, setCounts] = useState<Record<string, LocaleCounts>>({});
  const [countsBusy, setCountsBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setStatus(await readAutopilotStatus());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(t);
  }, [load]);

  const toggle = async () => {
    if (!status) return;
    setBusy(true);
    try {
      const next = await setAutopilotEnabled(!status.is_enabled);
      toast.success(next ? "Automatik ist aktiv." : "Automatik ist ausgeschaltet.");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const togglePause = async () => {
    if (!status) return;
    setBusy(true);
    try {
      const paused = await setAutopilotPaused(!status.is_paused);
      toast.success(
        paused
          ? "Verarbeitung angehalten. Fehlende und veraltete Texte werden weiter vorgemerkt."
          : "Verarbeitung fortgesetzt.",
      );
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const loadCounts = async (locale: string) => {
    setCountsBusy(true);
    try {
      const row = await readLocaleCounts(locale);
      setCounts((prev) => ({ ...prev, [locale]: row }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCountsBusy(false);
    }
  };

  const num = (n: number) => n.toLocaleString("de-DE");
  const when = (v: string | null) =>
    v ? new Date(v).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }) : "—";

  return (
    <section className="rounded-lg border bg-card p-3" aria-label="Übersetzungs-Automatik">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold">
            Automatik für neue deutsche Texte:{" "}
            {status ? (
              <span className={status.is_enabled ? "text-emerald-600" : "text-muted-foreground"}>
                {status.is_enabled ? "aktiv" : "inaktiv"}
              </span>
            ) : (
              <span className="text-muted-foreground">wird geladen …</span>
            )}
            {status?.is_paused ? (
              <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                Verarbeitung angehalten
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Speichern eines deutschen Textes übersetzt nie sofort: der Text wird nur als „fehlt/
            veraltet" vorgemerkt. Der Server übersetzt danach von selbst nach einer Ruhezeit von
            {" "}
            {num(status?.debounce_seconds ?? 90)} Sekunden — mehrere schnelle Überarbeitungen
            hintereinander ergeben also nur eine Übersetzung der letzten Fassung. Der Browser darf
            geschlossen sein. Von Hand gepflegte Zieltexte werden nie überschrieben.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
            onClick={() => void togglePause()}
            disabled={busy || !status}
          >
            {status?.is_paused ? "Verarbeitung fortsetzen" : "Verarbeitung anhalten"}
          </button>
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
            onClick={() => void toggle()}
            disabled={busy || !status}
          >
            {status?.is_enabled ? "Automatik ausschalten" : "Automatik einschalten"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-2 text-[11px] text-destructive">Status nicht lesbar: {error}</p>
      ) : null}

      {status ? (
        <div className="mt-3 space-y-2">
          {status.per_locale.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">
              Derzeit ist keine Zielsprache auf der Website sichtbar — es entstehen keine
              automatischen Aufträge.
            </p>
          ) : (
            status.per_locale.map((row) => {
              const c = counts[row.locale];
              return (
                <div key={row.locale} className="rounded border p-2 text-[11px]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">
                      {row.label_de ?? row.locale} ({row.locale.toUpperCase()})
                    </p>
                    <button
                      type="button"
                      className="rounded border px-2 py-0.5 hover:bg-muted disabled:opacity-50"
                      onClick={() => void loadCounts(row.locale)}
                      disabled={countsBusy}
                    >
                      Bestand prüfen
                    </button>
                  </div>
                  <div className="mt-1 grid gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                    <p>
                      <span className="text-muted-foreground">vorhanden: </span>
                      {c ? num(c.existing) : "auf Klick"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">fehlt: </span>
                      {c ? num(c.missing) : "auf Klick"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">veraltet: </span>
                      {c ? num(c.outdated) : "auf Klick"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">geplant (Ruhezeit läuft): </span>
                      {num(row.planned_waiting)}
                      {row.next_due_at ? ` · ab ${when(row.next_due_at)}` : ""}
                    </p>
                    <p>
                      <span className="text-muted-foreground">jetzt fällig: </span>
                      {num(row.planned_due)}
                      <span className="text-muted-foreground"> · läuft: </span>
                      {num(row.runs_open)}
                    </p>
                    <p>
                      <span className="text-muted-foreground">automatisch übersetzt: </span>
                      {num(row.translated)}
                      <span className="text-muted-foreground"> · Fehler: </span>
                      <span className={row.failed > 0 ? "text-destructive" : undefined}>
                        {num(row.failed)}
                      </span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">von Hand gepflegt, Quelle geändert: </span>
                      {num(row.skipped_manual)}
                    </p>
                    <p>
                      <span className="text-muted-foreground">letzte erfolgreiche Verarbeitung: </span>
                      {when(row.last_success_at)}
                    </p>
                    <p>
                      <span className="text-muted-foreground">letzte Serveraktivität: </span>
                      {when(row.run_activity ?? row.last_success_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <p className="text-[11px] text-muted-foreground">
            Alle fehlenden und veralteten Texte einer Sprache auf einmal übersetzen: dafür weiter
            unten die Schritte 1 bis 4 („Sprache", „Modell", „Prüfen", „Start") verwenden — dort
            gibt es auch Anhalten und Fortsetzen für den laufenden Auftrag.
          </p>
        </div>
      ) : null}
    </section>
  );
};

export default AutopilotPanel;

