/**
 * BildkartenCardWorkspace — vereinheitlichter Arbeitsbereich für ALLE
 * `card_v1`-Standardkarten im Admin (Etappe
 * `cms-light-bildkarten-workspace-fuer-alle-card-v1-1`).
 *
 * Ursprung: Pilot für B-026/B-027 (Türsprechanlagen) — die Akkordeon-
 * Struktur und Speichersicherheit haben sich bewährt. Wird jetzt für
 * ALLE `card_v1` verwendet, mit container-abhängiger Beschriftung
 * und Warn-Logik (Kartenraster / Kartenscroller / Hub-Raster /
 * Produktfilter-Raster / Feature-/Icon-Raster / Download-Liste).
 *
 *  - „Bild fehlt"-Warnung NUR, wenn der Container den jeweiligen Slot
 *    wirklich erwartet (`slotIsRequired`). Sonst nur leiser Hinweis.
 *  - Asset-Slots werden NICHT mehr global versteckt — `image`,
 *    `thumbnail` und `icon_image` bleiben alle anlegbar.
 *  - Speichern ausschließlich über `saveSectionField`
 *    (RPC `rpc_admin_update_section_field`, whitelist-geprüft).
 *  - Jedes Textfeld unterstützt DE und EN (kompakt nebeneinander).
 *  - Keine direkten Tabellenzugriffe, keine neuen RPCs.
 *  - Keine globalen Renderer, keine Produktdatenbank.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import type { AppLocale } from "@/i18n/locale";
import { ChevronDown } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { toast } from "sonner";

import { IconPickerDialog } from "@/features/admin/components/IconPickerDialog";
import { TranslateButton } from "@/features/admin/components/EditableField";
import { saveSectionField } from "@/features/admin/api/cmsAdminWrite";
import type { EditableFieldRow } from "@/features/admin/api/cmsAdminEditableFields";
import { containerHintFor } from "@/features/admin/lib/cardFieldsWorkspaceGroups";
import { resolveCardVisibility, resolveCardRuntime, type LinkRuntime } from "@/features/cms/lib/cardVisibility";
import { containerSupportFor } from "@/features/cms/lib/cardRuntimeMatrix";

interface Props {
  pageKey: string;
  sectionKey: string;
  parentSectionKey: string | null;
  parentSectionLabel: string | null;
  /** Technischer Typ des Eltern-Containers (z. B. `cards_v1`). UI-only. */
  parentSectionType?: string | null;
  fieldKeys: string[];
  /** Hat die Karte aktive Assets im Slot `image`? */
  hasImage: boolean;
  /** Hat die Karte aktive Assets im Slot `thumbnail`? */
  hasThumbnail?: boolean;
  /** Hat die Karte aktive Assets im Slot `icon_image`? */
  hasIconImage?: boolean;
  valueFor: (sectionKey: string, fieldKey: string, locale: AppLocale) => string | null;
  efGet: (sectionKey: string, fieldKey: string, locale: "de" | "en") => EditableFieldRow | null;
  renderFreigabeSwitch: (row: EditableFieldRow | null) => ReactNode;
  assetsSlot: ReactNode;
  onSaved: () => void | Promise<void>;
  scrollContainerRef?: RefObject<HTMLElement | null>;
}

const LINK_KIND_OPTIONS = [
  { value: "intern", label: "intern — Pfad" },
  { value: "extern", label: "extern — URL" },
  { value: "shortid", label: "kurz-id" },
  { value: "anker", label: "Sprungmarke — #anker (gleiche Seite)" },
] as const;


// ───────── Layout-Helfer ─────────────────────────────────────────────

type GroupKey = "content" | "image" | "icon" | "bullets" | "chips" | "links" | "tech";

const EMPTY_GROUPS: Record<GroupKey, boolean> = {
  content: false,
  image: false,
  icon: false,
  bullets: false,
  chips: false,
  links: false,
  tech: false,
};

/**
 * Modul-lokale Caches: überleben Re-Mounts der Workspace-Komponente,
 * die nach jedem Save durch Reload des Pilot-Bundles ausgelöst werden.
 * Schlüssel = `${pageKey}::${sectionKey}`.
 *
 *  - `openGroupsCache`: welche Akkordeon-Gruppen pro Karte aufgeklappt sind.
 *  - `scrollTopCache`:  letzte Scrollposition des Editor-Containers pro Karte.
 *
 * Wird beim ersten Auftritt einer Karte mit `EMPTY_GROUPS` (alles zu)
 * initialisiert; Wechsel der `sectionKey` löscht den Eintrag der vorigen
 * Karte explizit nicht — nur die *neue* Karte startet sauber zu.
 */
const openGroupsCache = new Map<string, Record<GroupKey, boolean>>();
const scrollTopCache = new Map<string, number>();
const cardCacheKey = (pageKey: string, sectionKey: string) => `${pageKey}::${sectionKey}`;

const GroupShell: React.FC<{
  title: string;
  hint?: string;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  children: ReactNode;
  tone?: "default" | "warn";
}> = ({ title, hint, open, onOpenChange, children, tone = "default" }) => (
  <section
    className={
      "rounded-md border " +
      (tone === "warn"
        ? "border-amber-300/60 bg-amber-50/30 dark:bg-amber-900/10"
        : "border-border bg-card")
    }
  >
    <button
      type="button"
      onClick={() => onOpenChange(!open)}
      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
      aria-expanded={open}
    >
      <span>{title}</span>
      <ChevronDown className={"h-3.5 w-3.5 transition-transform " + (open ? "rotate-180" : "")} />
    </button>
    {open && (
      <div className="space-y-3 border-t border-border/60 px-3 py-3">
        {hint && (
          <p className="text-[11px] leading-relaxed text-muted-foreground">{hint}</p>
        )}
        {children}
      </div>
    )}
  </section>
);

