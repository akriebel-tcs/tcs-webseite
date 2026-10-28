/**
 * Geschützter Gesamt-Export (Datenpaket v3) im Snapshot-Tab.
 *
 * Ohne Freigabe wird nichts gelesen: keine Zeilen, keine Vollzahlen, keine
 * Struktur. Die Freigabe läuft über das bestehende Adminpasswort
 * (`unlockAdmin`); der Freigabewert bleibt nur im Arbeitsspeicher — nie in der
 * Adresszeile, nie im Browser-Speicher, nie in Protokollen. Beim Öffnen des
 * Tabs wird nichts automatisch geladen und kein Bild abgerufen.
 *
 * Ein Abbruch (Knopf, Sperren oder Verlassen des Bildschirms) ist endgültig:
 * es gibt dann kein Paket und keinen Download.
 */

import { useEffect, useRef, useState } from "react";
import { unlockAdmin, lockAdmin, readAdminToken } from "@/features/admin/api/adminAuth";
import {
  buildFullExportZip,
  buildMediaOnlyZip,
  fetchCounts,
  ExportAbortError,
  ExportAuthError,
  type CountsResult,
  type ExportProgress,
  type FullExportResult,
} from "@/features/admin/api/cmsFullExport";
import { triggerDownload } from "@/features/admin/api/cmsSnapshotExport";


const STATUS_TEXT: Record<FullExportResult["status"], string> = {
  complete: "Paket vollständig erstellt: ",
  changed: "Paket erstellt — mit Hinweisen (Details in manifest.json → status_reasons): ",
  incomplete: "Paket erstellt, aber UNVOLLSTÄNDIG (Details in manifest.json): ",
};

