import { useEffect } from "react";

/**
 * Listener + Sender für die Admin-Live-Vorschau (öffentliche Seite im iFrame).
 *
 * Zwei Richtungen:
 *  1) Admin → Vorschau (Highlight): Admin sendet
 *     `postMessage({ type: 'cms-preview-highlight', sectionKey })`. Diese
 *     Hook scrollt das passende `[data-cms-section]`-Element in den
 *     sichtbaren Bereich und markiert es kurz mit einer Outline.
 *
 *  2) Vorschau → Admin (Routenänderung): Wenn der Nutzer im iFrame im Menü
 *     der echten Webseite klickt, ändert sich `location.pathname`. Diese
 *     Hook patcht `history.pushState/replaceState` einmalig und meldet jede
 *     neue Route via
 *     `postMessage({ type: 'cms-preview-route', pathname })`
 *     an das Admin-Fenster. Der Admin sucht dann den passenden
 *     Navigationsknoten und stellt Baum + Editor um.
 *
 * Für normale Besucher (kein parent / kein postMessage) ist beides ein No-Op.
 *
 * Wichtig: Hook wird global in `AppLayout` für alle öffentlichen Routen
 * registriert — nicht nur in `PageLayout` —, damit auch die Startseite
 * (HomePage rendert ohne PageLayout) reagiert.
 */
