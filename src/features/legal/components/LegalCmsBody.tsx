/**
 * Rendert den redaktionellen Fließtext einer Rechtsseite DB-first.
 *
 * Quelle: cms_section_fields (Section `content`, Felder `title` und `text`).
 * Beide Felder sind im Admin (/admin) pflegbar. Absätze werden über
 * Leerzeilen getrennt; einfache Zeilenumbrüche bleiben erhalten.
 */

type Props = {
  /** Zwischenüberschrift über dem Fließtext (optional). */
  title?: string;
  /** Fließtext der Seite (Absätze durch Leerzeile trennen). */
  text?: string;
};

export const LegalCmsBody = ({ title, text }: Props) => {
  const heading = (title ?? "").trim();
  const body = (text ?? "").trim();
  if (!heading && !body) return null;

  const paragraphs = body ? body.split(/\n{2,}/).filter((p) => p.trim().length > 0) : [];

  return (
    <div className="mb-10">
      {heading ? (
        <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-4">{heading}</h2>
      ) : null}
      {paragraphs.map((para, i) => (
        <p
          key={i}
          className="text-sm md:text-base text-muted-foreground leading-relaxed mb-4 whitespace-pre-line"
        >
          {para}
        </p>
      ))}
    </div>
  );
};

export default LegalCmsBody;
