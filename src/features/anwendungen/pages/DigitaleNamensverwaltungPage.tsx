import AnwendungDetailPage, { AnwendungPageData } from "@/features/anwendungen/components/AnwendungDetailPage";
import { Tag, Cloud, UserCog, Type, Plug } from "lucide-react";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";

const DigitaleNamensverwaltung = () => {
  // Batch 19: pageKey auf echte CMS-Seite (Spiegel-Regel).
  const { t, cms, loc } = useCmsI18n("anwendungen.digitale-namensverwaltung", "anwendungen", "funktionen.digitaleNamensverwaltung");

  const anforderungenIcons = [
    { key: "schild", icon: Tag },
    { key: "fernverwaltung", icon: Cloud },
    { key: "mieterwechsel", icon: UserCog },
    { key: "sondertexte", icon: Type },
    { key: "integration", icon: Plug },
  ];

  const anforderungen = anforderungenIcons.map(({ key, icon }) => ({
    icon,
    label: t(`funktionen.digitaleNamensverwaltung.anforderungen.${key}.label`),
    text: t(`funktionen.digitaleNamensverwaltung.anforderungen.${key}.text`),
  }));

  const leistungenKeys = ["verwaltung", "displaytechnik", "einsatz"];
  const leistungen = leistungenKeys.map((key) => ({
    title: t(`funktionen.digitaleNamensverwaltung.leistungen.${key}.title`),
    items: t(`funktionen.digitaleNamensverwaltung.leistungen.${key}.items`, { returnObjects: true }) as string[],
  }));

  const systembausteineKeys = ["displaymodul", "aussenstation", "software"];
  const systembausteine = systembausteineKeys.map((key) => ({
    label: t(`funktionen.digitaleNamensverwaltung.systembausteine.${key}.label`),
    title: t(`funktionen.digitaleNamensverwaltung.systembausteine.${key}.title`),
    description: t(`funktionen.digitaleNamensverwaltung.systembausteine.${key}.description`),
  }));

  const data: AnwendungPageData = {
    label: t("shared.labelsCommon.anwendungsloesung"),
    headline: t("funktionen.digitaleNamensverwaltung.headline"),
    intro: t("funktionen.digitaleNamensverwaltung.intro"),
    heroImage: "",
    description: t("funktionen.digitaleNamensverwaltung.description"),
    anforderungen,
    leistungen,
    systembausteine,
    broschure: {
      label: t("funktionen.digitaleNamensverwaltung.broschure.label"),
      href: "https://www.tcsag.de/fileadmin/user_upload/TCS_DE/Metanavigation/Downloads/TCSplus/SYS07_Digitale_Namensverwaltung.pdf",
    },
    verwandteAnwendungen: [
      { label: t("shared.verwandte.mehrfamilienhaus"), href: "/anwendungen/mehrfamilienhaus" },
      { label: t("shared.verwandte.grossanlage"), href: "/anwendungen/grossanlage" },
      { label: t("shared.verwandte.wohnheim"), href: "/anwendungen/bildungseinrichtungen" },
    ],
  };

  return <AnwendungDetailPage data={data} pageKey="anwendungen.digitale-namensverwaltung" />;
};

export default DigitaleNamensverwaltung;
