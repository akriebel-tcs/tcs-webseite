import AnwendungDetailPage, { AnwendungPageData } from "@/features/anwendungen/components/AnwendungDetailPage";
import { Video, Palette, Smartphone, KeyRound, HandMetal } from "lucide-react";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";

/**
 * KindertagesstaettenPage — Detail-Seite "TCS in Kindertagesstätten"
 * (Kindseite von P-057 Bildungseinrichtungen).
 *
 * Aufbau analog zu EinfamilienhausPage (P-061). Alle sichtbaren Inhalte
 * kommen DB-first aus `cms_pages` / `cms_sections` / `cms_section_fields`
 * für `anwendungen.kindertagesstaetten`. Die hier übergebenen `data`-Werte
 * sind reine Fallbacks für Strukturen ohne CMS-Eintrag.
 */
const Kindertagesstaetten = () => {
  const { t } = useCmsI18n("anwendungen.bildung.kindertagesstaette", "anwendungen", "bildung.kindertagesstaette");
  const base = "bildung.kindertagesstaette";

  const data: AnwendungPageData = {
    label: t("shared.labelsCommon.anwendungsloesung"),
    headline: t(`${base}.headline`),
    intro: t(`${base}.intro`),
    heroImage: "",
    description: t(`${base}.description`),
    anforderungen: [
      { icon: Video, label: t(`${base}.anforderungen.audioVideo.label`), text: t(`${base}.anforderungen.audioVideo.text`) },
      { icon: Palette, label: t(`${base}.anforderungen.design.label`), text: t(`${base}.anforderungen.design.text`) },
      { icon: Smartphone, label: t(`${base}.anforderungen.app.label`), text: t(`${base}.anforderungen.app.text`) },
      { icon: KeyRound, label: t(`${base}.anforderungen.zutritt.label`), text: t(`${base}.anforderungen.zutritt.text`) },
      { icon: HandMetal, label: t(`${base}.anforderungen.bedienung.label`), text: t(`${base}.anforderungen.bedienung.text`) },
    ],
    leistungen: [],
    systembausteine: [],
    verwandteAnwendungen: [
      { label: t("shared.verwandte.bildungseinrichtungen"), href: "/anwendungen/bildungseinrichtungen" },
    ],
  };

  return <AnwendungDetailPage data={data} pageKey="anwendungen.kindertagesstaetten" />;
};

export default Kindertagesstaetten;
