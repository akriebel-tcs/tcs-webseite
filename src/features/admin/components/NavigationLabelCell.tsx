/**
 * Inline-Editor für `cms_navigation_nodes.label_de` / `label_en`.
 *
 * Etappe D: Schreibt ausschließlich über die whitelist-eingeschränkte RPC
 * `rpc_admin_update_navigation_label`. Andere Felder können hier nicht
 * verändert werden.
 *
 * UI-Logik:
 *  - Standard: Anzeige des DB-Werts (oder "—") mit kleinem ✎ Bearbeiten-Knopf.
 *  - Bearbeitenmodus: Input + Speichern + Abbrechen.
 *  - Optional: Knopf „aus i18n übernehmen", wenn der i18n-Wert vom DB-Wert
 *    abweicht und nicht leer ist (Drift-Schnellbeheben).
 */
import { useState } from "react";
import {
  updateNavigationLabel,
  updateNavigationDescription,
  type NavLocale,
} from "@/features/admin/api/cmsAdminNavigationWrite";

type Props = {
  nodeId: string;
  locale: NavLocale;
  /** Aktueller DB-Wert (label_de / label_en). */
  dbValue: string | null;
  /** i18n-Wert derselben Sprache, falls verfügbar (für „übernehmen"-Shortcut). */
  i18nValue: string | null;
  /** Wird nach erfolgreichem Speichern mit dem neuen Wert aufgerufen. */
  onSaved: (newValue: string | null) => void;
  /**
   * Welches Feld gepflegt wird: `label` (Beschriftung im Menü, Standard)
   * oder `description` (Untertitel im Dropdown-Menü).
   */
  field?: "label" | "description";
  /** Mehrzeiliges Eingabefeld (sinnvoll für Untertitel). */
  multiline?: boolean;
};

type SaveState = "idle" | "saving" | "ok" | "error";

const NavigationLabelCell = ({ nodeId, locale, dbValue, i18nValue, onSaved, field = "label", multiline = false }: Props) => {
  const fieldName = field === "description" ? `description_${locale}` : `label_${locale}`;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(dbValue ?? "");
  const [state, setState] = useState<SaveState>("idle");
  const [msg, setMsg] = useState<string | null>(null);

  const startEdit = () => {
    setDraft(dbValue ?? "");
    setState("idle");
    setMsg(null);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setState("idle");
    setMsg(null);
  };

  const save = async (valueToSave: string) => {
    setState("saving");
    setMsg(null);
    const res =
      field === "description"
        ? await updateNavigationDescription(nodeId, locale, valueToSave)
        : await updateNavigationLabel(nodeId, locale, valueToSave);
    if (res.success && res.updated) {
      setState("ok");
      const newVal = (res.value ?? null) as string | null;
      onSaved(newVal);
      setEditing(false);
    } else {
      setState("error");
      setMsg(res.error ?? "Speichern fehlgeschlagen.");
    }
  };

  if (!editing) {
    const driftAvailable =
      !!i18nValue &&
      i18nValue.trim().length > 0 &&
      (dbValue ?? "").trim() !== i18nValue.trim();

    return (
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 break-words">
          {dbValue ? (
            <span>{dbValue}</span>
          ) : (
            <em className="text-muted-foreground">—</em>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <button
            type="button"
            onClick={startEdit}
            className="rounded border px-1.5 py-0.5 text-[10px] hover:bg-muted"
            title={`${fieldName} bearbeiten`}
          >
            Bearbeiten
          </button>
          {driftAvailable && (
            <button
              type="button"
              onClick={() => save(i18nValue ?? "")}
              className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-700 hover:bg-amber-500/20"
              title={`DB auf i18n-Wert „${i18nValue}" setzen`}
            >
              ← aus i18n
            </button>
          )}
        </div>
      </div>
    );
  }

  const dirty = (draft ?? "") !== (dbValue ?? "");

  return (
    <div className="space-y-1">
      {multiline ? (
        <textarea
          value={draft}
          autoFocus
          rows={2}
          onChange={(e) => {
            setDraft(e.target.value);
            if (state !== "idle") setState("idle");
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") cancel();
          }}
          className="w-full rounded border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          spellCheck={false}
        />
      ) : (
        <input
          type="text"
          value={draft}
          autoFocus
          onChange={(e) => {
            setDraft(e.target.value);
            if (state !== "idle") setState("idle");
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") cancel();
            if (e.key === "Enter" && dirty && state !== "saving") void save(draft);
          }}
          className="w-full rounded border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          spellCheck={false}
        />
      )}
      <div className="flex items-center justify-between gap-2">
        <span
          className={
            "text-[10px] " +
            (state === "ok"
              ? "text-emerald-600"
              : state === "error"
                ? "text-destructive"
                : state === "saving"
                  ? "text-muted-foreground"
                  : "text-muted-foreground")
          }
        >
          {state === "saving" ? "Speichere…" : (msg ?? fieldName)}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={cancel}
            className="rounded border px-2 py-0.5 text-[10px] hover:bg-muted"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={() => void save(draft)}
            disabled={!dirty || state === "saving"}
            className="rounded border border-foreground/40 bg-foreground px-2 py-0.5 text-[10px] text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
};

export default NavigationLabelCell;
