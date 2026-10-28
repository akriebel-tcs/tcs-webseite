/**
 * TabsV1 — Horizontale Tab-Navigation mit ARIA-konformen Reitern.
 * Pro Tab ein Inhalts-Panel mit H3, italic-Beschreibung und bis zu 4
 * Vorteilen (Mini-Headline + Body) in einem 2-Spalten-Grid.
 *
 * Aktiver Tab wird via lokalem useState gehalten (nicht URL-Hash).
 * Beim ersten Render ist der Tab mit niedrigster sort_order aktiv —
 * CmsBodyRenderer liefert Kind-Sections bereits in dieser Reihenfolge.
 *
 * Vorteile sind bewusst flach als `vorteile.<n>.headline/body` modelliert
 * (Ausnahme von der Karten-/Listen-Regel — feste Struktur, keine
 * projektweite Wiederverwendung geplant).
 *
 * Siehe docs/02-architektur/section-typen-katalog.md (tabs_v1 / tab_v1).
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, ExternalLink } from "lucide-react";
import type { CmsSectionContext } from "../CmsBodyRenderer";
import { f, cf, img, imgAlt } from "./_helpers";


export function TabsV1(ctx: CmsSectionContext) {
  const tabs = ctx.children.filter((c) => (c.section_type ?? "") === "tab_v1");

  const [activeTabKey, setActiveTabKey] = useState<string | null>(
    tabs[0]?.section_key ?? null,
  );

  const tabKeysSig = tabs.map((t) => t.section_key).join("|");
  useEffect(() => {
    if (tabs.length === 0) {
      setActiveTabKey(null);
      return;
    }
    if (!tabs.some((t) => t.section_key === activeTabKey)) {
      setActiveTabKey(tabs[0].section_key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabKeysSig]);

  if (tabs.length === 0) return null;

  const label = f(ctx, "label");
  const title = f(ctx, "title");
  const intro = f(ctx, "intro");
  const tablistLabel = f(ctx, "tablist_label");

  const activeTab = tabs.find((t) => t.section_key === activeTabKey);

  return (
    <section
      className="py-16 lg:py-24 bg-background"
      data-cms-section={ctx.sectionKey}
    >
      <div className="container mx-auto">
        {(label || title || intro) && (
          <div className="mb-10 max-w-3xl">
            {label && (
              <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-3">
                {label}
              </span>
            )}
            {title && (
              <h2 className="text-2xl md:text-3xl font-heading font-normal text-foreground">
                {title}
              </h2>
            )}
            {intro && (
              <p className="mt-4 text-muted-foreground leading-relaxed">{intro}</p>
            )}
          </div>
        )}

        <div
          role="tablist"
          {...(tablistLabel ? { "aria-label": tablistLabel } : {})}
          className="flex gap-6 overflow-x-auto border-b border-border mb-8 whitespace-nowrap"
        >
          {tabs.map((tab) => {
            const tabLabel = cf(ctx, tab.section_key, "tab_label");
            const isActive = tab.section_key === activeTabKey;
            return (
              <button
                key={tab.section_key}
                role="tab"
                aria-selected={isActive}
                aria-controls={`${ctx.sectionKey}-panel-${tab.section_key}`}
                id={`${ctx.sectionKey}-tab-${tab.section_key}`}
                onClick={() => setActiveTabKey(tab.section_key)}
                className={`pb-3 text-sm font-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isActive
                    ? "text-foreground font-medium border-b-2 border-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tabLabel || tab.section_key}
              </button>
            );
          })}
        </div>

        {activeTab && (
          <motion.div
            key={activeTab.section_key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            role="tabpanel"
            id={`${ctx.sectionKey}-panel-${activeTab.section_key}`}
            aria-labelledby={`${ctx.sectionKey}-tab-${activeTab.section_key}`}
            className="max-w-4xl"
          >
            <TabPanelContent ctx={ctx} tabKey={activeTab.section_key} />
          </motion.div>
        )}
      </div>
    </section>
  );
}

function TabPanelContent({ ctx, tabKey }: { ctx: CmsSectionContext; tabKey: string }) {
  const panelTitle = cf(ctx, tabKey, "title");
  const description = cf(ctx, tabKey, "description");
  const image = img(ctx, tabKey, "image");
  const imageAlt = imgAlt(ctx, tabKey, "image");

  const keys = ctx.cms.fieldKeys(tabKey);
  const indices = new Set<string>();
  for (const k of keys) {
    const m = k.match(/^vorteile\.(\d+)\.(headline|body)$/);
    if (m) indices.add(m[1]);
  }
  const sortedIndices = Array.from(indices).sort((a, b) => Number(a) - Number(b));
  const vorteile = sortedIndices
    .map((i) => ({
      idx: i,
      headline: cf(ctx, tabKey, `vorteile.${i}.headline`),
      body: cf(ctx, tabKey, `vorteile.${i}.body`),
      // Optionale Gruppen-Überschrift (z. B. „Vertriebsregion Nord Ost").
      // Ist sie gesetzt, beginnt ab diesem Eintrag eine neue Gruppe.
      group: cf(ctx, tabKey, `vorteile.${i}.group`),
      // Optionales Gruppen-Bild (z. B. Gebietskarte einer Vertriebsregion),
      // gepflegt im Bild-Slot `vorteile.<n>.group_image` am Gruppen-Anfang.
      groupImage: img(ctx, tabKey, `vorteile.${i}.group_image`),
      groupImageAlt: imgAlt(ctx, tabKey, `vorteile.${i}.group_image`),
      // Optionales Bild je Eintrag (z. B. Porträt eines Ansprechpartners),
      // gepflegt im Bild-Slot `vorteile.<n>.image`.
      image: img(ctx, tabKey, `vorteile.${i}.image`),
      imageAlt: imgAlt(ctx, tabKey, `vorteile.${i}.image`),
      // Optionaler Download-Link je Eintrag (z. B. VCF-Visitenkarte),
      // gepflegt im Textfeld `vorteile.<n>.vcf_href`.
      vcfHref: cf(ctx, tabKey, `vorteile.${i}.vcf_href`),
      // Optionaler Link zur Online-Visitenkarte (externe Adresse),
      // gepflegt im Textfeld `vorteile.<n>.online_href`.
      onlineHref: cf(ctx, tabKey, `vorteile.${i}.online_href`),
    }))
    .filter((v) => v.headline || v.body);

  // Beschriftung des Download-Links (redaktionell, je Sprache).
  const vcfLabel = cf(ctx, tabKey, "vcf_label");
  // Beschriftung des Links zur Online-Visitenkarte (redaktionell, je Sprache).
  const onlineLabel = cf(ctx, tabKey, "online_label");


  // In Gruppen bündeln: Ein Eintrag mit `group` startet eine neue Gruppe.
  // Ohne jede Gruppen-Überschrift bleibt es eine einzige Gruppe ohne Titel.
  const groups: {
    title: string;
    image: string;
    imageAlt: string;
    items: typeof vorteile;
  }[] = [];
  for (const v of vorteile) {
    if (groups.length === 0 || v.group) {
      groups.push({
        title: v.group || "",
        image: v.groupImage || "",
        imageAlt: v.groupImageAlt || "",
        items: [],
      });
    }
    groups[groups.length - 1].items.push(v);
  }


  return (
    <>
      {image && (
        <img
          src={image}
          alt={imageAlt}
          loading="lazy"
          className="w-full h-auto mb-6 object-cover"
        />
      )}
      {panelTitle && (
        <h3 className="text-xl md:text-2xl font-heading font-normal text-foreground mb-2">
          {panelTitle}
        </h3>
      )}
      {description && (
        <p className="italic text-muted-foreground leading-relaxed mb-8 whitespace-pre-line">
          {description}
        </p>
      )}
      {groups.map((g, gi) => (
        <div key={g.title || `group-${gi}`} className={gi > 0 ? "mt-10" : ""}>
          {g.title && (
            <h4 className="text-base md:text-lg font-heading font-medium text-foreground mb-5 pb-2 border-b border-border">
              {g.title}
            </h4>
          )}
          {g.image && (
            <img
              src={g.image}
              alt={g.imageAlt}
              loading="lazy"
              className="w-full max-w-sm h-auto mb-6 object-contain"
            />
          )}

          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
            {g.items.map((v) => (
              <li key={v.idx} className="flex gap-4">
                {v.image && (
                  <img
                    src={v.image}
                    alt={v.imageAlt}
                    loading="lazy"
                    className="w-[105px] h-[142px] shrink-0 object-cover"
                  />
                )}
                <div>
                  {v.headline && (
                    <p className="font-semibold text-sm text-foreground mb-1 leading-snug">
                      {v.headline}
                    </p>
                  )}
                  {v.body && (
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {v.body}
                    </p>
                  )}
                  {v.vcfHref && vcfLabel && (
                    <a
                      href={v.vcfHref}
                      download
                      className="mt-2 flex w-fit items-center gap-2 text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {vcfLabel}
                    </a>
                  )}
                  {v.onlineHref && onlineLabel && (
                    <a
                      href={v.onlineHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 flex w-fit items-center gap-2 text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {onlineLabel}
                    </a>
                  )}

                </div>

              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

