/**
 * useCmsI18n — Einheitlicher DB-first `t()`-Ersatz für Seiten-Komponenten.
 *
 * Idee:
 *   Eine Seite ruft heute hunderte Male `t("snipdooIp.hero.headline")` auf.
 *   Wir wollen diese Aufrufe NICHT umschreiben, aber sicherstellen, dass der
 *   Wert zuerst aus `cms_section_fields` kommt und i18n nur Fallback ist.
 *
 * Konvention (passt zur bestehenden Migrations-Konvention):
 *   i18n-Key  = `<rootPrefix>.<section>.<field>`
 *   DB-Lookup = cms.text("<section>", "<field>", locale, t(key))
 *
 *   Hat eine Seite keinen rootPrefix (z. B. weil sie direkt mit "hero.xy"
 *   arbeitet), bleibt `rootPrefix` leer.
 *
 *   Hat ein Key nur ein Segment ("title") oder beginnt nicht mit dem
 *   erwarteten rootPrefix, wird automatisch nur der i18n-Wert geliefert.
 *
 * Damit reicht in der Page-Komponente:
 *   const { t, cms, loc, i18n } = useCmsI18n(pageKey, ns, rootPrefix);
 *
 * Alle `t("…")`-Aufrufe bleiben unverändert und werden automatisch
 * DB-first aufgelöst. Bilder weiterhin explizit via `cms.asset(...)`.
 */
import type { AppLocale } from "@/i18n/locale";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  useCmsPageContent,
  normalizeLocale,
  type CmsPageContent,
} from "@/features/cms/hooks/useCmsPageContent";

export interface UseCmsI18nResult {
  /** DB-first Ersatz für i18next-`t`. Signatur kompatibel zu `t(key, opts?)`. */
  // Rückgabetyp `any`, damit `t("foo", { returnObjects: true }) as string[]` o. ä.
  // weiterhin ohne Cast-Friction funktioniert (i18n erlaubt Objekte/Arrays).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, opts?: Record<string, unknown>) => any;
  /** Roher i18n-Wert (ohne DB-Überlagerung) — wenn explizit gewünscht. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tRaw: (key: string, opts?: Record<string, unknown>) => any;
  cms: CmsPageContent;
  loc: AppLocale;
  i18n: ReturnType<typeof useTranslation>["i18n"];
}

export function useCmsI18n(
  pageKey: string | null | undefined,
  ns: string | string[] | undefined,
  rootPrefix?: string,
): UseCmsI18nResult {
  const cms = useCmsPageContent(pageKey ?? null);
  const { t, i18n } = useTranslation(ns);
  const loc = normalizeLocale(i18n.language);

  const wrapped = useMemo(() => {
    const stripPrefix = (k: string): string => {
      if (!rootPrefix) return k;
      if (k === rootPrefix) return "";
      if (k.startsWith(rootPrefix + ".")) return k.slice(rootPrefix.length + 1);
      return k;
    };

    const tDb = (key: string, opts?: Record<string, unknown>): string => {
      const fallback = t(key, opts as never) as unknown as string;
      // Interpolation/Plural/Arrays → i18n hat das Sagen.
      if (typeof fallback !== "string" || opts) return fallback as string;
      const path = stripPrefix(key);
      const dot = path.indexOf(".");
      if (dot < 0) return fallback;
      const section = path.slice(0, dot);
      const field = path.slice(dot + 1);
      return cms.text(section, field, loc, fallback);
    };

    return tDb;
  }, [cms, t, loc, rootPrefix]);

  return {
    t: wrapped,
    tRaw: t as never,
    cms,
    loc,
    i18n,
  };
}
