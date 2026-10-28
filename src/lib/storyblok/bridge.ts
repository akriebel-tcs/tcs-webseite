/**
 * Storyblok Visual Editor Bridge.
 *
 * Im Vorschau-Modus (`_storyblok`-Parameter) laedt die Seite das Bridge-Skript
 * von Storyblok. Der Editor schickt bei jeder Eingabe die geaenderte Story
 * (`input`); nach Veroeffentlichen/Aendern (`published`, `change`) wird neu
 * geladen. Komponenten abonnieren Aenderungen ueber `onStoryInput`.
 *
 * Klick-zu-Feld: Jeder Blok traegt in der Vorschau einen `_editable`-Kommentar,
 * aus dem `editableAttributes()` die Attribute `data-blok-c` / `data-blok-uid`
 * ableitet (entspricht `storyblokEditable` aus @storyblok/js).
 */
import { isPreviewMode, resetStoryblokCache } from "@/lib/storyblok/client";

type StoryLike = { content?: Record<string, unknown>; full_slug?: string; id?: number };
type InputListener = (story: StoryLike) => void;

const listeners = new Set<InputListener>();
let loading: Promise<void> | null = null;

declare global {
  interface Window {
    StoryblokBridge?: new (options?: Record<string, unknown>) => {
      on: (events: string[] | string, cb: (event: { story?: StoryLike; action?: string }) => void) => void;
    };
    storyblokRegisterEvent?: (cb: () => void) => void;
  }
}

export function onStoryInput(cb: InputListener): () => void {
  listeners.add(cb);
  void loadBridge();
  return () => {
    listeners.delete(cb);
  };
}

/** Bridge-Skript laden (nur Vorschau, nur einmal). */
export function loadBridge(): Promise<void> {
  if (!isPreviewMode() || typeof document === "undefined") return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve) => {
    const init = () => {
      const Bridge = window.StoryblokBridge;
      if (!Bridge) return resolve();
      const bridge = new Bridge({ preventClicks: true });
      bridge.on(["input"], (event) => {
        if (event.story) for (const cb of listeners) cb(event.story);
      });
      bridge.on(["published", "change"], () => {
        resetStoryblokCache();
        window.location.reload();
      });
      resolve();
    };
    if (window.StoryblokBridge) return init();
    const script = document.createElement("script");
    script.src = "https://app.storyblok.com/f/storyblok-v2-latest.js";
    script.async = true;
    script.onload = init;
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
  return loading;
}

/** `_editable`-Kommentar -> Attribute fuer Klick-zu-Feld im Visual Editor. */
export function editableAttributes(editable: string | null | undefined): Record<string, string> {
  if (!editable || !isPreviewMode()) return {};
  const m = /^<!--#storyblok#(.*)-->$/.exec(editable.trim());
  if (!m) return {};
  try {
    const options = JSON.parse(m[1]) as { uid?: string; id?: string; name?: string; space?: string };
    return {
      "data-blok-c": JSON.stringify(options),
      "data-blok-uid": `${options.id}-${options.uid}`,
    };
  } catch {
    return {};
  }
}
