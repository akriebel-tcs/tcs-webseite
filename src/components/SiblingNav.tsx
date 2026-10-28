/**
 * SiblingNav
 * ----------
 * Dezente Vor-/Zurück-Navigation zwischen Geschwisterseiten am Ende des
 * Inhaltsbereichs. Quelle: `useSiblingNavigation` (DB-first, RLS-konform).
 *
 * - Erste Seite: nur „weiter".
 * - Letzte Seite: nur „zurück".
 * - Keine Geschwister: rendert nichts.
 * - Inaktive/routenlose Knoten werden im Hook ausgefiltert — hier kommen
 *   ausschließlich live erreichbare Ziele an.
 *
 * Platzierung (T5):
 *   `PageLayout` rendert diese Navigation zentral GANZ am Seitenende, also
 *   nach den Tail-Blöcken (FAQ/CTA). Seiten, die die Navigation bewusst
 *   selbst an einer eigenen Stelle ausgeben, belegen den Platz über
 *   `useMarkRendered` — der zentrale Aufruf hält sich dann zurück.
 *
 * Dopplungsschutz (T5):
 *   Steht dasselbe Ziel bereits als Link im Seiteninhalt (z. B. Karte
 *   „Mehrfamilienhaus" in einem Kartenraster), wird es hier nicht erneut
 *   angeboten.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSiblingNavigation } from "@/navigation/useSiblingNavigation";
import { pickNavText } from "@/navigation/localizedNav";
import {
  useMarkRendered,
  useRenderedSections,
} from "@/features/cms/components/CmsRenderRegistry";

/** Platzhalter-Schlüssel im Render-Register (siehe CmsRenderRegistry). */
export const SIBLING_NAV_SLOT = "__sibling_nav__";

interface Props {
  pageKey: string;
  /** Optional: Wrapper-Klassen für individuelles Spacing. */
  className?: string;
  /**
   * `tail` = zentraler Aufruf aus `PageLayout` (ganz am Seitenende).
   * Er rendert nur, wenn die Seite die Navigation nicht selbst ausgibt.
   */
  variant?: "inline" | "tail";
}

function pickLabel(
  link: { label_de: string; label_en: string; labels?: Record<string, string | null> },
  locale: string,
): string {
  return pickNavText(locale, {
    map: link.labels,
    legacy: { de: link.label_de, en: link.label_en },
    fallback: link.label_de,
  });
}

/** Prüft, ob eine Route bereits als Link im Seiteninhalt vorkommt. */
function useExistingHrefs(routes: string[]): Set<string> {
  const key = routes.join("|");
  const [found, setFound] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!key) {
      setFound(new Set());
      return;
    }
    let cancelled = false;
    const scan = () => {
      if (cancelled) return;
      const hit = new Set<string>();
      for (const route of key.split("|")) {
        if (!route) continue;
        const anchors = Array.from(
          document.querySelectorAll<HTMLAnchorElement>(`a[href="${CSS.escape(route)}"]`),
        );
        if (anchors.some((a) => !a.closest("[data-sibling-nav]"))) hit.add(route);
      }
      setFound(hit);
    };
    // Inhalte kommen asynchron aus der Datenbank — kurz nachfassen.
    scan();
    const t1 = window.setTimeout(scan, 400);
    const t2 = window.setTimeout(scan, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [key]);
  return found;
}

export default function SiblingNav({ pageKey, className, variant = "inline" }: Props) {
  const { prev, next, ready } = useSiblingNavigation(pageKey);
  const { t, i18n } = useTranslation();
  const claimed = useRenderedSections().has(SIBLING_NAV_SLOT);
  // Inline-Aufrufe belegen den Platz, damit der zentrale Tail-Aufruf
  // in `PageLayout` nicht zusätzlich rendert.
  useMarkRendered(variant === "inline" ? SIBLING_NAV_SLOT : "");

  const existing = useExistingHrefs(
    [prev?.route_path ?? "", next?.route_path ?? ""].filter(Boolean),
  );

  if (variant === "tail" && claimed) return null;
  if (!ready) return null;

  const showPrev = prev && !existing.has(prev.route_path) ? prev : null;
  const showNext = next && !existing.has(next.route_path) ? next : null;
  if (!showPrev && !showNext) return null;

  const locale = i18n.language || "de";
  return (
    <nav
      data-sibling-nav
      aria-label={t("navigation:a11y.sectionNavigation")}
      className={
        "container mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-3 py-6 text-sm " +
        (className ?? "")
      }
    >
      {showPrev && (
        <Link
          to={showPrev.route_path}
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="truncate">{pickLabel(showPrev, locale)}</span>
        </Link>
      )}
      {showNext && (
        <Link
          to={showNext.route_path}
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          <span className="truncate">{pickLabel(showNext, locale)}</span>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Link>
      )}
    </nav>
  );
}
