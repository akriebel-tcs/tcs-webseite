/**
 * CtaButtonColorSelect — kleiner Schalter für die Button-Farbe in einem
 * `cta_v1`-Block. Drei Werte:
 *
 *   - auto  (Default): folgt dem Hintergrund (`background_variant`).
 *   - dark:            dunkler Button (Primär: schwarzer Hintergrund, weiße Schrift; Sekundär: dunkle Outline).
 *   - light:           heller Button  (Primär: weißer Hintergrund, schwarze Schrift; Sekundär: helle Outline).
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

type Color = "auto" | "dark" | "light";

function normalize(raw: string | null | undefined): Color {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "dark") return "dark";
  if (v === "light") return "light";
  return "auto";
}

interface Props {
  pageKey: string;
  sectionKey: string;
  fieldKey: "cta_primary_color" | "cta_secondary_color";
  value: string | null;
  editable: boolean;
  onSaved?: () => void | Promise<void>;
}

const CtaButtonColorSelect = ({ pageKey, sectionKey, fieldKey, value, editable, onSaved }: Props) => {
  const [current, setCurrent] = useState<Color>(() => normalize(value));
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
      fieldKey,
      locale: "de",
      value: v,
    });
    setSaving(false);
    if (!res.success) {
      toast.error(`Button-Farbe konnte nicht gespeichert werden: ${res.error ?? "unbekannt"}`);
      setCurrent(normalize(value));
      return;
    }
    toast.success("Button-Farbe gespeichert.");
    await onSaved?.();
  };

  if (!editable) {
    return (
      <span className="text-[11px] text-muted-foreground">
        Farbe: <strong>{current}</strong> (noch nicht zur Pflege freigegeben)
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <Select value={current} onValueChange={handleChange} disabled={saving}>
        <SelectTrigger className="h-8 w-[170px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="auto">Farbe: Automatisch</SelectItem>
          <SelectItem value="dark">Farbe: Dunkel</SelectItem>
          <SelectItem value="light">Farbe: Hell</SelectItem>
        </SelectContent>
      </Select>
      {saving && <span className="text-[11px] text-muted-foreground">speichert…</span>}
    </div>
  );
};

export default CtaButtonColorSelect;
