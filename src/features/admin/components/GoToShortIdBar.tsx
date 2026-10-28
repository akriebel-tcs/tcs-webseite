/**
 * "Gehe zu Kurz-ID" — kleine Eingabezeile im Admin-Header mit
 * Auto-Vervollständigung.
 *
 * Akzeptiert Eingaben wie:
 *   - N-5 / n5     → Navigationsknoten
 *   - P-12         → Seite
 *   - B-3 / B-014  → Block (Section)
 *   - A-7          → Asset (Bild)
 *   - Auch Volltext ohne Präfix, z. B. "pflege" oder "hero".
 *
 * Auflösung erfolgt über die read-only Resolver-RPCs
 * (`rpc_admin_resolve_node_no`, `_page_no`, `_section_uid`, `_asset_no`).
 * Vorschläge kommen aus `rpc_admin_search_short_ids`.
 *
 * Bei Auswahl ruft das Bauteil `onJump` mit einem Sprung-Ziel auf. Das Eltern-
 * Element (AdminPage) wechselt dann auf den Reiter „Struktur & Inhalte" →
 * „Seiten" und übergibt das Ziel an die Workbench, die den passenden Knoten
 * im Baum auswählt und – falls vorhanden – auf den gewünschten Block
 * scrollt.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { ArrowRight, Search, X } from "lucide-react";
import { toast } from "sonner";

import {
  parseShortId,
  resolveShortId,
  searchShortIds,
  type ResolveResult,
  type ResolveSuccess,
  type ShortIdSuggestion,
} from "@/features/admin/api/cmsAdminResolve";

export interface JumpTarget {
  page_key: string | null;
  section_key: string | null;
  node_id: string | null;
  field_key: string | null;
  label: string;
  raw: ResolveSuccess;
}

interface Props {
  onJump: (target: JumpTarget) => void;
  className?: string;
}

function describe(r: ResolveSuccess): string {
  switch (r.kind) {
    case "N":
      return `Knoten ${r.label_de ?? r.node_key}`;
    case "P":
      return `Seite ${r.page_key}`;
    case "B":
      return `Block ${r.section_key} auf Seite ${r.page_key}`;
    case "A":
      return `Bild ${r.section_key}.${r.field_key ?? "?"} auf Seite ${r.page_key}`;
  }
}

function toJump(r: ResolveSuccess): JumpTarget {
  switch (r.kind) {
    case "N":
      return {
        page_key: r.page_key,
        section_key: null,
        node_id: r.id,
        field_key: null,
        label: r.label_de ?? r.node_key,
        raw: r,
      };
    case "P":
      return {
        page_key: r.page_key,
        section_key: null,
        node_id: null,
        field_key: null,
        label: r.page_key,
        raw: r,
      };
    case "B":
      return {
        page_key: r.page_key,
        section_key: r.section_key,
        node_id: null,
        field_key: null,
        label: `${r.page_key} · ${r.section_key}`,
        raw: r,
      };
    case "A":
      return {
        page_key: r.page_key,
        section_key: r.section_key,
        node_id: null,
        field_key: r.field_key,
        label: `${r.page_key} · ${r.section_key}.${r.field_key ?? ""}`,
        raw: r,
      };
  }
}

const KIND_BADGE: Record<ShortIdSuggestion["kind"], string> = {
  N: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  P: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  B: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  A: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
};

const GoToShortIdBar = ({ onJump, className }: Props) => {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [suggestions, setSuggestions] = useState<ShortIdSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const fetchSeqRef = useRef(0);

  // Globaler Shortcut: „/" fokussiert die Eingabe.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          (target as HTMLElement).isContentEditable);
      if (isTyping) return;
      if (e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Klick außerhalb schließt das Vorschlags-Panel.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  // Vorschläge laden (debounced).
  useEffect(() => {
    const q = value.trim();
    if (!q) {
      setSuggestions([]);
      setHighlight(0);
      return;
    }
    const seq = ++fetchSeqRef.current;
    const handle = window.setTimeout(async () => {
      const items = await searchShortIds(q, 8);
      if (seq !== fetchSeqRef.current) return;
      setSuggestions(items);
      setHighlight(0);
    }, 150);
    return () => window.clearTimeout(handle);
  }, [value]);

  const openSuggestion = useCallback(
    async (s: ShortIdSuggestion) => {
      setBusy(true);
      const r = await resolveShortId({ kind: s.kind, value: s.num, formatted: s.formatted });
      setBusy(false);
      if (r.success === false) {
        toast.error(`${s.formatted} nicht gefunden (${r.error}).`);
        setResult(r);
        return;
      }
      onJump(toJump(r));
      toast.success(`Geöffnet: ${describe(r)}`);
      setValue("");
      setResult(null);
      setSuggestions([]);
      setOpen(false);
    },
    [onJump],
  );

  const handleResolve = useCallback(async () => {
    const parsed = parseShortId(value);
    if (parsed) {
      setBusy(true);
      const r = await resolveShortId(parsed);
      setBusy(false);
      setResult(r);
      if (r.success === false) {
        toast.error(`${parsed.formatted} nicht gefunden (${r.error}).`);
      } else {
        onJump(toJump(r));
        toast.success(`Geöffnet: ${describe(r)}`);
        setValue("");
        setResult(null);
        setOpen(false);
      }
      return;
    }

    // Freitext ohne Präfix: aktiven Vorschlag öffnen.
    if (open && suggestions.length > 0) {
      const s = suggestions[Math.max(0, Math.min(highlight, suggestions.length - 1))];
      void openSuggestion(s);
      return;
    }

    toast.error("Bitte Kurz-ID wie N-5, P-12, B-3 oder A-7 eingeben.");
  }, [value, open, suggestions, highlight, openSuggestion, onJump]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!open || suggestions.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => (h + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    },
    [open, suggestions.length],
  );

  const showPanel = open && value.trim().length > 0 && suggestions.length > 0;

  return (
    <div className={className} ref={wrapperRef}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleResolve();
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1 sm:flex-initial">
          <Search
            className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Gehe zu Kurz-ID … z. B. N-5, P-12, B-3"
            aria-label="Kurz-ID öffnen oder Volltext suchen (N-…, P-…, B-…, A-…)"
            aria-autocomplete="list"
            aria-expanded={showPanel}
            role="combobox"
            className="h-8 w-full rounded border bg-background pl-7 pr-7 text-xs font-mono placeholder:font-sans placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-72"
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                setValue("");
                setResult(null);
                setSuggestions([]);
                setOpen(false);
                inputRef.current?.focus();
              }}
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted"
              title="Eingabe leeren"
              aria-label="Eingabe leeren"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {showPanel && (
            <ul
              role="listbox"
              className="absolute left-0 right-0 z-50 mt-1 max-h-80 overflow-auto rounded border bg-popover text-popover-foreground shadow-md sm:w-72"
            >
              {suggestions.map((s, i) => {
                const active = i === highlight;
                return (
                  <li key={`${s.kind}-${s.num}`} role="option" aria-selected={active}>
                    <button
                      type="button"
                      onMouseEnter={() => setHighlight(i)}
                      onMouseDown={(e) => {
                        // verhindert, dass das Input vorher den Fokus verliert
                        e.preventDefault();
                      }}
                      onClick={() => void openSuggestion(s)}
                      className={`flex w-full items-start gap-2 px-2 py-1.5 text-left text-xs transition ${
                        active ? "bg-accent" : "hover:bg-accent/60"
                      }`}
                    >
                      <span
                        className={`mt-0.5 inline-flex shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] ${KIND_BADGE[s.kind]}`}
                      >
                        {s.formatted}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-foreground">
                          {s.label}
                        </span>
                        {s.sublabel && (
                          <span className="block truncate text-[10px] text-muted-foreground">
                            {s.sublabel}
                          </span>
                        )}
                      </span>
                      <ArrowRight className="mt-1 h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <button
          type="submit"
          disabled={busy || !value.trim()}
          className="inline-flex h-8 items-center gap-1 rounded border bg-background px-2 text-xs font-medium hover:bg-accent disabled:opacity-50"
          title="Auswahl öffnen oder Kurz-ID auflösen (Enter)"
        >
          {busy ? "…" : "Öffnen"}
        </button>
      </form>

      {result && result.success === false && (
        <div className="mt-2 rounded border border-destructive/40 bg-destructive/5 px-2 py-1.5 text-xs text-destructive">
          {result.input} nicht gefunden. <span className="opacity-70">({result.error})</span>
        </div>
      )}
    </div>
  );
};

export default GoToShortIdBar;
