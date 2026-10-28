import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AREA_LABEL,
  AREA_SHORT,
  STATUS_FILTER_LABEL,
  TRANSLATION_AREAS,
  listTranslationUnits,
  saveTranslationUnit,
  saveUnitErrorHint,
  unitKeyId,
  unitsToCsv,
  type TranslationUnit,
  type TranslationUnitPage,
  type UnitStatusFilter,
} from "@/features/admin/api/cmsTranslationUnits";
import type { CmsLocaleRow } from "@/features/admin/api/cmsTranslationRuns";

/**
 * Textliste des Arbeitsbereichs „Übersetzungen".
 *
 * Zeigt die kanonische Gesamtmenge aller übersetzbaren Texte aus der
 * Datenbank — Bausteinfelder, Seitentitel, Navigations-Beschriftungen und
 * -Beschreibungen sowie Bild-Alternativtexte. Es gibt keine zweite Ablage im
 * Frontend: gelesen wird `rpc_admin_list_translation_units`, geschrieben
 * ausschließlich `rpc_admin_update_translation_unit`.
 *
 * Seitenweise (Paging), damit nie zehntausende Zeilen im Fenster stehen.
 */

type Props = {
  locales: CmsLocaleRow[];
  pages: Array<{ page_key: string; title: string }>;
  onJumpToField?: (pageKey: string, sectionKey: string, fieldKey: string) => void;
};

const box = "rounded-lg border bg-card p-3";
const btn =
  "rounded border px-2 py-1 text-xs hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50";
const num = (n: number | null | undefined) => (n ?? 0).toLocaleString("de-DE");

/**
 * Reihenfolge der Statuswahl: erst die drei verständlichen Hauptzustände,
 * danach die technischen Detailzustände.
 */
const STATUS_ORDER: UnitStatusFilter[] = [
  "fehlt",
  "veraltet",
  "vorhanden",
  "alle",
  "gesperrt",
  "maschinell",
  "geprueft",
  "offen",
];

const statusBadge = (unit: TranslationUnit) => {
  const s = unit.target_status;
  if (!unit.whitelisted) {
    return {
      label: "für diese Sprache noch nicht vorbereitet",
      cls: "bg-muted text-muted-foreground",
    };
  }
  if (!s) return { label: "fehlt", cls: "bg-amber-100 text-amber-900" };
  if (s === "maschinell") return { label: "vorhanden (maschinell)", cls: "bg-sky-100 text-sky-900" };
  if (s === "maschinell_veraltet") {
    return { label: "muss aktualisiert werden", cls: "bg-orange-100 text-orange-900" };
  }
  return { label: "vorhanden (von Hand geprüft)", cls: "bg-emerald-100 text-emerald-900" };
};


const PAGE_SIZE = 50;

