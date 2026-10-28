import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Eye, ExternalLink, FileText } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import type { DocumentGroup, DocumentItem } from "./types";
import { canPreview } from "./documentKind";
import DocumentPreviewSheet from "./DocumentPreviewSheet";

/**
 * Abschnitt „Dokumente und Anleitungen" – nach Kategorie gruppiert.
 *
 * Jede Kategorie (Bedienungsanleitung, Datenblatt, Produktinfo,
 * Schaltpläne …) wird in einem eigenen Akkordeon (Klapp-Element)
 * dargestellt. Mehrere Akkordeons können gleichzeitig offen sein.
 *
 * PDF-Dokumente bekommen zwei klare Aktionen: „Vorschau" (öffnet die
 * seitliche Vorschau rechts) und „Download". Andere Dateitypen behalten
 * „Öffnen" und „Download" — es wird kein leerer PDF-Viewer geöffnet.
 *
 * Diese Komponente ist die einzige Stelle für dieses Verhalten; Seiten-PDP
 * und PDP-Popup verwenden sie gemeinsam.
 *
 * Quelle: ausschließlich `documents[]` aus dem Kanalvertrag (PDP-Payload).
 */

interface Props {
  readonly groups: readonly DocumentGroup[];
}

export default function ProductPdpDocuments({ groups }: Props) {
  const { t } = useTranslation("service");
  const [preview, setPreview] = useState<DocumentItem | null>(null);

  const labels = {
    preview: t("katalog.pdp.documents.preview", { defaultValue: "Vorschau" }),
    download: t("katalog.pdp.documents.download", {
      defaultValue: "Download",
    }),
    open: t("katalog.pdp.documents.open", { defaultValue: "Öffnen" }),
    newTab: t("katalog.pdp.documents.newTab", {
      defaultValue: "In neuem Tab öffnen",
    }),
    close: t("katalog.pdp.documents.close", {
      defaultValue: "Vorschau schließen",
    }),
    unavailable: t("katalog.pdp.documents.unavailable", {
      defaultValue:
        "Für dieses Dokument ist hier keine Vorschau möglich. Bitte in einem neuen Tab öffnen.",
    }),
  };

  if (groups.length === 0) {
    return (
      <section aria-labelledby="pdp-docs-heading" className="space-y-4">
        <p className="text-xs text-muted-foreground">
          {t("katalog.pdp.empty.documents")}
        </p>
      </section>
    );
  }

  return (
    <>
      <Accordion type="multiple" className="w-full">
        {groups.map((g) => (
          <AccordionItem key={g.key} value={g.key}>
            <AccordionTrigger>
              {t(`katalog.pdp.documents.categories.${g.key}`, {
                defaultValue: g.label ?? g.key,
              })}
            </AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-3">
                {g.items.map((doc) => (
                  <li
                    key={doc.key}
                    className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="flex min-w-0 items-start gap-2 text-sm text-foreground">
                      <FileText
                        className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 break-words">{doc.label}</span>
                      {doc.fileType ? (
                        <span className="shrink-0 text-xs uppercase text-muted-foreground">
                          {doc.fileType}
                        </span>
                      ) : null}
                    </span>

                    {doc.url ? (
                      <span className="flex shrink-0 flex-wrap gap-2">
                        {canPreview(doc) ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setPreview(doc)}
                          >
                            <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
                            {labels.preview}
                          </Button>
                        ) : (
                          <Button asChild variant="outline" size="sm">
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink
                                className="mr-2 h-4 w-4"
                                aria-hidden="true"
                              />
                              {labels.open}
                            </a>
                          </Button>
                        )}
                        <Button asChild variant="outline" size="sm">
                          <a
                            href={doc.url}
                            download
                            rel="noopener noreferrer"
                          >
                            <Download
                              className="mr-2 h-4 w-4"
                              aria-hidden="true"
                            />
                            {labels.download}
                          </a>
                        </Button>
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <DocumentPreviewSheet
        doc={preview}
        onClose={() => setPreview(null)}
        labels={{
          newTab: labels.newTab,
          download: labels.download,
          close: labels.close,
          unavailable: labels.unavailable,
        }}
      />
    </>
  );
}
