import GenericCmsPage from "@/features/cms/components/GenericCmsPage";

/**
 * WohnheimPage — Detail-Seite „TCS in Wohnheimen" (P-268 / N-153).
 *
 * Rendert vollständig DB-first über GenericCmsPage. Reihenfolge,
 * Sichtbarkeit und Inhalte aller Top-Level-Sections kommen aus
 * cms_sections / cms_section_fields / cms_assets unter dem
 * page_key "anwendungen.wohnheim".
 *
 * Seit Batch 59 enthält die Seite die zuvor unter
 * "anwendungen.bildungseinrichtungen" gepflegten Wohnheim-Blöcke
 * (einrichtung_wohnheim, anforderungen_wohnheim, leistungen_wohnheim_*,
 * broschure_wohnheim).
 */
const Wohnheim = () => <GenericCmsPage pageKey="anwendungen.wohnheim" />;

export default Wohnheim;
