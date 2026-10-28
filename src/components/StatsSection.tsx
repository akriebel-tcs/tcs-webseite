import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  useCmsPageContent,
  normalizeLocale,
} from "@/features/cms/hooks/useCmsPageContent";
import { listChildItems, txStatField } from "@/features/cms/utils/cmsItemHelpers";

const FALLBACK_STAT_KEYS = ["experience", "madeInGermany", "technology", "support"] as const;

interface Props {
  pageKey?: string;
}

const StatsSection: React.FC<Props> = ({ pageKey = "home.start" }) => {
  const { t, i18n } = useTranslation("home");
  const cms = useCmsPageContent(pageKey);
  const loc = normalizeLocale(i18n.language);

  // DB-first: Kindsections `stats_item_<key>` (stat_v1). Reihenfolge &
  // Sichtbarkeit kommen aus cms_sections; Fallback ist die alte i18n-Reihenfolge.
  const keys = listChildItems(cms, "stats", "stat_v1", FALLBACK_STAT_KEYS);

  return (
    <section className="py-16 lg:py-20 border-b border-border" data-cms-page={pageKey}>
      <div className="container mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
          {keys.map((key, i) => {
            const legacyValue = cms.text("stats", `${key}_value`, loc, t(`stats.items.${key}.value`, { defaultValue: "" }));
            const legacyLabel = cms.text("stats", `${key}_label`, loc, t(`stats.items.${key}.label`, { defaultValue: "" }));
            const value = txStatField(cms, loc, "stats", key, "value", legacyValue);
            const label = txStatField(cms, loc, "stats", key, "label", legacyLabel);
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="text-center"
                data-cms-section={`stats_item_${key}`}
              >
                <div className="text-2xl md:text-3xl font-heading text-foreground mb-1" data-cms-field="value">{value}</div>
                <div className="text-xs md:text-sm text-muted-foreground" data-cms-field="label">{label}</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
