import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import TranslationTextList from "@/features/admin/components/TranslationTextList";
import LocaleManagerPanel from "@/features/admin/components/LocaleManagerPanel";
import ProviderKeysPanel from "@/features/admin/components/ProviderKeysPanel";
import {
  hasNoModelChoice,
  isOwnKeyProvider,
  PROVIDER_KEYS_ANCHOR_ID,
  setLocaleProvider,
  switchRunProvider,
} from "@/features/admin/api/cmsProviderKeys";
import { onAdminUnlockChange, readAdminToken } from "@/features/admin/api/adminAuth";

import AutopilotPanel from "@/features/admin/components/AutopilotPanel";
import AdminSectionBoundary from "@/features/admin/components/AdminSectionBoundary";
import { AREA_LABEL } from "@/features/admin/api/cmsTranslationUnits";
import { setLocaleVisibility } from "@/features/admin/api/cmsLocaleVisibility";
import {
  controlRun,
  describeEta,
  fetchTranslationBasics,
  fetchTranslationCoverage,
  findActiveRunForScope,
  findRunForLocale,
  formatSeconds,
  qaReportToCsv,
  buildReportHtml,
  readPageList,
  readRun,
  readRuns,
  requestDryRun,
  requestQaReport,
  runProgress,
  describeRunState,

  scopeSignature,
  startRun,
  type DryRunResult,
  type QaReport,
  type TranslationBasics,
  type TranslationCoverage,
  type TranslationRunRow,
  type TranslationScopeKind,
  type TranslationStatus,
} from "@/features/admin/api/cmsTranslationRuns";

/**
 * Tab „Übersetzungen" — DB-first Übersetzungswerkzeug.
 *
 * Sichtbarer Ablauf von oben nach unten:
 *   1 Sprache wählen
 *   2 Anbieter und Modell wählen
 *   3 Fehlende Texte prüfen (Vorschau)
 *   4 Übersetzung starten
 *   5 Fortschritt (genau eine Anzeige)
 *
 * Alles Weitere liegt in Akkordeons (standardmäßig geschlossen).
 *
 * Alles Sichtbare kommt aus der Datenbank: Sprachliste, Sichtbarkeits-
 * zustände, Abdeckung, Läufe, Kostensätze. Der Fortschritt wird ausschließlich
 * aus gespeicherten Laufdaten berechnet, nie aus lokalem Zählen im Browser.
 *
 * Übersetzt werden ausschließlich fehlende und veraltete Zieltexte. Vorhandene,
 * besonders von Hand geprüfte Texte werden nie überschrieben (serverseitig
 * abgesichert). Nach einem Sprach- oder Modellwechsel wird eine alte Vorschau
 * verworfen und muss neu berechnet werden.
 *
 * Sicherheitsgrenze: Ein Lauf über eine komplette Sprache verlangt einen
 * serverseitig hinterlegten Freigabecode. Der Server meldet ausschließlich, OB
 * ein Code hinterlegt ist — der Wert wird nie an den Browser gesendet und
 * steht nirgends im Code, Frontend oder in der Datenbank.
 */

type Props = {
  /** Sprung in den Inhalte-Bereich (Seite/Baustein/Feld). */
  onJumpToField?: (pageKey: string, sectionKey: string, fieldKey: string) => void;
};

const box = "rounded-lg border bg-card p-3";
const btn =
  "rounded border px-2 py-1 text-xs hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimary =
  "rounded bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";

const ISSUE_LABEL: Record<string, string> = {
  ziel_leer: "Ziel leer",
  unveraendert_deutsch: "unverändert deutsch",
  platzhalter_fehlt: "Platzhalter fehlt",
  html_fehlt: "HTML fehlt",
  link_fehlt: "Link fehlt",
  markenbegriff_fehlt: "Markenbegriff fehlt",
  laenge_auffaellig: "Länge auffällig",
  quelle_geaendert: "deutsche Quelle geändert",
};

const RUN_STATUS_LABEL: Record<string, string> = {
  queued: "wartet",
  running: "läuft",
  paused: "pausiert",
  cancelled: "abgebrochen",
  done: "abgeschlossen",
  error: "Fehler",
};

/** Leerer Sprachstand, solange die Zahlen fehlen oder gestört sind. */
const EMPTY_COVERAGE: TranslationCoverage = {
  de_translatable_fields: 0,
  areas: [],
  source_by_area: {},
  locales: [],
};

const num = (n: number | null | undefined) => (n ?? 0).toLocaleString("de-DE");
const eur = (n: number) => `${n.toFixed(2).replace(".", ",")} €`;

