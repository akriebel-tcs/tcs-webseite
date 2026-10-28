/**
 * CtaToggleSwitch — physischer An/Aus-Schalter für die optionalen Bereiche
 * eines `cta_v1`-Blocks (Sekundär-Button, Telefon-Zeile, E-Mail-Zeile).
 *
 * Schreibt den Wert als Text "1" / "0" in `cms_section_fields` über die
 * generische, whitelist-geschützte RPC `rpc_admin_update_section_field`
 * (`saveSectionField`). Public-Renderer (`CtaV1.tsx`) liest exakt dasselbe
 * Feld — damit ist die DB die einzige Wahrheit.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { saveSectionField } from "@/features/admin/api/cmsAdminWrite";

function normalize(raw: string | null | undefined): boolean {
  const v = (raw ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "yes";
}

interface Props {
  pageKey: string;
  sectionKey: string;
  fieldKey: "show_secondary" | "show_phone" | "show_email" | string;
  value: string | null;
  /** Whitelist erlaubt Schreiben in DE. */
  editable: boolean;
  onSaved?: () => void | Promise<void>;
}

const CtaToggleSwitch = ({ pageKey, sectionKey, fieldKey, value, editable, onSaved }: Props) => {
  const [current, setCurrent] = useState<boolean>(() => normalize(value));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCurrent(normalize(value));
  }, [value]);

  const handleChange = async (next: boolean) => {
    if (next === current) return;
    setCurrent(next);
    setSaving(true);
    const res = await saveSectionField({
      pageKey,
      sectionKey,
      fieldKey,
      locale: "de",
      value: next ? "1" : "0",
    });
    setSaving(false);
    if (!res.success) {
      toast.error(`Schalter konnte nicht gespeichert werden: ${res.error ?? "unbekannt"}`);
      setCurrent(normalize(value));
      return;
    }
    toast.success(next ? "Bereich eingeblendet." : "Bereich ausgeblendet.");
    await onSaved?.();
  };

  if (!editable) {
    return (
      <div className="flex items-center gap-3 rounded border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <Switch checked={current} disabled />
        <span>
          {current ? "an" : "aus"}{" "}
          <span className="text-muted-foreground">(noch nicht zur Pflege freigegeben)</span>
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Switch checked={current} onCheckedChange={handleChange} disabled={saving} />
      <span className="text-sm text-foreground">{current ? "an" : "aus"}</span>
      {saving && <span className="text-[11px] text-muted-foreground">speichert…</span>}
    </div>
  );
};

export default CtaToggleSwitch;
