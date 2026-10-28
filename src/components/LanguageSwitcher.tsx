import { Check, Languages } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type AppLocale } from "@/i18n/locale";
import { useLanguageSwitch } from "@/i18n/useLanguageSwitch";
import { usePublicLocales } from "@/i18n/usePublicLocales";



interface LanguageSwitcherProps {
  className?: string;
}

/**
 * Sprachumschalter der Website — kompaktes Auswahlmenü.
 *
 * Die angebotenen Sprachen kommen ausschließlich aus der Datenbank
 * (`cms_locales`, `is_public = true`, sortiert nach `sort_order`). Keine im
 * Code hinterlegte Liste: eine Sprache im internen Arbeitsstand (bearbeitbar,
 * aber nicht öffentlich) erscheint hier nicht.
 *
 * Die Anzeige bleibt bei beliebig vielen Sprachen gleich breit (Symbol +
 * aktueller Sprachcode), es gibt also keinen Layoutsprung. URL- und
 * Sprachverhalten bleiben unverändert (Sprache wird wie bisher gemerkt).
 */
const LanguageSwitcher = ({ className = "" }: LanguageSwitcherProps) => {
  // Ein einziger, router-konformer Sprachwechsel (`useLanguageSwitch`). Dort hat
  // die Nutzerwahl (`i18n.language`) Vorrang vor `resolvedLanguage`, weil dieses
  // bei fehlenden statischen Sprachpaketen auf Deutsch zeigen kann.
  const { current, switchLanguage } = useLanguageSwitch();
  const { locales } = usePublicLocales();

  const change = (lang: AppLocale) => {
    void switchLanguage(lang);
  };




  // Nur anzeigen, wenn die Datenbank mehr als eine öffentliche Sprache meldet.
  if (locales.length < 2) return null;

  const currentRow = locales.find((l) => l.locale === current);
  const currentLabel = currentRow?.label_native ?? current.toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`inline-flex min-w-[64px] items-center justify-center gap-1 rounded px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${className}`}
        aria-label={`Sprache wählen — aktuell ${currentLabel}`}
      >
        <Languages className="h-4 w-4" aria-hidden="true" />
        <span className="font-semibold uppercase">{current}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[11rem]">
        {locales.map(({ locale: lang, label_native }) => (
          <DropdownMenuItem
            key={lang}
            onSelect={() => change(lang)}
            aria-current={lang === current ? "true" : undefined}
            className="flex items-center justify-between gap-3 text-xs"
          >
            <span>
              {label_native}
              <span className="ml-2 uppercase text-muted-foreground">{lang}</span>
            </span>
            {lang === current && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
