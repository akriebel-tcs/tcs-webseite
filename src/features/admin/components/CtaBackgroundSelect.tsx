/**
 * CtaBackgroundSelect — kleiner Schalter für `background_variant`
 * im `cta_v1`-Block. Zwei Werte:
 *
 *   - light (Default): heller Hintergrund, dunkle Buttons.
 *   - dark:            dunkler Hintergrund, helle Buttons.
 *
 * Schreibt direkt in `cms_section_fields` über die generische,
 * whitelist-geschützte RPC `rpc_admin_update_section_field`.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveSectionField } from "@/features/admin/api/cmsAdminWrite";

type Variant = "light" | "dark";

function normalize(raw: string | null | undefined): Variant {
  return (raw ?? "").trim().toLowerCase() === "dark" ? "dark" : "light";
}

interface Props {
  pageKey: string;
  sectionKey: string;
  value: string | null;
  /** Whitelist erlaubt Schreiben in DE. */
  editable: boolean;
  onSaved?: () => void | Promise<void>;
}

const CtaBackgroundSelect = ({ pageKey, sectionKey, value, editable, onSaved }: Props) => {
  const [current, setCurrent] = useState<Variant>(() => normalize(value));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCurrent(normalize(value));
  }, [value]);

  const handleChange = async (next: string) => {
    const v = normalize(next);
    if (v === current) return;
    setCurrent(v);
    setSaving(true);
    const res = await saveSectionField({
      pageKey,
      sectionKey,
      fieldKey: "background_variant",
      locale: "de",
      value: v,
    });
    setSaving(false);
    if (!res.success) {
      toast.error(`Hintergrund konnte nicht gespeichert werden: ${res.error ?? "unbekannt"}`);
      setCurrent(normalize(value));
      return;
    }
    toast.success(v === "dark" ? "Dunkler Hintergrund." : "Heller Hintergrund.");
    await onSaved?.();
  };

  if (!editable) {
    return (
      <span className="text-[11px] text-muted-foreground">
        Hintergrund: <strong>{current === "dark" ? "dunkel" : "hell"}</strong> (noch nicht zur Pflege freigegeben)
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <Select value={current} onValueChange={handleChange} disabled={saving}>
        <SelectTrigger className="h-8 w-[160px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="light">Heller Hintergrund</SelectItem>
          <SelectItem value="dark">Dunkler Hintergrund</SelectItem>
        </SelectContent>
      </Select>
      {saving && <span className="text-[11px] text-muted-foreground">speichert…</span>}
    </div>
  );
};

export default CtaBackgroundSelect;
