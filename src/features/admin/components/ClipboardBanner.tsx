/**
 * ClipboardBanner — Klemmbrett-Panel, fest am rechten Bildschirmrand.
 *
 * Etappe `cms-light-admin-clipboard-2`:
 *   - Schwebt rechts über dem Editor, sobald ein Block kopiert wurde.
 *   - Cross-Page erlaubt: auf jeder CMS-Seite erscheinen „Hier einfügen"-
 *     Stellen, sobald die Zwischenablage gefüllt ist.
 *   - Zeigt Quelle (Seite + Block) und ob die aktuelle Seite die Quelle ist.
 */
import ShortIdBadge from "@/features/admin/components/ShortIdBadge";

export interface ClipboardItem {
  pageKey: string;
  sectionKey: string;
  sectionUid: number | null;
  sectionType: string;
  /** Anzeige-Label, z. B. „block_entry" oder „persona_handwerk". */
  label: string;
}

interface Props {
  clipboard: ClipboardItem | null;
  /** Aktive Seite im Editor — für die Hinweis-Logik. */
  currentPageKey: string | null;
  onClear: () => void;
}

const ClipboardBanner = ({ clipboard, currentPageKey, onClear }: Props) => {
  if (!clipboard) return null;
  const sameSeite = currentPageKey === clipboard.pageKey;
  return (
    <aside
      className="fixed right-4 top-24 z-40 w-72 rounded-lg border border-primary/40 bg-primary/10 p-3 text-xs shadow-lg backdrop-blur"
      role="status"
      aria-label="Zwischenablage (Klemmbrett) für Inhaltsblöcke"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="select-none text-base" aria-hidden="true">
          📋
        </span>
        <span className="font-semibold">Zwischenablage</span>
        <button
          type="button"
          onClick={onClear}
          className="ml-auto rounded border border-border bg-background px-2 py-0.5 text-[11px] hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          title="Zwischenablage leeren"
        >
          Leeren
        </button>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <ShortIdBadge kind="B" value={clipboard.sectionUid} hint={`Block ${clipboard.label}`} />
          <span className="rounded bg-muted px-1 text-[10px] text-muted-foreground">
            {clipboard.sectionType}
          </span>
        </div>
        <div className="font-mono text-[11px] break-all">{clipboard.label}</div>
        <div className="text-[10px] text-muted-foreground">
          Quelle: <span className="font-mono">{clipboard.pageKey}</span>
        </div>
        <div className="rounded bg-background/60 p-2 text-[11px] leading-snug text-foreground/80">
          {sameSeite ? (
            <>
              Auf dieser Seite erscheinen jetzt blaue
              <span className="mx-1 font-medium">„Hier einfügen"</span>-Stellen
              zwischen den Blöcken.
            </>
          ) : (
            <>
              Wechsle im Baum links zur Zielseite — dort erscheinen
              <span className="mx-1 font-medium">„Hier einfügen"</span>-Stellen.
              Der Block wird mit allen Texten und Bildern kopiert.
            </>
          )}
        </div>
      </div>
    </aside>
  );
};

export default ClipboardBanner;
