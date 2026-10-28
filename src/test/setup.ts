import "@testing-library/jest-dom";

// Einzelne Tests laufen bewusst ohne Browser-Nachbau (Umgebung "node",
// z. B. die ausgeführten SQL-Prüfungen). Dann gibt es kein `window`.
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });
}


// jsdom-Polyfills für Radix-Komponenten (Batch 57.1):
// Radix DropdownMenu/Popover/Select erwarten echte Pointer-Capture-APIs
// und scrollIntoView, die jsdom nicht implementiert. Ohne diese Stubs
// öffnen Trigger ihr Menü in jsdom nicht zuverlässig.
if (typeof Element !== "undefined") {
  if (!(Element.prototype as unknown as { hasPointerCapture?: unknown }).hasPointerCapture) {
    (Element.prototype as unknown as { hasPointerCapture: () => boolean }).hasPointerCapture = () => false;
  }
  if (!(Element.prototype as unknown as { releasePointerCapture?: unknown }).releasePointerCapture) {
    (Element.prototype as unknown as { releasePointerCapture: () => void }).releasePointerCapture = () => {};
  }
  if (!(Element.prototype as unknown as { setPointerCapture?: unknown }).setPointerCapture) {
    (Element.prototype as unknown as { setPointerCapture: () => void }).setPointerCapture = () => {};
  }
  if (!(Element.prototype as unknown as { scrollIntoView?: unknown }).scrollIntoView) {
    (Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView = () => {};
  }
}

// jsdom kennt keinen ResizeObserver; der Datenblatt-Druckrahmen beobachtet
// damit nur die Vorschau-Breite. Stub genügt für Tests.
if (typeof globalThis !== "undefined" && !("ResizeObserver" in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
