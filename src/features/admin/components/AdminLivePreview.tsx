/**
 * AdminLivePreview — Eingebettete Live-Vorschau der echten öffentlichen Seite
 * neben dem Editor.
 *
 * Etappe „Admin lesbarer machen / Live-Preview daneben" + Viewport-Modi.
 *
 * - Lädt die Route der aktuell ausgewählten Seite in einem iFrame.
 * - Sendet beim Wechsel des fokussierten Blocks ein `postMessage` mit dem
 *   `section_key`. Der Listener in `PageLayout` scrollt zum Block und hebt
 *   ihn 2 s farbig hervor.
 * - Viewport-Schalter: Auto (volle Breite des Panels), Desktop 1280,
 *   Tablet 820, Mobil 390 — damit man auf kleinem Laptop einen realistischen
 *   Mobil-/Tablet-Eindruck bekommt.
 * - Re-Sendet die Highlight-Nachricht beim iFrame-`load`-Event, damit die
 *   Sprungmarke auch nach Reload bzw. Routenwechsel ankommt.
 */
import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { Monitor, Smartphone, Tablet, Maximize2, RotateCw } from "lucide-react";
import { blockTypeStyle } from "@/features/admin/lib/blockTypeStyle";

interface Props {
  /** Route der zu zeigenden Seite (z. B. `/zutrittskontrolle/mobiler-zutritt`). */
  routePath: string | null;
  /** Optional: Persona-ID für Home-Persona-Vorschau (`architekten`, `bauherren`, …). */
  previewPersonaId?: string | null;
  /** Aktuell im Editor fokussierter Block-Schlüssel — wird ans iFrame gemeldet. */
  highlightSectionKey: string | null;
  /** Block-Typ des fokussierten Blocks — bestimmt die Outline-Farbe im iFrame. */
  highlightSectionType?: string | null;
  /** Optionaler Bildslot innerhalb einer Section (z. B. `image_efh`). */
  highlightFieldKey?: string | null;
  /** Optionaler Reload-Trigger (z. B. nach Speichern). */
  reloadToken?: number;
  /**
   * Callback, wenn der Nutzer im iFrame der echten Webseite navigiert
   * (z. B. via Hauptmenü). Pfad ist die neue `location.pathname`.
   */
  onRouteChange?: (pathname: string) => void;
  /** Callback, wenn im iFrame eine Persona aktiviert/deaktiviert wurde. */
  onPersonaChange?: (personaId: string | null, pathname: string) => void;
  /**
   * Callback, wenn der Nutzer im iFrame auf einen Block mit
   * `data-cms-section` klickt — Admin scrollt zum passenden Editor-Eintrag.
   */
  onSectionSelect?: (sectionKey: string, pageKey: string | null, assetUrl?: string | null, fieldKey?: string | null, pathname?: string | null) => void;
}

export const ADMIN_PREVIEW_MESSAGE_TYPE = "cms-preview-highlight";
export const ADMIN_PREVIEW_ROUTE_MESSAGE_TYPE = "cms-preview-route";
export const ADMIN_PREVIEW_PERSONA_MESSAGE_TYPE = "cms-preview-persona";
export const ADMIN_PREVIEW_SELECT_MESSAGE_TYPE = "cms-preview-select";

type ViewportMode = "auto" | "desktop" | "tablet" | "mobile";

const VIEWPORT_PX: Record<Exclude<ViewportMode, "auto">, number> = {
  desktop: 1280,
  tablet: 820,
  mobile: 390,
};

/**
 * Geräte-typische Höhen für die festen Modi. Damit basiert `vh` (z. B. das
 * `h-[50vh]` Hero-Bild) auf einer echten Geräte-Höhe statt auf der zufälligen
 * Panel-Höhe — sonst wird das Hero im Smartphone-Modus überdimensioniert.
 * Im Auto-Modus bleibt es bei der Desktop-Skalierung.
 */
const VIEWPORT_PX_HEIGHT: Record<Exclude<ViewportMode, "auto">, number> = {
  desktop: 800,
  tablet: 1180,
  mobile: 844,
};

const STORAGE_KEY = "cms-admin-preview-viewport";

/**
 * Virtuelle Breite für den Auto-Modus: das iFrame rendert bei Desktop-Breite,
 * wir skalieren es per CSS-`transform` auf die Panel-Breite herunter.
 * So sieht man die echte Seite proportional verkleinert (inkl. Hero-Bild).
 */
const AUTO_VIRTUAL_WIDTH = 1280;

