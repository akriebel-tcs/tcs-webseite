import AnwendungDetailPage, { AnwendungPageData } from "@/features/anwendungen/components/AnwendungDetailPage";
import { Cable, RefreshCw, Layers, Tag } from "lucide-react";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";

const Sanierung = () => {
  const { t, cms, loc } = useCmsI18n("anwendungen.wohnen.sanierung", "anwendungen", "wohnen.sanierung");
  const base = "wohnen.sanierung";

  const data: AnwendungPageData = {
    label: t("shared.labelsCommon.anwendungsloesung"),
    headline: t(`${base}.headline`),
    intro: t(`${base}.intro`),
    heroImage: "",
    description: t(`${base}.description`),
    anforderungen: [
      { icon: Cable, label: t(`${base}.anforderungen.bestand.label`), text: t(`${base}.anforderungen.bestand.text`) },
      { icon: RefreshCw, label: t(`${base}.anforderungen.austausch.label`), text: t(`${base}.anforderungen.austausch.text`) },
      { icon: Layers, label: t(`${base}.anforderungen.ausbau.label`), text: t(`${base}.anforderungen.ausbau.text`) },
      { icon: Tag, label: t(`${base}.anforderungen.namen.label`), text: t(`${base}.anforderungen.namen.text`) },
    ],
    leistungen: [
      {
        title: t(`${base}.leistungen.szenarien.title`),
        items: t(`${base}.leistungen.szenarien.items`, { returnObjects: true }) as string[],
      },
      {
        title: t(`${base}.leistungen.vorteile.title`),
        items: t(`${base}.leistungen.vorteile.items`, { returnObjects: true }) as string[],
      },
    ],
    systembausteine: [
      { label: t(`${base}.systembausteine.aussenstation.label`), title: t(`${base}.systembausteine.aussenstation.title`), description: t(`${base}.systembausteine.aussenstation.description`) },
      { label: t(`${base}.systembausteine.smartStick.label`), title: t(`${base}.systembausteine.smartStick.title`), description: t(`${base}.systembausteine.smartStick.description`) },
      { label: t(`${base}.systembausteine.namen.label`), title: t(`${base}.systembausteine.namen.title`), description: t(`${base}.systembausteine.namen.description`) },
      { label: t(`${base}.systembausteine.snipdoo.label`), title: t(`${base}.systembausteine.snipdoo.title`), description: t(`${base}.systembausteine.snipdoo.description`) },
    ],
    verwandteAnwendungen: [
      { label: t("shared.verwandte.mehrfamilienhaus"), href: "/anwendungen/mehrfamilienhaus" },
      { label: t("shared.verwandte.grossanlage"), href: "/anwendungen/grossanlage" },
      { label: t("shared.verwandte.mobileTuerkommunikation"), href: "/gebaeudekommunikation/mobile-tuerkommunikation" },
    ],
  };

  return <AnwendungDetailPage data={data} pageKey="anwendungen.sanierung" />;
};

export default Sanierung;
