import { useTranslation } from "react-i18next";
import type { SpecGroup } from "./types";

/**
 * Gruppierte Darstellung „Technische Daten".
 *
 * Quelle: ausschließlich `pdp.technical_specs_display` aus
 * `rpc_get_channel_product_pdp` (bereits lokalisiert, mit `group_label`,
 * `group_sort` und `display_order`). Es werden ausschließlich gelieferte
 * Werte gerendert; Gruppen ohne Werte filtert der Aufrufer aus.
 */

interface Props {
  readonly groups: readonly SpecGroup[];
}

export default function ProductPdpTechnicalData({ groups }: Props) {
  const { t } = useTranslation("service");
  if (groups.length === 0) return null;

  return (
    <section aria-labelledby="pdp-specs-heading" className="space-y-4">
      <h2
        id="pdp-specs-heading"
        className="text-lg font-heading font-semibold text-foreground"
      >
        {t("katalog.pdp.sections.specs")}
      </h2>

      <div className="space-y-6">
        {groups.map((g) => (
          <div key={g.key} className="space-y-2">
            {g.label ? (
              <h3 className="text-sm font-medium text-foreground">{g.label}</h3>
            ) : null}
            <dl className="rounded-md border border-border overflow-hidden divide-y divide-border bg-card">
              {g.items.map((s) => (
                <div
                  key={s.key}
                  className="grid grid-cols-1 sm:grid-cols-[14rem_1fr] gap-1 sm:gap-4 px-4 py-2.5 text-sm"
                >
                  <dt className="text-muted-foreground">{s.label}</dt>
                  <dd className="text-foreground">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
