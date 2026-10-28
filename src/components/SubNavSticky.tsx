import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface SubNavItem {
  id: string;
  label: string;
}

interface SubNavStickyProps {
  items: SubNavItem[];
}

const SubNavSticky = ({ items }: SubNavStickyProps) => {
  const { t } = useTranslation("navigation");
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: [0, 0.25, 0.5, 1] }
    );
    items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top, behavior: "smooth" });
      history.replaceState(null, "", `#${id}`);
    }
  };

  return (
    <nav
      aria-label={t("a11y.sectionNavigation")}
      className="sticky top-16 z-30 bg-background/95 backdrop-blur border-b border-border"
    >
      <div className="container mx-auto">
        <ul className="flex gap-6 overflow-x-auto py-3 text-sm font-body whitespace-nowrap scrollbar-hide">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={(e) => handleClick(e, item.id)}
                className={`transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  activeId === item.id
                    ? "text-foreground font-medium border-b-2 border-foreground pb-1"
                    : "text-muted-foreground"
                }`}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default SubNavSticky;