const AdminLivePreview = ({ routePath, previewPersonaId, highlightSectionKey, highlightSectionType, highlightFieldKey, reloadToken, onRouteChange, onPersonaChange, onSectionSelect }: Props) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<ViewportMode>(() => {
    if (typeof window === "undefined") return "auto";
    const saved = window.localStorage.getItem(STORAGE_KEY) as ViewportMode | null;
    return saved && ["auto", "desktop", "tablet", "mobile"].includes(saved) ? saved : "auto";
  });
  const [manualReload, setManualReload] = useState(0);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  // Container-Größe beobachten — nötig für die Auto-Skalierung.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setContainerSize({ w: r.width, h: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Highlight-Wunsch ans iFrame senden — sowohl direkt bei Auswahl als auch
  // nach jedem `load`-Event (z. B. nach Routenwechsel oder Reload).
  useEffect(() => {
    if (!highlightSectionKey) return;
    const outlineColor = blockTypeStyle(highlightSectionType ?? null).cssColor;
    const send = () => {
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      try {
        win.postMessage(
          {
            type: ADMIN_PREVIEW_MESSAGE_TYPE,
            sectionKey: highlightSectionKey,
            fieldKey: highlightFieldKey ?? null,
            outlineColor,
          },
          window.location.origin,
        );
      } catch {
        /* Cross-Origin oder iFrame nicht bereit — beim nächsten load erneut. */
      }
    };
    const t1 = window.setTimeout(send, 120);
    const t2 = window.setTimeout(send, 600);
    const t3 = window.setTimeout(send, 1500);
    const iframe = iframeRef.current;
    iframe?.addEventListener("load", send);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      iframe?.removeEventListener("load", send);
    };
  }, [highlightSectionKey, highlightSectionType, highlightFieldKey, routePath, reloadToken, manualReload]);

  // Persona-Vorschau (Home-Sonderfall): Im iFrame die gewünschte Persona
  // auf der Startseite aktivieren/deaktivieren.
  useEffect(() => {
    const send = () => {
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      try {
        win.postMessage(
          {
            type: ADMIN_PREVIEW_PERSONA_MESSAGE_TYPE,
            personaId: previewPersonaId ?? null,
          },
          window.location.origin,
        );
      } catch {
        /* iFrame noch nicht bereit — nächster Versuch beim load/timeout */
      }
    };
    const t1 = window.setTimeout(send, 120);
    const t2 = window.setTimeout(send, 600);
    const iframe = iframeRef.current;
    iframe?.addEventListener("load", send);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      iframe?.removeEventListener("load", send);
    };
  }, [previewPersonaId, routePath, reloadToken, manualReload]);

  // Routen-Wechsel aus dem iFrame entgegennehmen und nach oben weiterreichen.
  useEffect(() => {
    if (!onRouteChange) return;
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; pathname?: string } | null;
      if (!data || data.type !== ADMIN_PREVIEW_ROUTE_MESSAGE_TYPE || !data.pathname) return;
      // Nur Nachrichten aus unserem iFrame berücksichtigen.
      if (event.source && event.source !== iframeRef.current?.contentWindow) return;
      onRouteChange(data.pathname);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onRouteChange]);

  useEffect(() => {
    if (!onPersonaChange) return;
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; personaId?: string | null; pathname?: string } | null;
      if (!data || data.type !== ADMIN_PREVIEW_PERSONA_MESSAGE_TYPE) return;
      if (event.source && event.source !== iframeRef.current?.contentWindow) return;
      onPersonaChange(data.personaId ?? null, data.pathname ?? "/");
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onPersonaChange]);

  // Block-Klick aus dem iFrame: Editor-Eintrag auswählen.
  useEffect(() => {
    if (!onSectionSelect) return;
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; sectionKey?: string; pageKey?: string | null; assetUrl?: string | null; fieldKey?: string | null; pathname?: string | null } | null;
      if (!data || data.type !== ADMIN_PREVIEW_SELECT_MESSAGE_TYPE) return;
      // Mindestens einer von beiden muss vorhanden sein — Karten-Bilder
      // ohne eigenes [data-cms-section] kommen nur mit assetUrl an.
      if (!data.sectionKey && !data.assetUrl) return;
      if (event.source && event.source !== iframeRef.current?.contentWindow) return;
      onSectionSelect(data.sectionKey ?? "", data.pageKey ?? null, data.assetUrl ?? null, data.fieldKey ?? null, data.pathname ?? null);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onSectionSelect]);

  if (!routePath) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-xs text-muted-foreground">
        <div>
          <div className="mb-1 text-sm font-medium text-foreground">Live-Vorschau</div>
          Wähle links eine Seite mit hinterlegtem Pfad — die echte Webseite erscheint hier.
        </div>
      </div>
    );
  }

  const src = `${routePath}${reloadToken || manualReload ? `?_p=${reloadToken ?? 0}_${manualReload}` : ""}`;

  const ModeBtn = ({
    value,
    icon: Icon,
    title,
  }: {
    value: ViewportMode;
    icon: typeof Monitor;
    title: string;
  }) => (
    <button
      type="button"
      onClick={() => setMode(value)}
      aria-pressed={mode === value}
      title={title}
      className={
        "flex h-6 w-6 items-center justify-center rounded transition-colors " +
        (mode === value ? "bg-foreground text-background" : "hover:bg-muted text-muted-foreground")
      }
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );

  const fixedWidth = mode === "auto" ? null : VIEWPORT_PX[mode];

  // Auto-Modus: iFrame rendert bei AUTO_VIRTUAL_WIDTH und wird per CSS-scale
  // auf die verfügbare Panel-Breite herunterskaliert. So bleiben alle
  // proportionalen Maße (z. B. `h-[70vh]` im Hero) realistisch.
  const autoScale =
    mode === "auto" && containerSize.w > 0
      ? Math.min(1, (containerSize.w - 16) / AUTO_VIRTUAL_WIDTH)
      : 1;
  const autoVirtualHeight =
    mode === "auto" && containerSize.h > 0 ? containerSize.h / autoScale : 0;

  return (
    <div className="flex h-full min-h-[600px] flex-col">
      <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-2 py-1 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-0.5">
          <ModeBtn value="auto" icon={Maximize2} title="Auto — Desktop-Ansicht skaliert auf Panel-Breite (proportional verkleinert, Hero-Bild bleibt im Verhältnis)" />
          <ModeBtn value="desktop" icon={Monitor} title="Desktop (1280 px) — typische Bildschirmbreite, ohne Skalierung" />
          <ModeBtn value="tablet" icon={Tablet} title="Tablet (820 px) — z. B. iPad hochkant" />
          <ModeBtn value="mobile" icon={Smartphone} title="Mobil (390 px) — Smartphone hochkant" />
          <button
            type="button"
            onClick={() => setManualReload((n) => n + 1)}
            title="Vorschau neu laden"
            className="ml-1 flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          {fixedWidth && (
            <span className="font-mono text-[10px] tabular-nums">{fixedWidth}px</span>
          )}
          {mode === "auto" && autoScale < 1 && (
            <span className="font-mono text-[10px] tabular-nums" title={`Desktop ${AUTO_VIRTUAL_WIDTH}px, skaliert auf ${Math.round(autoScale * 100)}%`}>
              {Math.round(autoScale * 100)}%
            </span>
          )}
          <span className="truncate font-mono" title={routePath}>{routePath}</span>
          <a
            href={routePath}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded px-1.5 py-0.5 hover:bg-muted hover:text-foreground"
            title="In neuem Tab öffnen"
          >
            ↗
          </a>
        </div>
      </div>
      <div
        ref={containerRef}
        className={
          "flex-1 min-h-0 bg-muted/40 p-2 " +
          (mode === "auto" ? "overflow-hidden" : "overflow-auto flex justify-center")
        }
      >
        {mode === "auto" ? (
          <iframe
            ref={iframeRef}
            src={src}
            title={`Live-Vorschau ${routePath}`}
            className="border bg-background shadow-sm"
            style={{
              width: `${AUTO_VIRTUAL_WIDTH}px`,
              height: autoVirtualHeight ? `${autoVirtualHeight}px` : "100%",
              transform: `scale(${autoScale})`,
              transformOrigin: "top left",
            }}
            sandbox="allow-same-origin allow-scripts allow-forms"
          />
        ) : (
          <iframe
            ref={iframeRef}
            src={src}
            title={`Live-Vorschau ${routePath}`}
            className="border bg-background shadow-sm"
            style={{
              width: `${fixedWidth}px`,
              height: `${VIEWPORT_PX_HEIGHT[mode as Exclude<ViewportMode, "auto">]}px`,
              maxWidth: "100%",
              flex: "0 0 auto",
            }}
            sandbox="allow-same-origin allow-scripts allow-forms"
          />
        )}
      </div>
    </div>
  );
};

export default AdminLivePreview;
