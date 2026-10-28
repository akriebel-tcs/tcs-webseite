import GenericCmsPage from "@/features/cms/components/GenericCmsPage";

/**
 * SchulePage — Detail-Seite „TCS in Schulen" (P-267 / N-152).
 *
 * Rendert vollständig DB-first über GenericCmsPage. Reihenfolge,
 * Sichtbarkeit und Inhalte aller Top-Level-Sections kommen aus
 * cms_sections / cms_section_fields / cms_assets unter dem
 * page_key "anwendungen.schule".
 *
 * Seit Batch 58 enthält die Seite die zuvor unter
 * "anwendungen.bildungseinrichtungen" gepflegten Schule-Blöcke
 * (einrichtung_schule, anforderungen_schule, leistungen_schule_*,
 * broschure_schule).
 */
const Schule = () => <GenericCmsPage pageKey="anwendungen.schule" />;

export default Schule;
