import { useEffect, useMemo, useState } from "react";
import {
  readEditableFields,
  setEditableFieldEnabled,
  type EditableFieldRow,
} from "@/features/admin/api/cmsAdminEditableFields";

/**
 * Admin-Übersicht über `cms_admin_editable_fields` — die Whitelist, die
 * bestimmt, welche Seite/Sektion/Feld/Sprache im CMS-Light editierbar ist.
 *
 * Diese Komponente erlaubt ausschließlich das Ein-/Ausschalten von
 * `is_enabled` über die eng begrenzte RPC
 * `rpc_admin_set_editable_field_enabled`. Es können hier keine neuen
 * Einträge angelegt und keine entfernt werden — die Liste selbst wird
 * über Migrationen geführt.
 */

type RowGroup = {
  pageKey: string;
  sectionKey: string;
  fieldKey: string;
  rows: EditableFieldRow[]; // i.d.R. zwei: de + en
};

const GROUP_KEY = (r: EditableFieldRow) =>
  `${r.page_key}|${r.section_key}|${r.field_key}`;

export default function EditableFieldsPanel() {
  const [rows, setRows] = useState<EditableFieldRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<{ id: string; ok: boolean; msg: string } | null>(null);
  const [filterPage, setFilterPage] = useState<string>("__all__");
  const [filterEnabled, setFilterEnabled] = useState<"all" | "on" | "off">("all");

  const load = () => {
    setLoading(true);
    return readEditableFields().then((res) => {
      setRows(res.rows);
      setLoadError(res.error);
      setLoading(false);
    });
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    readEditableFields().then((res) => {
      if (cancelled) return;
      setRows(res.rows);
      setLoadError(res.error);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const pageKeys = useMemo(() => {
    const s = new Set(rows.map((r) => r.page_key));
    return Array.from(s).sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filterPage !== "__all__" && r.page_key !== filterPage) return false;
      if (filterEnabled === "on" && !r.is_enabled) return false;
      if (filterEnabled === "off" && r.is_enabled) return false;
      return true;
    });
  }, [rows, filterPage, filterEnabled]);

  const groups: RowGroup[] = useMemo(() => {
    const map = new Map<string, RowGroup>();
    for (const r of filteredRows) {
      const k = GROUP_KEY(r);
      let g = map.get(k);
      if (!g) {
        g = {
          pageKey: r.page_key,
          sectionKey: r.section_key,
          fieldKey: r.field_key,
          rows: [],
        };
        map.set(k, g);
      }
      g.rows.push(r);
    }
    return Array.from(map.values());
  }, [filteredRows]);

  const totalEnabled = rows.filter((r) => r.is_enabled).length;

  const onToggle = async (row: EditableFieldRow, next: boolean) => {
    setPending((p) => ({ ...p, [row.id]: true }));
    setFeedback(null);
    // optimistisches Update
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, is_enabled: next } : r)));
    const res = await setEditableFieldEnabled({
      pageKey: row.page_key,
      sectionKey: row.section_key,
      fieldKey: row.field_key,
      locale: row.locale,
      isEnabled: next,
    });
    if (!res.success) {
      // Rollback
      setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, is_enabled: !next } : r)));
      setFeedback({ id: row.id, ok: false, msg: res.error ?? "unbekannter Fehler" });
    } else {
      setFeedback({
        id: row.id,
        ok: true,
        msg: next ? "freigeschaltet" : "gesperrt",
      });
    }
    setPending((p) => {
      const { [row.id]: _drop, ...rest } = p;
      return rest;
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        Die Liste zeigt alle Felder, die in der Whitelist{" "}
        <code className="rounded bg-muted px-1">cms_admin_editable_fields</code>{" "}
        eingetragen sind. Nur freigeschaltete Felder lassen sich im Inhalts-Editor
        speichern. Hier kann der Schalter{" "}
        <strong>„aktiv"</strong> umgelegt werden — neue Einträge entstehen nur
        über Migrationen.
      </div>

      <div className="flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col">
          <span className="text-xs text-muted-foreground">Seite (page_key)</span>
          <select
            value={filterPage}
            onChange={(e) => setFilterPage(e.target.value)}
            className="rounded border bg-background px-2 py-1"
          >
            <option value="__all__">alle</option>
            {pageKeys.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-muted-foreground">Status</span>
          <select
            value={filterEnabled}
            onChange={(e) => setFilterEnabled(e.target.value as "all" | "on" | "off")}
            className="rounded border bg-background px-2 py-1"
          >
            <option value="all">alle</option>
            <option value="on">nur aktiv</option>
            <option value="off">nur inaktiv</option>
          </select>
        </label>
        <div className="ml-auto text-xs text-muted-foreground">
          {totalEnabled} / {rows.length} aktiv
          <button
            type="button"
            onClick={load}
            className="ml-3 rounded border px-2 py-1 hover:bg-muted"
          >
            Neu laden
          </button>
        </div>
      </div>

      {loading && (
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          Lade…
        </div>
      )}

      {!loading && loadError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          Konnte Freigabeliste nicht laden: {loadError}
        </div>
      )}

      {!loading && !loadError && groups.length === 0 && (
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          Keine Einträge gefunden (Filter prüfen).
        </div>
      )}

      {!loading && !loadError && groups.length > 0 && (
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Seite (page_key)</th>
                <th className="px-3 py-2 font-medium">Abschnitt (section_key)</th>
                <th className="px-3 py-2 font-medium">Feld (field_key)</th>
                <th className="px-3 py-2 font-medium">DE</th>
                <th className="px-3 py-2 font-medium">EN</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => {
                const de = g.rows.find((r) => r.locale === "de") ?? null;
                const en = g.rows.find((r) => r.locale === "en") ?? null;
                return (
                  <tr key={`${g.pageKey}|${g.sectionKey}|${g.fieldKey}`} className="border-t align-top">
                    <td className="px-3 py-2 font-mono text-xs">{g.pageKey}</td>
                    <td className="px-3 py-2 font-mono text-xs">{g.sectionKey}</td>
                    <td className="px-3 py-2 font-mono text-xs">{g.fieldKey}</td>
                    <td className="px-3 py-2">
                      <ToggleCell
                        row={de}
                        pending={de ? !!pending[de.id] : false}
                        feedback={de && feedback?.id === de.id ? feedback : null}
                        onToggle={onToggle}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <ToggleCell
                        row={en}
                        pending={en ? !!pending[en.id] : false}
                        feedback={en && feedback?.id === en.id ? feedback : null}
                        onToggle={onToggle}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ToggleCell({
  row,
  pending,
  feedback,
  onToggle,
}: {
  row: EditableFieldRow | null;
  pending: boolean;
  feedback: { ok: boolean; msg: string } | null;
  onToggle: (row: EditableFieldRow, next: boolean) => void;
}) {
  if (!row) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-col gap-1">
      <label className="inline-flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={row.is_enabled}
          disabled={pending}
          onChange={(e) => onToggle(row, e.target.checked)}
          className="h-4 w-4"
        />
        <span
          className={
            "text-xs " +
            (row.is_enabled ? "text-emerald-700" : "text-muted-foreground")
          }
        >
          {row.is_enabled ? "aktiv" : "inaktiv"}
        </span>
      </label>
      {feedback && (
        <span
          className={
            "text-xs " + (feedback.ok ? "text-emerald-700" : "text-destructive")
          }
        >
          {feedback.ok ? feedback.msg : `Fehler: ${feedback.msg}`}
        </span>
      )}
    </div>
  );
}