export function useCmsPreviewHighlight(activePersona?: string | null) {
  useEffect(() => {
    // --- Empfänger: Highlight-Wunsch vom Admin ---
    // Aktive Timer/Observer, damit aufeinanderfolgende Highlights den
    // vorherigen Versuch sauber abräumen.
    let activeCleanup: (() => void) | null = null;

    const applyHighlight = (
      sectionKey: string,
      fieldKey: string | null,
      color: string,
    ): boolean => {
      const sectionSel = `[data-cms-section="${CSS.escape(sectionKey)}"]`;
      const sectionEl = document.querySelector<HTMLElement>(sectionSel);
      if (!sectionEl) return false;

      // Innerstes Ziel: bevorzugt Bild-Feld; sonst Section selbst.
      let inner: HTMLElement | null = null;
      if (fieldKey) {
        const fieldSel = [
          `${sectionSel}[data-cms-field="${CSS.escape(fieldKey)}"]`,
          `${sectionSel} [data-cms-field="${CSS.escape(fieldKey)}"]`,
        ].join(", ");
        inner = document.querySelector<HTMLElement>(fieldSel);
      }
      const target = inner ?? sectionEl;

      // Vertikal + horizontal in den sichtbaren Bereich bringen (für
      // horizontale Scroller wie ProductScrollerV1).
      try {
        target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      } catch {
        target.scrollIntoView();
      }

      const decorate = (el: HTMLElement) => {
        const prev = {
          outline: el.style.outline,
          outlineOffset: el.style.outlineOffset,
          boxShadow: el.style.boxShadow,
          transition: el.style.transition,
        };
        el.style.transition = "outline-color 0.2s ease, box-shadow 0.2s ease";
        el.style.outline = `3px solid ${color}`;
        el.style.outlineOffset = "3px";
        // box-shadow als Fallback, falls outline durch overflow:hidden
        // eines Vorfahren beschnitten wird.
        el.style.boxShadow = `0 0 0 3px ${color}, 0 0 0 6px ${color}33`;
        return () => {
          el.style.outline = prev.outline;
          el.style.outlineOffset = prev.outlineOffset;
          el.style.boxShadow = prev.boxShadow;
          el.style.transition = prev.transition;
        };
      };

      const undos: Array<() => void> = [];
      // Karte/Section immer mit-markieren — Bezug bei Karten bleibt sichtbar.
      undos.push(decorate(sectionEl));
      if (inner && inner !== sectionEl) undos.push(decorate(inner));

      const t = window.setTimeout(() => undos.forEach((fn) => fn()), 2400);
      activeCleanup = () => {
        window.clearTimeout(t);
        undos.forEach((fn) => fn());
      };
      return true;
    };

    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as {
        type?: string;
        sectionKey?: string;
        fieldKey?: string | null;
        outlineColor?: string;
        personaId?: string | null;
      } | null;
      if (data?.type === "cms-preview-persona") {
        window.dispatchEvent(
          new CustomEvent("cms-preview-persona", {
            detail: { personaId: data.personaId ?? null },
          }),
        );
        return;
      }
      if (!data || data.type !== "cms-preview-highlight" || !data.sectionKey) return;
      const fieldKey = data.fieldKey?.trim() || null;
      const color = data.outlineColor || "hsl(var(--primary))";
      const sectionKey = data.sectionKey;

      activeCleanup?.();
      activeCleanup = null;

      if (applyHighlight(sectionKey, fieldKey, color)) return;

      // Karten/Async-Daten: bis zu ~3 s mit MutationObserver + Polling
      // nach dem Ziel suchen, danach aufgeben.
      let done = false;
      const tryNow = () => {
        if (done) return;
        if (applyHighlight(sectionKey, fieldKey, color)) {
          done = true;
          obs.disconnect();
          window.clearInterval(poll);
          window.clearTimeout(stop);
        }
      };
      const obs = new MutationObserver(tryNow);
      obs.observe(document.body, { childList: true, subtree: true });
      const poll = window.setInterval(tryNow, 250);
      const stop = window.setTimeout(() => {
        done = true;
        obs.disconnect();
        window.clearInterval(poll);
      }, 3000);
    };
    window.addEventListener("message", handler);

    // --- Block-Klick: jedes Element mit [data-cms-section] wird klickbar
    //     und meldet den Klick ans Admin-Fenster (cms-preview-select).
    //     Capture-Phase, damit Buttons/Links innerhalb des Blocks erst
    //     funktionieren, wenn Shift gedrückt ist (oder direkt der Wrapper
    //     getroffen wird). Im Iframe-Modus zusätzlich Hover-Outline.
    const inIframeForClick = window.parent && window.parent !== window;
    let cleanupClick: (() => void) | null = null;
    if (inIframeForClick) {
      const HOVER_OUTLINE = "1px dashed hsl(var(--primary) / 0.6)";
      let lastHover: HTMLElement | null = null;
      const onMove = (ev: MouseEvent) => {
        const target = (ev.target as HTMLElement | null)?.closest<HTMLElement>(
          "[data-cms-section]",
        );
        if (target === lastHover) return;
        if (lastHover) {
          lastHover.style.outline = "";
          lastHover.style.outlineOffset = "";
          lastHover.style.cursor = "";
        }
        lastHover = target;
        if (target) {
          target.style.outline = HOVER_OUTLINE;
          target.style.outlineOffset = "2px";
          target.style.cursor = "pointer";
          target.title = 'Klicken auf den Block-Hintergrund: Block im Admin öffnen. Links und Buttons (z. B. "Mehr erfahren") funktionieren wie auf der echten Webseite.';
        }
      };
      const onClick = (ev: MouseEvent) => {
        // Alt/Option-Klick: normale Aktion zulassen (Links, Buttons im Block).
        if (ev.altKey) return;
        const rawTarget = ev.target as HTMLElement | null;
        const target = rawTarget?.closest<HTMLElement>("[data-cms-section]");
        const sectionKey = target?.getAttribute("data-cms-section") ?? "";
        const fieldContainer = rawTarget?.closest<HTMLElement>("[data-cms-field]") ?? null;
        const imgEl =
          rawTarget?.closest<HTMLImageElement>("img") ??
          fieldContainer?.querySelector<HTMLImageElement>("img") ??
          null;
        const fieldKeyFromTarget =
          fieldContainer?.getAttribute("data-cms-field") ??
          imgEl?.closest<HTMLElement>("[data-cms-field]")?.getAttribute("data-cms-field") ??
          null;
        const isCmsAssetTarget = Boolean((sectionKey || fieldKeyFromTarget) && imgEl);
        const assetUrl: string | null = isCmsAssetTarget
          ? imgEl?.currentSrc || imgEl?.src || null
          : null;

        // Klicks auf interaktive Elemente (Links, Buttons, Eingaben) NICHT
        // abfangen — sonst funktionieren Logo, Menüs, „Mehr erfahren",
        // Buttons, Akkordeons usw. in der Live-Vorschau nicht mehr.
        // Ausnahme: echter CMS-Bildtreffer innerhalb eines markierten Slots.
        const interactive = rawTarget?.closest<HTMLElement>(
          'a[href], button, [role="button"], input, select, textarea, label, summary, [data-interactive="true"]',
        );
        if (interactive && !isCmsAssetTarget) return;

        const pageKey = (target ?? rawTarget ?? null)
          ?.closest<HTMLElement>("[data-cms-page]")
          ?.getAttribute("data-cms-page") ?? null;

        // Ohne Bild UND ohne Section nichts zu tun.
        if (!sectionKey && !assetUrl) return;

        ev.preventDefault();
        ev.stopPropagation();
        try {
          window.parent.postMessage(
            {
              type: "cms-preview-select",
              sectionKey,
              pageKey,
              pathname: window.location.pathname,
              assetUrl,
              fieldKey: fieldKeyFromTarget,
            },
            window.location.origin,
          );
        } catch {
          /* Cross-Origin — egal. */
        }
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("click", onClick, true);
      cleanupClick = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("click", onClick, true);
        if (lastHover) {
          lastHover.style.outline = "";
          lastHover.style.outlineOffset = "";
          lastHover.style.cursor = "";
        }
      };
    }



    // --- Sender: Routen-Wechsel ans Admin-Fenster melden ---
    // Nur sinnvoll, wenn die Seite tatsächlich in einem (gleichherkünftigen)
    // iFrame läuft. Sonst no-op.
    const inIframe = window.parent && window.parent !== window;
    let cleanupSender: (() => void) | null = null;

    if (inIframe) {
      const send = () => {
        try {
          window.parent.postMessage(
            { type: "cms-preview-route", pathname: window.location.pathname },
            window.location.origin,
          );
        } catch {
          /* Cross-Origin oder nicht bereit — egal. */
        }
      };
      // Initial einmal melden.
      send();

      // History-Methoden patchen, damit auch React-Router-Navigationen
      // (pushState ohne popstate) erkannt werden.
      const origPush = window.history.pushState;
      const origReplace = window.history.replaceState;
      window.history.pushState = function (...args) {
        const r = origPush.apply(this, args as Parameters<typeof origPush>);
        window.setTimeout(send, 0);
        return r;
      };
      window.history.replaceState = function (...args) {
        const r = origReplace.apply(this, args as Parameters<typeof origReplace>);
        window.setTimeout(send, 0);
        return r;
      };
      const popHandler = () => send();
      window.addEventListener("popstate", popHandler);

      cleanupSender = () => {
        window.history.pushState = origPush;
        window.history.replaceState = origReplace;
        window.removeEventListener("popstate", popHandler);
      };
    }

    return () => {
      window.removeEventListener("message", handler);
      cleanupSender?.();
      cleanupClick?.();
      activeCleanup?.();
    };
  }, []);

  useEffect(() => {
    const inIframe = window.parent && window.parent !== window;
    if (!inIframe) return;

    const sendPersona = () => {
      try {
        window.parent.postMessage(
          {
            type: "cms-preview-persona",
            personaId: activePersona ?? null,
            pathname: window.location.pathname,
          },
          window.location.origin,
        );
      } catch {
        /* Cross-Origin oder nicht bereit — egal. */
      }
    };

    const t = window.setTimeout(sendPersona, 0);
    return () => window.clearTimeout(t);
  }, [activePersona]);
}
