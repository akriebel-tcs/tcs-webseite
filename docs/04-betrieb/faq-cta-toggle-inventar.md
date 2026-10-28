# FAQ-/CTA-Toggle- und Body-Pfad-Inventar

Stand: 2026-09-05 15:39 · Quelle: `snapshot:/dev-server/scripts/sync/snapshot` · 113 Seiten mit FAQ-/CTA-Section · 117 Seiten insgesamt.

## Bedeutung

- **OK / ok_db_rendered** — Page-Pfad zieht das CMS-Objekt aus der DB: Admin-Toggle wirkt 1:1.
- **OK_DEDUP_ONLY / ok_dedup_only** — Inline-Code rendert weiter, `CmsInlineSectionMarker` verhindert nur Doppelrender. **Admin-Toggle wirkt NICHT auf den sichtbaren Inhalt** — bewusste Restschuld, keine Wahrheit.
- **ORPHAN** — Kein V1-Renderer im Page-Pfad sichtbar.
- **MIXED** — V1-Pfad + Legacy `<CTASection/>` parallel, Risiko Doppel-CTA.
- **UNKNOWN / unknown** — Page-Pfad nicht eindeutig auflösbar (z. B. dynamische Slug-Routen).
- **—** — Block existiert auf der Seite nicht.

## Zusammenfassung

| Block | OK | OK_DEDUP_ONLY | ORPHAN | MIXED | UNKNOWN | nicht vorhanden |
|-------|----|---------------|--------|-------|---------|------------------|
| FAQ   | 100 | 0 | 0 | 0 | 2 | 11 |
| CTA   | 110 | 0 | 0 | 0 | 2 | 1 |

Body-Pfad (DB-first, Code-Evidenz Pflicht): **114 ok**, **3 unknown** über alle 117 Seiten.

### Body-Evidenz (Aufschlüsselung)

| Evidenz | Seiten |
|---------|-------:|
| Generischer `CmsBodyRenderer` / `useCmsBody` | 43 |
| Page nutzt generischen `RENDERERS`/`CMS_RENDERERS`-Dispatch | 26 |
| Page iteriert `cms.sections` + `data-cms-section` | 23 |
| Dynamisches Slug-Template `ReferenzprojektDetailPage` (`anwendungen.referenzprojekte.<slug>`) | 12 |
| Page iteriert `cms.sections` (ohne `data-cms-section`-Marker) | 10 |
| Keine Page-Datei mit dieser pageKey gefunden | 1 |
| Bewusster Sonderfall (duplicate-copy:Arbeitskopie der personas.architekt-Seite, kein eigenes Page-File) | 1 |
| Bewusster Sonderfall (legacy-redirect:/service/online-produktkatalog → /produkte/tuerkommunikation) | 1 |
