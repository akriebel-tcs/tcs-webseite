/**
 * iconResolver — kleine Brücke zwischen DB-Werten und Lucide-React-Icons.
 *
 * In der DB liegt pro Karte ein optionaler Icon-Name (Kebab-Case, z. B.
 * `building-2`, `briefcase`, `hotel`). Hier wird er auf die passende
 * Lucide-Komponente gemappt.
 *
 * Tranche 23: zusätzlich Lucide-Named-Re-Exports als Fallback (z. B.
 * `CheckCircle2`, `Home` — von lucide-react weiterhin exportiert, aber
 * nicht im `icons`-Objekt). Damit bleiben Legacy-Werte korrekt gerendert.
 */
import * as LucideAll from "lucide-react";
import { icons, CheckCircle2, type LucideIcon } from "lucide-react";

function kebabToPascal(name: string): string {
  return name
    .split("-")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

export function resolveIcon(
  name: string | undefined | null,
  fallback: LucideIcon = CheckCircle2,
): LucideIcon {
  if (!name) return fallback;
  const trimmed = name.trim();
  if (!trimmed) return fallback;

  const iconMap = icons as Record<string, LucideIcon>;
  const namedMap = LucideAll as unknown as Record<string, LucideIcon>;

  // Kandidaten in Reihenfolge probieren:
  //   1. Originalwert (z. B. "Smartphone", "smartphone", "shield-check")
  //   2. kebab→Pascal (für "shield-check" → "ShieldCheck")
  //   3. erste-Buchstabe-groß (für einteilige lowercase: "smartphone" → "Smartphone")
  //   4. lowercase → kebab→Pascal (Defensivpfad)
  const candidates: string[] = [trimmed];
  if (trimmed.includes("-")) candidates.push(kebabToPascal(trimmed));
  if (!/[A-Z]/.test(trimmed) && !trimmed.includes("-")) {
    candidates.push(trimmed.charAt(0).toUpperCase() + trimmed.slice(1));
  }
  candidates.push(kebabToPascal(trimmed.toLowerCase()));

  for (const c of candidates) {
    const found = iconMap[c] ?? namedMap[c];
    if (found) return found;
  }
  return fallback;
}
