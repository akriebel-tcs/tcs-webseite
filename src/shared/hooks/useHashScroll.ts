import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * useHashScroll — springt zu `#anker` in der Adresse, sobald das Ziel im
 * Seiteninhalt vorhanden ist.
 *
 * Hintergrund: CMS-Inhalte kommen asynchron aus der Datenbank. Der Browser
 * versucht den Sprung sofort beim Laden, da existiert der Zielblock aber
 * noch nicht. Diese Hook probiert es deshalb kurz nach (max. ~3 s) und
 * reagiert außerdem auf Klicks auf Sprungmarken-Links innerhalb der Seite.
 */
export function useHashScroll() {
  const location = useLocation();

  useEffect(() => {
    const raw = location.hash.replace(/^#/, "");
    if (!raw) return;
    let id: string;
    try {
      id = decodeURIComponent(raw);
    } catch {
      id = raw;
    }

    let cancelled = false;
    let tries = 0;

    const tick = () => {
      if (cancelled) return;
      const el =
        document.getElementById(id) ??
        document.querySelector<HTMLElement>(`[data-cms-anchor="${CSS.escape(id)}"]`);
      if (el) {
        try {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch {
          el.scrollIntoView();
        }
        return;
      }
      tries += 1;
      if (tries < 30) window.setTimeout(tick, 100);
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.hash]);
}
