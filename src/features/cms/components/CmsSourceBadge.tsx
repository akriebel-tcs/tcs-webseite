/**
 * CmsSourceBadge — Sichtbarer Hinweis (NUR in der Vorschau/Dev-Umgebung),
 * woher der Body einer Seite kommt:
 *   🟢 grün = Body wird aus der Datenbank gerendert (CmsBodyRenderer aktiv)
 *   🟡 gelb = Body kommt noch aus dem Code (i18n-Fallback)
 *
 * Wird in PRODUKTION (gepublishte Seite) NICHT angezeigt.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export interface CmsSourceBadgeProps {
  pageKey: string;
  source: "db" | "fallback";
  /** Anzahl Top-Level-Sections aus der DB (nur informativ). */
  sectionCount?: number;
}

const SHOW_BADGE =
  import.meta.env.DEV || import.meta.env.VITE_SHOW_CMS_SOURCE_BADGE === "1";

export default function CmsSourceBadge({ pageKey, source, sectionCount }: CmsSourceBadgeProps) {
  const { t } = useTranslation();
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    setHidden(localStorage.getItem("cms-source-badge-hidden") === "1");
  }, []);

  if (!SHOW_BADGE || hidden) return null;

  const isDb = source === "db";
  const bg = isDb ? "bg-emerald-600" : "bg-amber-500";
  const dot = isDb ? "🟢" : "🟡";
  const label = isDb ? "Body aus DB" : "Body aus Code (Fallback)";

  return (
    <div
      className={`fixed bottom-4 right-4 z-[9999] ${bg} text-white text-xs font-mono px-3 py-2 rounded-md shadow-lg flex items-center gap-2 max-w-xs`}
      role="status"
      aria-label={`CMS Quelle: ${label}`}
    >
      <span aria-hidden>{dot}</span>
      <div className="flex flex-col leading-tight">
        <span className="font-semibold">{label}</span>
        <span className="opacity-80">
          {pageKey}
          {isDb && typeof sectionCount === "number" && ` · ${sectionCount} Sections`}
        </span>
      </div>
      <button
        type="button"
        onClick={() => {
          localStorage.setItem("cms-source-badge-hidden", "1");
          setHidden(true);
        }}
        className="ml-2 opacity-70 hover:opacity-100"
        aria-label={t("common:ui.hideBadge")}
      >
        ×
      </button>
    </div>
  );
}