const FullExportPanel = () => {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(() => Boolean(readAdminToken()));
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<CountsResult | null>(null);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [result, setResult] = useState<FullExportResult | null>(null);
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const stopExport = () => {
    abortRef.current?.abort();
    abortRef.current = null;
  };

  // Verlassen des Bildschirms bricht einen laufenden Export ab.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  const handleUnlock = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const session = await unlockAdmin(password);
      setPassword("");
      setUnlocked(true);
      setExpiresAt(session.expiresAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Entsperren nicht möglich.");
    } finally {
      setBusy(false);
    }
  };

  const handleLock = async () => {
    stopExport();
    await lockAdmin();
    setUnlocked(false);
    setCounts(null);
    setResult(null);
    setExpiresAt(null);
  };

  const handleAuthError = (e: unknown) => {
    if (e instanceof ExportAuthError) {
      stopExport();
      setUnlocked(false);
      setCounts(null);
      setError(`${e.message} Der Export wurde abgebrochen — es entsteht kein halbfertiges Paket.`);
      return true;
    }
    if (e instanceof ExportAbortError) {
      setError("Export abgebrochen. Es wurde kein Paket erstellt und nichts heruntergeladen.");
      return true;
    }
    return false;
  };

  const loadCounts = async () => {
    setBusy(true);
    setError(null);
    try {
      setCounts(await fetchCounts());
    } catch (e) {
      if (!handleAuthError(e)) setError(e instanceof Error ? e.message : "unbekannt");
    } finally {
      setBusy(false);
    }
  };

  const runPackage = async (build: typeof buildFullExportZip) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const out = await build({
        signal: controller.signal,
        onProgress: (p) => setProgress(p),
      });
      if (controller.signal.aborted) throw new ExportAbortError();
      triggerDownload(out.blob, out.fileName);
      setResult(out);
    } catch (e) {
      if (!handleAuthError(e)) setError(e instanceof Error ? e.message : "unbekannt");
    } finally {
      setBusy(false);
      setRunning(false);
      if (abortRef.current === controller) abortRef.current = null;
      setProgress(null);
    }
  };

  const startExport = () => runPackage(buildFullExportZip);
  const startMediaOnly = () => runPackage(buildMediaOnlyZip);


  if (!unlocked) {
    return (
      <div className="rounded-md border bg-card p-4">
        <h2 className="text-base font-semibold">Gesamt-Export (geschützt)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Der umfassende Export enthält auch nicht veröffentlichte und inaktive Inhalte. Er ist
          deshalb mit dem bestehenden Adminpasswort geschützt. Die übrige Redaktionsarbeit unter
          /admin bleibt unverändert ohne Anmeldung möglich. Es gibt hier kein Benutzerkonto und kein
          E-Mail-Feld.
        </p>
        <form onSubmit={handleUnlock} className="mt-3 flex flex-wrap items-end gap-2">
          <label className="text-sm">
            <span className="block text-xs text-muted-foreground">Adminpasswort</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 rounded-md border px-2 py-1.5 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={busy || !password.trim()}
            className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-50"
          >
            {busy ? "Prüfen …" : "Gesamt-Export entsperren"}
          </button>
        </form>
        {error && (
          <p className="mt-2 text-sm text-destructive">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Gesamt-Export (entsperrt)</h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {expiresAt && <span>Freigabe bis {new Date(expiresAt).toLocaleTimeString("de-DE")}</span>}
          <button type="button" onClick={handleLock} className="rounded-md border px-2 py-1 hover:bg-muted">
            Sperren
          </button>
        </div>
      </div>

      <p className="mt-1 text-sm text-muted-foreground">
        Umfassender logischer Export aller CMS-Inhalte, Sprachen, Navigation, Medienzuordnungen,
        Whitelists und Konfigurationen — inklusive nicht veröffentlichter Zeilen. Kein
        Datenbank-Vollabzug, kein einheitlicher Zeitpunkt, keine geprüfte Wiederherstellung.
        Bilddateien sind nicht im Paket: dafür liegt ein wiederaufnehmbares Hilfspaket mit
        Windows-Skript bei.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={loadCounts}
          disabled={busy}
          className="rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
        >
          Umfang prüfen (Zählerstände)
        </button>
        <button
          type="button"
          onClick={startExport}
          disabled={busy}
          className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {running ? "Export läuft …" : "Datenpaket herunterladen (.zip)"}
        </button>
        <button
          type="button"
          onClick={startMediaOnly}
          disabled={busy}
          className="rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
        >
          Nur Medienpaket herunterladen (.zip)
        </button>
        {running && (
          <button
            type="button"
            onClick={stopExport}
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            Abbrechen
          </button>
        )}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Das Medienpaket ist die Ergänzung, wenn beim Datenpaket nur das Bildinventar gefehlt hat: es
        liest ausschließlich das Bildverzeichnis und die Bildzuordnungen — nicht alle Tabellen. Ein
        bereits geladenes Datenpaket bleibt unverändert gültig.
      </p>


      {progress && (
        <p className="mt-2 text-xs text-muted-foreground">
          {progress.phase}
          {progress.detail ? `: ${progress.detail}` : ""} ({progress.done}/{progress.total})
        </p>
      )}

      {error && (
        <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {result && (
        <div
          className={`mt-3 rounded-md border px-3 py-2 text-sm ${
            result.status === "complete"
              ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-900"
              : "border-amber-500/50 bg-amber-500/10 text-amber-900"
          }`}
        >
          {STATUS_TEXT[result.status]}
          <span className="font-mono">{result.fileName}</span>
        </div>
      )}

      {counts && (
        <div className="mt-3 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-1 pr-3 font-medium">Tabelle</th>
                <th className="py-1 pr-3 font-medium">Art</th>
                <th className="py-1 pr-3 font-medium">Zeilen</th>
                <th className="py-1 font-medium">Letzte Änderung</th>
              </tr>
            </thead>
            <tbody>
              {counts.tables.map((t) => (
                <tr key={t.table} className="border-b last:border-0">
                  <td className="py-1 pr-3 font-mono text-xs">{t.table}</td>
                  <td className="py-1 pr-3 text-xs">{t.classification}</td>
                  <td className="py-1 pr-3 tabular-nums">
                    {t.error ? <span className="text-destructive">Fehler</span> : (t.row_count ?? 0).toLocaleString("de-DE")}
                  </td>
                  <td className="py-1 text-xs text-muted-foreground">{t.marker_value ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted-foreground">
            Nicht exportiert: {counts.excluded.map((e) => e.name).join(", ")}.
          </p>
        </div>
      )}
    </div>
  );
};

export default FullExportPanel;
