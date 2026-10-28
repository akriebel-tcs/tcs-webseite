/**
 * CardDividerSelect — Trennstrich über Kartenlinks.
 * Block: „Wie global" | „An" | „Aus" (Feld `card_dividers`, nur DE).
 * Daneben der globale Schalter (Seite `global.einstellungen`, Block `card_settings`).
 * Schreibt ausschließlich über `rpc_admin_update_section_field` (Whitelist).
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveSectionField } from "@/features/admin/api/cmsAdminWrite";
import {
  CARD_DIVIDERS_FIELD_KEY,
  CARD_SETTINGS_PAGE_KEY,
  CARD_SETTINGS_SECTION_KEY,
  loadGlobalCardDividers,
  normalizeDividerSetting,
  useGlobalCardDividers,
} from "@/features/cms/lib/cardDividers";

interface Props {
  pageKey: string;
  sectionKey: string;
  value: string | null;
  editable: boolean;
  onSaved?: () => void | Promise<void>;
}

const CardDividerSelect = ({ pageKey, sectionKey, value, editable, onSaved }: Props) => {
  const [current, setCurrent] = useState(() => normalizeDividerSetting(value));
  const [saving, setSaving] = useState(false);
  const globalRaw = useGlobalCardDividers();
  const globalOn = normalizeDividerSetting(globalRaw) !== "off";

  useEffect(() => setCurrent(normalizeDividerSetting(value)), [value]);

  const save = async (pk: string, sk: string, v: string) => {
    setSaving(true);
    const res = await saveSectionField({ pageKey: pk, sectionKey: sk, fieldKey: CARD_DIVIDERS_FIELD_KEY, locale: "de", value: v });
    setSaving(false);
    if (!res.success) toast.error(`Trennstrich konnte nicht gespeichert werden: ${res.error ?? "unbekannt"}`);
    return res.success;
  };

  const onBlock = async (next: string) => {
    const v = normalizeDividerSetting(next);
    if (v === current) return;
    const prev = current;
    setCurrent(v);
    if (!(await save(pageKey, sectionKey, v === "inherit" ? "" : v))) return setCurrent(prev);
    toast.success("Trennstrich für diesen Block gespeichert.");
    await onSaved?.();
  };

  const onGlobal = async (next: string) => {
    if ((next === "on") === globalOn) return;
    if (await save(CARD_SETTINGS_PAGE_KEY, CARD_SETTINGS_SECTION_KEY, next)) {
      await loadGlobalCardDividers(true);
      toast.success(next === "on" ? "Trennstriche global an." : "Trennstriche global aus.");
    }
  };

  if (!editable) return null;

  return (
    <span className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <span className="text-[11px] text-muted-foreground" title="Dünne Linie über den Links der Karten">
        Trennstrich
      </span>
      <Select value={current} onValueChange={onBlock} disabled={saving}>
        <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="inherit" className="text-xs">Wie global ({globalOn ? "an" : "aus"})</SelectItem>
          <SelectItem value="on" className="text-xs">An</SelectItem>
          <SelectItem value="off" className="text-xs">Aus</SelectItem>
        </SelectContent>
      </Select>
      <span className="text-[11px] text-muted-foreground">Global</span>
      <Select value={globalOn ? "on" : "off"} onValueChange={onGlobal} disabled={saving}>
        <SelectTrigger className="h-8 w-[70px] text-xs" aria-label="Trennstrich global"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="on" className="text-xs">An</SelectItem>
          <SelectItem value="off" className="text-xs">Aus</SelectItem>
        </SelectContent>
      </Select>
    </span>
  );
};

export default CardDividerSelect;
