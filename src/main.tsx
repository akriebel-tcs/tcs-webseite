import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import i18n from "./i18n";
import "./index.css";
import RootErrorBoundary from "./app/RootErrorBoundary";
import { applyCmsOverlay } from "./features/cms/i18n/applyCmsOverlay";
import { snapshotBaseline, diffOverlayed, scheduleFoutScan } from "./features/cms/i18n/foutSelfCheck";
import { DEFAULT_APP_LOCALE, normalizeAppLocale } from "./i18n/locale";
import { readLocaleRegistry } from "./i18n/localeRegistry";
import { applyLegacyPersonaRedirect } from "./features/personas/legacyRedirect";

/**
 * CMS-Overlay (Etappe 2 — Public-Renderer DB-erst).
 *
 * Wir blockieren den ersten Paint kurz, damit die DB-Inhalte vor dem ersten
 * Render in i18next gemerged sind. So gewinnt die DB, wo sie Werte hat — ohne
 * FOUT (kein Aufblitzen der i18n-JSON-Texte). Wenn die DB nicht erreichbar ist
 * oder lange braucht, gilt eine harte Notfall-Schranke (1.2s), nach der wir
 * trotzdem rendern und das Overlay später live nachziehen.
 *
 * Wichtig (Weiße-Seite-Schutz): Das Vorladen darf das Rendern niemals
 * verhindern. Jeder Schritt hier ist einzeln abgesichert, das Anzeigen läuft
 * genau einmal, und ein Wächter zeigt notfalls eine Meldung statt einer leeren
 * Seite. Zusätzlich fängt `RootErrorBoundary` Anzeigefehler im Baum ab.
 *
 * Zusätzlich (nur DEV): FOUT-Selbstcheck. Wir snapshotten die i18n-JSON-Bundles
 * VOR dem Overlay als Baseline und vergleichen sie nach dem Overlay. Nach dem
 * ersten Paint scannt der Check `document.body.innerText` und meldet jeden
 * i18n-JSON-Wert, der sichtbar wäre, obwohl die DB ihn ersetzt hat.
 */
const BOOT_TIMEOUT_MS = 1200;
const WATCHDOG_MS = 6000;

// Alte Zielgruppen-Adressen (/personas/…) vor dem ersten Router-Rendern
// auf die neuen, sprechenden Adressen umschreiben.
try {
  applyLegacyPersonaRedirect();
} catch (error) {
  console.error(error);
}

const startLocale = normalizeAppLocale(i18n.language);

let baseline: ReturnType<typeof snapshotBaseline> | null = null;
try {
  baseline = import.meta.env.DEV ? snapshotBaseline(i18n, startLocale) : null;
} catch (error) {
  console.error(error);
}

let mounted = false;

function mountApp() {
  if (mounted) return;
  mounted = true;
  const container = document.getElementById("root");
  if (!container) {
    console.error(new Error("Anzeigebereich #root fehlt im HTML-Dokument."));
    return;
  }
  createRoot(container).render(
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>,
  );
}

// Wächter: sollte der Startvorgang aus irgendeinem Grund hängen bleiben,
// wird trotzdem gerendert, statt eine weiße Seite stehen zu lassen.
const watchdog = setTimeout(() => {
  if (!mounted) console.error(new Error("Startvorgang zu langsam — Anzeige wird erzwungen."));
  mountApp();
}, WATCHDOG_MS);

function afterMount() {
  if (import.meta.env.DEV && baseline) {
    try {
      const candidates = diffOverlayed(i18n, startLocale, baseline);
      scheduleFoutScan(candidates);
    } catch (error) {
      console.error(error);
    }
  }

  // Die öffentlichen Sprachen kommen ausschließlich aus `cms_locales`.
  // Eine gemerkte, nicht (mehr) öffentliche Sprache wird auf Deutsch
  // zurückgestellt; alle übrigen öffentlichen Sprachen laden leise nach,
  // damit ein Sprachwechsel sofort DB-Werte hat.
  void readLocaleRegistry()
    .then((rows) => {
      const publicCodes = rows.filter((r) => r.is_public).map((r) => r.locale);
      if (publicCodes.length > 0 && !publicCodes.includes(startLocale)) {
        void i18n.changeLanguage(DEFAULT_APP_LOCALE);
        return;
      }
      for (const other of publicCodes) {
        if (other !== startLocale) void applyCmsOverlay(i18n, other);
      }
    })
    .catch(() => {});
}

function startOverlayBoot(): Promise<void> {
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, BOOT_TIMEOUT_MS));
  try {
    const overlay = Promise.resolve(applyCmsOverlay(i18n, startLocale)).then(
      () => undefined,
      () => undefined,
    );
    return Promise.race([overlay, timeout]);
  } catch (error) {
    // Ein sofortiger Fehler im Vorladen darf das Rendern nicht blockieren.
    console.error(error);
    return Promise.resolve();
  }
}

// Sprachwechsel: Overlay der neuen Sprache asynchron nachziehen.
i18n.on("languageChanged", () => {
  try {
    void Promise.resolve(applyCmsOverlay(i18n, normalizeAppLocale(i18n.language))).catch(() => {});
  } catch (error) {
    console.error(error);
  }
});

void startOverlayBoot().then(
  () => {
    clearTimeout(watchdog);
    mountApp();
    afterMount();
  },
  (error) => {
    console.error(error);
    clearTimeout(watchdog);
    mountApp();
    afterMount();
  },
);
