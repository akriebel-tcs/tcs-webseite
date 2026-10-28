import { useEffect, useState } from "react";

/**
 * Liefert einen Wert mit Verzögerung. Wird `value` mehrfach hintereinander
 * geändert (z. B. beim Tippen), wird erst nach `delayMs` Ruhe der finale
 * Stand übernommen. Dient dazu, Filter-/Listing-Refetches nicht bei jedem
 * Tastendruck auszulösen.
 */
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
