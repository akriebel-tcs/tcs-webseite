/**
 * TeaserBackgroundSelect — Hintergrund-Auswahl für `teaser_2col_v1`.
 *
 * Fünf abgestimmte Werte, die der Public-Renderer (`Teaser2ColV1`) kennt:
 *
 *   - white     (Weiss, Default)
 *   - black-5   (5% Schwarz)
 *   - black-7   (7% Schwarz)
 *   - black-10  (10% Schwarz)
 *   - black-13  (13% Schwarz)
 *
 * Schreibt direkt in `cms_section_fields` über die generische,
 * whitelist-geschützte RPC `rpc_admin_update_section_field`.
 * Schreibt nur Locale DE — der Wert ist technisch und sprachneutral.
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

type Variant = "white" | "black-5" | "black-7" | "black-10" | "black-13";

const OPTIONS: Array<{ value: Variant; label: string }> = [
  { value: "white", label: "Weiss" },
  { value: "black-5", label: "5% Schwarz" },
  { value: "black-7", label: "7% Schwarz" },
  { value: "black-10", label: "10% Schwarz" },
  { value: "black-13", label: "13% Schwarz" },
];

function normalize(raw: string | null | undefined): Variant {
  const v = (raw ?? "").trim().toLowerCase();
  switch (v) {
    case "black-5":
    case "black-7":
    case "black-10":
    case "black-13":
      return v;
    case "muted":
      // Altbestand: muted ≈ 10% Schwarz.
      return "black-10";
    default:
      // "", "default", "white", "light", "dark", Unbekanntes → Weiss.
      return "white";
  }
}

interface Props {
  pageKey: string;
  sectionKey: string;
  value: string | null;
  editable: boolean;
  onSaved?: () => void | Promise<void>;
}

const TeaserBackgroundSelect = ({ pageKey, sectionKey, value, editable, onSaved }: Props) => {
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
    const label = OPTIONS.find((o) => o.value === v)?.label ?? v;
    toast.success(`Hintergrund: ${label}.`);
    await onSaved?.();
  };

  if (!editable) {
    const label = OPTIONS.find((o) => o.value === current)?.label ?? current;
    return (
      <span className="text-[11px] text-muted-foreground">
        Hintergrund: <strong>{label}</strong> (noch nicht zur Pflege freigegeben)
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <span className="text-[11px] text-muted-foreground">Hintergrund</span>
      <Select value={current} onValueChange={handleChange} disabled={saving}>
        <SelectTrigger className="h-8 w-[160px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default TeaserBackgroundSelect;
