import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { upsertLocale } from "@/features/admin/api/cmsAdminLocales";
import {
  checkPublicReleaseReadiness,
  type PublicReleaseReadiness,
} from "@/features/admin/api/cmsLocaleVisibility";
import {
  isValidLocaleCode,
  searchLanguageCatalog,
  type CatalogLanguage,
} from "@/i18n/languageCatalog";
import type { CmsLocaleRow } from "@/features/admin/api/cmsTranslationRuns";

/**
 * Kompakte Sprachverwaltung im Übersetzungsbereich.
 *
 * Wahrheit ist ausschließlich `cms_locales` (aktiv, auf Website sichtbar,
 * Reihenfolge, Rückfallsprache). Deutsch ist Quellsprache und kann nicht
 * abgeschaltet werden. „Im CMS bearbeitbar" und „auf der Website sichtbar" sind
 * zwei getrennte Zustände. Neu angelegte Sprachen sind bewusst beides nicht.
 */
type Props = {
  locales: CmsLocaleRow[];
  loading: boolean;
  busyLocale: string | null;
  onChangeVisibility: (
    locale: string,
    field: "is_active" | "is_public",
    next: boolean,
    wasPublic: boolean,
  ) => Promise<void> | void;
  onLocaleAdded: () => Promise<void> | void;
  /** Sprache im Ablauf auswählen, um fehlende Texte zu prüfen und zu ergänzen. */
  onCompleteMissing?: (locale: string) => void;
  /** Zahlen serverseitig neu berechnen lassen (dauert einen Moment). */
  onRefreshCoverage?: () => Promise<void> | void;
  /**
   * Fehler beim Laden der Sprachliste. Wird lokal in diesem Block gemeldet; die
   * zuletzt geladenen Sprachen bleiben stehen und bedienbar.
   */
  error?: string | null;
  /** Sprachliste erneut laden. */
  onReload?: () => Promise<void> | void;
};

const btn =
  "rounded border px-2 py-1 text-xs hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50";

