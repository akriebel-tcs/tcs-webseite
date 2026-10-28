/**
 * CtaKindSelect — Auswahlfeld für die Linkart (`cta_kind` / `cta_secondary_kind`)
 * in einem `cta_v1`-Block. Drei Werte sind erlaubt:
 *
 *   - intern   → Interner Pfad (z. B. `/produkte/eingangssysteme`)
 *   - extern   → Externe URL (z. B. `https://www.example.com`)
 *   - shortid  → Kurz-ID (z. B. `P-203` oder `B-014`)
 *
 * Diese Auswahl ist **rein redaktionell**: Sie steuert nur den Platzhalter
 * und die kurze Hilfe im Ziel-URL-Feld (`cta_href` / `cta_secondary_href`).
 * Der Public-Renderer liest weiterhin ausschließlich das URL-Feld.
 *
 * Schreibt über die generische, whitelist-geschützte RPC
 * `rpc_admin_update_section_field` (`saveSectionField`).
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

export type CtaKindValue = "intern" | "extern" | "shortid";

const KIND_LABEL: Record<CtaKindValue, string> = {
  intern: "Intern (interner Pfad, z. B. /produkte/eingangssysteme)",
  extern: "Extern (vollständige URL, z. B. https://www.example.com)",
  shortid: "Kurz-ID (z. B. P-203 für Seite oder B-014 für Block)",
};

function normalize(raw: string | null | undefined): CtaKindValue {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "extern" || v === "external") return "extern";
  if (v === "shortid" || v === "short_id" || v === "kurz-id" || v === "kurzid") return "shortid";
  return "intern";
}

interface Props {
  pageKey: string;
  sectionKey: string;
  fieldKey: "cta_kind" | "cta_secondary_kind";
  value: string | null;
  /** Whitelist erlaubt Schreiben in DE. */
  editable: boolean;
  onSaved?: () => void | Promise<void>;
}

const CtaKindSelect = ({ pageKey, sectionKey, fieldKey, value, editable, onSaved }: Props) => {
  const [current, setCurrent] = useState<CtaKindValue>(() => normalize(value));
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
      toast.error(`Linkart konnte nicht gespeichert werden: ${res.error ?? "unbekannt"}`);
      setCurrent(normalize(value));
      return;
    }
    toast.success("Linkart gespeichert.");
    await onSaved?.();
  };

  if (!editable) {
    return (
      <div className="rounded border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        Linkart: <span className="font-medium text-foreground">{current}</span>
        <span className="ml-2 text-muted-foreground">(noch nicht zur Pflege freigegeben)</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={current} onValueChange={handleChange} disabled={saving}>
        <SelectTrigger className="h-9 w-full max-w-md text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="intern">{KIND_LABEL.intern}</SelectItem>
          <SelectItem value="extern">{KIND_LABEL.extern}</SelectItem>
          <SelectItem value="shortid">{KIND_LABEL.shortid}</SelectItem>
        </SelectContent>
      </Select>
      {saving && <span className="text-[11px] text-muted-foreground">speichert…</span>}
    </div>
  );
};

export default CtaKindSelect;