const VisibilityStateShell: React.FC<{
  enabled: boolean;
  children: ReactNode;
  offLabel?: string;
}> = ({ enabled, children, offLabel = "Aktuell ausgeblendet — Inhalte bleiben erhalten." }) => (
  <div className={enabled ? "space-y-2" : "space-y-2 opacity-60"}>
    {!enabled && (
      <div className="rounded border border-dashed border-border bg-muted/20 px-2 py-1 text-[10px] text-muted-foreground">
        {offLabel}
      </div>
    )}
    {children}
  </div>
);

const Toggle: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
  compact?: boolean;
}> = ({ checked, onChange, label, hint, disabled, compact }) => (
  <label
    className={
      (compact
        ? "flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground "
        : "flex cursor-pointer items-center justify-between gap-2 rounded border border-border bg-background px-2.5 py-1.5 text-xs ") +
      (disabled ? "opacity-60 cursor-not-allowed " : "")
    }
    title={hint}
  >
    {compact ? (
      <>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="h-3.5 w-3.5 cursor-pointer accent-primary"
        />
        <span>{label}</span>
      </>
    ) : (
      <>
        <span className="text-foreground">{label}</span>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 cursor-pointer accent-primary"
        />
      </>
    )}
  </label>
);

// ───────── Bilinguale Eingabe ────────────────────────────────────────
/**
 * Kompakte DE/EN-Zeile (Single-Line oder Mehrzeilig). Speichert pro
 * Sprache via `saveSectionField` bei Blur (oder Enter bei Single-Line).
 * Zeigt den Freigabe-Schalter pro Sprache klein rechts.
 */
const BiText: React.FC<{
  pageKey: string;
  sectionKey: string;
  fieldKey: string;
  label: string;
  multiline?: boolean;
  placeholderDe?: string;
  placeholderEn?: string;
  valueFor: Props["valueFor"];
  efGet: Props["efGet"];
  renderFreigabeSwitch: Props["renderFreigabeSwitch"];
  onSaved: Props["onSaved"];
  mono?: boolean;
}> = ({
  pageKey, sectionKey, fieldKey, label, multiline, placeholderDe, placeholderEn,
  valueFor, efGet, renderFreigabeSwitch, onSaved, mono,
}) => {
  const deInitial = valueFor(sectionKey, fieldKey, "de") ?? "";
  const enInitial = valueFor(sectionKey, fieldKey, "en") ?? "";
  const deRow = efGet(sectionKey, fieldKey, "de");
  const enRow = efGet(sectionKey, fieldKey, "en");

  const [de, setDe] = useState(deInitial);
  const [en, setEn] = useState(enInitial);
  const [pendDe, setPendDe] = useState(false);
  const [pendEn, setPendEn] = useState(false);
  const lastSavedDe = useRef(deInitial);
  const lastSavedEn = useRef(enInitial);

  // Bei externem Reload Werte übernehmen, wenn Nutzer nichts editiert hat.
  useEffect(() => {
    if (de === lastSavedDe.current) {
      setDe(deInitial);
      lastSavedDe.current = deInitial;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deInitial]);
  useEffect(() => {
    if (en === lastSavedEn.current) {
      setEn(enInitial);
      lastSavedEn.current = enInitial;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enInitial]);

  const save = useCallback(
    async (locale: "de" | "en", next: string) => {
      const ref = locale === "de" ? lastSavedDe : lastSavedEn;
      if (next === ref.current) return;
      const setPend = locale === "de" ? setPendDe : setPendEn;
      setPend(true);
      const r = await saveSectionField({ pageKey, sectionKey, fieldKey, locale, value: next });
      setPend(false);
      if (r.success) {
        ref.current = next;
        await onSaved();
      } else {
        toast.error(`Speichern fehlgeschlagen (${locale.toUpperCase()} · ${fieldKey}): ${r.error ?? "unbekannter Fehler"}`);
      }
    },
    [pageKey, sectionKey, fieldKey, onSaved],
  );

  const inputCls =
    "w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring " +
    (mono ? "font-mono " : "");
  const editableDe = !!deRow?.is_enabled;
  const editableEn = !!enRow?.is_enabled;

  const renderInput = (
    locale: "de" | "en",
    val: string,
    setVal: (v: string) => void,
    editable: boolean,
    placeholder?: string,
  ) =>
    multiline ? (
      <textarea
        value={val}
        disabled={!editable}
        rows={2}
        placeholder={placeholder}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => void save(locale, val)}
        className={inputCls + " resize-y min-h-[44px]"}
      />
    ) : (
      <input
        type="text"
        value={val}
        disabled={!editable}
        placeholder={placeholder}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => void save(locale, val)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          }
        }}
        className={inputCls}
      />
    );

  // DE→EN-Übersetzungsbutton wiederverwendet aus EditableField. Erscheint
  // nur, wenn beide Sprachen in der Whitelist freigegeben sind — dann kann
  // der Vorschlag ins EN-Feld übernommen und automatisch gespeichert werden.
  const canTranslate = editableDe && editableEn;
  const handleTranslated = useCallback(
    (suggestion: string) => {
      setEn(suggestion);
      void save("en", suggestion);
    },
    [save],
  );

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-medium text-foreground">{label}</span>
        <code className="font-mono text-[10px] text-muted-foreground/70">{fieldKey}</code>
      </div>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        <div>
          <div className="mb-0.5 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>DE {pendDe && <span className="ml-1 opacity-60">speichert…</span>}</span>
            {renderFreigabeSwitch(deRow)}
          </div>
          {renderInput("de", de, setDe, editableDe, placeholderDe)}
        </div>
        <div>
          <div className="mb-0.5 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
            <span>EN {pendEn && <span className="ml-1 opacity-60">speichert…</span>}</span>
            <div className="flex items-center gap-1.5">
              {canTranslate && (
                <TranslateButton
                  sourceText={de}
                  fieldKey={fieldKey}
                  onTranslated={handleTranslated}
                />
              )}
              {renderFreigabeSwitch(enRow)}
            </div>
          </div>
          {renderInput("en", en, setEn, editableEn, placeholderEn)}
        </div>
      </div>
    </div>
  );
};

