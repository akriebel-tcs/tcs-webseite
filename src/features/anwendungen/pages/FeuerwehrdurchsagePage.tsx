import AnwendungDetailPage, { AnwendungPageData } from "@/features/anwendungen/components/AnwendungDetailPage";
import { ShieldCheck, Users, HandMetal, Cable } from "lucide-react";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";

const Feuerwehrdurchsage = () => {
  // Batch 19: pageKey auf echte CMS-Seite (Spiegel-Regel).
  const { t, cms, loc } = useCmsI18n("anwendungen.feuerwehrdurchsage", "anwendungen", "funktionen.feuerwehrdurchsage");

  const anforderungenIcons = [
    { key: "norm", icon: ShieldCheck },
    { key: "alleWohneinheiten", icon: Users },
    { key: "bedienung", icon: HandMetal },
    { key: "bestand", icon: Cable },
  ];

  const anforderungen = anforderungenIcons.map(({ key, icon }) => ({
    icon,
    label: t(`funktionen.feuerwehrdurchsage.anforderungen.${key}.label`),
    text: t(`funktionen.feuerwehrdurchsage.anforderungen.${key}.text`),
  }));

  const leistungenKeys = ["durchsage", "integration", "produkte"];
  const leistungen = leistungenKeys.map((key) => ({
    title: t(`funktionen.feuerwehrdurchsage.leistungen.${key}.title`),
    items: t(`funktionen.feuerwehrdurchsage.leistungen.${key}.items`, { returnObjects: true }) as string[],
  }));

  const systembausteineKeys = ["fde", "innenstationen", "schluesselschalter", "video"];
  const systembausteine = systembausteineKeys.map((key) => ({
    label: t(`funktionen.feuerwehrdurchsage.systembausteine.${key}.label`),
    title: t(`funktionen.feuerwehrdurchsage.systembausteine.${key}.title`),
    description: t(`funktionen.feuerwehrdurchsage.systembausteine.${key}.description`),
  }));

  const data: AnwendungPageData = {
    label: t("shared.labelsCommon.anwendungsloesung"),
    headline: t("funktionen.feuerwehrdurchsage.headline"),
    intro: t("funktionen.feuerwehrdurchsage.intro"),
    heroImage: "",
    description: t("funktionen.feuerwehrdurchsage.description"),
    anforderungen,
    leistungen,
    systembausteine,
    broschure: {
      label: t("funktionen.feuerwehrdurchsage.broschure.label"),
      href: "https://www.tcsag.de/fileadmin/user_upload/TCS_DE/Metanavigation/Downloads/TCSplus/SYS08_Feuerwehrdurchsage.pdf",
    },
    verwandteAnwendungen: [
      { label: t("shared.verwandte.feuerwehr"), href: "/anwendungen/feuerwehr" },
      { label: t("shared.verwandte.interneKommunikation"), href: "/anwendungen/interne-kommunikation" },
      { label: t("shared.verwandte.mehrfamilienhaus"), href: "/anwendungen/mehrfamilienhaus" },
    ],
  };

  return <AnwendungDetailPage data={data} pageKey="anwendungen.feuerwehrdurchsage" />;
};

export default Feuerwehrdurchsage;
