/**
 * Ampel-Tickbox für den Fertigstellungsgrad einer Seite (Sitemap).
 *
 * Drei Kästchen (Rot / Gelb / Grün). Der Stand wird in der Tabelle
 * `cms_page_completion` gespeichert — Schreibweg ausschließlich über die
 * whitelisted RPC `rpc_admin_set_page_completion` (kein direkter
 * Tabellenschreibzugriff aus dem Frontend).
 */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getCmsSupabaseClient, isCmsSupabaseConfigured } from "@/lib/cmsSupabase/client";
import { isStoryblokSource } from "@/lib/content/source";

export type CompletionStatus = "none" | "red" | "yellow" | "green";

const OPTIONS: Array<{ value: Exclude<CompletionStatus, "none">; classes: string; labelDe: string; labelEn: string }> = [
  {
    value: "red",
    classes: "border-red-500 text-red-600 data-[on=true]:bg-red-500",
    labelDe: "Rot — offen",
    labelEn: "Red — open",
  },
  {
    value: "yellow",
    classes: "border-amber-500 text-amber-600 data-[on=true]:bg-amber-500",
    labelDe: "Gelb — in Arbeit",
    labelEn: "Yellow — in progress",
  },
  {
    value: "green",
    classes: "border-emerald-500 text-emerald-600 data-[on=true]:bg-emerald-500",
    labelDe: "Grün — fertig",
    labelEn: "Green — done",
  },
];

interface Store {
  statuses: Record<string, CompletionStatus>;
  setStatus: (routePath: string, status: CompletionStatus, pageKey?: string | null) => void;
  hours: Record<string, number | null>;
  setHours: (routePath: string, hours: number | null, pageKey?: string | null) => void;
  totalHours: number;
}

const CompletionContext = createContext<Store>({
  statuses: {},
  setStatus: () => {},
  hours: {},
  setHours: () => {},
  totalHours: 0,
});

export const PageCompletionProvider = ({ children }: { children: React.ReactNode }) => {
  const [statuses, setStatuses] = useState<Record<string, CompletionStatus>>({});
  const [hours, setHoursState] = useState<Record<string, number | null>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      if (isStoryblokSource() || !isCmsSupabaseConfigured()) return; // Ampel gibt es nur im CMS-Light
      try {
        const sb = getCmsSupabaseClient();
        const { data } = await (sb as unknown as {
          from: (t: string) => {
            select: (c: string) => Promise<{ data: unknown }>;
          };
        })
          .from("cms_page_completion")
          .select("route_path, status, hours");
        if (!alive || !Array.isArray(data)) return;
        const next: Record<string, CompletionStatus> = {};
        const nextHours: Record<string, number | null> = {};
        (data as Array<{ route_path: string; status: CompletionStatus; hours: number | null }>).forEach((r) => {
          next[r.route_path] = r.status;
          nextHours[r.route_path] = r.hours ?? null;
        });
        setStatuses(next);
        setHoursState(nextHours);
      } catch {
        /* fail-soft: Ampel bleibt leer */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setStatus = useCallback(
    (routePath: string, status: CompletionStatus, pageKey?: string | null) => {
      setStatuses((prev) => ({ ...prev, [routePath]: status }));
      (async () => {
        try {
          const sb = getCmsSupabaseClient();
          await (sb.rpc as unknown as (
            fn: string,
            args: Record<string, unknown>,
          ) => Promise<unknown>)("rpc_admin_set_page_completion", {
            p_route_path: routePath,
            p_status: status,
            p_page_key: pageKey ?? null,
          });
        } catch {
          /* fail-soft */
        }
      })();
    },
    [],
  );

  const setHours = useCallback(
    (routePath: string, value: number | null, pageKey?: string | null) => {
      setHoursState((prev) => ({ ...prev, [routePath]: value }));
      (async () => {
        try {
          const sb = getCmsSupabaseClient();
          await (sb.rpc as unknown as (
            fn: string,
            args: Record<string, unknown>,
          ) => Promise<unknown>)("rpc_admin_set_page_hours", {
            p_route_path: routePath,
            p_hours: value,
            p_page_key: pageKey ?? null,
          });
        } catch {
          /* fail-soft */
        }
      })();
    },
    [],
  );

  const totalHours = Object.values(hours).reduce((sum, h) => sum + (h ?? 0), 0);

  return (
    <CompletionContext.Provider value={{ statuses, setStatus, hours, setHours, totalHours }}>
      {children}
    </CompletionContext.Provider>
  );
};

/** Kleines Eingabefeld für den Aufwand einer Seite in Stunden (max. zweistellig). */
export const PageHoursInput: React.FC<Props> = ({ routePath, pageKey, isEn }) => {
  const { hours, setHours } = useContext(CompletionContext);
  const value = hours[routePath];

  return (
    <span className="inline-flex items-center gap-0.5 align-middle">
      <input
        type="text"
        inputMode="numeric"
        maxLength={2}
        value={value === null || value === undefined ? "" : String(value)}
        aria-label={isEn ? "Effort in hours" : "Aufwand in Stunden"}
        title={isEn ? "Effort in hours (max. 99)" : "Aufwand in Stunden (max. 99)"}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
          setHours(routePath, digits === "" ? null : Number(digits), pageKey);
        }}
        className="h-5 w-8 rounded-[3px] border border-border bg-background px-1 text-center text-[11px] text-foreground outline-none focus:border-foreground"
      />
      <span className="text-[10px] text-muted-foreground">h</span>
    </span>
  );
};

/** Summenfeld (vierstellig) über alle eingetragenen Stundenwerte. */
export const PageHoursTotal: React.FC<{ isEn?: boolean }> = ({ isEn }) => {
  const { totalHours } = useContext(CompletionContext);
  return (
    <div className="mt-4 flex items-center justify-end gap-2 border-t border-border pt-4">
      <span className="text-xs text-muted-foreground">
        {isEn ? "Total effort" : "Summe Aufwand"}
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="inline-flex h-7 w-14 items-center justify-center rounded-[3px] border border-border bg-secondary text-sm font-medium tabular-nums text-foreground">
          {Math.min(totalHours, 9999)}
        </span>
        <span className="text-xs text-muted-foreground">h</span>
      </span>
    </div>
  );
};


interface Props {
  routePath: string;
  pageKey?: string | null;
  isEn?: boolean;
}

const PageCompletionTraffic: React.FC<Props> = ({ routePath, pageKey, isEn }) => {
  const { statuses, setStatus } = useContext(CompletionContext);
  const current = statuses[routePath] ?? "none";

  return (
    <span
      className="inline-flex items-center gap-1 align-middle"
      role="group"
      aria-label={isEn ? "Completion status" : "Fertigstellungsgrad"}
    >
      {OPTIONS.map((opt) => {
        const on = current === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            data-on={on}
            aria-pressed={on}
            title={isEn ? opt.labelEn : opt.labelDe}
            onClick={(e) => {
              e.preventDefault();
              setStatus(routePath, on ? "none" : opt.value, pageKey);
            }}
            className={`flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border bg-transparent transition-colors ${opt.classes}`}
          >
            {on && (
              <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-background" aria-hidden="true">
                <path
                  d="M2.5 6.2 4.7 8.4 9.5 3.6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            <span className="sr-only">{isEn ? opt.labelEn : opt.labelDe}</span>
          </button>
        );
      })}
    </span>
  );
};

export default PageCompletionTraffic;
