/**
 * CmsBodyRenderer — Iteriert über `cms.sections` und rendert pro
 * `section_type` eine spezialisierte Komponente.
 *
 * Spielregeln:
 *   - Hero-Sections werden übersprungen (rendert weiterhin CmsPageLayout).
 *   - Kind-Sections (parent_section_key gesetzt) werden NICHT auf der obersten
 *     Ebene gerendert; sie tauchen unter ihrer Eltern-Section auf (z. B.
 *     card_v1 unter cards_v1).
 *   - Unbekannte Typen werden in DEV mit einer Warnung sichtbar gemacht,
 *     in PROD still übersprungen.
 *   - Wenn die Seite KEINE renderbare Body-Section hat, gibt der Renderer
 *     `null` zurück. Die aufrufende Page-Komponente kann in diesem Fall
 *     ihren bisherigen i18n-Fallback-JSX rendern.
 *
 * Stand: P-0 — Skelett + Typ-Aliasing. Konkrete Komponenten kommen in P-1.
 */
import type { ReactNode } from "react";
import type { CmsPageContent } from "@/features/cms/hooks/useCmsPageContent";
import { normalizeLocale } from "@/features/cms/hooks/useCmsPageContent";
import { useTranslation } from "react-i18next";

import { ContentSectionV1 } from "./sections/ContentSectionV1";
import { CardsSectionV1 } from "./sections/CardsSectionV1";
import { FeatureGridV1 } from "./sections/FeatureGridV1";
import { ProductScrollerV1 } from "./sections/ProductScrollerV1";
import { ProductShowcaseListV1 } from "./sections/ProductShowcaseListV1";
import { DownloadListV1 } from "./sections/DownloadListV1";
import { ContactBlockV1 } from "./sections/ContactBlockV1";
import { StatsV1 } from "./sections/StatsV1";
import { CtaV1 } from "./sections/CtaV1";
import { RichV1 } from "./sections/RichV1";
import { FaqV1 } from "./sections/FaqV1";
import { Teaser2ColV1 } from "./sections/Teaser2ColV1";
import { TabsV1 } from "./sections/TabsV1";
import { sectionAnchorId, sectionAnchorAlias } from "@/features/cms/lib/sectionAnchor";
import type { AppLocale } from "@/i18n/locale";
import { SECTION_BG_MUTED_CLASS, SELF_PAINTED_SECTION_TYPES, isMutedSectionBg, readSectionBg } from "@/features/cms/lib/sectionBackground";

export type Locale = AppLocale;

export interface CmsSectionContext {
  pageKey: string;
  cms: CmsPageContent;
  locale: Locale;
  /** Eltern-Section-Key oder eigener Key. */
  sectionKey: string;
  /** Kind-Sections (für Container-Typen wie cards_v1). */
  children: Array<{ section_key: string; section_type: string | null }>;
  /**
   * Standard `true`/undefined: Die Komponente meldet sich als **inline**
   * gerenderte Section an (`useMarkRendered`), damit ein Tail-Renderer sie
   * nicht zusätzlich ausspielt.
   *
   * Tail-Renderer setzen `false`: Ihre eigene Ausgabe darf sich nicht selbst
   * als „inline vorhanden" melden, sonst überspringt der nächste
   * Tail-Render seinen eigenen Block und die Section verschwindet.
   */
  markInlineRendered?: boolean;
}

/**
 * Aliasing alter section_type-Werte auf die kanonischen v1-Namen.
 * Siehe docs/02-architecture/section-typen-katalog.md.
 */
export function normalizeType(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const map: Record<string, string> = {
    hero: "hero_v1",
    content: "content_v1",
    intro: "content_v1",
    content_block_v1: "content_v1",
    content_blocks_intro_v1: "content_v1",
    cta: "cta_v1",
    rich: "rich_v1",
    "feature-grid": "feature_grid_v1",
    "product-scroller": "product_scroller_v1",
    products: "product_scroller_v1",
  };
  return map[raw] ?? raw;
}

export const RENDERERS: Record<string, (ctx: CmsSectionContext) => ReactNode> = {
  content_v1: (ctx) => <ContentSectionV1 {...ctx} />,
  cards_v1: (ctx) => <CardsSectionV1 {...ctx} />,
  feature_grid_v1: (ctx) => <FeatureGridV1 {...ctx} />,
  product_scroller_v1: (ctx) => <ProductScrollerV1 {...ctx} />,
  product_showcase_list_v1: (ctx) => <ProductShowcaseListV1 {...ctx} />,
  download_list_v1: (ctx) => <DownloadListV1 {...ctx} />,
  contact_block_v1: (ctx) => <ContactBlockV1 {...ctx} />,
  stats_v1: (ctx) => <StatsV1 {...ctx} />,
  cta_v1: (ctx) => <CtaV1 {...ctx} />,
  rich_v1: (ctx) => <RichV1 {...ctx} />,
  faq_v1: (ctx) => <FaqV1 {...ctx} />,
  teaser_2col_v1: (ctx) => <Teaser2ColV1 {...ctx} />,
  tabs_v1: (ctx) => <TabsV1 {...ctx} />,

};

