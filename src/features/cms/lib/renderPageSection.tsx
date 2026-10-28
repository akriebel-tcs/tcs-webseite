import type { ReactNode } from "react";
import {
  RENDERERS,
  SKIP_TYPES,
  normalizeType,
  type CmsSectionContext,
  type Locale,
} from "@/features/cms/components/CmsBodyRenderer";
import type { CmsPageContent } from "@/features/cms/hooks/useCmsPageContent";
import { sectionAnchorId, sectionAnchorAlias } from "@/features/cms/lib/sectionAnchor";
import { SECTION_BG_MUTED_CLASS, SELF_PAINTED_SECTION_TYPES, isMutedSectionBg, readSectionBg } from "@/features/cms/lib/sectionBackground";


export function canRenderCmsSectionType(sectionType: string | null | undefined): boolean {
  const normalized = normalizeType(sectionType);
  if (!normalized || SKIP_TYPES.has(normalized)) return false;
  return RENDERERS[normalized] != null;
}

export function renderPageSectionByType(args: {
  pageKey: string;
  sectionKey: string;
  sectionType: string | null | undefined;
  cms: CmsPageContent;
  locale: Locale;
  allowSkippedTypes?: boolean;
}): ReactNode | null {
  let normalized = normalizeType(args.sectionType);
  if (!normalized) return null;
  if (!args.allowSkippedTypes && SKIP_TYPES.has(normalized)) return null;

  // Effektiver Container (siehe `effectiveContainerKindOf`):
  // `cards_v1` mit `section_key='products'` ist redaktionell ein
  // Kartenscroller (`cards_v1.scroller`) und muss öffentlich über
  // `ProductScrollerV1` rendern. Spiegelt die Weiche aus
  // `CmsBodyRenderer` 1:1, damit beide Render-Pfade
  // (GenericCmsPage → renderPageSectionByType und CmsBodyRenderer)
  // dieselbe Wahrheit fahren.
  if (normalized === "cards_v1" && args.sectionKey === "products") {
    normalized = "product_scroller_v1";
  }

  const renderer = RENDERERS[normalized];
  if (!renderer) {
    if (import.meta.env.DEV) {
      console.warn(
        `[renderPageSectionByType] Nicht unterstützte Section übersprungen: ${args.pageKey}/${args.sectionKey} (${args.sectionType ?? "ohne Typ"})`,
      );
    }
    return null;
  }

  const children = args.cms.sections
    .filter((section) => section.parent_section_key === args.sectionKey)
    .map((section) => ({
      section_key: section.section_key,
      section_type: section.section_type ?? null,
    }));

  const ctx: CmsSectionContext = {
    pageKey: args.pageKey,
    cms: args.cms,
    locale: args.locale,
    sectionKey: args.sectionKey,
    children,
  };

  const out = renderer(ctx);
  if (out == null) return null;

  // Globaler Hintergrund-Schalter (`section_bg`, nur DE gepflegt):
  //   "muted"/"secondary" → grauer Abschnitt, sonst Standard.
  // Spiegelt die Regel aus `CmsBodyRenderer` 1:1, damit Seiten mit
  // eigenem Render-Loop denselben Schalter wirksam machen.
  // `teaser_2col_v1` (eigener, feiner abgestufter Schalter) und
  // `cards_v1` (liest `section_bg` selbst) malen sich selbst.
  // Sprachneutral: aktuelle Sprache → DE → EN (Layout gilt für alle Sprachen).
  const wantsMuted = isMutedSectionBg(readSectionBg(args.cms, args.sectionKey, args.locale));
  const selfPainted = SELF_PAINTED_SECTION_TYPES.has(normalized);

  // Sprungmarke: jeder Top-Level-Block ist über `#<block-schlüssel>`
  // erreichbar (siehe `sectionAnchor.ts`).
  const anchor = sectionAnchorId(args.sectionKey);
  const alias = sectionAnchorAlias(args.sectionKey);
  const body = !wantsMuted || selfPainted ? out : <div className={SECTION_BG_MUTED_CLASS}>{out}</div>;

  return (
    <div id={anchor || undefined} data-cms-anchor={alias ?? anchor} className="scroll-mt-24">
      {body}
    </div>
  );
}
