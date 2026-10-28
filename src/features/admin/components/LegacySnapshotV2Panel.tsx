/**
 * Alter Export v2 (nur öffentliche Inhalte) — bleibt unverändert erhalten,
 * ist aber nicht mehr der Hauptweg. Diese Komponente wird erst gemountet,
 * wenn der Bereich ausdrücklich geöffnet wird; vorher wird nichts gezählt
 * und nichts geladen.
 */

import { useEffect, useState } from "react";
import {
  buildContentSnapshotZip,
  previewSnapshotCounts,
  triggerDownload,
  FILTER_MODE,
  FILTER_EXPLANATION,
  type SnapshotPreview,
} from "@/features/admin/api/cmsSnapshotExport";

const LegacySnapshotV2Panel = () => {
  const [preview, setPreview] = useState<SnapshotPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [building, setBuilding] = useState(false);
  const [lastFile, setLastFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    setLoadingPreview(true);
    previewSnapshotCounts()
      .then((p) => setPreview(p))
      .catch((e) => setError(e instanceof Error ? e.message : "unknown"))
      .finally(() => setLoadingPreview(false));
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDownload = async () => {
    setBuilding(true);
    setError(null);
    try {
      const res = await buildContentSnapshotZip();
      triggerDownload(res.blob, res.fileName);
      setLastFile(res.fileName);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown");
    } finally {
      setBuilding(false);
    }
  };

  const totalRows = preview?.tables.reduce((sum, t) => sum + (t.rowCount ?? 0), 0) ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm text-amber-800">
        <strong>Kein vollständiges Datenbank-Backup.</strong> Dieses Bundle ist
        ein redaktionelles Übergabe- und Sicherungspaket („Master-Snapshot"),
        das nur öffentliche/aktive Inhalte enthält. Ohne Binärbilder, ohne
        Drafts/inaktive Inhalte, ohne Live-DDL, ohne Secrets, ohne
        Produktdatenbank. Für einen umfassenden Stand den geschützten
        Gesamt-Export oben nutzen.
      </div>

      <div className="rounded-md border border-blue-500/40 bg-blue-500/5 px-3 py-2 text-xs text-blue-900">
        <div>
          <strong>Filtermodus:</strong>{" "}
          <code className="rounded bg-blue-500/10 px-1">{FILTER_MODE}</code>{" "}
          — RLS-gefiltert: enthält nur öffentliche/aktive CMS-Inhalte.
        </div>
        <div className="mt-1 text-blue-900/80">{FILTER_EXPLANATION}</div>
      </div>

      <div className="rounded-md border bg-card p-4">
        <h3 className="text-sm font-semibold">
          CMS-Light Master-Snapshot v2 herunterladen (nur öffentliche Inhalte)
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Erzeugt ein ZIP mit den 6 CMS-Light-Tabellen als JSON, Excel-/CSV-
          Strukturansichten, Asset-Downloadlisten (Bild-Slots inkl.
          {" "}<code>public_url</code> / <code>storage_path</code>), den
          Migrationsdateien aus dem Build, dem Section-Type-Vertrag, einem
          inferierten Schema, Validation-Checks sowie HANDOVER/RESTORE-Doku
          und einem Manifest mit Filtermodus und Differenzen zu bekannten
          DB-Totals.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onDownload}
            disabled={building || loadingPreview}
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
          >
            {building ? "Master-Snapshot wird erstellt…" : "Alten Export v2 herunterladen (.zip)"}
          </button>
          <button
            type="button"
            onClick={refresh}
            disabled={loadingPreview || building}
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
          >
            Zeilenzahlen neu prüfen
          </button>
          {lastFile && (
            <span className="text-xs text-muted-foreground">
              Zuletzt erzeugt: <span className="font-mono">{lastFile}</span>
            </span>
          )}
        </div>

        {error && (
          <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            Fehler: {error}
          </div>
        )}
      </div>

      <div className="rounded-md border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Enthaltene Tabellen (RLS-gefiltert)</h3>
          <span className="text-xs text-muted-foreground">
            {loadingPreview
              ? "lädt…"
              : `${preview?.tables.length ?? 0} Tabellen · ${totalRows.toLocaleString("de-DE")} Zeilen gesamt`}
          </span>
        </div>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-1 pr-3 font-medium">Tabelle</th>
              <th className="py-1 pr-3 font-medium">Zeilen (Snapshot)</th>
              <th className="py-1 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(preview?.tables ?? []).map((t) => (
              <tr key={t.table} className="border-b last:border-0">
                <td className="py-1.5 pr-3 font-mono text-xs">{t.table}</td>
                <td className="py-1.5 pr-3 tabular-nums">
                  {t.rowCount.toLocaleString("de-DE")}
                </td>
                <td className="py-1.5 text-xs">
                  {t.error ? (
                    <span className="text-destructive">Fehler: {t.error}</span>
                  ) : (
                    <span className="text-muted-foreground">ok</span>
                  )}
                </td>
              </tr>
            ))}
            {!loadingPreview && (preview?.tables.length ?? 0) === 0 && (
              <tr>
                <td colSpan={3} className="py-2 text-xs text-muted-foreground">
                  Keine Daten.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-muted-foreground">
          Hinweis: Diese Zählung zeigt die für den anonymen Lesepfad sichtbaren
          Zeilen. Drafts/inaktive Inhalte sind nicht enthalten. Differenzen zu
          bekannten DB-Totals werden in <code>manifest.json</code> und{" "}
          <code>validation/expected-counts.json</code> ausgewiesen.
        </p>
      </div>

      <div className="rounded-md border bg-muted/30 p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">ZIP-Inhalt (Master-Snapshot v2)</p>
        <ul className="mt-1 list-inside list-disc space-y-0.5">
          <li><code>tables/&lt;name&gt;.json</code> — Roh-Inhalt der 6 CMS-Light-Tabellen (RLS-gefiltert)</li>
          <li><code>csv/cms_pages_overview.csv</code>, <code>cms_structure_flat.csv</code>, <code>cms_field_matrix.csv</code>, <code>cms_assets_overview.csv</code>, <code>cms_navigation_tree.csv</code> — Excel-freundlich (UTF-8 BOM, Semikolon)</li>
          <li><code>assets/asset-index.json</code>, <code>asset-download-list.txt</code>, <code>asset-download-list.csv</code>, <code>DOWNLOAD_BILDER.md</code> — Bilder separat nachladen</li>
          <li><code>migrations/*.sql</code> — Migrationsdateien aus dem Build (falls verfügbar)</li>
          <li><code>contract/sectionTypes.json</code>, <code>tables-classification.json</code>, <code>known-limits.md</code> — Vertrag &amp; Grenzen</li>
          <li><code>schema/schema-snapshot.json</code> — aus den Daten abgeleitetes Inventar (inferred, not authoritative)</li>
          <li><code>validation/validation-checks.sql</code>, <code>expected-counts.json</code> — Live-DB-Abgleich</li>
          <li><code>manifest.json</code> — Filtermodus, Counts, bekannte DB-Totals, Differenzgründe</li>
          <li><code>README.txt</code>, <code>HANDOVER.md</code>, <code>RESTORE_LIMITS.md</code> — Übergabe-Doku</li>
        </ul>
      </div>
    </div>
  );
};

export default LegacySnapshotV2Panel;