/** Einfaches, ruhiges Akkordeon (standardmäßig geschlossen). */
const Panel = ({
  title,
  hint,
  children,
  defaultOpen = false,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) => (
  <details className="rounded-lg border bg-card" open={defaultOpen}>
    <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold">
      {title}
      {hint ? <span className="ml-2 font-normal text-muted-foreground">{hint}</span> : null}
    </summary>
    <div className="border-t px-3 py-3">{children}</div>
  </details>
);

/** Nummerierte Zeile im Hauptablauf. */
const Step = ({ n, title, children }: { n: number; title: string; children: ReactNode }) => (
  <div className="border-t pt-3 first:border-t-0 first:pt-0">
    <p className="mb-2 text-xs font-semibold">
      <span className="mr-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-[10px] text-background">
        {n}
      </span>
      {title}
    </p>
    {children}
  </div>
);

const TranslationWorkbench = ({ onJumpToField }: Props) => {
  /**
   * Grundstatus und Sprachstand sind getrennt: Sprachliste, Anbieter und
   * Modelle laden schnell und sind unabhängig von den teuren Zahlen. Eine
   * gestörte Zahlenberechnung darf Sprachwahl und Aktivierung nicht blockieren.
   */
  const [basics, setBasics] = useState<TranslationBasics | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [coverage, setCoverage] = useState<TranslationCoverage | null>(null);
  const [coverageError, setCoverageError] = useState<string | null>(null);
  const [coverageLoading, setCoverageLoading] = useState(true);
  const [pages, setPages] = useState<Array<{ page_key: string; title: string }>>([]);
  const [pagesError, setPagesError] = useState<string | null>(null);
  const [runs, setRuns] = useState<TranslationRunRow[]>([]);

  const [targetLocale, setTargetLocale] = useState<string>("");
  const [scopeKind, setScopeKind] = useState<TranslationScopeKind>("locale");
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [pageFilter, setPageFilter] = useState("");
  const [provider, setProvider] = useState("lovable_ai");
  const [model, setModel] = useState("");
  // „Eigenes Modell": echtes Eingabefeld für eine eigene Kennung.
  const [customModel, setCustomModel] = useState(false);
  /** Aus Schritt 2 angesprungener Anbieter für „Schlüssel & Anbieter". */
  const [keySetupProvider, setKeySetupProvider] = useState<string | null>(null);
  const [visibilityBusy, setVisibilityBusy] = useState<string | null>(null);

  const [dry, setDry] = useState<DryRunResult | null>(null);
  const [dryBusy, setDryBusy] = useState(false);
  const [startBusy, setStartBusy] = useState(false);
  /** Fehler direkt an Schritt 4 (nicht nur oben außerhalb des Sichtfelds). */
  const [startError, setStartError] = useState<string | null>(null);
  /**
   * Gilt die kurzlebige Adminfreigabe noch? Ohne sie kann ein pausierter Lauf
   * nicht auf einen anderen Anbieter umgestellt werden — das muss VOR dem
   * Klick sichtbar sein.
   */
  const [adminUnlocked, setAdminUnlocked] = useState<boolean>(() => readAdminToken() != null);
  /** Verständliche Bestätigung der Vorschau (keine Kürzel, kein Geheimnis). */
  const [previewConfirmed, setPreviewConfirmed] = useState(false);
  /**
   * Nur im geschlossenen Einrichtungsbereich: der serverseitig hinterlegte
   * Freigabecode muss beim Start eines Gesamtlaufs mitgegeben werden. Der Wert
   * wird nicht gespeichert und steht nirgends im Code.
   */
  const [adminRelease, setAdminRelease] = useState("");
  /**
   * Sitzungsfreigabe: nach einem erfolgreichen Start bleibt der Code für diese
   * geöffnete Admin-Sitzung im Arbeitsspeicher wirksam. Er wird nicht in der
   * Datenbank und nicht im Browser-Speicher abgelegt und ist nach dem Schließen
   * des Tabs weg. Der serverseitige Schutz bleibt unverändert bestehen.
   */
  const [releaseAccepted, setReleaseAccepted] = useState(false);

  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [activeRun, setActiveRun] = useState<TranslationRunRow | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [qa, setQa] = useState<QaReport | null>(null);
  const [qaBusy, setQaBusy] = useState(false);

  /** true = für die gewählte Sprache und den Umfang gibt es noch keinen Lauf. */
  const [noRunForScope, setNoRunForScope] = useState(false);

  // ------------------------------------------------------------------ Laden
  /** Grundstatus: schnell, unabhängig von den Sprachstand-Zahlen. */
  const loadBasics = useCallback(async (options: { refresh?: boolean } = {}) => {
    setStatusLoading(true);
    try {
      const s = await fetchTranslationBasics({ refresh: options.refresh === true });
      setBasics(s);
      setStatusError(null);
      setTargetLocale((prev) => {
        const active = s.locales.filter((l) => l.is_active && !l.is_source);
        if (prev && active.some((l) => l.locale === prev)) return prev;
        return active[0]?.locale ?? "";
      });
      setProvider((prev) => {
        if (s.providers.some((p) => p.provider === prev)) return prev;
        return s.providers.find((p) => p.configured)?.provider ?? s.providers[0]?.provider ?? "";
      });
    } catch (err) {
      setStatusError((err as Error).message);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  /** Sprachstand: eigener Lade- und Fehlerzustand, blockiert nichts. */
  const loadCoverage = useCallback(async (options: { refresh?: boolean } = {}) => {
    setCoverageLoading(true);
    try {
      const c = await fetchTranslationCoverage({ refresh: options.refresh === true });
      setCoverage(c);
      setCoverageError(null);
    } catch (err) {
      setCoverageError((err as Error).message);
    } finally {
      setCoverageLoading(false);
    }
  }, []);

  const loadRuns = useCallback(async () => {
    try {
      setRuns(await readRuns(15));
    } catch {
      /* Leseproblem blockiert die Oberfläche nicht */
    }
  }, []);

  useEffect(() => {
    void loadBasics();
    void loadCoverage();
    void loadRuns();
    readPageList()
      .then((p) => {
        setPages(p);
        setPagesError(null);
      })
      .catch((err) => {
        setPages([]);
        setPagesError((err as Error).message);
      });
  }, [loadBasics, loadCoverage, loadRuns]);

  /**
   * Fortschrittskarte strikt an gewählte Sprache und Umfang koppeln. Bei jedem
   * Wechsel wird die alte Anzeige verworfen; danach wird ausschließlich ein Lauf
   * genau dieser Sprache und dieses Umfangs geladen. Fremde Läufe (z. B. ein
   * alter EN-Lauf) erscheinen nur noch unter „Bisherige Läufe".
   */
  useEffect(() => {
    setActiveRunId(null);
    setActiveRun(null);
    setDry(null);
    setPreviewConfirmed(false);
    setQa(null);
    setMessage(null);
    setNoRunForScope(false);
    if (!targetLocale) return;
    let cancelled = false;
    void findRunForLocale({
      targetLocale,
      scopeKind,
      pageKeys: scopeKind === "locale" ? [] : selectedPages,
    })
      .then((run) => {
        if (cancelled) return;
        if (!run) {
          setNoRunForScope(true);
          return;
        }
        setActiveRunId(run.id);
        setActiveRun(run);
      })
      .catch(() => {
        if (!cancelled) setNoRunForScope(true);
      });
    return () => {
      cancelled = true;
    };
  }, [targetLocale, scopeKind, selectedPages]);


  // Laufender Lauf: moderates Polling der persistierten Daten.
  // Der Browser steuert nur; gearbeitet wird serverseitig.
  useEffect(() => {
    if (!activeRunId) return;
    let cancelled = false;
    const tick = () => {
      readRun(activeRunId)
        .then((r) => {
          if (cancelled || !r) return;
          setActiveRun(r);
          if (r.status === "done" || r.status === "error" || r.status === "cancelled") {
            const p = runProgress(r);
            const st = describeRunState(r);
            setMessage(
              r.status === "done"
                ? st.incomplete
                  ? `Lauf unvollständig: ${p.processed} von ${p.planned} verarbeitet, ${st.remaining} Restobjekte offen. Grund: ${st.reason}. Mit „Restlauf fortsetzen" weiterarbeiten.`
                  : `Lauf abgeschlossen: ${p.processed} von ${p.planned} verarbeitet — ${r.fields_done} übersetzt, ${r.fields_skipped} übersprungen, ${r.fields_failed} Fehler.`
                : r.status === "cancelled"
                  ? "Lauf abgebrochen. Bereits übersetzte Texte bleiben erhalten."
                  : "Lauf mit Fehler beendet.",
            );

            void loadCoverage({ refresh: true });

          }
        })
        .catch(() => undefined);
      void loadRuns();
    };
    tick();
    const id = window.setInterval(tick, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [activeRunId, loadRuns, loadCoverage]);

  // -------------------------------------------------------------- Abgeleitet
  /**
   * Gemeinsame Sicht für Anzeigen, die Grundstatus und Zahlen zusammen brauchen.
   * Fehlen die Zahlen (Störung), bleibt die Oberfläche vollständig bedienbar.
   */
  const status: TranslationStatus | null = useMemo(
    () => (basics ? { ...basics, coverage: coverage ?? EMPTY_COVERAGE } : null),
    [basics, coverage],
  );
  const allLocales = useMemo(() => basics?.locales ?? [], [basics]);
  const activeLocales = useMemo(
    () => allLocales.filter((l) => l.is_active && !l.is_source),
    [allLocales],
  );
  const sourceLocale = useMemo(() => allLocales.find((l) => l.is_source), [allLocales]);
  const providerList = useMemo(() => basics?.providers ?? [], [basics]);
  const rates = useMemo(
    () => (basics?.rates ?? []).filter((r) => r.provider === provider && r.is_enabled),
    [basics, provider],
  );
  const providerConfigured = useMemo(
    () => basics?.providers.find((p) => p.provider === provider)?.configured ?? false,
    [basics, provider],
  );
  const providerLabel = useMemo(
    () => providerList.find((p) => p.provider === provider)?.label ?? provider,
    [providerList, provider],
  );
  const modelLabel = useMemo(
    () => (basics?.rates ?? []).find((r) => r.model === model)?.label ?? model,
    [basics, model],
  );
  /** Auswahlfelder hängen nur am Grundstatus, nie an den Sprachstand-Zahlen. */
  const selectsBusy = statusLoading || !basics;

  const targetLabel = useMemo(
    () => activeLocales.find((l) => l.locale === targetLocale)?.label_de ?? targetLocale,
    [activeLocales, targetLocale],
  );

  /** Sprachstand der gewählten Zielsprache (Übersetzungsstand, nicht Vorbereitung). */
  const localeRow = useMemo(
    () => (coverage?.locales ?? []).find((l) => l.locale === targetLocale) ?? null,
    [coverage, targetLocale],
  );
  const totalUnits = coverage?.de_translatable_fields ?? 0;
  const missingCount = localeRow ? Math.max(0, totalUnits - localeRow.filled) : 0;
  const notPreparedCount = localeRow?.not_whitelisted ?? 0;

  /**
   * Regel für Modell-Kennungen kommt vom Server (Statusabruf) — damit gilt in
   * Oberfläche und Serverfunktion dieselbe Prüfung und es gibt keine zweite
   * Liste im Code. Die Modelle selbst stehen in der Datenbank.
   */
  // Regel und Hinweis je Anbieter: eigene Anbieter benutzen ihre nativen
  // Modell-Kennungen ohne Schrägstrich, das Gateway die Form anbieter/modell.
  const modelPattern =
    status?.model_id_patterns?.[provider] ??
    status?.model_id_pattern ??
    "^[a-z0-9][a-z0-9._-]*\\/[A-Za-z0-9][A-Za-z0-9._-]*$";
  const modelHint =
    status?.model_id_hints?.[provider] ??
    status?.model_id_hint ??
    "Modell-Kennungen haben immer die Form anbieter/modell, z. B. google/gemini-3.6-flash.";
  const modelValid = useMemo(() => {
    // DeepL hat keine Modellauswahl: der vorhandene Vertrag gilt als gültig.
    if (hasNoModelChoice(provider)) return true;
    const value = model.trim();
    if (!value) return false;
    try {
      return new RegExp(modelPattern).test(value);
    } catch {
      return /^[A-Za-z0-9][A-Za-z0-9._-]*(\/[A-Za-z0-9][A-Za-z0-9._-]*)?$/.test(value);
    }
  }, [model, modelPattern, provider]);

  /** Kanonischer Modellwert: DeepL hat keine Modellauswahl. */
  const effectiveModel = hasNoModelChoice(provider) ? "deepl-api" : model.trim();

  /**
   * Pausierter Lauf genau dieses Umfangs: er wird fortgesetzt statt neu
   * gestartet. Weichen Anbieter oder Modell von der Auswahl ab, wird derselbe
   * Lauf zuerst umgestellt.
   */
  const pausedRun = activeRun && activeRun.status === "paused" ? activeRun : null;
  const runNeedsSwitch =
    pausedRun != null && (pausedRun.provider !== provider || pausedRun.model !== effectiveModel);

  /**
   * Freigabezustand beobachten: Entsperren/Sperren wirkt sofort, und eine
   * abgelaufene 30-Minuten-Freigabe wird auch ohne Klick erkannt.
   */
  useEffect(() => {
    const sync = () => setAdminUnlocked(readAdminToken() != null);
    sync();
    const off = onAdminUnlockChange(sync);
    const timer = window.setInterval(sync, 20000);
    return () => {
      off();
      window.clearInterval(timer);
    };
  }, []);

  /** Umstellen ist eine geschützte Aktion: ohne gültige Freigabe geht sie nicht. */
  const switchNeedsRelease = runNeedsSwitch && !adminUnlocked;


  // Modell immer auf einen gültigen Kostensatz des gewählten Anbieters setzen.
  useEffect(() => {
    if (customModel) return;
    if (rates.length === 0) return;
    if (rates.some((r) => r.model === model)) return;
    setModel((rates.find((r) => r.is_default) ?? rates[0]).model);
  }, [rates, model, customModel]);

  const effectivePageKeys = scopeKind === "locale" ? [] : selectedPages;
  const signature = targetLocale ? scopeSignature(scopeKind, targetLocale, effectivePageKeys) : "";
  const filteredPages = useMemo(() => {
    const q = pageFilter.trim().toLowerCase();
    const list = q
      ? pages.filter((p) => p.page_key.includes(q) || p.title.toLowerCase().includes(q))
      : pages;
    return list.slice(0, 400);
  }, [pages, pageFilter]);

  const progress = activeRun ? runProgress(activeRun) : null;
  /** Ehrlicher Zustand: „abgeschlossen" nie zusammen mit unter 100 %. */
  const runState = activeRun ? describeRunState(activeRun) : null;

  /** Restzeit nur bei aktivem, gespeichertem Lauf und ausreichender Stichprobe. */
  const etaText = activeRun ? describeEta(activeRun) : "–";

  const globalConfigured = status?.global_authorization_configured ?? false;

  /** Sprach- oder Modellwechsel macht eine alte Vorschau ungültig. */
  const resetPreview = () => {
    setDry(null);
    setPreviewConfirmed(false);
  };

  // ---------------------------------------------------------------- Aktionen
  const changeVisibility = async (
    locale: string,
    field: "is_active" | "is_public",
    next: boolean,
    wasPublic: boolean,
  ) => {
    if (field === "is_public" && !next && wasPublic) {
      const ok = window.confirm(
        "Diese Sprache ist derzeit auf der Website sichtbar. Nach dem Ausblenden verschwindet sie aus dem öffentlichen Sprachumschalter. Wirklich ausblenden?",
      );
      if (!ok) return;
    }
    if (field === "is_active" && !next) {
      const ok = window.confirm(
        "Diese Sprache wird im CMS nicht mehr bearbeitbar und damit auch nicht mehr auf der Website sichtbar. Vorhandene Übersetzungen bleiben gespeichert. Fortfahren?",
      );
      if (!ok) return;
    }
    setVisibilityBusy(locale);
    setError(null);
    try {
      const saved = await setLocaleVisibility({
        locale,
        isActive: field === "is_active" ? next : undefined,
        isPublic: field === "is_public" ? next : undefined,
        reason: "Übersetzungsbereich",
      });
      // Ergebnis der Datenbank sofort übernehmen: die Sprache ist damit ohne
      // Warten auf eine neue Zahlenberechnung in Schritt 1 auswählbar.
      setBasics((prev) =>
        prev
          ? {
              ...prev,
              locales: prev.locales.map((l) =>
                l.locale === saved.locale
                  ? { ...l, is_active: saved.is_active, is_public: saved.is_public }
                  : l,
              ),
            }
          : prev,
      );
      if (saved.is_active) setTargetLocale((prev) => prev || saved.locale);
      toast.success("Sprachsichtbarkeit gespeichert.");
      // Bestätigung aus der Datenbank im Hintergrund; die Bedienung wartet nicht.
      void loadBasics({ refresh: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setVisibilityBusy(null);
    }
  };

  const doDryRun = async () => {
    if (!targetLocale) return;
    setDryBusy(true);
    setError(null);
    setMessage(null);
    setPreviewConfirmed(false);
    try {
      setDry(
        await requestDryRun({
          targetLocale,
          scopeKind,
          pageKeys: effectivePageKeys,
          provider,
          model: effectiveModel,
        }),
      );
      // Einzige Auswahlstelle: die getroffene Wahl wird hier gleich als
      // Sprachvoreinstellung gespeichert (geprüfter Serverweg).
      try {
        const saved = await setLocaleProvider(targetLocale, provider, effectiveModel);
        setMessage(
          `Für ${targetLabel || saved.locale} gespeichert: ${providerLabel} / ${modelLabel || saved.model}.`,
        );
        void loadBasics({ refresh: true });
      } catch (err) {
        setMessage(
          `Prüfung fertig. Die Voreinstellung für ${targetLabel || targetLocale} konnte nicht gespeichert werden: ${(err as Error).message}`,
        );
      }
    } catch (err) {
      setDry(null);
      setError((err as Error).message);
    } finally {
      setDryBusy(false);
    }
  };

  /**
   * Vorhandenen pausierten Lauf in einem Schritt weiterführen: bei
   * abweichendem Anbieter/Modell zuerst über den geprüften Serverweg umstellen,
   * danach fortsetzen. Zähler, Lauf-Nummer und übersetzte Texte bleiben.
   */
  const doResumePaused = async () => {
    if (!pausedRun || startBusy) return;
    const runId = pausedRun.id;
    setError(null);
    setStartError(null);
    setMessage(null);
    setStartBusy(true);
    try {
      if (runNeedsSwitch) {
        // Geschützte Aktion: ohne gültige Adminfreigabe darf hier nichts
        // scheinbar gelingen.
        if (!adminUnlocked) {
          throw new Error(
            `Die Umstellung auf ${providerLabel} braucht die Adminfreigabe. Bitte unten im Abschnitt „Schlüssel & Anbieter“ mit dem Adminpasswort entsperren und dann erneut fortsetzen.`,
          );
        }
        const res = await switchRunProvider({ runId, provider, model: effectiveModel });
        // Der Serverweg stellt Anbieter/Modell um. Ob er dabei auch schon auf
        // „läuft" setzt, ist nicht garantiert — deshalb wird der Zustand
        // geprüft und nur bei Bedarf fortgesetzt.
        const switched = res?.run as { status?: string } | undefined;
        if (switched?.status !== "running") await controlRun(runId, "resume");
        setMessage(
          `Lauf ${runId.slice(0, 8)} auf ${providerLabel} / ${effectiveModel} umgestellt und fortgesetzt.`,
        );
      } else {
        await controlRun(runId, "resume");
        setMessage(`Lauf ${runId.slice(0, 8)} wird fortgesetzt.`);
      }
      // Laufdaten sofort neu lesen: Schritt 5 zeigt ausschließlich den in der
      // Datenbank gespeicherten Zustand, nie die gewählte Absicht.
      let fresh = await readRun(runId);
      if (fresh?.status === "paused") {
        // Sicherheitsnetz: Umstellung erfolgt, Lauf aber noch pausiert.
        await controlRun(runId, "resume");
        fresh = await readRun(runId);
      }
      if (fresh) setActiveRun(fresh);
      setActiveRunId(runId);
      if (fresh && fresh.status === "paused") {
        setStartError(
          `Der Lauf steht weiterhin auf „pausiert“ (${fresh.last_error ?? "kein Grund gemeldet"}). Bitte die Meldung prüfen und erneut fortsetzen.`,
        );
      }
      void loadRuns();
      void loadBasics({ refresh: true });
    } catch (err) {
      const msg = (err as Error).message;
      setStartError(msg);
      setError(msg);
      // Auch im Fehlerfall den echten Datenbankstand zeigen.
      try {
        const fresh = await readRun(runId);
        if (fresh) setActiveRun(fresh);
      } catch {
        // Anzeige bleibt beim letzten gelesenen Stand.
      }
    } finally {
      setStartBusy(false);
    }
  };

  const doStart = async () => {
    if (pausedRun) {
      await doResumePaused();
      return;
    }
    if (!targetLocale || !dry || startBusy) return;
    setError(null);
    setStartError(null);
    setMessage(null);
    setStartBusy(true);
    try {
      // Doppelklickschutz: gibt es zu genau diesem Umfang schon einen offenen
      // Lauf, wird er nur angezeigt — es entsteht kein zweiter Auftrag.
      const existing = await findActiveRunForScope({
        targetLocale,
        scopeKind,
        pageKeys: effectivePageKeys,
      });
      if (existing) {
        setActiveRunId(existing.id);
        setActiveRun(existing);
        setMessage(
          `Lauf läuft bereits (Lauf-Nummer ${existing.id.slice(0, 8)}). Die Anzeige unten zeigt diesen Lauf.`,
        );
        return;
      }
      setMessage("Auftrag angenommen — der Server startet den Lauf. Die Anzeige unten aktualisiert sich selbst.");
      const res = await startRun({
        targetLocale,
        scopeKind,
        pageKeys: effectivePageKeys,
        provider,
        model: effectiveModel,
        authorizationCode: scopeKind === "locale" ? adminRelease : undefined,
      });
      setActiveRunId(res.run_id);
      if (scopeKind === "locale" && adminRelease.trim() !== "") setReleaseAccepted(true);
      setMessage(
        res.reused
          ? `Lauf läuft bereits (Lauf-Nummer ${res.run_id.slice(0, 8)}) und wird fortgesetzt.`
          : `Auftrag angenommen (Lauf-Nummer ${res.run_id.slice(0, 8)}). Die Verarbeitung läuft auf dem Server; das Fenster darf geschlossen werden.`,
      );
      void loadRuns();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setStartBusy(false);
    }
  };

  const doControl = async (action: "pause" | "resume" | "cancel") => {
    if (!activeRunId) return;
    setError(null);
    try {
      const res = await controlRun(activeRunId, action);
      setActiveRun(res.run);
      setMessage(
        action === "pause"
          ? "Lauf pausiert — Stand ist gespeichert."
          : action === "resume"
            ? "Lauf wird fortgesetzt."
            : "Lauf abgebrochen. Bereits übersetzte Felder bleiben erhalten.",
      );
      void loadRuns();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const doQa = async () => {
    if (!targetLocale) return;
    setQaBusy(true);
    setError(null);
    try {
      const res = await requestQaReport({
        targetLocale,
        scopeKind,
        pageKeys: effectivePageKeys,
        limit: 800,
      });
      setQa(res.qa);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setQaBusy(false);
    }
  };

  const downloadCsv = () => {
    if (!qa) return;
    const blob = new Blob([`\uFEFF${qaReportToCsv(qa)}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uebersetzung-qa-${qa.target_locale}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** Druckbarer Gesamtbericht (Browser-Druck → „Als PDF speichern"). */
  const printReport = () => {
    const html = buildReportHtml({ locale: targetLocale, status, qa });
    const w = window.open("", "_blank", "width=1000,height=800");
    if (!w) {
      toast.error("Bericht konnte nicht geöffnet werden. Bitte Pop-ups erlauben.");
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  /**
   * Start ist nur erlaubt, wenn Vorschau vorliegt und bestätigt ist, Anbieter
   * und Modell stimmen und — bei einem Gesamtlauf — der serverseitige
   * Freigabecode eingerichtet und im Einrichtungsbereich eingegeben wurde.
   */
  const startBlockReason = (() => {
    // Fortsetzen eines pausierten Laufs braucht keine neue Vorschau: es wird
    // nichts zusätzlich geplant, nur derselbe Lauf weitergeführt.
    if (pausedRun) {
      if (!providerConfigured) return "Für den gewählten Anbieter ist kein Schlüssel hinterlegt.";
      if (!modelValid) return "Bitte in Schritt 2 ein gültiges Modell wählen.";
      if (switchNeedsRelease)
        return `Die Umstellung des pausierten Laufs auf ${providerLabel} braucht die Adminfreigabe (30 Minuten gültig).`;
      return null;
    }
    if (!dry) return "Bitte zuerst Schritt 3 ausführen (fehlende Texte prüfen).";
    if (dry.dry_run.todo_fields === 0)
      return "Nichts zu tun — alle Zieltexte sind aktuell oder von Hand geprüft.";
    if (!providerConfigured) return "Für den gewählten Anbieter ist kein Schlüssel hinterlegt.";
    if (!modelValid) return "Bitte in Schritt 2 ein gültiges Modell wählen.";
    if (scopeKind !== "locale" && effectivePageKeys.length === 0)
      return "Bitte im Bereich „Seiten und Umfang“ mindestens eine Seite wählen.";
    if (scopeKind === "locale" && !globalConfigured)
      return "Gesamtlauf noch nicht administrativ freigeschaltet.";
    if (scopeKind === "locale" && !releaseAccepted && adminRelease.trim() === "")
      return "Gesamtlauf: Freigabecode im Bereich „Einmalige Einrichtung“ eingeben.";
    if (!previewConfirmed) return "Bitte die Vorschau bestätigen.";
    return null;
  })();

  // ------------------------------------------------------------------ Render
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold">Übersetzungen</h2>
        <span className="rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
          Quelle: {sourceLocale ? `${sourceLocale.label_de} (${sourceLocale.locale})` : "—"} ·
          verbindlich
        </span>
        <button
          type="button"
          className={btn}
          onClick={() => {
            void loadBasics({ refresh: true });
            void loadCoverage({ refresh: true });
            void loadRuns();
          }}
        >
          Zahlen neu laden
        </button>
      </div>

      {/*
        Sprachliste zuerst und immer: sie hängt ausschließlich an den schnellen
        Basisdaten (`basics`). Weder die teure Sprachstand-Berechnung noch ein
        Fehler darin darf diesen Block entfernen.
      */}
      <AdminSectionBoundary label="Sprachen und Sichtbarkeit">
        <LocaleManagerPanel
          locales={allLocales}
          loading={statusLoading}
          busyLocale={visibilityBusy}
          error={statusError}
          onReload={() => loadBasics({ refresh: true })}
          onChangeVisibility={changeVisibility}
          onLocaleAdded={() => loadBasics({ refresh: true })}
          onRefreshCoverage={() => loadCoverage({ refresh: true })}
          onCompleteMissing={(loc) => {
            setTargetLocale(loc);
            resetPreview();
            setMessage(
              "Sprache übernommen. Bitte in Schritt 3 „Fehlende Texte prüfen“ — nur fehlende Texte werden ergänzt.",
            );
          }}
        />
      </AdminSectionBoundary>

      {/*
        Schlüssel & Anbieter: in der offenen Ansicht nur Erklärung, die
        eigentliche Verwaltung erst nach Anmeldung mit Administrationsrechten.
      */}
      <AdminSectionBoundary label="Schlüssel und Anbieter">
        <ProviderKeysPanel
          highlightProvider={keySetupProvider}
          onChanged={() => loadBasics({ refresh: true })}
        />
      </AdminSectionBoundary>


      {coverageError && (
        <div className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800">
          Die Übersetzungszahlen konnten gerade nicht berechnet werden
          {/^.*(timeout|504|Zeit).*/i.test(coverageError)
            ? " (die Berechnung hat zu lange gedauert)"
            : ""}
          . Sprachwahl, Aktivierung und Läufe funktionieren weiter.{" "}
          <button
            type="button"
            className={`${btn} ml-2`}
            onClick={() => void loadCoverage({ refresh: true })}
          >
            Zahlen erneut berechnen
          </button>
        </div>
      )}
      {error && (
        <div className="rounded border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded border bg-muted/40 p-3 text-sm text-muted-foreground">{message}</div>
      )}

      {/* ==================================== Automatik für neue deutsche Texte */}
      <AdminSectionBoundary label="Automatik für neue deutsche Texte">
        <AutopilotPanel />
      </AdminSectionBoundary>

      {/* ============================================ Hauptablauf (immer offen) */}
      <AdminSectionBoundary label="Ablauf Übersetzungen">
      <section className={`${box} space-y-3`} aria-label="Hauptablauf Übersetzungen">
        {statusLoading && !basics && (
          <p className="rounded border bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
            Sprachen, Anbieter und Kostensätze werden aus der Datenbank geladen …
          </p>
        )}
        {!statusLoading && statusError && (
          <div className="rounded border border-destructive/40 bg-destructive/5 px-2 py-1 text-xs text-destructive">
            Auswahl nicht möglich: {statusError}
            <button
              type="button"
              className={`${btn} ml-2`}
              onClick={() => void loadBasics({ refresh: true })}
            >
              Neu laden
            </button>
          </div>
        )}
        {!statusLoading && !statusError && basics && activeLocales.length === 0 && (
          <div className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-800">
            Außer der Quellsprache ist keine Sprache im CMS bearbeitbar. Bitte oben in der
            Sprachzeile eine Zielsprache aktivieren.
          </div>
        )}

        {/* ------------------------------------------------- 1 Sprache wählen */}
        <Step n={1} title="Sprache wählen">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <select
              aria-label="Zielsprache"
              className="rounded border bg-background px-2 py-1 disabled:opacity-60"
              value={targetLocale}
              disabled={selectsBusy || activeLocales.length === 0}
              onChange={(e) => {
                setTargetLocale(e.target.value);
                resetPreview();
              }}
            >
              {activeLocales.length === 0 && (
                <option value="">{selectsBusy ? "lädt …" : "keine Sprache verfügbar"}</option>
              )}
              {activeLocales.map((l) => (
                <option key={l.locale} value={l.locale}>
                  {l.label_de} ({l.locale})
                </option>
              ))}
            </select>
            {localeRow && (
              <span className="text-muted-foreground">
                vorhanden {num(localeRow.filled)} · fehlt {num(missingCount)} · muss aktualisiert
                werden {num(localeRow.stale)}
                {notPreparedCount > 0 ? ` · technische Ausnahmen ${num(notPreparedCount)}` : ""}
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Deutsch ist Quelle und kann nicht Zielsprache sein.
          </p>
        </Step>

        {/* --------------------------------------- 2 Anbieter und Modell wählen */}
        <Step n={2} title="Anbieter und Modell wählen">
          <div className="flex flex-wrap items-end gap-3 text-xs">
            <label className="flex flex-col gap-1">
              <span className="text-muted-foreground">Anbieter</span>
              <select
                aria-label="Anbieter"
                className="rounded border bg-background px-2 py-1 disabled:opacity-60"
                value={provider}
                disabled={selectsBusy || providerList.length === 0}
                onChange={(e) => {
                  const next = e.target.value;
                  setProvider(next);
                  const own = (status?.rates ?? []).filter(
                    (r) => r.provider === next && r.is_enabled,
                  );
                  setCustomModel(false);
                  setKeySetupProvider(null);
                  setModel(
                    hasNoModelChoice(next)
                      ? "deepl-api"
                      : ((own.find((r) => r.is_default) ?? own[0])?.model ?? ""),
                  );
                  resetPreview();
                }}
              >
                {providerList.length === 0 && (
                  <option value="">{selectsBusy ? "lädt …" : "kein Anbieter verfügbar"}</option>
                )}
                {providerList.map((p) => (
                  <option key={p.provider} value={p.provider}>
                    {p.label} — {p.configured ? "konfiguriert" : "nicht konfiguriert"}
                  </option>
                ))}
              </select>
            </label>

            {hasNoModelChoice(provider) ? (
              <p className="rounded border bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground">
                DeepL benötigt keine Modellauswahl. Es wird der vorhandene Vertrag{" "}
                <span className="font-mono">deepl-api</span> verwendet.
              </p>
            ) : (
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground">Modell</span>
                <select
                  aria-label="Modell"
                  className="rounded border bg-background px-2 py-1 disabled:opacity-60"
                  value={customModel ? "__custom__" : model}
                  disabled={selectsBusy || (rates.length === 0 && !customModel)}
                  onChange={(e) => {
                    const next = e.target.value;
                    resetPreview();
                    if (next === "__custom__") {
                      setCustomModel(true);
                      setModel("");
                      return;
                    }
                    setCustomModel(false);
                    setModel(next);
                  }}
                >
                  {rates.length === 0 && (
                    <option value="">
                      {selectsBusy
                        ? "lädt …"
                        : providerConfigured
                          ? "kein Modell für diesen Anbieter gepflegt"
                          : "erst eigenen Schlüssel einrichten"}
                    </option>
                  )}
                  {rates.map((r) => (
                    <option key={r.model} value={r.model}>
                      {r.label}
                      {r.is_default ? " (Voreinstellung)" : ""}
                    </option>
                  ))}
                  <option value="__custom__">Eigenes Modell (Kennung eingeben) …</option>
                </select>
              </label>
            )}
          </div>
          <p className="mt-2 rounded border bg-muted/30 px-2 py-1 text-[11px]">
            Aktiv: <strong>{providerLabel}</strong> ·{" "}
            <span className="font-mono">{model || "—"}</span>
            {modelLabel && modelLabel !== model ? ` (${modelLabel})` : ""} ·{" "}
            {providerConfigured ? "Schlüssel hinterlegt" : "kein Schlüssel hinterlegt"}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            <strong>Gemini 3.6 Flash</strong>: Voreinstellung für große Mengen.{" "}
            <strong>GPT-6 Astra</strong>: Qualitätsoption für schwierige Fachtexte. Auswahl und
            Voreinstellung kommen aus der Datenbank.
          </p>
          {customModel && (
            <div className="mt-2 rounded border border-dashed bg-muted/10 p-2">
              <label className="flex flex-col gap-1 text-xs">
                <span className="text-muted-foreground">
                  Eigene Modell-Kennung (Form: anbieter/modell)
                </span>
                <input
                  className="w-80 rounded border bg-background px-2 py-1 font-mono"
                  placeholder="z. B. google/gemini-3.8-flash"
                  value={model}
                  onChange={(e) => {
                    setModel(e.target.value);
                    resetPreview();
                  }}
                />
              </label>
              {model.trim() !== "" && !modelValid && (
                <p className="mt-1 text-[11px] font-medium text-destructive">
                  Diese Kennung ist nicht zulässig. {modelHint}
                </p>
              )}
            </div>
          )}
          {pausedRun && (
            <div className="mt-2 rounded border bg-muted/30 px-3 py-2 text-[11px]">
              <p>
                Für {targetLabel || targetLocale} gibt es einen pausierten Lauf (Nummer{" "}
                {pausedRun.id.slice(0, 8)}). Am Lauf gespeichert:{" "}
                <span className="font-mono">
                  {pausedRun.provider} / {pausedRun.model}
                </span>
                . Ausgewählt ist:{" "}
                <span className="font-mono">
                  {provider} / {effectiveModel || "—"}
                </span>
                .
              </p>
              <p className="mt-1 text-muted-foreground">
                {runNeedsSwitch
                  ? "Beim Fortsetzen in Schritt 4 wird derselbe Lauf automatisch auf diese Auswahl umgestellt — bereits übersetzte Texte und die Lauf-Nummer bleiben erhalten."
                  : "Auswahl und Lauf stimmen überein — in Schritt 4 wird derselbe Lauf einfach fortgesetzt."}
              </p>
            </div>
          )}
          {status && !providerConfigured && (
            <div className="mt-2 rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-800">
              <p className="font-medium">
                Für <strong>{providerLabel}</strong> ist noch kein eigener Schlüssel hinterlegt — ein
                Start ist gesperrt.
              </p>
              {isOwnKeyProvider(provider) && (
                <>
                  <p className="mt-1">
                    So geht es weiter: unten im Abschnitt „Schlüssel &amp; Anbieter" zuerst mit dem
                    Adminpasswort entsperren, dann den Schlüssel von {providerLabel} speichern.
                    Danach werden die Modelle geladen und stehen hier zur Auswahl.
                    {hasNoModelChoice(provider) && " DeepL benötigt keine Modellauswahl."}
                  </p>
                  <button
                    type="button"
                    className={`${btnPrimary} mt-2`}
                    onClick={() => {
                      setKeySetupProvider(provider);
                      document
                        .getElementById(PROVIDER_KEYS_ANCHOR_ID)
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  >
                    Eigenen Schlüssel einrichten
                  </button>
                </>
              )}
            </div>
          )}
        </Step>

        {/* -------------------------------------- 3 Fehlende Texte prüfen */}
        <Step n={3} title="Fehlende Texte prüfen">
          <button
            type="button"
            className={btnPrimary}
            onClick={doDryRun}
            disabled={dryBusy || !targetLocale || !modelValid}
          >
            {dryBusy ? "Prüfung läuft …" : "Fehlende Texte prüfen"}
          </button>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Die Prüfung bereitet die Zielsprache automatisch vor und zählt danach nur fehlende und
            veraltete Texte. Nach Sprach- oder Modellwechsel muss neu geprüft werden.
          </p>

          {dry && (
            <div className="mt-2 rounded border bg-muted/20 p-2">
              <p className="text-xs font-medium">Vorschau (Schätzung, noch nichts übersetzt)</p>
              <p className="mt-1 text-xs">
                <strong>{num(dry.dry_run.todo_fields)} fehlende Texte werden übersetzt</strong>;{" "}
                {num(dry.dry_run.targets_existing)} vorhandene bleiben erhalten.
              </p>
              {(() => {
                // Verständliche Aufteilung: Seiteninhalte (Redaktion) und
                // Bedienungstexte der Oberfläche werden gemeinsam geplant.
                const byArea = dry.dry_run.by_area ?? {};
                const ui = byArea.ui_string?.todo ?? 0;
                const content = Object.entries(byArea)
                  .filter(([area]) => area !== "ui_string")
                  .reduce((sum, [, row]) => sum + (row?.todo ?? 0), 0);
                return (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Davon Seiteninhalte: <strong>{num(content)}</strong> · Bedienungstexte
                    (Schaltflächen, Filter, Hinweise): <strong>{num(ui)}</strong>
                  </p>
                );
              })()}

              <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-5">
                {[
                  ["jetzt übersetzbar (fehlt/veraltet)", num(dry.dry_run.todo_fields)],
                  ["vorhanden (unberührt)", num(dry.dry_run.targets_existing)],
                  ["geschützt (von Hand geprüft)", num(dry.dry_run.protected_manual)],
                  ["erwartete Modellaufrufe", num(dry.estimate.model_calls_expected)],
                  ...(dry.dry_run.not_whitelisted > 0
                    ? ([["technische Ausnahmen", num(dry.dry_run.not_whitelisted)]] as [
                        string,
                        string,
                      ][])
                    : []),
                ].map(([label, value]) => (
                  <div key={label} className="rounded border bg-background px-2 py-1">
                    <div className="text-[10px] text-muted-foreground">{label}</div>
                    <div className="font-semibold">{value}</div>
                  </div>
                ))}
              </div>
              {dry.dry_run.not_whitelisted > 0 && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Technische Ausnahmen: {num(dry.dry_run.not_whitelisted)} deutsche Texte konnten für
                  diese Sprache nicht automatisch vorbereitet werden (z. B. weil der zugehörige
                  Baustein inzwischen entfernt wurde). Sie werden weder gezählt noch angefasst. Es
                  ist keine Handarbeit an einzelnen Feldern nötig.
                </p>
              )}
              <p className="mt-2 text-xs">
                {dry.estimate.cost_available === false ||
                dry.estimate.cost_per_1k_source_chars <= 0 ? (
                  <>
                    <strong>Kostenschätzung nicht verfügbar.</strong> {dry.estimate.basis}
                  </>
                ) : (
                  <>
                    <strong>Kostenschätzung: {eur(dry.estimate.cost_estimate)}</strong> (Schätzung,
                    keine Zusage) · {dry.estimate.basis}
                  </>
                )}{" "}
                Modell: <span className="font-mono">{dry.estimate.model ?? model}</span>
              </p>
              <label className="mt-2 flex items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={previewConfirmed}
                  onChange={(e) => setPreviewConfirmed(e.target.checked)}
                  aria-label="Vorschau bestätigen"
                />
                <span>
                  Vorschau geprüft: Es werden nur die {num(dry.dry_run.todo_fields)} fehlenden bzw.
                  veralteten Texte übersetzt. Vorhandene und von Hand geprüfte Texte bleiben
                  unverändert.
                </span>
              </label>
            </div>
          )}
        </Step>

        {/* ---------------------------------------- 4 Übersetzung starten */}
        <Step n={4} title="Übersetzung starten">
          <button
            type="button"
            className={btnPrimary}
            onClick={doStart}
            disabled={startBusy || startBlockReason != null}
          >
            {startBusy
              ? pausedRun
                ? runNeedsSwitch
                  ? `Lauf wird auf ${providerLabel} umgestellt und fortgesetzt …`
                  : "Lauf wird fortgesetzt …"
                : "Lauf wird gestartet …"
              : pausedRun
                ? `${targetLabel || targetLocale} mit ${providerLabel} fortsetzen`
                : scopeKind === "locale"
                ? `Alle fehlenden Texte in ${targetLabel || "…"} übersetzen`
                : `Fehlende Texte der gewählten Seiten übersetzen (${effectivePageKeys.length})`}
          </button>
          {startBlockReason && (
            <p className="mt-1 text-[11px] text-amber-700">{startBlockReason}</p>
          )}
          {switchNeedsRelease && (
            <div className="mt-2 rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-900">
              <p className="font-medium">Adminfreigabe fehlt oder ist abgelaufen.</p>
              <p className="mt-1">
                Der pausierte Lauf {pausedRun?.id.slice(0, 8)} ist noch auf{" "}
                <span className="font-mono">
                  {pausedRun?.provider} / {pausedRun?.model}
                </span>{" "}
                gespeichert. Die Umstellung auf {providerLabel} ist ein geschützter Schritt: bitte
                einmal mit dem Adminpasswort entsperren (gilt 30 Minuten), dann hier fortsetzen.
              </p>
              <button
                type="button"
                className={`${btnPrimary} mt-2`}
                onClick={() => {
                  setKeySetupProvider(provider);
                  document
                    .getElementById(PROVIDER_KEYS_ANCHOR_ID)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                Jetzt entsperren
              </button>
            </div>
          )}
          {startError && (
            <div
              role="alert"
              className="mt-2 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] text-destructive"
            >
              {startError}
            </div>
          )}


          {scopeKind === "locale" && !globalConfigured && (
            <details className="mt-2 rounded border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-900">
              <summary className="cursor-pointer select-none font-medium">
                Einmalige Einrichtung erforderlich
              </summary>
              <p className="mt-1">
                Der CMS-Bereich hat derzeit keine Anmeldung. Deshalb muss ein Administrator einmalig
                einen privaten Freigabecode in den Projekteinstellungen hinterlegen. Danach kann der
                Redakteur den Lauf hier starten.
              </p>
              <p className="mt-1">
                Weg dorthin: im Lovable-Projekt oben rechts auf die Projekteinstellungen und dort
                den Abschnitt für Geheimnisse öffnen, einen selbst gewählten langen Code speichern
                und diese Seite neu laden.
              </p>
              <p className="mt-1">
                Der Server meldet dem Browser ausschließlich, <em>ob</em> ein Code hinterlegt ist —
                niemals den Wert. Mehr kann die Oberfläche nicht sicher erkennen.
              </p>
              <label className="mt-2 flex flex-col gap-1">
                <span>Admin-Freigabecode für diese Sitzung (optional, wird nicht gespeichert)</span>
                <input
                  className="w-64 rounded border bg-background px-2 py-1"
                  type="password"
                  autoComplete="off"
                  aria-label="Admin-Freigabecode für diese Sitzung"
                  value={adminRelease}
                  onChange={(e) => setAdminRelease(e.target.value)}
                />
              </label>
            </details>
          )}
          {scopeKind === "locale" && globalConfigured && (
            <details className="mt-2 rounded border p-2 text-xs">
              <summary className="cursor-pointer select-none text-muted-foreground">
                Einmalige Einrichtung (erledigt)
              </summary>
              <p className="mt-1 text-muted-foreground">
                Ein Freigabecode ist serverseitig hinterlegt. Für den Start eines Gesamtlaufs muss er
                hier einmal je Sitzung eingegeben werden; er wird nur an den geschützten Serverdienst
                gesendet und nicht gespeichert.
              </p>
              {releaseAccepted && (
                <p className="mt-1 font-medium text-emerald-700">
                  Für diese Sitzung freigeschaltet — keine erneute Eingabe nötig.
                </p>
              )}
              <label className="mt-2 flex flex-col gap-1">
                <span>Admin-Freigabecode für diese Sitzung</span>
                <input
                  className="w-64 rounded border bg-background px-2 py-1"
                  type="password"
                  autoComplete="off"
                  aria-label="Admin-Freigabecode für diese Sitzung"
                  value={adminRelease}
                  onChange={(e) => setAdminRelease(e.target.value)}
                />
              </label>
            </details>
          )}
        </Step>

        {/* ------------------------------------------------ 5 Fortschritt */}
        <Step n={5} title="Fortschritt">
          {activeRun && progress ? (
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded bg-muted px-2 py-0.5 text-[11px]">
                  {activeRun.target_locale} ·{" "}
                  {activeRun.scope_kind === "locale" ? "ganze Sprache" : "gewählte Seiten"} ·{" "}
                  {runState?.label ?? RUN_STATUS_LABEL[activeRun.status] ?? activeRun.status}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {activeRun.provider} / {activeRun.model}
                </span>
              </div>
              {runState?.incomplete && (
                <p className="mb-2 rounded border border-destructive/40 bg-destructive/5 px-2 py-1 text-[11px]">
                  Der Lauf ist nicht vollständig: {num(runState.remaining)} Restobjekte offen.
                  Grund: {runState.reason}. Mit „Restlauf fortsetzen" arbeitet der Server weiter;
                  vorhandene und von Hand gepflegte Texte bleiben unangetastet.
                </p>
              )}

              <div className="h-2 w-full overflow-hidden rounded bg-muted">
                <div className="h-full bg-foreground" style={{ width: `${progress.percent}%` }} />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:grid-cols-6">
                {[
                  ["Fortschritt", `${progress.percent} %`],
                  ["verarbeitet", `${num(progress.processed)} / ${num(progress.planned)}`],
                  ["übersetzt", num(activeRun.fields_done)],
                  ["übersprungen", num(activeRun.fields_skipped)],
                  ["offen", num(progress.remaining)],
                  ["Fehler", num(activeRun.fields_failed)],
                  [
                    "letzte Serveraktivität",
                    progress.secondsSinceActivity <= 5
                      ? "gerade eben"
                      : `vor ${formatSeconds(progress.secondsSinceActivity)}`,
                  ],
                  ["Lauf-Nummer", activeRun.id.slice(0, 8)],
                  [
                    "Phase",
                    activeRun.status === "running"
                      ? progress.isComplete
                        ? "wird abgeschlossen"
                        : "wird verarbeitet"
                      : (runState?.label ?? RUN_STATUS_LABEL[activeRun.status] ?? activeRun.status),

                  ],
                  ["Tempo", `${progress.throughput.toFixed(2)} Texte/s`],
                  ["Restzeit", etaText],
                  ["Laufzeit", formatSeconds(progress.runtimeSeconds)],
                  ["Kosten (Schätzung)", eur(Number(activeRun.cost_estimate))],
                ].map(([label, value]) => (
                  <div key={label} className="rounded border bg-background px-2 py-1">
                    <div className="text-[10px] text-muted-foreground">{label}</div>
                    <div className="font-semibold">{value}</div>
                  </div>
                ))}
              </div>
              {activeRun.last_error && (
                <p className="mt-1 text-[11px] text-destructive">
                  Letzte Meldung: {activeRun.last_error}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={btn}
                  onClick={() => void doControl("pause")}
                  disabled={activeRun.status !== "running"}
                >
                  Pausieren
                </button>
                <button
                  type="button"
                  className={btn}
                  onClick={() => void doControl("resume")}
                  disabled={!runState?.canResume}
                >
                  {runState?.incomplete ? "Restlauf fortsetzen" : "Fortsetzen"}
                </button>

                <button
                  type="button"
                  className={btn}
                  onClick={() => void doControl("cancel")}
                  disabled={["done", "cancelled"].includes(activeRun.status)}
                >
                  Abbrechen
                </button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Die Verarbeitung läuft serverseitig weiter — dieses Fenster darf geschlossen werden.
                Alle Zahlen kommen aus der Datenbank. Fortsetzungsmarke:{" "}
                {activeRun.cursor_page_key
                  ? `${activeRun.cursor_page_key} / ${activeRun.cursor_section_key} / ${activeRun.cursor_field_key}`
                  : "Anfang"}
                .
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              {targetLocale
                ? noRunForScope
                  ? `Für ${targetLabel} wurde in diesem Umfang noch kein Lauf gestartet. Frühere Läufe anderer Sprachen stehen weiter unten unter „Bisherige Läufe".`
                  : "Lauf dieser Sprache wird geladen …"
                : "Bitte zuerst eine Zielsprache wählen."}
            </p>
          )}
        </Step>
      </section>
      </AdminSectionBoundary>

      {/* ====================================================== Akkordeons */}
      <Panel
        title="Abdeckung nach Inhaltsbereich"
        hint={`${num(totalUnits)} deutsche Texte insgesamt`}
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span>
            {coverageError
              ? "Die Zahlen konnten gerade nicht berechnet werden. Die übrige Bedienung ist davon nicht betroffen."
              : coverageLoading && !coverage
                ? "Die Zahlen werden geladen …"
                : coverage?.cache
                  ? `Stand der Zusammenfassung: ${new Date(
                      coverage.cache.computed_at,
                    ).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}` +
                    (coverage.cache.busy
                      ? " · Eine Neuberechnung läuft gerade; bitte in einem Moment erneut prüfen."
                      : coverage.cache.is_stale
                        ? " · Es gab seither Änderungen; die Zahlen werden beim nächsten Aufruf neu berechnet."
                        : "")
                  : "Die Zahlen werden serverseitig gespeichert und nicht bei jedem Öffnen neu gerechnet."}
          </span>
          <button
            type="button"
            className="rounded border px-2 py-0.5 hover:bg-muted disabled:opacity-50"
            onClick={() => void loadCoverage({ refresh: true })}
            disabled={coverageLoading}
          >
            {coverageLoading ? "Wird neu berechnet …" : "Zahlen neu berechnen"}
          </button>
        </div>
        <div className="overflow-x-auto">

          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-1 pr-3">Sprache</th>
                <th className="py-1 pr-3">Status</th>
                <th className="py-1 pr-3">deutsche Texte</th>
                <th className="py-1 pr-3">vorhanden</th>
                <th className="py-1 pr-3">fehlt</th>
                <th className="py-1 pr-3">muss aktualisiert werden</th>
                <th className="py-1 pr-3">noch nicht vorbereitet</th>
                <th className="py-1 pr-3">Fehler</th>
                <th className="py-1 pr-3">offene Läufe</th>
                <th className="py-1 pr-3">Abdeckung</th>
              </tr>
            </thead>
            <tbody>
              {(status?.coverage.locales ?? []).map((l) => {
                const total = status?.coverage.de_translatable_fields ?? 0;
                const missing = Math.max(0, total - l.filled);
                const coveragePercent = total > 0 ? Math.round((l.filled / total) * 100) : 0;
                return (
                  <tr key={l.locale} className="border-t">
                    <td className="py-1 pr-3 font-medium">
                      {l.label_de} <span className="text-muted-foreground">({l.locale})</span>
                    </td>
                    <td className="py-1 pr-3">
                      {l.is_source
                        ? "Quellsprache"
                        : l.is_active
                          ? l.is_public
                            ? "im CMS bearbeitbar, auf der Website sichtbar"
                            : "im CMS bearbeitbar, nicht auf der Website sichtbar"
                          : "im CMS nicht bearbeitbar"}
                    </td>
                    <td className="py-1 pr-3">{l.is_source ? num(l.filled) : num(total)}</td>
                    <td className="py-1 pr-3">{num(l.filled)}</td>
                    <td className="py-1 pr-3">{l.is_source ? "–" : num(missing)}</td>
                    <td className="py-1 pr-3">{num(l.stale)}</td>
                    <td className="py-1 pr-3">{l.is_source ? "–" : num(l.not_whitelisted)}</td>
                    <td className="py-1 pr-3">{num(l.failed_jobs)}</td>
                    <td className="py-1 pr-3">{num(l.open_runs)}</td>
                    <td className="py-1 pr-3">{l.is_source ? "100 %" : `${coveragePercent} %`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-1 pr-3">Inhaltsbereich</th>
                <th className="py-1 pr-3">deutsche Texte</th>
                {(status?.coverage.locales ?? [])
                  .filter((l) => !l.is_source)
                  .map((l) => (
                    <th key={l.locale} className="py-1 pr-3">
                      {l.locale.toUpperCase()} fehlt / zu übersetzen
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {(status?.coverage.areas ?? []).map((a) => (
                <tr key={a} className="border-t">
                  <td className="py-1 pr-3">{AREA_LABEL[a] ?? a}</td>
                  <td className="py-1 pr-3">{num(status?.coverage.source_by_area?.[a] ?? 0)}</td>
                  {(status?.coverage.locales ?? [])
                    .filter((l) => !l.is_source)
                    .map((l) => {
                      const row = l.by_area?.[a];
                      const src = status?.coverage.source_by_area?.[a] ?? 0;
                      const missing = Math.max(0, src - (row?.filled ?? 0));
                      return (
                        <td key={l.locale} className="py-1 pr-3">
                          {num(missing)} / {num(row?.todo ?? 0)}
                        </td>
                      );
                    })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Sprachen kommen aus der zentralen Sprachliste der CMS-Datenbank. „Noch nicht vorbereitet"
          zählt deutsche Texte, deren Zielsprachenfeld intern noch nicht aktiviert ist.
        </p>
      </Panel>

      <Panel
        title="Seiten und Umfang"
        hint={
          scopeKind === "locale"
            ? "derzeit: ganze Sprache"
            : `derzeit: ${effectivePageKeys.length} Seite(n)`
        }
      >
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Umfang</span>
          <select
            aria-label="Umfang"
            className="w-64 rounded border bg-background px-2 py-1"
            value={scopeKind}
            onChange={(e) => {
              setScopeKind(e.target.value as TranslationScopeKind);
              resetPreview();
            }}
          >
            <option value="locale">alle fehlenden Texte der Sprache</option>
            <option value="page">eine Seite</option>
            <option value="pages">ausgewählte Seiten</option>
          </select>
        </label>

        {scopeKind !== "locale" && (
          <div className="mt-3">
            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
              <input
                className="w-56 rounded border bg-background px-2 py-1"
                placeholder="Seiten filtern …"
                value={pageFilter}
                onChange={(e) => setPageFilter(e.target.value)}
              />
              <span className="text-muted-foreground">{selectedPages.length} Seite(n) gewählt</span>
              <button
                type="button"
                className={btn}
                onClick={() => {
                  setSelectedPages([]);
                  resetPreview();
                }}
              >
                Auswahl leeren
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto rounded border">
              {filteredPages.map((p) => {
                const checked = selectedPages.includes(p.page_key);
                return (
                  <label
                    key={p.page_key}
                    className="flex cursor-pointer items-center gap-2 border-b px-2 py-1 text-xs last:border-b-0 hover:bg-muted/50"
                  >
                    <input
                      type={scopeKind === "page" ? "radio" : "checkbox"}
                      checked={checked}
                      onChange={() => {
                        resetPreview();
                        setSelectedPages((prev) =>
                          scopeKind === "page"
                            ? [p.page_key]
                            : prev.includes(p.page_key)
                              ? prev.filter((k) => k !== p.page_key)
                              : [...prev, p.page_key],
                        );
                      }}
                    />
                    <span className="font-mono">{p.page_key}</span>
                    <span className="truncate text-muted-foreground">{p.title}</span>
                  </label>
                );
              })}
              {filteredPages.length === 0 && (
                <p className="px-2 py-2 text-xs text-muted-foreground">
                  {pagesError
                    ? `Seitenliste konnte nicht geladen werden: ${pagesError}`
                    : "Keine Seite gefunden."}
                </p>
              )}
            </div>
          </div>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">
          Umfangs-Kennung (für Nachvollziehbarkeit): {signature || "—"}
        </p>
      </Panel>

      <Panel title="Texte ansehen und bearbeiten">
        <TranslationTextList
          locales={status?.locales ?? []}
          pages={pages}
          onJumpToField={onJumpToField}
        />
      </Panel>

      <Panel title="QA und Berichte">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <button type="button" className={btn} onClick={doQa} disabled={qaBusy || !targetLocale}>
            {qaBusy ? "Prüfung läuft …" : "Prüflauf starten"}
          </button>
          <button type="button" className={btn} onClick={downloadCsv} disabled={!qa}>
            Bericht als CSV
          </button>
          <button type="button" className={btn} onClick={printReport} disabled={!status}>
            Bericht drucken / als PDF
          </button>
        </div>
        {qa ? (
          <>
            <p className="text-xs">
              geprüft {num(qa.checked)} · ohne Befund {num(qa.ok)} · Befunde {num(qa.issues_total)} ·
              fehlgeschlagene Batches {num(qa.failed_batches)}
            </p>
            <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
              {Object.entries(qa.by_issue).map(([key, count]) => (
                <span key={key} className="rounded bg-muted px-2 py-0.5">
                  {ISSUE_LABEL[key] ?? key}: {num(count)}
                </span>
              ))}
            </div>
            <div className="mt-2 max-h-72 overflow-y-auto rounded border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card text-left text-muted-foreground">
                  <tr>
                    <th className="py-1 pl-2 pr-3">Seite / Baustein / Feld</th>
                    <th className="py-1 pr-3">Befund</th>
                    <th className="py-1 pr-3">Deutsch</th>
                    <th className="py-1 pr-3">Zielsprache</th>
                    <th className="py-1 pr-3" />
                  </tr>
                </thead>
                <tbody>
                  {qa.items.map((i) => (
                    <tr
                      key={`${i.page_key}|${i.section_key}|${i.field_key}`}
                      className="border-t align-top"
                    >
                      <td className="py-1 pl-2 pr-3 break-all font-mono">
                        {i.page_key} / {i.section_key} / {i.field_key}
                      </td>
                      <td className="py-1 pr-3">{ISSUE_LABEL[i.issue] ?? i.issue}</td>
                      <td className="py-1 pr-3">{i.de_value}</td>
                      <td className="py-1 pr-3">{i.target_value || "—"}</td>
                      <td className="py-1 pr-3">
                        {onJumpToField && (
                          <button
                            type="button"
                            className={btn}
                            onClick={() => onJumpToField(i.page_key, i.section_key, i.field_key)}
                          >
                            zur Stelle
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {qa.items.length === 0 && (
                    <tr>
                      <td className="py-2 pl-2 text-muted-foreground" colSpan={5}>
                        Keine Befunde.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Der Prüflauf vergleicht deutsche Quelltexte mit der Zielsprache: leere Ziele,
            unverändert deutsche Texte, fehlende Platzhalter, HTML, Links, Markenbegriffe,
            auffällige Längen und geänderte Quelltexte.
          </p>
        )}
      </Panel>

      <Panel title="Bisherige Läufe" hint={`${runs.length} gespeichert`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-1 pr-3">Start</th>
                <th className="py-1 pr-3">Sprache</th>
                <th className="py-1 pr-3">Umfang</th>
                <th className="py-1 pr-3">Status</th>
                <th className="py-1 pr-3">erledigt / geplant</th>
                <th className="py-1 pr-3">Fehler</th>
                <th className="py-1 pr-3">Kosten (Schätzung)</th>
                <th className="py-1 pr-3" />
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="py-1 pr-3">{new Date(r.created_at).toLocaleString("de-DE")}</td>
                  <td className="py-1 pr-3">{r.target_locale}</td>
                  <td className="py-1 pr-3">
                    {r.scope_kind === "locale" ? "ganze Sprache" : `${r.page_keys.length} Seite(n)`}
                  </td>
                  <td className="py-1 pr-3">{RUN_STATUS_LABEL[r.status] ?? r.status}</td>
                  <td className="py-1 pr-3">
                    {num(r.fields_done)} / {num(r.fields_planned)}
                  </td>
                  <td className="py-1 pr-3">{num(r.fields_failed)}</td>
                  <td className="py-1 pr-3">{eur(Number(r.cost_estimate))}</td>
                  <td className="py-1 pr-3">
                    <button
                      type="button"
                      className={btn}
                      onClick={() => {
                        setActiveRunId(r.id);
                        setActiveRun(r);
                      }}
                    >
                      anzeigen
                    </button>
                  </td>
                </tr>
              ))}
              {runs.length === 0 && (
                <tr>
                  <td className="py-2 text-muted-foreground" colSpan={8}>
                    Noch keine Läufe gespeichert.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Weitere Modelleinstellungen" hint="Schlüssel, eigenes Modell, Preistabelle">
        <p className="text-xs text-muted-foreground">
          Schlüssel für Anbieter liegen ausschließlich als Projekt-Geheimnis auf dem Server. Die
          Oberfläche kennt nur „konfiguriert / nicht konfiguriert".
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
          {providerList.map((p) => (
            <span key={p.provider} className="rounded bg-muted px-2 py-0.5">
              {p.label}: {p.configured ? "konfiguriert" : "nicht konfiguriert"}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs font-medium">Modelle und Kostensätze (aus der Datenbank)</p>
        <div className="mt-1 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-1 pr-3">Anbieter</th>
                <th className="py-1 pr-3">Modell</th>
                <th className="py-1 pr-3">Bezeichnung</th>
                <th className="py-1 pr-3">Satz / 1.000 Quellzeichen</th>
                <th className="py-1 pr-3">Voreinstellung</th>
              </tr>
            </thead>
            <tbody>
              {(status?.rates ?? []).map((r) => (
                <tr key={`${r.provider}|${r.model}`} className="border-t">
                  <td className="py-1 pr-3">{r.provider}</td>
                  <td className="py-1 pr-3 font-mono">{r.model}</td>
                  <td className="py-1 pr-3">{r.label}</td>
                  <td className="py-1 pr-3">
                    {r.cost_per_1k_source_chars > 0
                      ? `${r.cost_per_1k_source_chars} ${r.currency}`
                      : "Schätzung nicht verfügbar"}
                  </td>
                  <td className="py-1 pr-3">{r.is_default ? "ja" : ""}</td>
                </tr>
              ))}
              {(status?.rates ?? []).length === 0 && (
                <tr>
                  <td className="py-2 text-muted-foreground" colSpan={5}>
                    Keine Kostensätze gepflegt.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Ein eigenes Modell wird in Schritt 2 über „Eigenes Modell (Kennung eingeben)" gewählt.{" "}
          {modelHint}
        </p>
      </Panel>

      <p className="text-[11px] text-muted-foreground">
        Maschinelle Übersetzungen sind im internen Arbeitsstand sofort sichtbar, bleiben aber als
        maschinell gekennzeichnet. Von Hand gespeicherte Zieltexte werden nie automatisch
        überschrieben.
      </p>
    </div>
  );
};

export default TranslationWorkbench;
