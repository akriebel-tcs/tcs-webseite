import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const NOINDEX_META_ID = "robots-noindex-404";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation("common");

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  // 404 darf nicht indexiert werden – noindex/nofollow-Meta nur für diese Seite einfügen.
  useEffect(() => {
    if (typeof document === "undefined") return;
    let meta = document.getElementById(NOINDEX_META_ID) as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.id = NOINDEX_META_ID;
      meta.name = "robots";
      meta.content = "noindex, nofollow";
      document.head.appendChild(meta);
    }
    return () => {
      const existing = document.getElementById(NOINDEX_META_ID);
      if (existing) existing.remove();
    };
  }, []);

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-muted">
      <div className="text-center px-4">
        <h1 className="mb-4 text-5xl font-bold text-foreground">{t("notFound.code")}</h1>
        <h2 className="mb-3 text-2xl font-semibold text-foreground">{t("notFound.headline")}</h2>
        <p className="mb-6 text-base text-muted-foreground max-w-md mx-auto">
          {t("notFound.intro")}
        </p>
        <a
          href="/"
          className="inline-block bg-foreground text-background px-6 py-3 text-sm font-medium hover:bg-foreground/90 transition-colors"
        >
          {t("notFound.cta")}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
