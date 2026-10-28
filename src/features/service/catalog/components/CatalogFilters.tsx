import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  CatalogFilterGroup,
  CatalogFilterState,
} from "../types";

interface CatalogFiltersProps {
  groups: readonly CatalogFilterGroup[];
  value: CatalogFilterState;
  onChange: (next: CatalogFilterState) => void;
}

/**
 * DB-gesteuerte Filtersektion. Felder und Werte stammen ausschließlich aus
 * `product_filter_options_view` (über `groupFilterOptions`). Keine
 * hartkodierten Filter, keine Klassifikationen, keine Smart-Stick-/Paket-
 * Heuristiken.
 *
 * Etappe `catalog-filter-ui-1`: Vier definierte Quick-Filter-Blöcke
 * (`system_typ`, `montageart`, `wohneinheiten`, `ip_gateway`) werden – sofern
 * die DB-View das jeweilige Feld liefert – als kompakte Toggle/Pill-Reihen
 * gerendert. SYSTEM und MONTAGE als Toggle-Pills, WE als kompakte Pills,
 * IP als Ja/Nein-Pills (Werte stammen weiterhin aus der DB-View). Alle
 * weiteren Filtergruppen werden darunter unverändert als Selects gerendert.
 *
 * Wenn ein Quick-Feld in der DB nicht vorkommt, wird der entsprechende Block
 * nicht gerendert. Die Filter wirken weiterhin clientseitig auf den bereits
 * geladenen Produkten (Ausführung in `CatalogMvp.tsx`).
 */

const QUICK_FIELDS = [
  "system_typ",
  "paket_klasse",
  "montageart",
  "ip_gateway",
  "smartstick_possible",
  "smartstick_status",
] as const;
type QuickField = (typeof QUICK_FIELDS)[number];

/** Farbfilter wird als eigene Swatch-Reihe gerendert (nicht als Select). */
const COLOR_FIELD = "color" as const;