const LocaleManagerPanel = ({
  locales,
  loading,
  busyLocale,
  onChangeVisibility,
  onLocaleAdded,
  onCompleteMissing,
  onRefreshCoverage,
  error,
  onReload,
}: Props) => {
  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [customDe, setCustomDe] = useState("");
  const [customNative, setCustomNative] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const [readiness, setReadiness] = useState<Record<string, PublicReleaseReadiness>>({});

  // Freigabereife kommt aus der Datenbank: Seiteninhalte UND Bedienungstexte
  // müssen für die Sprache vollständig übersetzt sein.
  useEffect(() => {
    let cancelled = false;
    const codes = locales.filter((l) => !l.is_source).map((l) => l.locale);
    void (async () => {
      // Parallel, damit die Anzeige nicht auf die langsamste Sprache wartet.
      const results = await Promise.all(
        codes.map(async (code) => [code, await checkPublicReleaseReadiness(code)] as const),
      );
      if (cancelled) return;
      setReadiness((prev) => ({ ...prev, ...Object.fromEntries(results) }));
    })();
    return () => {
      cancelled = true;
    };
  }, [locales]);


  const readinessFor = (code: string): PublicReleaseReadiness =>
    readiness[code] ?? {
      locale: code,
      ready: false,
      missing: "Sprachstand wird geprüft …",
    };

  const [recheck, setRecheck] = useState<string | null>(null);

  /** Einzelne Sprache erneut prüfen (frische Zahlen aus der Datenbank). */
  const recheckLocale = async (code: string) => {
    setRecheck(code);
    try {
      // Zuerst serverseitig neu rechnen lassen, dann den frischen Stand lesen.
      if (onRefreshCoverage) await onRefreshCoverage();
      const next = await checkPublicReleaseReadiness(code);
      setReadiness((prev) => ({ ...prev, [code]: next }));
    } finally {
      setRecheck(null);
    }
  };

  const known = useMemo(() => new Set(locales.map((l) => l.locale)), [locales]);
  const results = useMemo(() => searchLanguageCatalog(query), [query]);

  const add = async (code: string, labelDe: string, labelNative: string) => {
    setSaving(code);
    try {
      await upsertLocale({ locale: code, labelDe, labelNative, fallbackLocale: "de" });
      toast.success(
        `${labelDe} angelegt. Die Sprache ist noch nicht im CMS aktiv und nicht auf der Website sichtbar.`,
      );
      setQuery("");
      setCustomCode("");
      setCustomDe("");
      setCustomNative("");
      await onLocaleAdded();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(null);
    }
  };

  const addFromCatalog = (l: CatalogLanguage) => void add(l.code, l.de, l.native);

  const customValid =
    isValidLocaleCode(customCode) &&
    customDe.trim().length > 1 &&
    customNative.trim().length > 1 &&
    !known.has(customCode.trim().toLowerCase());

  return (
    <section className="rounded-lg border bg-card p-3" aria-label="Sprachen und Sichtbarkeit">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold">Sprachen</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Haken = im CMS bearbeitbar (Redaktion und Übersetzung). Auge = auf der Website sichtbar.
            Deutsch ist Quellsprache und bleibt beides.
          </p>
        </div>
        <button
          type="button"
          className={btn}
          aria-expanded={addOpen}
          onClick={() => setAddOpen((v) => !v)}
        >
          <Plus className="mr-1 inline h-3 w-3" aria-hidden />
          Sprache hinzufügen
        </button>
      </div>

      {/*
        Ladefehler bleiben lokal: die zuletzt geladene Sprachliste steht weiter da
        und ist bedienbar. Dieser Block verschwindet nie.
      */}
      {error && (
        <div
          role="alert"
          className="mt-2 rounded border border-destructive/40 bg-destructive/5 px-2 py-1 text-[11px] text-destructive"
        >
          Die Sprachliste konnte nicht neu geladen werden: {error}
          {locales.length > 0 ? " Angezeigt wird der zuletzt geladene Stand." : ""}
          {onReload && (
            <button type="button" className={`${btn} ml-2`} onClick={() => void onReload()}>
              Erneut laden
            </button>
          )}
        </div>
      )}

      {/* Untereinander statt endlose Kürzelreihe. */}
      <ul className="mt-2 divide-y rounded border bg-background">
        {locales.map((l) => (
          <li
            key={l.locale}
            className="flex flex-wrap items-center justify-between gap-2 px-2 py-1.5 text-xs"
          >
            <span className="min-w-[14rem]">
              <span className="font-medium">{l.label_de}</span>
              {l.label_native && l.label_native !== l.label_de ? (
                <span className="text-muted-foreground"> / {l.label_native}</span>
              ) : null}
              <span className="ml-1 rounded bg-muted px-1 py-0.5 uppercase text-muted-foreground">
                {l.locale}
              </span>
              {l.is_source ? (
                <span className="ml-1 text-[10px] text-muted-foreground">(Quellsprache)</span>
              ) : null}
            </span>
            <span className="flex items-center gap-3">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  aria-label={`${l.label_de}: im CMS bearbeitbar`}
                  checked={l.is_active}
                  disabled={l.is_source || busyLocale === l.locale}
                  onChange={(e) =>
                    void onChangeVisibility(l.locale, "is_active", e.target.checked, l.is_public)
                  }
                />
                <span className="text-muted-foreground">im CMS bearbeitbar</span>
              </label>
              <button
                type="button"
                className={`rounded border px-1.5 py-0.5 ${
                  l.is_public ? "bg-emerald-100 text-emerald-900" : "text-muted-foreground"
                } disabled:cursor-not-allowed disabled:opacity-50`}
                aria-label={`${l.label_de}: auf der Website sichtbar`}
                aria-pressed={l.is_public}
                title={
                  l.is_source
                    ? "Quellsprache: immer auf der Website sichtbar."
                    : l.is_public
                      ? "Auf der Website sichtbar. Klicken blendet die Sprache aus."
                      : readinessFor(l.locale).ready
                        ? "Nur interner Arbeitsstand. Klicken macht die Sprache öffentlich."
                        : readinessFor(l.locale).missing
                }
                disabled={
                  l.is_source ||
                  !l.is_active ||
                  busyLocale === l.locale ||
                  (!l.is_public && !readinessFor(l.locale).ready)
                }
                onClick={() =>
                  void onChangeVisibility(l.locale, "is_public", !l.is_public, l.is_public)
                }
              >
                {l.is_public ? (
                  <>
                    <Eye className="mr-1 inline h-3 w-3" aria-hidden />
                    sichtbar
                  </>
                ) : (
                  <>
                    <EyeOff className="mr-1 inline h-3 w-3" aria-hidden />
                    nicht sichtbar
                  </>
                )}
              </button>
            </span>
            {!l.is_source && !l.is_public && !readinessFor(l.locale).ready ? (
              <div className="w-full text-[11px] text-amber-700">
                <p>Noch nicht für die Website freischaltbar: {readinessFor(l.locale).missing}</p>
                <p className="mt-0.5 text-muted-foreground">
                  Offen: {readinessFor(l.locale).contentMissing ?? "–"} Seiteninhalte ·{" "}
                  {readinessFor(l.locale).uiMissing ?? "–"} Bedienungstexte
                </p>
                <span className="mt-1 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={btn}
                    disabled={recheck === l.locale}
                    onClick={() => void recheckLocale(l.locale)}
                  >
                    {recheck === l.locale ? "prüft …" : "Sprachstand neu prüfen"}
                  </button>
                  {onCompleteMissing && (
                    <button
                      type="button"
                      className={btn}
                      disabled={!l.is_active}
                      title={
                        l.is_active
                          ? "Sprache im Ablauf auswählen und fehlende Texte prüfen."
                          : "Zuerst „im CMS bearbeitbar“ einschalten."
                      }
                      onClick={() => onCompleteMissing(l.locale)}
                    >
                      Fehlende Übersetzungen vervollständigen
                    </button>
                  )}
                </span>
              </div>
            ) : null}
          </li>
        ))}
        {locales.length === 0 && (
          <li className="px-2 py-2 text-xs text-muted-foreground">
            {loading ? "Sprachliste wird geladen …" : "Keine Sprachliste verfügbar."}
          </li>
        )}
      </ul>

      {addOpen && (
        <div className="mt-3 rounded border p-2 text-xs">
          <p className="text-muted-foreground">
            Sprache aus der Liste wählen oder eigenen Code angeben. Neue Sprachen werden nur
            angelegt — sie sind danach weder im CMS aktiv noch auf der Website sichtbar.
          </p>
          <label className="mt-2 flex items-center gap-2">
            <Search className="h-3 w-3 text-muted-foreground" aria-hidden />
            <input
              className="w-64 rounded border bg-background px-2 py-1"
              placeholder="Sprache suchen, z. B. Kroatisch oder hr"
              aria-label="Sprache im Katalog suchen"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <ul className="mt-2 max-h-48 divide-y overflow-auto rounded border bg-background">
            {results.map((l) => (
              <li key={l.code} className="flex items-center justify-between gap-2 px-2 py-1">
                <span>
                  {l.de} / {l.native}{" "}
                  <span className="rounded bg-muted px-1 uppercase text-muted-foreground">
                    {l.code}
                  </span>
                </span>
                {known.has(l.code) ? (
                  <span className="text-muted-foreground">bereits vorhanden</span>
                ) : (
                  <button
                    type="button"
                    className={btn}
                    disabled={saving !== null}
                    onClick={() => addFromCatalog(l)}
                  >
                    {saving === l.code ? "wird angelegt …" : "hinzufügen"}
                  </button>
                )}
              </li>
            ))}
            {results.length === 0 && (
              <li className="px-2 py-1 text-muted-foreground">
                Keine Treffer — unten eigenen Code angeben.
              </li>
            )}
          </ul>

          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span>Code (z. B. hr)</span>
              <input
                className="rounded border bg-background px-2 py-1"
                aria-label="Eigener Sprachcode"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span>Deutscher Name</span>
              <input
                className="rounded border bg-background px-2 py-1"
                aria-label="Deutscher Sprachname"
                value={customDe}
                onChange={(e) => setCustomDe(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span>Name in der Sprache</span>
              <input
                className="rounded border bg-background px-2 py-1"
                aria-label="Sprachname in der Sprache selbst"
                value={customNative}
                onChange={(e) => setCustomNative(e.target.value)}
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                className={btn}
                disabled={!customValid || saving !== null}
                onClick={() => void add(customCode, customDe, customNative)}
              >
                Eigene Sprache anlegen
              </button>
            </div>
          </div>
          {customCode.trim() !== "" && !isValidLocaleCode(customCode) && (
            <p className="mt-1 text-amber-700">
              Der Code muss die Form „hr" oder „pt-br" haben (zwei bis drei Buchstaben, optional mit
              Region).
            </p>
          )}
        </div>
      )}
    </section>
  );
};

export default LocaleManagerPanel;
