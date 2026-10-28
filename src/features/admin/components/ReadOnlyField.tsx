/**
 * Read-only Anzeige eines CMS-Feldes (DE/EN).
 * Bewusst keine echten Formularelemente. Nur visuelle Boxen.
 */
type Props = {
  label: string;
  de: string | null;
  en: string | null;
};

const ValueBox = ({ value }: { value: string | null }) => (
  <div
    role="presentation"
    aria-readonly="true"
    className="min-h-[2.25rem] whitespace-pre-wrap break-words rounded border border-input bg-muted/30 px-3 py-2 text-sm text-foreground"
  >
    {value !== null && value !== "" ? (
      value
    ) : (
      <span className="text-xs text-muted-foreground">— kein Wert —</span>
    )}
  </div>
);

const ReadOnlyField = ({ label, de, en }: Props) => {
  return (
    <div className="grid gap-3 border-t px-3 py-3 sm:grid-cols-[10rem_1fr_1fr] sm:items-start">
      <div className="text-xs">
        <div className="font-mono text-foreground">{label}</div>
        <div className="mt-1 text-muted-foreground">Nur Leseansicht</div>
      </div>
      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">DE</div>
        <ValueBox value={de} />
      </div>
      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">EN</div>
        <ValueBox value={en} />
      </div>
    </div>
  );
};

export default ReadOnlyField;
