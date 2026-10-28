/**
 * Dialog: neuen Navigationsknoten anlegen.
 *
 * Wird gebraucht, um eine (z. B. duplizierte) Seite ins Menü zu hängen.
 * Anlage immer als inaktiv und „nicht öffentlich" — Redaktion gibt frei.
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  createNavigationNode,
  type CreateNavigationNodeArgs,
} from "@/features/admin/api/cmsAdminPagesLifecycle";
import type { NavigationNodeRow, NavArea } from "@/features/admin/api/cmsAdminNavigation";
import { logActivity } from "@/features/admin/lib/activityLog";

interface Props {
  open: boolean;
  /** Optional vorausgewählte Seite (page_key), z. B. nach Duplizieren. */
  defaultPageKey?: string | null;
  /** Optional vorausgewählter Eltern-Knoten. */
  defaultParentNodeKey?: string | null;
  defaultNavArea?: NavArea;
  /** Bestehende Knoten zur Auswahl als Eltern-Knoten. */
  navigationNodes: NavigationNodeRow[];
  onClose: () => void;
  onCreated: (newNodeId: string) => void | Promise<void>;
}

const NAV_AREAS: { value: NavArea; label: string }[] = [
  { value: "main", label: "Hauptnavigation" },
  { value: "meta", label: "Meta-Navigation (oben)" },
  { value: "footer", label: "Footer" },
  { value: "footer_bottom", label: "Footer unten" },
  { value: "persona", label: "Persona-Navigation" },
  { value: "home", label: "Home" },
];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

const CreateNavigationNodeDialog: React.FC<Props> = ({
  open,
  defaultPageKey,
  defaultParentNodeKey,
  defaultNavArea,
  navigationNodes,
  onClose,
  onCreated,
}) => {
  const [navArea, setNavArea] = useState<NavArea>("main");
  const [parentKey, setParentKey] = useState<string>("");
  const [nodeKey, setNodeKey] = useState("");
  const [pageKey, setPageKey] = useState("");
  const [labelDe, setLabelDe] = useState("");
  const [labelEn, setLabelEn] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNavArea(defaultNavArea ?? "main");
    setParentKey(defaultParentNodeKey ?? "");
    setPageKey(defaultPageKey ?? "");
    const seed = (defaultPageKey ?? "").split(".").pop() ?? "";
    setNodeKey(seed);
    setLabelDe("");
    setLabelEn("");
    setError(null);
  }, [open, defaultNavArea, defaultParentNodeKey, defaultPageKey]);

  const parents = useMemo(
    () =>
      navigationNodes
        .filter((n) => n.nav_area === navArea)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [navigationNodes, navArea],
  );

  if (!open) return null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    const args: CreateNavigationNodeArgs = {
      navArea,
      parentNodeKey: parentKey.trim() || null,
      nodeKey: slugify(nodeKey.trim()),
      pageKey: pageKey.trim() || null,
      labelDe: labelDe.trim() || null,
      labelEn: labelEn.trim() || null,
      nodeType: "page",
    };
    const res = await createNavigationNode(args);
    setBusy(false);
    if (!res.success) {
      const msg =
        res.error === "node_key_exists"
          ? "Dieser node_key existiert in diesem Bereich bereits."
          : res.error === "parent_not_found"
            ? "Eltern-Knoten nicht gefunden."
            : res.error === "page_not_found"
              ? "Diese Seite (page_key) existiert nicht."
              : res.error === "page_key_required_for_page_node"
                ? "Bitte eine Seite (page_key) angeben."
                : res.error === "node_key_invalid"
                  ? "node_key ungültig (nur Kleinbuchstaben, Zahlen, . _ -)."
                  : res.error ?? "Unbekannter Fehler.";
      setError(msg);
      return;
    }
    toast.success(
      `Navigationsknoten angelegt (N-${String(res.node_no ?? "?").padStart(3, "0")}).`,
      {
        description:
          "Der Knoten erscheint sofort links im Baum. Er ist zunächst nur ein interner Entwurf und ändert die öffentliche Website noch nicht.",
        duration: 10000,
      },
    );
    logActivity({
      kind: "node_create",
      status: "saved",
      summary: `Knoten „${labelDe.trim() || nodeKey.trim()}" angelegt in „${navArea}".`,
      nodeKey: res.node_key ?? slugify(nodeKey.trim()),
      pageKey: pageKey.trim() || undefined,
    });
    await onCreated(res.id!);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
      <div className="w-full max-w-lg rounded-lg border bg-card p-5 shadow-lg">
        <h2 className="mb-1 text-lg font-semibold">Navigationsknoten anlegen</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Hängt einen neuen Eintrag ins Menü (z. B. für eine duplizierte
          Seite). Wird zunächst als <strong>interner Arbeitsstand</strong>
          angelegt. Danach siehst du ihn sofort links im Baum und kannst dort
          prüfen, verschieben, aktivieren oder wieder löschen.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium">Bereich (nav_area)</span>
            <select
              value={navArea}
              onChange={(e) => {
                setNavArea(e.target.value as NavArea);
                setParentKey("");
              }}
              className="w-full rounded border bg-background px-2 py-1.5 text-sm"
              disabled={busy}
            >
              {NAV_AREAS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium">
              Eltern-Knoten (leer = oberste Ebene)
            </span>
            <select
              value={parentKey}
              onChange={(e) => setParentKey(e.target.value)}
              className="w-full rounded border bg-background px-2 py-1.5 font-mono text-xs"
              disabled={busy}
            >
              <option value="">— oberste Ebene —</option>
              {parents.map((n) => (
                <option key={n.id} value={n.node_key}>
                  {n.label_de ?? n.label ?? n.node_key} ({n.node_key})
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-medium">
            node_key (technische Kennung, eindeutig im Bereich)
          </span>
          <input
            type="text"
            value={nodeKey}
            onChange={(e) => setNodeKey(e.target.value)}
            className="w-full rounded border bg-background px-2 py-1.5 font-mono text-sm"
            placeholder="z. B. tuersprechanlagen-kopie"
            disabled={busy}
          />
        </label>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-medium">
            Seite (page_key, auf die dieser Knoten zeigt)
          </span>
          <input
            type="text"
            value={pageKey}
            onChange={(e) => setPageKey(e.target.value)}
            className="w-full rounded border bg-background px-2 py-1.5 font-mono text-sm"
            placeholder="z. B. gebaeudekommunikation.tuersprechanlagen.kopie"
            disabled={busy}
          />
        </label>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium">Label DE</span>
            <input
              type="text"
              value={labelDe}
              onChange={(e) => setLabelDe(e.target.value)}
              className="w-full rounded border bg-background px-2 py-1.5 text-sm"
              placeholder="Anzeigetext im Menü (Deutsch)"
              disabled={busy}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium">Label EN</span>
            <input
              type="text"
              value={labelEn}
              onChange={(e) => setLabelEn(e.target.value)}
              className="w-full rounded border bg-background px-2 py-1.5 text-sm"
              placeholder="Display label (English)"
              disabled={busy}
            />
          </label>
        </div>

        {error && (
          <div className="mt-3 rounded border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
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
            disabled={busy || !nodeKey.trim() || !pageKey.trim()}
            className="rounded border bg-foreground px-3 py-1.5 text-sm text-background hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Lege an…" : "Knoten anlegen"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateNavigationNodeDialog;
