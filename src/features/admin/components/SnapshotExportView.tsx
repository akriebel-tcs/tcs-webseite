import { useState } from "react";
import FullExportPanel from "./FullExportPanel";
import LegacySnapshotV2Panel from "./LegacySnapshotV2Panel";

/**
 * Export-Tab im Redaktionsbereich.
 *
 * Hauptweg ist der geschützte Gesamt-Export (Datenpaket v3). Der alte
 * Master-Snapshot v2 bleibt erhalten, ist aber eingeklappt und lädt erst nach
 * ausdrücklichem Öffnen — beim Öffnen des Tabs wird nichts gezählt.
 */
const SnapshotExportView = () => {
  const [legacyOpen, setLegacyOpen] = useState(false);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-1">
      <FullExportPanel />

      <div className="rounded-md border bg-card">
        <button
          type="button"
          onClick={() => setLegacyOpen((v) => !v)}
          aria-expanded={legacyOpen}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
        >
          <span>
            <span className="text-sm font-semibold">
              Alter Export v2: nur öffentliche Inhalte
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Älteres Paket ohne Drafts, ohne inaktive Zeilen, ohne Bilddateien.
              Wird erst beim Öffnen geladen.
            </span>
          </span>
          <span className="text-xs text-muted-foreground">
            {legacyOpen ? "Einklappen" : "Öffnen"}
          </span>
        </button>
        {legacyOpen && (
          <div className="border-t p-4">
            <LegacySnapshotV2Panel />
          </div>
        )}
      </div>
    </div>
  );
};

export default SnapshotExportView;
