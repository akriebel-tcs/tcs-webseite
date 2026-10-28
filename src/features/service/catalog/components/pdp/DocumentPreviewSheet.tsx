/**
 * DocumentPreviewSheet — einheitliche seitliche Dokumentvorschau für
 * Produktdokumente (PDP-Seite und PDP-Popup).
 *
 * Muster übernommen vom Download-Center (`DownloadCenter.tsx`):
 * rechts einfahrendes Sheet, auf Mobil bildschirmfüllend, PDF wird als
 * `iframe` OHNE `sandbox` eingebettet (der eingebaute PDF-Viewer der Browser
 * wird von einem Sandbox-Attribut blockiert). Es wird niemals HTML-Inhalt
 * per `dangerouslySetInnerHTML` eingebettet.
 */
import { Download, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { DocumentItem } from "./types";

interface Props {
  readonly doc: DocumentItem | null;
  readonly onClose: () => void;
  readonly labels: {
    readonly newTab: string;
    readonly download: string;
    readonly close: string;
    readonly unavailable: string;
  };
}

export default function DocumentPreviewSheet({ doc, onClose, labels }: Props) {
  const url = doc?.url ?? null;

  return (
    <Sheet open={Boolean(doc)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-4 p-0 sm:max-w-xl lg:max-w-2xl"
      >
        {doc && (
          <>
            <SheetHeader className="space-y-2 border-b border-border p-6 pb-4 text-left">
              <SheetTitle className="break-words text-base">
                {doc.label}
              </SheetTitle>
              {url ? (
                <SheetDescription className="break-all text-xs">
                  {url}
                </SheetDescription>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-1">
                {url ? (
                  <>
                    <Button asChild variant="outline" size="sm">
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        {labels.newTab}
                      </a>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <a href={url} download rel="noopener noreferrer">
                        <Download className="mr-2 h-4 w-4" />
                        {labels.download}
                      </a>
                    </Button>
                  </>
                ) : null}
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="mr-2 h-4 w-4" />
                  {labels.close}
                </Button>
              </div>
            </SheetHeader>
            <div className="min-h-0 flex-1 px-6 pb-6">
              {url ? (
                <iframe
                  key={url}
                  src={url}
                  title={doc.label}
                  referrerPolicy="no-referrer"
                  className="h-full min-h-[60vh] w-full rounded-md border border-border bg-muted"
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {labels.unavailable}
                </p>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
