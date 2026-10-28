/**
 * CTASection — dünner Wrapper, der die globale Projekt-CTA der Startseite
 * (`home.start` / Section `cta`) vollständig aus der Datenbank rendert.
 *
 * Es gibt KEINE hartkodierten Texte, Telefonnummern oder E-Mail-Adressen
 * mehr im Code. Alles (Überschrift, Fließtext, Beschriftungen, Linkziele,
 * Telefon-/E-Mail-Anzeige, optionale Bereiche per Schalter) wird im
 * `/admin` gepflegt und 1:1 hier ausgespielt — eine einzige Wahrheit.
 */
import CmsTailCta from "@/features/cms/components/CmsTailCta";

interface Props {
  pageKey?: string;
}

const CTASection: React.FC<Props> = ({ pageKey = "home.start" }) => {
  return (
    <div id="kontakt">
      <CmsTailCta pageKey={pageKey} />
    </div>
  );
};

export default CTASection;
