/**
 * PersonaBodyRenderer — Runde 12.b / Schritt 4 „Eine Wahrheit".
 *
 * Rendert den Body einer Persona-Seite ausschließlich aus
 * `cms.sections.sort_order` über den zentralen Renderer
 * (`renderPageSectionByType`). Damit wirkt Drag/Drop bzw. jede
 * Sortier-/Sichtbarkeits-Änderung im CMS-Light 1:1 auf die öffentliche
 * Website (Spiegel-Regel).
 *
 * Standard-Skip: `hero`, `stats`, `solution_teaser_*` — diese Blöcke
 * rendert die jeweilige Persona-Content-Datei weiterhin manuell, weil
 * sie eigenes Layout (Hero, Stats-Grid, Solutions-Wrapper) brauchen,
 * das (noch) kein eigener Standard-Section-Typ ist.
 *
 * Sonderfall `standard_cta`: Erhält automatisch den Anker `id="kontakt"`
 * und wird als `cta_v1` normalisiert, damit der zentrale CTA-Renderer
 * greift (gleiche Logik wie `PersonaCmsSection`).
 *
 * Eltern-Sections (parent_section_id IS NULL) werden iteriert; Kind-
 * Karten rendert der jeweilige Container selbst.
 */
import type { CmsPageContent } from "@/features/cms/hooks/useCmsPageContent";
import type { Locale } from "@/features/cms/components/CmsBodyRenderer";
import { renderPageSectionByType } from "@/features/cms/lib/renderPageSection";

interface Props {
  pageKey: string;
  cms: CmsPageContent;
  locale: Locale;
  /** Zusätzliche section_keys, die der Body-Renderer überspringen soll. */
  skipKeys?: readonly string[];
  /** Zusätzliche section_key-Präfixe, die übersprungen werden. */
  skipPrefixes?: readonly string[];
  /**
   * Wenn true, gelten NUR die übergebenen skipKeys/skipPrefixes — die
   * Standard-Skips (u. a. `solution_teaser_*`) entfallen. Nötig für Seiten,
   * die ihre Wechselteaser 1:1 in der DB-Reihenfolge (`sort_order`) zwischen
   * den Kartenrastern rendern sollen (Spiegel-Regel).
   */
  disableDefaultSkips?: boolean;
}

const DEFAULT_SKIP_KEYS = new Set<string>(["hero", "stats", "solutions"]);
const DEFAULT_SKIP_PREFIXES: readonly string[] = ["solution_teaser_"];

export function PersonaBodyRenderer({
  pageKey,
  cms,
  locale,
  skipKeys = [],
  skipPrefixes = [],
  disableDefaultSkips = false,
}: Props) {
  const skipKeySet = new Set<string>(
    disableDefaultSkips ? skipKeys : [...DEFAULT_SKIP_KEYS, ...skipKeys],
  );
  const allSkipPrefixes = disableDefaultSkips
    ? [...skipPrefixes]
    : [...DEFAULT_SKIP_PREFIXES, ...skipPrefixes];


  const bodySections = cms.sections
    .filter((s) => !s.parent_section_key)
    .filter((s) => !skipKeySet.has(s.section_key))
    .filter((s) => !allSkipPrefixes.some((p) => s.section_key.startsWith(p)))
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <>
      {bodySections.map((sec) => {
        const isCta = sec.section_key === "standard_cta";
        const normalizedType =
          sec.section_type === "cta" ? "cta_v1" : sec.section_type ?? null;
        const rendered = renderPageSectionByType({
          pageKey,
          sectionKey: sec.section_key,
          sectionType: normalizedType,
          cms,
          locale,
          allowSkippedTypes: normalizedType === "cta_v1",
        });
        if (!rendered) return null;
        if (isCta) {
          return (
            <div
              key={sec.section_key}
              id="kontakt"
              data-cms-section={sec.section_key}
            >
              {rendered}
            </div>
          );
        }
        return (
          <div key={sec.section_key} data-cms-section={sec.section_key}>
            {rendered}
          </div>
        );
      })}
    </>
  );
}
