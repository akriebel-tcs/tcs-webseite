/**
 * VisibilityFieldSwitch — generischer An/Aus-Schalter für Sichtbarkeits-
 * Felder in `cms_section_fields`. Wird vor allem für FAQ-Items
 * (`items.<slug>.enabled` / `.is_active` / `.visible` / `.hidden`) genutzt,
 * funktioniert aber für jedes Feld, dessen Wert "1"/"0" die Sichtbarkeit
 * eines Public-Elements steuert.
 *
 * Logik:
 *   - `invert=false` (enabled/is_active/visible): ON = "1", OFF = "0";
 *     fehlender Wert gilt im Renderer als sichtbar → Default ON.
 *   - `invert=true`  (hidden): ON (sichtbar) = "0", OFF (versteckt) = "1";
 *     fehlender Wert gilt als sichtbar → Default ON.
 *
 * Schreibweg: ausschließlich über die Whitelist-geschützte RPC
 * `rpc_admin_update_section_field` via `saveSectionField`. Geschrieben wird
 * nur in die Locales, die der Aufrufer per `locales` übergibt (sollen
 * ausschließlich DB-Zeilen + Whitelist-`is_enabled=true` sein).
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { saveSectionField } from "@/features/admin/api/cmsAdminWrite";

function readOn(raw: string | null | undefined, invert: boolean): boolean {
  const v = (raw ?? "").trim();
  if (invert) return v !== "1"; // hidden: "1" = versteckt → OFF
  return v !== "0"; // enabled/is_active/visible: leer/"1" = sichtbar
}

interface Props {
  pageKey: string;
  sectionKey: string;
  fieldKey: string;
  /** DB-Wert in DE (führend für die Anzeige). */
  valueDe: string | null;
  invert: boolean;
  /** Locales, in denen wirklich gespeichert werden darf (DB-Zeile + Whitelist). */
  locales: ReadonlyArray<"de" | "en" | "pl">;
  onSaved?: () => void | Promise<void>;
}

const VisibilityFieldSwitch = ({ pageKey, sectionKey, fieldKey, valueDe, invert, locales, onSaved }: Props) => {
  const [current, setCurrent] = useState<boolean>(() => readOn(valueDe, invert));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCurrent(readOn(valueDe, invert));
  }, [valueDe, invert]);

  const editable = locales.length > 0;

  const handleChange = async (nextOn: boolean) => {
    if (nextOn === current || !editable) return;
    setCurrent(nextOn);
    setSaving(true);
    const valueToWrite = invert
      ? (nextOn ? "0" : "1")
      : (nextOn ? "1" : "0");
    let firstError: string | null = null;
    for (const loc of locales) {
      const res = await saveSectionField({
        pageKey,
        sectionKey,
        fieldKey,
        locale: loc,
        value: valueToWrite,
      });
      if (!res.success && !firstError) firstError = res.error ?? "unbekannt";
    }
    setSaving(false);
    if (firstError) {
      toast.error(`Schalter konnte nicht gespeichert werden: ${firstError}`);
      setCurrent(readOn(valueDe, invert));
      return;
    }
    toast.success(nextOn ? "Eingeblendet." : "Ausgeblendet.");
    await onSaved?.();
  };

  if (!editable) {
    return (
      <div className="flex items-center gap-3 rounded border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <Switch checked={current} disabled />
        <span>
          {current ? "sichtbar" : "ausgeblendet"}{" "}
          <span className="text-muted-foreground">(noch nicht zur Pflege freigegeben)</span>
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Switch checked={current} onCheckedChange={handleChange} disabled={saving} />
      <span className="text-sm text-foreground">{current ? "sichtbar" : "ausgeblendet"}</span>
      {saving && <span className="text-[11px] text-muted-foreground">speichert…</span>}
    </div>
  );
};

export default VisibilityFieldSwitch;