const CatalogFilters = ({ groups, value, onChange }: CatalogFiltersProps) => {
  const { t } = useTranslation("service");

  const groupByField = new Map<string, CatalogFilterGroup>();
  for (const g of groups) groupByField.set(g.field, g);

  const quickGroups: Array<{ field: QuickField; group: CatalogFilterGroup }> =
    [];
  for (const f of QUICK_FIELDS) {
    const g = groupByField.get(f);
    if (g && g.options.length > 0) quickGroups.push({ field: f, group: g });
  }

  const wohneinheitenGroup = groupByField.get("wohneinheiten") ?? null;
  const colorGroup = groupByField.get(COLOR_FIELD) ?? null;
  const restGroups = groups.filter(
    (g) =>
      !QUICK_FIELDS.includes(g.field as QuickField) &&
      g.field !== "wohneinheiten" &&
      g.field !== COLOR_FIELD,
  );

  if (
    quickGroups.length === 0 &&
    restGroups.length === 0 &&
    !colorGroup &&
    !wohneinheitenGroup
  )
    return null;


  const setValue = (field: string, raw: string | null) => {
    const next: CatalogFilterState = { ...value };
    if (raw === null || raw === "") {
      delete next[field];
    } else {
      next[field] = raw;
    }
    onChange(next);
  };

  const handleSelect = (field: string, raw: string) => {
    if (raw === "__all__" || raw === "") setValue(field, null);
    else setValue(field, raw);
  };

  const hasActive = Object.keys(value).length > 0;

  const pillBase =
    "px-3 py-1.5 rounded-sm text-xs border transition-colors whitespace-nowrap";
  const pillActive = "bg-foreground text-background border-foreground";
  const pillInactive =
    "bg-card text-foreground border-border hover:border-accent/40";

  // Heuristik nur für reine UI-Beschriftung des IP-Toggles – die tatsächlichen
  // Filterwerte (`opt.value`) stammen weiterhin aus der DB-View. Wir
  // beschriften lediglich Werte, die offensichtlich Booleans sind, freundlicher.
  const boolLabel = (field: string, raw: string): string | null => {
    const v = raw.trim().toLowerCase();
    if (v === "true" || v === "1" || v === "ja" || v === "yes")
      return field === "ip_gateway"
        ? t("katalog.filters.groups.ip_gateway.yes")
        : t("katalog.filters.bool.yes");
    if (v === "false" || v === "0" || v === "nein" || v === "no")
      return field === "ip_gateway"
        ? t("katalog.filters.groups.ip_gateway.no")
        : t("katalog.filters.bool.no");
    return null;
  };

  const renderPillRow = (
    field: QuickField,
    group: CatalogFilterGroup,
    opts: { boolLabels?: boolean } = {},
  ) => {
    const current = value[field] ?? null;
    const labelKey = `katalog.filters.groups.${field}.label` as const;
    const allKey = `katalog.filters.groups.${field}.all` as const;
    const labelFallback =
      group.label ||
      (field === "smartstick_possible" || field === "smartstick_status"
        ? "SmartStick-fähig"
        : field);
    const allFallback = t("katalog.v2.filters.allOption");
    const useBoolLabels =
      opts.boolLabels ||
      field === "smartstick_possible" || field === "smartstick_status";
    return (
      <div key={field} className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mr-1">
          {t(labelKey, { defaultValue: labelFallback })}
        </span>
        <button
          type="button"
          onClick={() => setValue(field, null)}
          className={`${pillBase} ${current === null ? pillActive : pillInactive}`}
          aria-pressed={current === null}
        >
          {t(allKey, { defaultValue: allFallback })}
        </button>
        {group.options.map((opt) => {
          const display = useBoolLabels
            ? (boolLabel(field, opt.value) ?? opt.label)
            : opt.label;
          const active = current === opt.value;
          const disabled = Boolean(opt.disabled);
          const showCount =
            typeof opt.count === "number" || disabled;
          const countValue = typeof opt.count === "number" ? opt.count : 0;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                if (disabled) return;
                setValue(field, opt.value);
              }}
              disabled={disabled}
              aria-disabled={disabled}
              className={`${pillBase} ${
                active
                  ? pillActive
                  : disabled
                    ? "bg-card text-muted-foreground border-border opacity-50 cursor-not-allowed"
                    : pillInactive
              }`}
              aria-pressed={active}
            >
              {display}
              {showCount ? (
                <span
                  className={
                    "ml-1 " +
                    (active ? "opacity-80" : "text-muted-foreground")
                  }
                >
                  ({countValue})
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="mb-6 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">
          {t("katalog.v2.filters.headline")}
        </h3>
        {hasActive ? (
          <button
            type="button"
            onClick={() => onChange({})}
            className="text-xs text-accent hover:underline"
          >
            {t("katalog.v2.filters.reset")}
          </button>
        ) : null}
      </div>

      {quickGroups.length > 0 ? (
        <div className="flex flex-col gap-3 mb-4">
          {quickGroups.map(({ field, group }) =>
            renderPillRow(field, group, {
              boolLabels:
                field === "ip_gateway" ||
                field === "smartstick_possible" ||
                field === "smartstick_status",
            }),
          )}
        </div>
      ) : null}

      {colorGroup && colorGroup.options.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mr-1">
            {colorGroup.label}
          </span>
          <button
            type="button"
            onClick={() => setValue(COLOR_FIELD, null)}
            className={`${pillBase} ${
              (value[COLOR_FIELD] ?? null) === null ? pillActive : pillInactive
            }`}
            aria-pressed={(value[COLOR_FIELD] ?? null) === null}
          >
            {t("katalog.v2.filters.allOption")}
          </button>
          {colorGroup.options.map((opt) => {
            const active = value[COLOR_FIELD] === opt.value;
            const disabled = Boolean(opt.disabled);
            const count = typeof opt.count === "number" ? opt.count : 0;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  if (disabled) return;
                  setValue(COLOR_FIELD, opt.value);
                }}
                disabled={disabled}
                aria-disabled={disabled}
                aria-pressed={active}
                title={opt.label}
                className={
                  "inline-flex items-center gap-2 rounded-sm border px-2 py-1.5 text-xs transition-colors " +
                  (active
                    ? "bg-foreground text-background border-foreground"
                    : disabled
                      ? "bg-card text-muted-foreground border-border opacity-50 cursor-not-allowed"
                      : "bg-card text-foreground border-border hover:border-accent/40")
                }
              >
                <span
                  aria-hidden="true"
                  className={
                    "h-4 w-4 shrink-0 rounded-sm border " +
                    (active ? "border-background/70" : "border-foreground/40")
                  }
                  style={
                    opt.swatchHex
                      ? { backgroundColor: opt.swatchHex }
                      : undefined
                  }
                />
                <span className="whitespace-nowrap">{opt.label}</span>
                <span
                  className={active ? "opacity-80" : "text-muted-foreground"}
                >
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {wohneinheitenGroup && wohneinheitenGroup.options.length > 0 ? (

        <WohneinheitenInput
          group={wohneinheitenGroup}
          value={value["wohneinheiten"] ?? ""}
          onCommit={(raw) => setValue("wohneinheiten", raw)}
          label={t("katalog.filters.groups.wohneinheiten.label")}
          resetLabel={t("katalog.v2.filters.reset")}
        />
      ) : null}

      {restGroups.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {restGroups.map((group) => {
            const current = value[group.field] ?? "";
            return (
              <label
                key={group.field}
                className="flex flex-col gap-1 text-xs text-muted-foreground"
              >
                <span>{group.label}</span>
                <select
                  value={current}
                  onChange={(e) => handleSelect(group.field, e.target.value)}
                  className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
                >
                  <option value="__all__">
                    {t("katalog.v2.filters.allOption")}
                  </option>
                  {group.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {typeof opt.count === "number"
                        ? `${opt.label} (${opt.count})`
                        : opt.label}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

interface WohneinheitenInputProps {
  group: CatalogFilterGroup;
  value: string;
  onCommit: (raw: string | null) => void;
  label: string;
  resetLabel: string;
}

/**
 * Lokales Eingabefeld für „Wohneinheiten" mit Debounce.
 * Vorher wurde bei jedem Tastendruck der Parent-State aktualisiert, was
 * einen RPC-Refetch ausgelöst hat. Dadurch ging die Eingabe nach der ersten
 * Ziffer verloren (z. B. „2" → Refetch → „4" konnte nicht mehr getippt
 * werden). Jetzt: lokaler State + 400 ms Debounce. Pfeile (Spin-Buttons)
 * sind dauerhaft sichtbar (siehe `catalog-we-input` in index.css).
 */
const WohneinheitenInput = ({
  group,
  value,
  onCommit,
  label,
  resetLabel,
}: WohneinheitenInputProps) => {
  const nums = group.options
    .map((o) => Number(o.value))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  const min = nums[0];
  const max = nums[nums.length - 1];
  const validSet = new Set(nums.map(String));

  const [local, setLocal] = useState<string>(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommittedRef = useRef<string>(value);

  // Externe Änderungen (z. B. Reset) übernehmen
  useEffect(() => {
    if (value !== lastCommittedRef.current) {
      setLocal(value);
      lastCommittedRef.current = value;
    }
  }, [value]);

  const scheduleCommit = (raw: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      lastCommittedRef.current = raw;
      onCommit(raw === "" ? null : raw);
    }, 400);
  };

  const isValid = local === "" || validSet.has(local);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mr-1">
        {label}
      </span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        value={local}
        placeholder={`${min}–${max}`}
        onChange={(e) => {
          const raw = e.target.value.trim();
          setLocal(raw);
          scheduleCommit(raw);
        }}
        onBlur={() => {
          if (timerRef.current) clearTimeout(timerRef.current);
          if (local !== lastCommittedRef.current) {
            lastCommittedRef.current = local;
            onCommit(local === "" ? null : local);
          }
        }}
        className={
          "catalog-we-input w-28 rounded-md border bg-background px-2 py-1.5 text-sm text-foreground " +
          (isValid ? "border-input" : "border-destructive")
        }
        aria-label={label}
      />
      {local ? (
        <button
          type="button"
          onClick={() => {
            if (timerRef.current) clearTimeout(timerRef.current);
            setLocal("");
            lastCommittedRef.current = "";
            onCommit(null);
          }}
          className="text-xs text-accent hover:underline"
        >
          {resetLabel}
        </button>
      ) : null}
      {!isValid ? (
        <span className="text-xs text-destructive">
          {min}–{max}
        </span>
      ) : null}
    </div>
  );
};

export default CatalogFilters;
