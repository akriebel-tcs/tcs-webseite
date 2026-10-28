// Batch 22: ServicePage komplett DB-getrieben.
// Früher: harte `sectionsMeta` mit 5 Gruppen × 16 Items, Icons und Routen
// im Code, Texte über i18n. Heute: 5 `cards_v1`-Gruppen + 16 `card_v1`-
// Kinder leben in der DB (P-078 service.hub). Renderpfad = `GenericCmsPage`,
// der `cms_sections` nach `sort_order` iteriert (Spiegel-Regel) und für
// `cards_v1` den erweiterten `CardsSectionV1` mit `section_bg` und
// `is_placeholder` benutzt.
import GenericCmsPage from "@/features/cms/components/GenericCmsPage";

const ServicePage = () => <GenericCmsPage pageKey="service.hub" />;

export default ServicePage;