/**
 * DB-Boolean (1/0) — schreibt DE+EN synchron.
 */
const DbBoolToggle: React.FC<{
  pageKey: string;
  sectionKey: string;
  fieldKey: string;
  label: string;
  hint?: string;
  initial: string | null;
  onSaved: Props["onSaved"];
  compact?: boolean;
}> = ({ pageKey, sectionKey, fieldKey, label, hint, initial, onSaved, compact }) => {
  const isOn = (initial ?? "").trim() === "1";
  const [checked, setChecked] = useState(isOn);
  const [pending, setPending] = useState(false);
  useEffect(() => setChecked(isOn), [isOn]);

  const handle = async (next: boolean) => {
    setChecked(next);
    setPending(true);
    const value = next ? "1" : "0";
    const [rDe, rEn] = await Promise.all([
      saveSectionField({ pageKey, sectionKey, fieldKey, locale: "de", value }),
      saveSectionField({ pageKey, sectionKey, fieldKey, locale: "en", value }),
    ]);
    setPending(false);
    const failures: string[] = [];
    if (!rDe.success) failures.push(`DE: ${rDe.error ?? "unbekannt"}`);
    if (!rEn.success) failures.push(`EN: ${rEn.error ?? "unbekannt"}`);
    if (failures.length > 0) {
      // Optimistischen Schalter zurücksetzen, sonst lügt die UI.
      setChecked(!next);
      toast.error(`Schalter „${label}" (${fieldKey}) konnte nicht gespeichert werden — ${failures.join(" · ")}`);
    }
    await onSaved();
  };

  return (
    <Toggle
      checked={checked}
      onChange={(v) => void handle(v)}
      label={label}
      hint={hint}
      disabled={pending}
      compact={compact}
    />
  );
};

/**
 * Schreibt einen identischen Stringwert in DE+EN (z. B. `link_N_kind`, `icon`).
 * Gibt true zurück, wenn beide Sprachen erfolgreich gespeichert wurden; bei
 * Fehler wird ein Toast gezeigt, damit der Schalter nicht still scheitert.
 */
const writeBoth = async (
  pageKey: string,
  sectionKey: string,
  fieldKey: string,
  value: string,
): Promise<boolean> => {
  const [rDe, rEn] = await Promise.all([
    saveSectionField({ pageKey, sectionKey, fieldKey, locale: "de", value }),
    saveSectionField({ pageKey, sectionKey, fieldKey, locale: "en", value }),
  ]);
  const failures: string[] = [];
  if (!rDe.success) failures.push(`DE: ${rDe.error ?? "unbekannt"}`);
  if (!rEn.success) failures.push(`EN: ${rEn.error ?? "unbekannt"}`);
  if (failures.length > 0) {
    toast.error(`Feld „${fieldKey}" konnte nicht gespeichert werden — ${failures.join(" · ")}`);
    return false;
  }
  return true;
};

// ───────── Spezial-Blöcke ────────────────────────────────────────────

const IconBlock: React.FC<{
  pageKey: string;
  sectionKey: string;
  valueFor: Props["valueFor"];
  onSaved: Props["onSaved"];
}> = ({ pageKey, sectionKey, valueFor, onSaved }) => {
  // Zwei getrennte Felder steuern das Icon (Masterkarten-Regel card_v1):
  //   - `icon`         = Lucide-Name (Inhalt, bleibt beim Ausblenden erhalten)
  //   - `icon_enabled` = Sichtbarkeit ("1"=an, "0"=aus, leer=an wenn `icon` gesetzt)
  // Das Icon kann in jedem Karten-Container neben einem Bild erscheinen.
  const initial = (
    valueFor(sectionKey, "icon", "de") ?? valueFor(sectionKey, "icon", "en") ?? ""
  ).trim();
  const enabledRaw = (
    valueFor(sectionKey, "icon_enabled", "de") ??
    valueFor(sectionKey, "icon_enabled", "en") ??
    ""
  ).trim();
  const enabledFromDb = enabledRaw === "" ? initial.length > 0 : enabledRaw === "1";

  const [name, setName] = useState(initial);
  const [enabledLocal, setEnabledLocal] = useState(enabledFromDb);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => setName(initial), [initial]);
  useEffect(() => setEnabledLocal(enabledFromDb), [enabledFromDb]);

  const saveName = async (next: string) => {
    const v = next.trim();
    setName(v);
    setPending(true);
    await writeBoth(pageKey, sectionKey, "icon", v);
    setPending(false);
    await onSaved();
  };

  const toggleEnabled = async (next: boolean) => {
    setEnabledLocal(next);
    setPending(true);
    const ok = await writeBoth(pageKey, sectionKey, "icon_enabled", next ? "1" : "0");
    setPending(false);
    if (!ok) setEnabledLocal(enabledFromDb);
    await onSaved();
  };

  // Lucide-Komponente per Name auflösen (Best-Effort, nur Vorschau-Pille).
  const pascal = name
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
  const Comp =
    ((LucideIcons as unknown) as Record<string, React.ComponentType<{ className?: string }>>)[pascal] ??
    null;

  const hasName = name.length > 0;

  return (
    <div className="space-y-2">
      <Toggle
        compact
        checked={enabledLocal && hasName}
        onChange={(v) => void toggleEnabled(v)}
        label={
          !hasName
            ? "Lucide-Icon anzeigen (kein Name gesetzt)"
            : enabledLocal
              ? `Lucide-Icon anzeigen (an · ${name})`
              : `Lucide-Icon anzeigen (aus · ${name})`
        }
        hint="Schalter schreibt `icon_enabled` (1/0). Der Icon-Name in `icon` bleibt beim Ausblenden erhalten."
        disabled={pending || !hasName}
      />
      {!hasName && (
        <p className="rounded border border-muted bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground">
          Hinweis: Schalter wird aktiv, sobald unten ein Icon-Name gesetzt ist.
        </p>
      )}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <div className="mb-0.5 text-[10px] text-muted-foreground">
            icon · Lucide-Name (kebab-case)
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => void saveName(name)}
            placeholder="shield-check"
            className="w-full rounded border border-border bg-background px-2 py-1 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-muted"
        >
          Wählen
        </button>
        <span className="flex h-7 w-7 items-center justify-center rounded border border-border bg-background text-primary">
          {Comp ? <Comp className="h-4 w-4" /> : <span className="text-[9px]">?</span>}
        </span>
      </div>
      <IconPickerDialog
        open={open}
        onOpenChange={setOpen}
        currentValue={name}
        onSelect={(kebab) => {
          setOpen(false);
          void saveName(kebab);
        }}
      />
    </div>
  );
};