// `cta_v1` wird global einmal am Seitenende durch <CmsTailCta/> (siehe
// PageLayout) gerendert. Würde der Body-Renderer die CTA-Section zusätzlich
// rendern, erschiene sie doppelt — daher hier überspringen.
export const SKIP_TYPES = new Set(["hero_v1", "cta_v1"]);

interface Props {
  pageKey: string;
  cms: CmsPageContent;
  /** Falls true: rendert auch ohne DB-Sections (für Debug). Default: false. */
  forceRender?: boolean;
}

export default function CmsBodyRenderer({ pageKey, cms, forceRender = false }: Props) {
  const { i18n } = useTranslation();
  const locale = normalizeLocale(i18n.language);

  // Nur top-level Sections (kein parent) iterieren.
  const top = cms.sections.filter((s) => !s.parent_section_key);
  const rendered: ReactNode[] = [];

  for (const sec of top) {
    let type = normalizeType(sec.section_type);
    if (!type || SKIP_TYPES.has(type)) continue;
    // Effektiver Container (siehe `effectiveContainerKindOf`):
    // `cards_v1` mit `section_key=products` wird redaktionell als
    // Kartenscroller geführt und muss öffentlich ebenfalls als Scroller
    // rendern. Ohne diese Weiche fiele der Block sonst auf das normale
    // Kartenraster zurück (Drift Admin↔Public). Keine zweite Scroller-
    // Logik — wir delegieren auf den bestehenden ProductScrollerV1.
    if (type === "cards_v1" && sec.section_key === "products") {
      type = "product_scroller_v1";
    }
    const renderer = RENDERERS[type];
    if (!renderer) {
      if (import.meta.env.DEV) {
        console.warn(`[CmsBodyRenderer] Unbekannter section_type "${sec.section_type}" auf ${pageKey}/${sec.section_key}`);
      }
      continue;
    }
    const children = cms.sections
      .filter((c) => c.parent_section_key === sec.section_key)
      .map((c) => ({ section_key: c.section_key, section_type: c.section_type ?? null }));

    // Globaler Hintergrund-Schalter (`section_bg`, nur DE gepflegt):
    //   "muted"/"secondary" → grauer Abschnitt, sonst Standard.
    // `teaser_2col_v1` hat einen eigenen, feiner abgestuften Schalter
    // (`background_variant`) und wird hier nicht zusätzlich eingefärbt.
    // `cards_v1` liest `section_bg` selbst — dann kein doppelter Wrapper.
    // Sprachneutral: aktuelle Sprache → DE → EN.
    const wantsMuted = isMutedSectionBg(readSectionBg(cms, sec.section_key, locale));
    const selfPainted = SELF_PAINTED_SECTION_TYPES.has(type);
    const wrapClass = wantsMuted && !selfPainted ? SECTION_BG_MUTED_CLASS : undefined;

    // Sprungmarke pro Block: `#<block-schlüssel>` (siehe sectionAnchor.ts).
    const anchor = sectionAnchorId(sec.section_key);
    const alias = sectionAnchorAlias(sec.section_key);

    rendered.push(
      <div
        key={`${pageKey}-${sec.section_key}`}
        id={anchor || undefined}
        data-cms-anchor={alias ?? anchor}
        className={wrapClass ? `${wrapClass} scroll-mt-24` : "scroll-mt-24"}
      >
        {renderer({ pageKey, cms, locale, sectionKey: sec.section_key, children })}
      </div>,
    );


  }

  if (!forceRender && rendered.length === 0) return null;
  return <>{rendered}</>;
}

/**
 * Helper für Page-Komponenten:
 *   const body = useCmsBody(pageKey, cms);
 *   return body ?? <FallbackJsx/>;
 */
export function useCmsBody(pageKey: string, cms: CmsPageContent): ReactNode | null {
  // Body gilt als „vorhanden", sobald mindestens eine non-hero Top-Level-Section
  // mit bekanntem renderbaren Typ existiert.
  const hasRenderable = cms.sections.some((s) => {
    if (s.parent_section_key) return false;
    const t = normalizeType(s.section_type);
    return !!t && !SKIP_TYPES.has(t) && t in RENDERERS;
  });
  if (!hasRenderable) return null;
  // Zusätzlich: mindestens ein Feld in irgendeiner DB-Section gesetzt.
  if (!cms.hasDbContent) return null;
  return <CmsBodyRenderer pageKey={pageKey} cms={cms} />;
}
