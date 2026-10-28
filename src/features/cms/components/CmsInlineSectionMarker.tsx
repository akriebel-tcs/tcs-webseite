/**
 * CmsInlineSectionMarker — Batch 5.
 *
 * Markiert eine `section_key` als „bereits inline gerendert" für den
 * aktuellen Render-Pass (CmsRenderRegistry). Damit überspringt der zentrale
 * Tail-Renderer (CmsTailCta / CmsTailFaq) diese Section, auch wenn die
 * Page sie nicht über die V1-Komponenten ausgespielt hat (z. B. eine
 * hartcodierte Kontakt-CTA in einer Speziallayout-Seite).
 *
 * Bewusste Restschuld: die DB-Section bleibt im Admin sichtbar/schaltbar,
 * der inline gerenderte Inhalt überschreibt aber den DB-Inhalt. Diese
 * Marker stehen ausschließlich auf Seiten, die wir in Batch 5 als
 * dokumentierte Speziallayouts behalten. Sobald deren Inhalt in die
 * DB wandert, kann der Marker entfernt und das inline-Markup gelöscht
 * werden — der Admin-Toggle wirkt dann automatisch.
 *
 * Rendert nichts. Side-effect-frei außerhalb des Registry-Contexts
 * (No-Op, wenn kein Provider montiert ist).
 */
import { useMarkRendered } from "./CmsRenderRegistry";

interface Props {
  /** `section_key` der Section, die inline gerendert wurde. */
  sectionKey: string;
}

export default function CmsInlineSectionMarker({ sectionKey }: Props) {
  useMarkRendered(sectionKey);
  return null;
}
