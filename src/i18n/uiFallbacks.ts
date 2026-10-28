/**
 * Sprachneutrale Notfall-Beschriftungen fuer wiederverwendbare
 * Bedienelemente (Gruppe 2 des Sprachvertrags).
 *
 * Hintergrund: Frueher stand in vielen Renderern ein Zweisprachen-Ausdruck,
 * der nur Deutsch und Englisch kannte und bei jeder neu freigegebenen
 * Sprache stumm auf Deutsch zurueckfiel. Hier wird stattdessen der
 * i18n-Schluessel `common:ui.learnMore` fuer die uebergebene Sprache
 * gelesen — jede Sprache mit gepflegtem Schluessel ist damit korrekt.
 *
 * Wichtig: Das ist nur der Fallback. Die eigentliche Linkbeschriftung ist
 * ein redaktioneller Inhalt und kommt aus CMS-Light
 * (`link_<n>_label`, Gruppe 1).
 */
import i18n from "@/i18n";

export function learnMoreFallback(locale?: string): string {
  return i18n.t("ui.learnMore", { ns: "common", lng: locale || undefined }) as string;
}
