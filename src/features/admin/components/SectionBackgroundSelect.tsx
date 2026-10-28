/**
 * SectionBackgroundSelect — globaler Hintergrund-Schalter für Blöcke.
 *
 * Zwei Werte (Feld `section_bg`, nur Locale DE, technisch/sprachneutral):
 *
 *   - default (Standard): normaler Seitenhintergrund.
 *   - muted:              gedämpfter grauer Hintergrund (bg-secondary).
 *
 * Altbestand: `secondary` wird wie `muted` behandelt (Service-Hub).
 *
 * Schreibt über die whitelist-geschützte RPC `rpc_admin_update_section_field`.
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

type Variant = "default" | "muted";

export function normalizeSectionBg(raw: string | null | undefined): Variant {
  const v = (raw ?? "").trim().toLowerCase();
  return v === "muted" || v === "secondary" ? "muted" : "default";
}

interface Props {
  pageKey: string;
  sectionKey: string;
  value: string | null;
  /** Whitelist erlaubt Schreiben in DE. */
  editable: boolean;
  onSaved?: () => void | Promise<void>;
}

const SectionBackgroundSelect = ({ pageKey, sectionKey, value, editable, onSaved }: Props) => {
  const [current, setCurrent] = useState<Variant>(() => normalizeSectionBg(value));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCurrent(normalizeSectionBg(value));
  }, [value]);

  const handleChange = async (next: string) => {
    const v = normalizeSectionBg(next);
    if (v === current) return;
    setCurrent(v);
    setSaving(true);
    const res = await saveSectionField({
      pageKey,
      sectionKey,
      fieldKey: "section_bg",
      locale: "de",
      value: v,
    });
    setSaving(false);
    if (!res.success) {
      toast.error(`Hintergrund konnte nicht gespeichert werden: ${res.error ?? "unbekannt"}`);
      setCurrent(normalizeSectionBg(value));
      return;
    }
    toast.success(v === "muted" ? "Grauer Hintergrund." : "Standard-Hintergrund.");
    await onSaved?.();
  };

  if (!editable) {
    return (
      <span className="text-[11px] text-muted-foreground">
        Hintergrund: <strong>{current === "muted" ? "grau" : "Standard"}</strong> (noch nicht zur
        Pflege freigegeben)
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <span className="text-[11px] text-muted-foreground">Hintergrund</span>
      <Select value={current} onValueChange={handleChange} disabled={saving}>
        <SelectTrigger className="h-8 w-[150px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default" className="text-xs">
            Standard (weiss)
          </SelectItem>
          <SelectItem value="muted" className="text-xs">
            Grau (muted)
          </SelectItem>
        </SelectContent>
      </Select>
    </span>
  );
};

export default SectionBackgroundSelect;