const BulletRow: React.FC<{
  pageKey: string;
  sectionKey: string;
  index: number;
  valueFor: Props["valueFor"];
  efGet: Props["efGet"];
  renderFreigabeSwitch: Props["renderFreigabeSwitch"];
  onSaved: Props["onSaved"];
}> = ({ pageKey, sectionKey, index, valueFor, efGet, renderFreigabeSwitch, onSaved }) => {
  // Canonical: `bullets.N` / `bullets_N_enabled`. Falls leer, zeigt der Renderer
  // den Legacy-Wert aus `features.N` als Fallback. Wer hier schreibt, schreibt
  // die neue Wahrheit und überschreibt die Legacy-Anzeige.
  const fk = `bullets.${index}`;
  const enabledFk = `bullets_${index}_enabled`;
  const legacyValue = (valueFor(sectionKey, `features.${index}`, "de") ?? "").trim();
  const currentValue = (valueFor(sectionKey, fk, "de") ?? "").trim();
  const showLegacyHint = currentValue === "" && legacyValue !== "";
  return (
    <div className="rounded border border-border bg-background/40 p-2">
      <div className="flex items-center justify-between gap-2">
        <DbBoolToggle
          compact
          pageKey={pageKey}
          sectionKey={sectionKey}
          fieldKey={enabledFk}
          label={`Bulletpoint ${index + 1} sichtbar`}
          hint="Schreibt `bullets_${index}_enabled` (1/0). Der Texteintrag bleibt erhalten."
          initial={valueFor(sectionKey, enabledFk, "de") ?? valueFor(sectionKey, enabledFk, "en")}
          onSaved={onSaved}
        />
        <code className="font-mono text-[10px] text-muted-foreground/70">{fk}</code>
      </div>
      <div className="mt-2">
        <BiText
          pageKey={pageKey}
          sectionKey={sectionKey}
          fieldKey={fk}
          label={`Bulletpoint ${index + 1}`}
          valueFor={valueFor}
          efGet={efGet}
          renderFreigabeSwitch={renderFreigabeSwitch}
          onSaved={onSaved}
        />
      </div>
      {showLegacyHint && (
        <p className="mt-1 text-[10px] text-muted-foreground/80">
          Legacy-Wert aus <code className="font-mono">features.{index}</code> wird angezeigt, bis dieses Feld gefüllt ist.
        </p>
      )}
    </div>
  );
};

const ChipRow: React.FC<{
  pageKey: string;
  sectionKey: string;
  index: number;
  valueFor: Props["valueFor"];
  efGet: Props["efGet"];
  renderFreigabeSwitch: Props["renderFreigabeSwitch"];
  onSaved: Props["onSaved"];
}> = ({ pageKey, sectionKey, index, valueFor, efGet, renderFreigabeSwitch, onSaved }) => {
  const fk = `chips.${index}`;
  const enabledFk = `chips_${index}_enabled`;
  return (
    <div className="rounded border border-border bg-background/40 p-2">
      <div className="flex items-center justify-between gap-2">
        <DbBoolToggle
          compact
          pageKey={pageKey}
          sectionKey={sectionKey}
          fieldKey={enabledFk}
          label={`Chip ${index + 1} sichtbar`}
          hint="Schreibt `chips_${index}_enabled` (1/0). Wird als graue Pille ausgespielt."
          initial={valueFor(sectionKey, enabledFk, "de") ?? valueFor(sectionKey, enabledFk, "en")}
          onSaved={onSaved}
        />
        <code className="font-mono text-[10px] text-muted-foreground/70">{fk}</code>
      </div>
      <div className="mt-2">
        <BiText
          pageKey={pageKey}
          sectionKey={sectionKey}
          fieldKey={fk}
          label={`Chip ${index + 1}`}
          valueFor={valueFor}
          efGet={efGet}
          renderFreigabeSwitch={renderFreigabeSwitch}
          onSaved={onSaved}
        />
      </div>
    </div>
  );
};

