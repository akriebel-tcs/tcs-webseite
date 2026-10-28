/**
 * AdminPreviewDrawer — kleiner Wrapper, der `PreviewSheet` (Schublade rechts)
 * mit `AdminLivePreview` (iframe der öffentlichen Seite) kombiniert.
 *
 * Wird in Bilder, Templates und Strukturkarte verwendet, damit dort der
 * gleiche Live-Vorschau-Mechanismus zur Verfügung steht wie im Inhalte-Bereich.
 *
 * - `storageKey` legt fest, wo der Auf-/Zu-Status persistiert wird, damit
 *   die drei Views unabhängig voneinander offen/zu bleiben können.
 * - `routePath` ist der Pfad der zu zeigenden öffentlichen Seite
 *   (z. B. `/anwendungen/wohnbau`). Ist nichts ausgewählt, lädt die
 *   Vorschau standardmäßig `defaultRoutePath` (Startseite `/`), damit man
 *   im iframe die echte Webseite öffnen und frei navigieren kann.
 * - `highlightSectionKey` markiert einen Abschnitt in der Vorschau.
 * - `onRouteChange` wird gerufen, wenn der Nutzer im iframe auf einen Link
 *   klickt und sich die URL ändert — Aufrufer können damit ihre eigene
 *   Auswahl synchronisieren (Strukturkarte: Knoten markieren, Templates:
 *   Seite einblenden, Bilder: Verwendung auswählen).
 * - `onSectionSelect` wird gerufen, wenn im iframe ein Block angeklickt
 *   wird (jeder Block mit `data-cms-section`).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import PreviewSheet from "@/features/admin/components/PreviewSheet";
import AdminLivePreview from "@/features/admin/components/AdminLivePreview";
import {
  readLastPreviewRoute,
  writeLastPreviewRoute,
} from "@/features/admin/lib/previewRouteMemory";

interface Props {
  routePath: string | null;
  highlightSectionKey?: string | null;
  highlightSectionType?: string | null;
  highlightFieldKey?: string | null;
  storageKey: string;
  /** Optional: kleiner Hinweistext über dem iframe (z. B. „Verwendung 1 von 3"). */
  contextLabel?: string | null;
  /**
   * Pfad, der geladen wird, wenn weder `routePath` noch ein zuletzt
   * gemerkter Vorschau-Pfad vorhanden sind. Standard `/`.
   */
  defaultRoutePath?: string;
  /** Routenwechsel im iframe (Hauptmenü, Link, …) — für Reverse-Navigation. */
  onRouteChange?: (pathname: string) => void;
  /** Klick auf einen Block im iframe (`data-cms-section`). */
  onSectionSelect?: (sectionKey: string, pageKey: string | null, assetUrl?: string | null, fieldKey?: string | null, pathname?: string | null) => void;
}

const AdminPreviewDrawer: React.FC<Props> = ({
  routePath,
  highlightSectionKey = null,
  highlightSectionType = null,
  highlightFieldKey = null,
  storageKey,
  contextLabel = null,
  defaultRoutePath = "/",
  onRouteChange,
  onSectionSelect,
}) => {
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [open, storageKey]);

  // Zuletzt gezeigter Pfad über alle Admin-Bereiche hinweg. Wird einmalig
  // beim Mount gelesen — danach läuft die Quelle der Wahrheit über
  // `routePath` (explizite Auswahl) bzw. iFrame-Navigation.
  const rememberedRef = useRef<string | null>(null);
  if (rememberedRef.current === null) {
    rememberedRef.current = readLastPreviewRoute();
  }

  // Effektiver Pfad: 1. explizite Auswahl, 2. gemerkter Stand,
  // 3. Standard (üblicherweise „/"). So springt die Vorschau beim Wechsel
  // zwischen Inhalte/Bilder/Templates/Strukturkarte nicht mehr auf die
  // Startseite zurück, wenn der aktuelle Bereich gerade keine eigene
  // Auswahl hat.
  const effectiveRoute = routePath ?? rememberedRef.current ?? defaultRoutePath;
  const isDefault = !routePath;

  // Jeden tatsächlich geladenen Pfad als „zuletzt gesehen" merken.
  useEffect(() => {
    writeLastPreviewRoute(effectiveRoute);
  }, [effectiveRoute]);

  // Auch iFrame-Navigation (Hauptmenü, Link-Klick) persistieren — und erst
  // dann den Aufrufer informieren.
  const handleRouteChange = useCallback(
    (pathname: string) => {
      writeLastPreviewRoute(pathname);
      onRouteChange?.(pathname);
    },
    [onRouteChange],
  );

  return (
    <PreviewSheet open={open} onOpenChange={setOpen}>
      <div className="flex h-full min-h-0 flex-col">
        {(contextLabel || isDefault) && (
          <div className="shrink-0 border-b bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">
            {contextLabel
              ? contextLabel
              : rememberedRef.current && rememberedRef.current !== defaultRoutePath
                ? `Zuletzt gezeigt: ${rememberedRef.current} — navigiere in der Webseite weiter, oder wähle links einen Eintrag.`
                : "Wähle links einen Eintrag, oder navigiere direkt in der Webseite (Links und Menü funktionieren)."}
          </div>
        )}
        <div className="min-h-0 flex-1">
          <AdminLivePreview
            routePath={effectiveRoute}
            highlightSectionKey={highlightSectionKey}
            highlightSectionType={highlightSectionType}
            highlightFieldKey={highlightFieldKey}
            onRouteChange={handleRouteChange}
            onSectionSelect={onSectionSelect}
          />
        </div>
      </div>
    </PreviewSheet>
  );
};

export default AdminPreviewDrawer;
