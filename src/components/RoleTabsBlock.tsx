import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export interface RoleTab {
  id: string;
  label: string;
  headline: string;
  paragraphs: string[];
}

interface RoleTabsBlockProps {
  tabs: RoleTab[];
}

const RoleTabsBlock = ({ tabs }: RoleTabsBlockProps) => {
  const { t } = useTranslation();
  const [active, setActive] = useState<string>(tabs[0]?.id ?? "");

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    const match = tabs.find((t) => t.id === hash);
    if (match) {
      setActive(match.id);
      const el = document.getElementById("rollen");
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 120;
        window.scrollTo({ top, behavior: "smooth" });
      }
    }
  }, [tabs]);

  const activeTab = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div>
      <div
        role="tablist"
        aria-label={t("navigation:a11y.roleTabs")}
        className="flex gap-6 overflow-x-auto border-b border-border mb-8 whitespace-nowrap"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active === tab.id}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => {
              setActive(tab.id);
              history.replaceState(null, "", `#${tab.id}`);
            }}
            className={`pb-3 text-sm font-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              active === tab.id
                ? "text-foreground font-medium border-b-2 border-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <motion.div
        key={activeTab.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        role="tabpanel"
        id={`panel-${activeTab.id}`}
        aria-labelledby={`tab-${activeTab.id}`}
        className="max-w-3xl"
      >
        <h3 className="text-xl md:text-2xl font-heading font-normal text-foreground mb-4">
          {activeTab.headline}
        </h3>
        {activeTab.paragraphs.map((p, i) => (
          <p key={i} className="text-muted-foreground leading-relaxed mb-4 last:mb-0">
            {p}
          </p>
        ))}
      </motion.div>
    </div>
  );
};

export default RoleTabsBlock;
