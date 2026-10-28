/**
 * Etappe I.7 — Dialog: Seite duplizieren.
 *
 * Quelle = vom Redakteur ausgewählte Seite. Felder DE/EN, Sections, Whitelist
 * und Bilder werden serverseitig kopiert.
 *
 * Etappe 1 (Erweiterung): Optional kann beim Duplizieren direkt ein Menü-
 * Eintrag (Navigationsknoten) unter einem wählbaren Eltern-Knoten angelegt
 * werden. Der neue Knoten ist zunächst **inaktiv** und **nicht öffentlich
 * sichtbar** — erst nach Aktivierung im Navigations-Editor erscheint er live.
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  duplicatePage,
  type DuplicatePageNavTarget,
} from "@/features/admin/api/cmsAdminPagesLifecycle";
import { logActivity } from "@/features/admin/lib/activityLog";
import { getCmsSupabaseClient } from "@/lib/cmsSupabase/client";

interface Props {
  open: boolean;
  sourcePageKey: string;
  sourceRoutePath: string | null;
  onClose: () => void;
  onDuplicated: (newPageKey: string) => void | Promise<void>;
}

type NavArea = DuplicatePageNavTarget["navArea"];

interface NavOption {
  nav_area: NavArea;
  node_key: string;
  label_de: string | null;
  label_en: string | null;
  parent_id: string | null;
  id: string;
}

const NAV_AREA_LABELS: Record<NavArea, string> = {
  main: "Hauptnavigation (oben)",
  persona: "Personas (Zielgruppenleiste)",
  meta: "Meta-Navigation (klein, oben rechts)",
  footer: "Footer-Spalten",
  footer_bottom: "Footer-Leiste (ganz unten)",
  home: "Startseite (interne Gruppe)",
};

const DuplicatePageDialog: React.FC<Props> = ({
  open,
  sourcePageKey,
  sourceRoutePath,
  onClose,
  onDuplicated,
}) => {
  const [newKey, setNewKey] = useState("");
  const [newRoute, setNewRoute] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Navigation (optional)
  const [createNav, setCreateNav] = useState(false);
  const [navArea, setNavArea] = useState<NavArea>("main");
  const [parentNodeKey, setParentNodeKey] = useState<string>(""); // "" = Top-Level
  const [navNodes, setNavNodes] = useState<NavOption[]>([]);
  const [navLoading, setNavLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setNewKey(`${sourcePageKey}.kopie`);
      setNewRoute(sourceRoutePath ? `${sourceRoutePath}-kopie` : "");
      setError(null);
      setCreateNav(false);
      setNavArea("main");
      setParentNodeKey("");
    }
  }, [open, sourcePageKey, sourceRoutePath]);

  // Bei Öffnen der Nav-Sektion: alle aktiven Knoten laden (klein, einmalig)
  useEffect(() => {
    if (!open || !createNav || navNodes.length > 0 || navLoading) return;
    let cancelled = false;
    setNavLoading(true);
    (async () => {
      const supabase = getCmsSupabaseClient();
      const { data, error: navErr } = await supabase
        .from("cms_navigation_nodes")
        .select("id, nav_area, node_key, label_de, label_en, parent_id")
        .eq("is_active", true)
        .order("nav_area", { ascending: true })
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      if (navErr) {
        setError(`Navigationsbaum konnte nicht geladen werden: ${navErr.message}`);
      } else {
        setNavNodes((data ?? []) as NavOption[]);
      }
      setNavLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, createNav, navNodes.length, navLoading]);

  const parentOptions = useMemo(
    () => navNodes.filter((n) => n.nav_area === navArea),
    [navNodes, navArea],
  );

  if (!open) return null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    const navTarget: DuplicatePageNavTarget | null = createNav
      ? {
          navArea,
          parentNodeKey: parentNodeKey.trim() || null,
        }
      : null;
    const res = await duplicatePage(
      sourcePageKey,
      newKey.trim(),
      newRoute.trim() || null,
      navTarget,
    );
    setBusy(false);
    if (!res.success) {
      const msg =
        res.error === "target_page_key_exists"
          ? "Diese page_key existiert bereits."
          : res.error === "target_route_path_exists"
            ? "Dieser route_path existiert bereits."
            : res.error === "source_not_found"
              ? "Quellseite nicht gefunden."
              : res.error === "nav_node_key_exists"
                ? "Im Zielbereich existiert bereits ein Menüknoten mit dieser Kennung."
                : res.error === "nav_parent_not_found"
                  ? "Der gewählte Eltern-Knoten wurde im Zielbereich nicht gefunden."
                  : res.error === "nav_area_invalid"
                    ? "Unbekannter Navigationsbereich."
                    : res.error ?? "Unbekannter Fehler.";
      setError(msg);
      return;
    }
    const navInfo = res.nav_node_key
      ? ` Menüknoten „${res.nav_node_key}" als Entwurf angelegt (inaktiv, nicht öffentlich).`
      : "";
    toast.success(
      `Kopie als Entwurf angelegt: ${res.new_page_key} (${res.sections_copied ?? 0} Blöcke, ${res.fields_copied ?? 0} Felder, ${res.assets_copied ?? 0} Bilder).${navInfo}`,
      {
        description: res.nav_node_key
          ? 'Im Navigations-Editor aktivieren und „öffentlich sichtbar“ einschalten, sobald die Seite redaktionell fertig ist.'
          : 'Die Kopie ist als Entwurf gespeichert. Im nächsten Schritt kannst du einen Menü-Knoten anlegen. Öffentlich sichtbar wird sie dadurch noch nicht.',
        duration: 12000,
      },
    );
    logActivity({
      kind: "page_duplicate",
      status: "saved",
      summary: `Seite „${sourcePageKey}" als „${res.new_page_key}" dupliziert${res.nav_node_key ? ` (+ Menüknoten „${res.nav_node_key}" in ${res.nav_area})` : ""}.`,
      pageKey: res.new_page_key ?? undefined,
    });
    await onDuplicated(res.new_page_key!);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-5 shadow-lg max-h-[90vh] overflow-y-auto">
        <h2 className="mb-1 text-lg font-semibold">Seite duplizieren</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Quelle:{" "}
          <code className="rounded bg-muted px-1 font-mono text-[11px]">{sourcePageKey}</code>
          <br />
          Sections, Texte (DE+EN), Freigaben und Bilder werden kopiert. Auf
          Wunsch wird zusätzlich ein Menüknoten (Navigationseintrag) angelegt —
          standardmäßig <strong>inaktiv</strong> und <strong>nicht öffentlich
          sichtbar</strong>.
        </p>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-medium">
            Neuer page_key (interne Kennung der Seite)
          </span>
          <input
            type="text"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="w-full rounded border bg-background px-2 py-1.5 font-mono text-sm"
            placeholder="z. B. anwendungen.pflege.kopie"
            disabled={busy}
          />
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-medium">
            Neuer route_path (URL-Pfad, z. B. /anwendungen/pflege-kopie)
          </span>
          <input
            type="text"
            value={newRoute}
            onChange={(e) => setNewRoute(e.target.value)}
            className="w-full rounded border bg-background px-2 py-1.5 font-mono text-sm"
            placeholder="optional"
            disabled={busy}
          />
        </label>

        <div className="mb-3 rounded border bg-muted/30 p-3">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={createNav}
              onChange={(e) => setCreateNav(e.target.checked)}
              disabled={busy}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">Menüknoten mit anlegen</span>
              <span className="block text-xs text-muted-foreground">
                Legt zusätzlich einen Navigationseintrag an, der auf die neue
                Seite zeigt. Bleibt als Entwurf inaktiv, bis du ihn aktivierst.
              </span>
            </span>
          </label>

          {createNav && (
            <div className="mt-3 space-y-3 border-t pt-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium">
                  Navigationsbereich (nav_area)
                </span>
                <select
                  value={navArea}
                  onChange={(e) => {
                    setNavArea(e.target.value as NavArea);
                    setParentNodeKey("");
                  }}
                  disabled={busy}
                  className="w-full rounded border bg-background px-2 py-1.5 text-sm"
                >
                  {(Object.keys(NAV_AREA_LABELS) as NavArea[]).map((a) => (
                    <option key={a} value={a}>
                      {NAV_AREA_LABELS[a]} — {a}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium">
                  Eltern-Knoten (parent) — wo soll der neue Eintrag hängen?
                </span>
                <select
                  value={parentNodeKey}
                  onChange={(e) => setParentNodeKey(e.target.value)}
                  disabled={busy || navLoading}
                  className="w-full rounded border bg-background px-2 py-1.5 text-sm"
                >
                  <option value="">— Oberste Ebene (kein Parent) —</option>
                  {parentOptions.map((n) => (
                    <option key={n.id} value={n.node_key}>
                      {(n.label_de ?? n.label_en ?? n.node_key)}
                      {" — "}
                      <span>{n.node_key}</span>
                    </option>
                  ))}
                </select>
                {navLoading && (
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    Lade Navigationsbaum…
                  </span>
                )}
              </label>

              <p className="text-[11px] text-muted-foreground">
                Hinweis: Der Knoten wird als Entwurf angelegt (is_active=false,
                show_in_public_nav=false). Reihenfolge: ans Ende des gewählten
                Eltern-Knotens. Beschriftung kommt aus title_de/title_en der
                Quellseite und kann anschließend im Navigations-Editor
                überschrieben werden.
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-3 rounded border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !newKey.trim()}
            className="rounded border bg-foreground px-3 py-1.5 text-sm text-background hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Kopiere…" : "Kopie anlegen"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DuplicatePageDialog;