const LinkBlock: React.FC<{
  pageKey: string;
  sectionKey: string;
  n: number;
  valueFor: Props["valueFor"];
  efGet: Props["efGet"];
  renderFreigabeSwitch: Props["renderFreigabeSwitch"];
  onSaved: Props["onSaved"];
  /** Optionaler Container-aware Linkstatus (Sprint „card_v1 Runtime-Parität"). */
  status?: LinkRuntime;
}> = ({ pageKey, sectionKey, n, valueFor, efGet, renderFreigabeSwitch, onSaved, status }) => {
  const enabledFk = `link_${n}_enabled`;
  const labelFk = `link_${n}_label`;
  const kindFk = `link_${n}_kind`;
  const hrefFk = `link_${n}_href`;

  const kindInitial = (valueFor(sectionKey, kindFk, "de") ?? valueFor(sectionKey, kindFk, "en") ?? "").trim();
  const [kind, setKind] = useState(kindInitial || "intern");
  useEffect(() => setKind(kindInitial || "intern"), [kindInitial]);

  const handleKind = async (next: string) => {
    setKind(next);
    await writeBoth(pageKey, sectionKey, kindFk, next);
    await onSaved();
  };

  const statusBadge = (() => {
    if (!status) return null;
    const cls = {
      active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      incomplete: "bg-amber-500/20 text-amber-800 dark:text-amber-200",
      disabled: "bg-muted text-muted-foreground",
      unsupported: "bg-destructive/15 text-destructive",
      empty: "bg-muted/50 text-muted-foreground",
    }[status.status];
    const label = {
      active: "aktiv",
      incomplete: "unvollständig",
      disabled: "deaktiviert",
      unsupported: "nicht in diesem Layout",
      empty: "leer",
    }[status.status];
    return (
      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${cls}`} title={status.reason ?? undefined}>
        {label}
      </span>
    );
  })();

  return (
    <div className="rounded border border-border bg-background/40 p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          link_{n}_*
        </span>
        <div className="flex items-center gap-2">
          {statusBadge}
          <DbBoolToggle
            compact
            pageKey={pageKey}
            sectionKey={sectionKey}
            fieldKey={enabledFk}
            label="sichtbar"
            initial={valueFor(sectionKey, enabledFk, "de") ?? valueFor(sectionKey, enabledFk, "en")}
            onSaved={onSaved}
          />
        </div>
      </div>
      {status?.reason && status.status !== "active" && status.status !== "empty" && (
        <p className="mb-2 text-[10px] text-muted-foreground italic">{status.reason}</p>
      )}
      <div className="space-y-2">
        <BiText
          pageKey={pageKey}
          sectionKey={sectionKey}
          fieldKey={labelFk}
          label={`Link ${n} · Label`}
          valueFor={valueFor}
          efGet={efGet}
          renderFreigabeSwitch={renderFreigabeSwitch}
          onSaved={onSaved}
        />
        <div>
          <div className="mb-0.5 text-[10px] text-muted-foreground">
            Art · <code className="font-mono">{kindFk}</code>
          </div>
          <select
            value={kind}
            onChange={(e) => void handleKind(e.target.value)}
            className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {LINK_KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <BiText
          pageKey={pageKey}
          sectionKey={sectionKey}
          fieldKey={hrefFk}
          label={`Link ${n} · Ziel (href)`}
          mono
          placeholderDe={
            kind === "extern"
              ? "https://…"
              : kind === "shortid"
                ? "P-203 oder B-538"
                : kind === "anker"
                  ? "#tuersprechanlage"
                  : "/pfad"
          }
          placeholderEn={
            kind === "extern"
              ? "https://…"
              : kind === "shortid"
                ? "P-203 or B-538"
                : kind === "anker"
                  ? "#tuersprechanlage"
                  : "/path"
          }

          valueFor={valueFor}
          efGet={efGet}
          renderFreigabeSwitch={renderFreigabeSwitch}
          onSaved={onSaved}
        />
      </div>
    </div>
  );
};

// ───────── Hauptkomponente ───────────────────────────────────────────

export const BildkartenCardWorkspace: React.FC<Props> = ({
  pageKey,
  sectionKey,
  parentSectionKey,
  parentSectionLabel,
  parentSectionType,
  fieldKeys,
  hasImage,
  hasThumbnail = false,
  hasIconImage = false,
  valueFor,
  efGet,
  renderFreigabeSwitch,
  assetsSlot,
  onSaved,
  scrollContainerRef,
}) => {
  // Container-Hinweis (Label + erwarteter Slot + Pflicht ja/nein).
  // Sonderfall `cards_v1 + products` → Kartenscroller (Eine-Wahrheit-Etappe).
  const containerHint = useMemo(
    () => containerHintFor(parentSectionType, parentSectionKey),
    [parentSectionType, parentSectionKey],
  );
  // Zentraler Resolver — gleiche Wahrheit wie Public-Renderer.
  const cardVis = useMemo(
    () =>
      resolveCardVisibility({
        valueFor: (fk, loc) => valueFor(sectionKey, fk, loc),
        hasImage,
        hasThumbnail,
        hasIconImage,
        parentSectionType,
        parentSectionKey,
      }),
    [valueFor, sectionKey, hasImage, hasThumbnail, hasIconImage, parentSectionType, parentSectionKey],
  );
  // Container-aware Runtime — Status pro Feld (active/incomplete/disabled/unsupported/empty).
  const cardRt = useMemo(
    () =>
      resolveCardRuntime({
        valueFor: (fk, loc) => valueFor(sectionKey, fk, loc),
        hasImage,
        hasThumbnail,
        hasIconImage,
        parentSectionType,
        parentSectionKey,
      }),
    [valueFor, sectionKey, hasImage, hasThumbnail, hasIconImage, parentSectionType, parentSectionKey],
  );
  const support = useMemo(
    () => containerSupportFor(parentSectionType, parentSectionKey),
    [parentSectionType, parentSectionKey],
  );
  // Hat die Karte einen aktiven Asset im erwarteten Slot?
  const hasExpectedAsset =
    containerHint?.expectedSlot === "thumbnail"
      ? hasThumbnail
      : containerHint?.expectedSlot === "icon_image"
        ? hasIconImage
        : containerHint?.expectedSlot === "image"
          ? hasImage
          : true;
  const expectedSlotMissing =
    !!containerHint && containerHint.expectedSlot !== "none" && !hasExpectedAsset;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cacheKey = cardCacheKey(pageKey, sectionKey);

  // ── Akkordeon-Zustand pro Karte. Beim ersten Mounten einer Karte alles zu;
  //    Wechsel auf eine andere Karte resettet auf alles zu. Re-Mounts der
  //    Workspace-Komponente nach Save behalten den Zustand (Modul-Cache).
  const [openGroups, setOpenGroupsState] = useState<Record<GroupKey, boolean>>(
    () => openGroupsCache.get(cacheKey) ?? { ...EMPTY_GROUPS },
  );
  const lastCacheKeyRef = useRef(cacheKey);
  useEffect(() => {
    if (lastCacheKeyRef.current !== cacheKey) {
      lastCacheKeyRef.current = cacheKey;
      const fresh = { ...EMPTY_GROUPS };
      openGroupsCache.set(cacheKey, fresh);
      setOpenGroupsState(fresh);
    }
  }, [cacheKey]);
  // Akkordeon-Verhalten: Single-Open. Beim Öffnen einer Gruppe werden alle
  // anderen automatisch geschlossen. Schließen wirkt nur auf die eigene Gruppe.
  const toggleGroup = useCallback(
    (k: GroupKey) => (next: boolean) =>
      setOpenGroupsState((s) => {
        const updated: Record<GroupKey, boolean> = next
          ? { ...EMPTY_GROUPS, [k]: true }
          : { ...s, [k]: false };
        openGroupsCache.set(cacheKey, updated);
        return updated;
      }),
    [cacheKey],
  );

  // ── Scrollcontainer: bevorzugt den vom Editor übergebenen Ref (echter
  //    rechter Arbeitsbereich), Fallback auf DOM-Suche.
  const findScrollParent = useCallback((node: HTMLElement | null): Element | Window => {
    let el: HTMLElement | null = node?.parentElement ?? null;
    while (el) {
      const o = getComputedStyle(el).overflowY;
      if ((o === "auto" || o === "scroll") && el.scrollHeight > el.clientHeight + 1) {
        return el;
      }
      el = el.parentElement;
    }
    return window;
  }, []);

  const getScroller = useCallback((): Element | Window => {
    if (scrollContainerRef?.current) return scrollContainerRef.current;
    return findScrollParent(rootRef.current);
  }, [scrollContainerRef, findScrollParent]);

  // Nach Re-Mount (Save-Reload) gemerkte Scrollposition wiederherstellen.
  useEffect(() => {
    const saved = scrollTopCache.get(cacheKey);
    if (saved == null) return;
    requestAnimationFrame(() => {
      const t = getScroller();
      if (t === window) window.scrollTo({ top: saved, left: 0, behavior: "auto" });
      else (t as Element).scrollTop = saved;
    });
    // läuft nur bei Mount/Wechsel — kein Endlos-Refresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  const onSavedPreserve = useCallback(async () => {
    const target = getScroller();
    const top = target === window ? window.scrollY : (target as Element).scrollTop;
    scrollTopCache.set(cacheKey, top);
    await onSaved();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const t2 = getScroller();
        if (t2 === window) window.scrollTo({ top, left: 0, behavior: "auto" });
        else (t2 as Element).scrollTop = top;
      });
    });
  }, [getScroller, onSaved, cacheKey]);

  // ── Kanonische Feldnamen (Sprint „Kartenmodell vereinheitlichen —
  //    card_v1 Textwahrheit konsolidieren"). Der Admin schreibt jetzt
  //    primär in `eyebrow` / `title` / `description`. Die Alias-Felder
  //    `subtitle` / `headline` / `beschreibung` wurden per Migration in
  //    diese kanonischen Felder backfilled und werden von den Renderern
  //    (`CardsSectionV1`, `ProductScrollerV1`) nur noch als Fallback gelesen.
  const EYEBROW_FK = "eyebrow";
  const TITLE_FK = "title";
  const DESC_FK = "description";

  // ── Eyebrow-Sichtbarkeit: ausschließlich über `eyebrow_enabled` (1/0).
  //    Texte bleiben beim Ausschalten erhalten.
  const eyebrowEnabledRaw = (
    valueFor(sectionKey, "eyebrow_enabled", "de") ??
    valueFor(sectionKey, "eyebrow_enabled", "en") ??
    ""
  ).trim();
  const eyebrowEnabled = eyebrowEnabledRaw === "1";

  // ── Container-aware Zählungen (Sprint „card_v1 Runtime-Parität").
  //    Resolver liefert active/incomplete/disabled-Counts pro Modul.
  const activeBulletCount = cardRt.counts.bulletsActive;
  const activeChipCount = cardRt.counts.chipsActive;
  const activeLinkCount = cardRt.counts.linksActive;
  const incompleteLinkCount = cardRt.counts.linksIncomplete;
  const filledLinkCount = cardRt.counts.linksFilled;

  const iconValue = cardVis.iconName;
  // Renderer-Wahrheit aus dem zentralen Resolver.
  const iconVisibleInRenderer = cardVis.iconVisible;

  const imageEnabledRaw = (valueFor(sectionKey, "image_enabled", "de") ?? valueFor(sectionKey, "image_enabled", "en") ?? "").trim();
  const imageEnabledFromDb = imageEnabledRaw === "" ? hasImage : imageEnabledRaw === "1";
  // Optimistischer lokaler Schalter-Zustand: zeigt sofort die Nutzer-Intention,
  // fällt aber bei Save-Fehler zurück auf den DB-Wert (siehe `handleImageToggle`).
  const [imageVisibleLocal, setImageVisibleLocal] = useState(imageEnabledFromDb);
  useEffect(() => setImageVisibleLocal(imageEnabledFromDb), [imageEnabledFromDb]);
  const [imagePending, setImagePending] = useState(false);
  const imageVisible = imageVisibleLocal;

  const handleImageToggle = async (next: boolean) => {
    setImageVisibleLocal(next);
    setImagePending(true);
    const ok = await writeBoth(pageKey, sectionKey, "image_enabled", next ? "1" : "0");
    setImagePending(false);
    if (!ok) {
      // Toast wurde bereits in writeBoth gezeigt — Schalter zurück auf DB-Wert.
      setImageVisibleLocal(imageEnabledFromDb);
    }
    await onSavedPreserve();
  };




  return (
    <div ref={rootRef} className="space-y-3">
      {/* Kopf — container-abhängige Beschriftung */}
      <div
        className={
          "flex flex-wrap items-center gap-2 rounded border border-l-4 px-3 py-2 text-[11px] " +
          (expectedSlotMissing && containerHint?.slotIsRequired
            ? "border-l-destructive bg-destructive/5"
            : "border-l-primary/60 bg-muted/20")
        }
      >
        <span className="rounded bg-primary/10 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-primary">
          Standardkarte
        </span>
        {containerHint && (
          <span
            className="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground"
            title={containerHint.summary}
          >
            {containerHint.containerLabel}
          </span>
        )}
        {expectedSlotMissing && containerHint?.slotIsRequired && (
          <span
            className="rounded bg-destructive/15 px-1.5 py-0.5 font-medium text-destructive"
            title={`Container „${containerHint.containerLabel}" erwartet Slot \`${containerHint.expectedSlot}\` — sonst wirkt die Karte leer.`}
          >
            ⚠ {containerHint.expectedSlot === "image"
              ? "Bild fehlt"
              : containerHint.expectedSlot === "thumbnail"
                ? "Thumbnail fehlt"
                : "Bildicon fehlt"}
          </span>
        )}
        {expectedSlotMissing && containerHint && !containerHint.slotIsRequired && (
          <span
            className="rounded bg-muted/60 px-1.5 py-0.5 text-muted-foreground"
            title={containerHint.summary}
          >
            Hinweis: Bild empfohlen (Textkarte hier erlaubt)
          </span>
        )}
        {parentSectionKey && (
          <span className="text-muted-foreground">
            in {containerHint?.containerLabel ?? "Container"}:{" "}
            <span className="font-medium text-foreground">
              {parentSectionLabel ?? parentSectionKey}
            </span>
          </span>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground/70">
          DE/EN · {containerHint?.summary ?? "Standardkarte"}
        </span>
      </div>


      {/* 1 Inhalte — drei klar getrennte Textbereiche */}
      <GroupShell title="Inhalte (Texte)" open={openGroups.content} onOpenChange={toggleGroup("content")}>
        {/* 1a Eyebrow — Sichtbarkeit über eyebrow_enabled (1/0), Text bleibt erhalten. */}
        <section className="rounded border border-border/60 bg-background/40 p-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Kicker · Eyebrow
              <span className="ml-1 font-normal normal-case opacity-70">(kleine Zeile über dem Titel)</span>
            </span>
            <DbBoolToggle
              compact
              pageKey={pageKey}
              sectionKey={sectionKey}
              fieldKey="eyebrow_enabled"
              label="anzeigen"
              hint="Schreibt `eyebrow_enabled` (1/0). Der Text bleibt beim Ausschalten erhalten."
              initial={
                valueFor(sectionKey, "eyebrow_enabled", "de") ??
                valueFor(sectionKey, "eyebrow_enabled", "en")
              }
              onSaved={onSavedPreserve}
            />
          </div>
          <VisibilityStateShell enabled={eyebrowEnabled}>
            <BiText
              pageKey={pageKey}
              sectionKey={sectionKey}
              fieldKey={EYEBROW_FK}
              label="Eyebrow"
              valueFor={valueFor}
              efGet={efGet}
              renderFreigabeSwitch={renderFreigabeSwitch}
              onSaved={onSavedPreserve}
            />
          </VisibilityStateShell>
        </section>


        {/* 1b Titel */}
        <section className="rounded border border-border/60 bg-background/40 p-2">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Titel · Headline
            <span className="ml-1 font-normal normal-case opacity-70">(die große Überschrift der Karte)</span>
          </div>
          <BiText
            pageKey={pageKey}
            sectionKey={sectionKey}
            fieldKey={TITLE_FK}
            label="Titel"
            valueFor={valueFor}
            efGet={efGet}
            renderFreigabeSwitch={renderFreigabeSwitch}
            onSaved={onSavedPreserve}
          />
        </section>

        {/* 1c Beschreibung */}
        <section className="rounded border border-border/60 bg-background/40 p-2">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Beschreibung · Body
            <span className="ml-1 font-normal normal-case opacity-70">(Fließtext unter dem Titel)</span>
          </div>
          <BiText
            pageKey={pageKey}
            sectionKey={sectionKey}
            fieldKey={DESC_FK}
            label="Beschreibung"
            multiline
            valueFor={valueFor}
            efGet={efGet}
            renderFreigabeSwitch={renderFreigabeSwitch}
            onSaved={onSavedPreserve}
          />
        </section>
      </GroupShell>

      {/* 2 Bilder — Slots image / thumbnail / icon_image bleiben alle anlegbar.
          Welcher Slot im aktuellen Container wirklich gerendert wird, steht im
          Container-Hinweis oben. */}
      <GroupShell
        title="Bild · Thumbnail · Bildicon"
        hint={
          containerHint
            ? `Aktiver Container: ${containerHint.containerLabel}. ${containerHint.summary}`
            : "Hauptbild der Karte. Der Schalter wirkt auf das echte CMS-Feld `image_enabled`. Bilddateien bleiben erhalten."
        }
        tone={expectedSlotMissing && containerHint?.slotIsRequired ? "warn" : "default"}
        open={openGroups.image}
        onOpenChange={toggleGroup("image")}
      >
        <div className="rounded border border-border bg-background/40 p-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Hauptbild · Slot <code className="font-mono">image</code>
            </span>
            <Toggle
              compact
              checked={imageVisible}
              onChange={(v) => void handleImageToggle(v)}
              label="anzeigen"
              hint="Schreibt `image_enabled` in DE und EN."
              disabled={imagePending}
            />
          </div>
          {!imageVisible && (
            <p className="mt-2 text-[10px] text-muted-foreground/70">
              Bild ist aktuell ausgeblendet. Die hinterlegten Dateien bleiben erhalten.
            </p>
          )}
        </div>
        {assetsSlot}
        {expectedSlotMissing && containerHint?.slotIsRequired && (
          <p className="text-[11px] text-destructive">
            Container „{containerHint.containerLabel}" erwartet einen aktiven Slot{" "}
            <code>{containerHint.expectedSlot}</code> — sonst wirkt die Karte leer.
          </p>
        )}
      </GroupShell>


      {/* 3 Icon — card_v1 ist Masterkarte: Icon kann in jedem Container neben
          einem Bild koexistieren. Sichtbarkeit über `icon_enabled` (1/0). */}
      <GroupShell
        title={`Icon (Lucide) — ${iconVisibleInRenderer ? `an · ${iconValue}` : iconValue ? `aus · ${iconValue}` : "aus"}`}
        hint='Schalter schreibt `icon_enabled` (1/0). Der Icon-Name in `icon` bleibt beim Ausblenden erhalten.'
        open={openGroups.icon}
        onOpenChange={toggleGroup("icon")}
      >
        <IconBlock
          pageKey={pageKey}
          sectionKey={sectionKey}
          valueFor={valueFor}
          onSaved={onSavedPreserve}
        />
      </GroupShell>


      {/* 4 Bulletpoints — Listenpunkte mit Anstrich. Canonical `bullets.N`. */}
      <GroupShell
        title={
          support.supports.bullets
            ? `Bulletpoints · ${activeBulletCount} von 5 aktiv`
            : `Bulletpoints · in diesem Layout nicht sichtbar`
        }
        hint={
          support.supports.bullets
            ? 'Wird als Liste mit Punkt/Anstrich unter der Beschreibung ausgespielt. Canonical `bullets.0`–`bullets.4`. Legacy `features.*` wird nur als Fallback angezeigt, bis ein Bullet gepflegt ist.'
            : `Container „${containerHint?.containerLabel ?? "—"}" rendert keine Bulletpoints. Inhalte bleiben erhalten, werden aber öffentlich nicht angezeigt.`
        }
        tone={!support.supports.bullets ? "warn" : "default"}
        open={openGroups.bullets}
        onOpenChange={toggleGroup("bullets")}
      >
        <div className="flex flex-col gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <BulletRow
              key={i}
              pageKey={pageKey}
              sectionKey={sectionKey}
              index={i}
              valueFor={valueFor}
              efGet={efGet}
              renderFreigabeSwitch={renderFreigabeSwitch}
              onSaved={onSavedPreserve}
            />
          ))}
        </div>
      </GroupShell>

      {/* 4b Chips / Merkmale — graue Pillen. Separates Modul, optional. */}
      <GroupShell
        title={
          support.supports.chips
            ? `Chips / Merkmale · ${activeChipCount} von 5 aktiv`
            : `Chips / Merkmale · in diesem Layout nicht sichtbar`
        }
        hint={
          support.supports.chips
            ? 'Wird als kleine graue Pillen ausgespielt (z. B. „IP65", „Edelstahl"). Standardmäßig leer — Karten ohne Chips zeigen keinen Chip-Bereich.'
            : `Container „${containerHint?.containerLabel ?? "—"}" rendert keine Chips. Inhalte bleiben erhalten, werden aber öffentlich nicht angezeigt.`
        }
        tone={!support.supports.chips ? "warn" : "default"}
        open={openGroups.chips}
        onOpenChange={toggleGroup("chips")}
      >
        <div className="flex flex-col gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <ChipRow
              key={i}
              pageKey={pageKey}
              sectionKey={sectionKey}
              index={i}
              valueFor={valueFor}
              efGet={efGet}
              renderFreigabeSwitch={renderFreigabeSwitch}
              onSaved={onSavedPreserve}
            />
          ))}
        </div>
      </GroupShell>

      {/* 5 Links — Status: aktiv · unvollständig · befüllt. */}
      <GroupShell
        title={
          support.supports.links
            ? `Links · ${activeLinkCount} aktiv${incompleteLinkCount > 0 ? ` · ${incompleteLinkCount} unvollständig` : ""}${filledLinkCount > 0 ? ` · ${filledLinkCount} befüllt` : ""}`
            : `Links · in diesem Layout nicht sichtbar`
        }
        hint={
          support.supports.links
            ? 'Verlinkungen unter der Karte (z. B. „Mehr erfahren" auf eine Produktseite). Ein Link gilt als aktiv, wenn Beschriftung UND Ziel gepflegt sind und der Schalter an ist.'
            : `Container „${containerHint?.containerLabel ?? "—"}" rendert keine Links link_1..3. Inhalte bleiben erhalten, werden aber öffentlich nicht angezeigt.`
        }
        tone={!support.supports.links ? "warn" : "default"}
        open={openGroups.links}
        onOpenChange={toggleGroup("links")}
      >
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((n) => (
            <LinkBlock
              key={n}
              pageKey={pageKey}
              sectionKey={sectionKey}
              n={n}
              valueFor={valueFor}
              efGet={efGet}
              renderFreigabeSwitch={renderFreigabeSwitch}
              onSaved={onSavedPreserve}
              status={cardRt.links[n - 1]}
            />
          ))}
        </div>
      </GroupShell>


      {/* 6 Technik */}
      <GroupShell title="Technik" open={openGroups.tech} onOpenChange={toggleGroup("tech")}>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-[11px] sm:grid-cols-3">
          <div className="min-w-0">
            <dt className="text-muted-foreground">section_key</dt>
            <dd className="font-mono break-all">{sectionKey}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted-foreground">section_type</dt>
            <dd className="font-mono">card_v1</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted-foreground">parent_section_key</dt>
            <dd className="font-mono break-all">{parentSectionKey ?? "–"}</dd>
          </div>
        </dl>
        <p className="mt-2 text-[10px] text-muted-foreground/70">
          Echte Feldnamen: {fieldKeys.sort().join(" · ")}
        </p>
      </GroupShell>
    </div>
  );
};

export default BildkartenCardWorkspace;