const TranslationTextList = ({ locales, pages, onJumpToField }: Props) => {
  const targets = useMemo(
    () => locales.filter((l) => !l.is_source && l.is_active),
    [locales],
  );

  const [targetLocale, setTargetLocale] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<UnitStatusFilter>("fehlt");
  const [areas, setAreas] = useState<string[]>([]);
  const [pageKey, setPageKey] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [offset, setOffset] = useState(0);

  const [data, setData] = useState<TranslationUnitPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editKey, setEditKey] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!targetLocale && targets.length > 0) setTargetLocale(targets[0].locale);
  }, [targets, targetLocale]);

  const load = useCallback(async () => {
    if (!targetLocale) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listTranslationUnits({
        targetLocale,
        areas: areas.length > 0 ? areas : null,
        status: statusFilter,
        pageKey: pageKey || null,
        search: searchTerm || null,
        limit: PAGE_SIZE,
        offset,
      });
      setData(res);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Textliste konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [targetLocale, areas, statusFilter, pageKey, searchTerm, offset]);

  useEffect(() => {
    void load();
  }, [load]);

  const rowKey = (u: TranslationUnit) => `${u.area}|${u.ref_key}|${u.unit_key}`;

  const beginEdit = (u: TranslationUnit) => {
    setNotice(null);
    setEditKey(rowKey(u));
    setDraft(u.target_value ?? "");
  };

  const save = async (u: TranslationUnit) => {
    setSaving(true);
    setNotice(null);
    const res = await saveTranslationUnit({
      area: u.area,
      refId: u.ref_id,
      pageKey: u.page_key,
      sectionKey: u.section_key,
      unitKey: u.unit_key,
      locale: targetLocale,
      value: draft,
    });
    setSaving(false);
    if (!res.success) {
      setNotice(saveUnitErrorHint(res.error));
      return;
    }
    setNotice("Gespeichert. Der Text gilt jetzt als von Hand geprüft und wird von automatischen Läufen nicht überschrieben.");
    setEditKey(null);
    await load();
  };

  const downloadCsv = () => {
    if (!data) return;
    const blob = new Blob([`\uFEFF${unitsToCsv(targetLocale, data.items)}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uebersetzungen-${targetLocale}-${data.offset + 1}-${data.offset + data.items.length}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleArea = (area: string) => {
    setOffset(0);
    setAreas((prev) => (prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]));
  };

  const total = data?.total ?? 0;
  const from = total === 0 ? 0 : (data?.offset ?? 0) + 1;
  const to = Math.min((data?.offset ?? 0) + (data?.items.length ?? 0), total);

  return (
    <section className={box} aria-label="Textliste Übersetzungen">
      <h3 className="text-sm font-semibold">Texte durchsuchen und von Hand übersetzen</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Alle übersetzbaren Texte der Datenbank: Bausteine, Seitentitel, Navigation
        (Beschriftung und Beschreibung) und Bild-Alternativtexte. Von Hand gespeicherte
        Zieltexte gelten als geprüft und werden von automatischen Läufen nie überschrieben.
      </p>

      {targets.length === 0 ? (
        <p className="mt-3 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
          Es ist derzeit keine Zielsprache aktiv. Sprachen werden in der Datenbank
          (Tabelle der Sprachen) freigeschaltet.
        </p>
      ) : (
        <>
          <div className="mt-3 grid gap-2 md:grid-cols-4">
            <label className="text-xs">
              <span className="block text-muted-foreground">Zielsprache</span>
              <select
                aria-label="Zielsprache der Textliste"
                className="mt-1 w-full rounded border bg-background px-2 py-1"
                value={targetLocale}
                onChange={(e) => {
                  setOffset(0);
                  setTargetLocale(e.target.value);
                }}
              >
                {targets.map((l) => (
                  <option key={l.locale} value={l.locale}>
                    {l.label_de} ({l.locale.toUpperCase()})
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs">
              <span className="block text-muted-foreground">Status</span>
              <select
                aria-label="Status-Filter"
                className="mt-1 w-full rounded border bg-background px-2 py-1"
                value={statusFilter}
                onChange={(e) => {
                  setOffset(0);
                  setStatusFilter(e.target.value as UnitStatusFilter);
                }}
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_FILTER_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs">
              <span className="block text-muted-foreground">Seite</span>
              <select
                aria-label="Seiten-Filter"
                className="mt-1 w-full rounded border bg-background px-2 py-1"
                value={pageKey}
                onChange={(e) => {
                  setOffset(0);
                  setPageKey(e.target.value);
                }}
              >
                <option value="">Alle Seiten</option>
                {pages.map((p) => (
                  <option key={p.page_key} value={p.page_key}>
                    {p.title || p.page_key}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs">
              <span className="block text-muted-foreground">Suche im Text</span>
              <span className="mt-1 flex gap-1">
                <input
                  aria-label="Suche im Text"
                  className="w-full rounded border bg-background px-2 py-1"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setOffset(0);
                      setSearchTerm(search.trim());
                    }
                  }}
                  placeholder="Suchbegriff"
                />
                <button
                  type="button"
                  className={btn}
                  onClick={() => {
                    setOffset(0);
                    setSearchTerm(search.trim());
                  }}
                >
                  Suchen
                </button>
              </span>
            </label>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">Datenbereiche:</span>
            {TRANSLATION_AREAS.map((a) => (
              <label key={a} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={areas.length === 0 || areas.includes(a)}
                  onChange={() => toggleArea(a)}
                  aria-label={AREA_LABEL[a]}
                />
                <span>
                  {AREA_LABEL[a]}
                  {data?.by_area?.[a] != null ? ` (${num(data.by_area[a])})` : ""}
                </span>
              </label>
            ))}
            {areas.length > 0 && (
              <button
                type="button"
                className={btn}
                onClick={() => {
                  setAreas([]);
                  setOffset(0);
                }}
              >
                Alle Bereiche
              </button>
            )}
          </div>

          {data && (
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <p>
                Übersetzungsstand: vorhanden {num(data.counts.vorhanden ?? 0)} · fehlt{" "}
                {num(data.counts.fehlt)} · muss aktualisiert werden {num(data.counts.veraltet)}
              </p>
              <p>
                Vorbereitung: {num(data.total_unfiltered)} deutsche Texte insgesamt, davon{" "}
                {num(data.counts.gesperrt)} für diese Sprache noch nicht vorbereitet. Details:
                maschinell {num(data.counts.maschinell)} · von Hand geprüft{" "}
                {num(data.counts.geprueft)}
              </p>
            </div>
          )}


          {notice && (
            <p className="mt-2 rounded border bg-muted p-2 text-xs" role="status">
              {notice}
            </p>
          )}
          {error && (
            <div className="mt-2 rounded border border-destructive/40 bg-destructive/10 p-2 text-xs">
              <p className="font-medium">Textliste konnte nicht geladen werden.</p>
              <p className="mt-1 break-all text-muted-foreground">{error}</p>
              <button type="button" className={`${btn} mt-2`} onClick={() => void load()}>
                Erneut laden
              </button>
            </div>
          )}

          {loading && !data && (
            <p className="mt-3 text-xs text-muted-foreground">Texte werden geladen …</p>
          )}

          {data && data.items.length === 0 && !loading && (
            <p className="mt-3 rounded border bg-muted p-2 text-xs">
              Kein Text passt zu dieser Auswahl.
            </p>
          )}

          {data && data.items.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[860px] text-xs">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="p-1">Bereich / Kennung</th>
                    <th className="p-1">Deutsch (Quelle)</th>
                    <th className="p-1">{targetLocale.toUpperCase()} (Zieltext)</th>
                    <th className="p-1">Herkunft</th>
                    <th className="p-1" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((u) => {
                    const badge = statusBadge(u);
                    const key = rowKey(u);
                    const editing = editKey === key;
                    return (
                      <tr key={key} className="border-t align-top">
                        <td className="p-1">
                          <span className="rounded bg-muted px-1 py-0.5">
                            {AREA_SHORT[u.area] ?? u.area}
                          </span>
                          <span className="mt-1 block break-all text-muted-foreground">
                            {unitKeyId(u)}
                          </span>
                        </td>
                        <td className="max-w-[22rem] p-1">{u.source_text}</td>
                        <td className="max-w-[22rem] p-1">
                          {editing ? (
                            <textarea
                              aria-label="Zieltext bearbeiten"
                              className="w-full rounded border bg-background p-1"
                              rows={3}
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                            />
                          ) : (
                            <span className={u.target_value ? "" : "text-muted-foreground"}>
                              {u.target_value || "— fehlt —"}
                            </span>
                          )}
                        </td>
                        <td className="p-1">
                          <span className={`rounded px-1 py-0.5 ${badge.cls}`}>{badge.label}</span>
                        </td>
                        <td className="p-1">
                          <div className="flex flex-col gap-1">
                            {editing ? (
                              <>
                                <button
                                  type="button"
                                  className={btn}
                                  disabled={saving}
                                  onClick={() => void save(u)}
                                >
                                  {saving ? "Speichert …" : "Speichern"}
                                </button>
                                <button
                                  type="button"
                                  className={btn}
                                  onClick={() => setEditKey(null)}
                                >
                                  Abbrechen
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                className={btn}
                                disabled={!u.whitelisted}
                                title={
                                  u.whitelisted
                                    ? undefined
                                    : "Für diese Sprache noch nicht vorbereitet: deutscher Quelltext vorhanden, Zielsprachenfeld intern noch nicht zur Bearbeitung aktiviert."
                                }

                                onClick={() => beginEdit(u)}
                              >
                                Bearbeiten
                              </button>
                            )}
                            {onJumpToField && u.area === "section_field" && (
                              <button
                                type="button"
                                className={btn}
                                onClick={() =>
                                  onJumpToField(u.page_key, u.section_key, u.unit_key)
                                }
                              >
                                Im Inhalte-Bereich öffnen
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              className={btn}
              disabled={loading || (data?.offset ?? 0) <= 0}
              onClick={() => setOffset(Math.max(0, (data?.offset ?? 0) - PAGE_SIZE))}
            >
              Zurück
            </button>
            <span className="text-muted-foreground">
              {num(from)}–{num(to)} von {num(total)}
            </span>
            <button
              type="button"
              className={btn}
              disabled={loading || to >= total}
              onClick={() => setOffset((data?.offset ?? 0) + PAGE_SIZE)}
            >
              Weiter
            </button>
            <button type="button" className={btn} disabled={!data} onClick={downloadCsv}>
              Diese Seite als CSV
            </button>
            <button type="button" className={btn} disabled={loading} onClick={() => void load()}>
              Neu laden
            </button>
          </div>
        </>
      )}
    </section>
  );
};

export default TranslationTextList;
