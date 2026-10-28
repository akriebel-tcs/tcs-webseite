# Eine Wahrheit — offene Befunde Masterliste (D3a.2 + D3a.3 + D3a.4)

Stand: 2026-06-04T14:48:50.410Z

Fuehrt die drei offenen Spiegel-Befundklassen in EINE Liste zusammen, ordnet
jedem Eintrag einen Cluster zu und schlaegt eine Umsetzungs-Reihenfolge vor.

> D3a liefert nur Analyse + Plan. Noch keine Code-Fixes.

## Ampel-Gesamtbild

| Ampel | Bedeutung | Anzahl |
|---|---|---|
| 🔴 rot | High-Blocker (Spiegel gebrochen, Public falsch) | **0** |
| 🟡 gelb | Medium-Kandidat (Spiegel unwirksam, kein Sichtbarkeitsbruch heute) | **106** |
| 🟡 gelb | Restschuld (Inhalt im Code, nicht im Admin) | **34** |

### Verteilung nach Richtung

| Richtung | Beschreibung | Anzahl |
|---|---|---|
| A | DB an, Public rendert nicht | 73 |
| B | Public rendert, Admin-Schalter ohne Wirkung | 33 |
| C | Public-Block ohne CMS-Gegenstueck | 34 |

## Cluster-Uebersicht

| Cluster | Befunde | Seiten | high | medium | restschuld |
|---|---|---|---|---|---|
| F — Sonstige (Einzelfall) | 73 | 23 | 0 | 70 | 3 |
| A — Anwendungen-Detailseiten | 29 | 9 | 0 | 0 | 29 |
| D — Spezialseite mit vielen ignorierten Sections | 23 | 1 | 0 | 23 | 0 |
| E — Registrierte Sonderseiten | 15 | 8 | 0 | 13 | 2 |

## Empfohlene Batch-Reihenfolge

### Batch 1 — Cluster C — Hero zentral in CmsPageLayout gaten

- Seitenanzahl: **8**
- Befundanzahl: **8**
- Erwarteter Effekt: Eliminiert ~30 Medium-Befunde in einem zentralen Patch.
- Risiko: mittel — CmsPageLayout wird zentral angefasst, viele Pages betroffen.
- Browser-Abnahme: ja (Stichprobe ueber alle Cluster-Pages)

### Batch 2 — Cluster A — Anwendungen-Detailseiten per Codemod

- Seitenanzahl: **9**
- Befundanzahl: **29**
- Erwarteter Effekt: Wiederholbares Visibility-Guard-Pattern auf gleich gebaute Detailseiten.
- Risiko: niedrig — gleichfoermige Pages, einheitlicher Slot-Satz.
- Browser-Abnahme: ja (Stichprobe 3 Pages)

### Batch 3 — Cluster B — Eingangssysteme-Sub-Pages per Codemod

- Seitenanzahl: **0**
- Befundanzahl: **0**
- Erwarteter Effekt: Gleicher Slot-Satz (hero/nav/items/topics/cta), Pattern wie Batch 2.
- Risiko: niedrig.
- Browser-Abnahme: ja (Stichprobe 3 Pages)

### Batch 4 — Cluster A-Renderpfad — generischer Rest-Renderer auf Detailseiten

- Seitenanzahl: **0**
- Befundanzahl: **0**
- Erwarteter Effekt: Aktive DB-Sections (FAQ, CTA) werden auf gleichartigen Pages sichtbar.
- Risiko: niedrig-mittel — neue Bloecke erscheinen Public.
- Browser-Abnahme: ja (jede Page pruefen)

### Batch 5 — Cluster D — SnipdooIpPage und aehnliche Sonderseiten

- Seitenanzahl: **1**
- Befundanzahl: **23**
- Erwarteter Effekt: Speziallayout entweder vollstaendig CMS-gefuehrt oder als bewusste Sonderseite registrieren.
- Risiko: hoch — Layout-Eingriff.
- Browser-Abnahme: ja (volle Page-Abnahme).

### Batch 6 — Cluster E — Sonderseiten-Register pflegen

- Seitenanzahl: **8**
- Befundanzahl: **15**
- Erwarteter Effekt: Klare Trennung CMS-getrieben vs. bewusst hartcodiert.
- Risiko: niedrig (nur Registereintraege).
- Browser-Abnahme: nein.

### Batch 7 — Klasse C (Restschuld) — Inhalt-zuerst-Migration

- Seitenanzahl: **13**
- Befundanzahl: **34**
- Erwarteter Effekt: Pflegbarkeit im Admin; kein Sichtbarkeitsbruch.
- Risiko: niedrig.
- Browser-Abnahme: nein (Inhalt unveraendert).

## Masterliste (alle Befunde)

| Sev | Richt. | Cluster | page_key | Route | section_key | Typ | Page-Datei | Empfehlung | Aufwand |
|---|---|---|---|---|---|---|---|---|---|
| 🟡 | A | D | gebaeudekommunikation.snipdoo-ip | /gebaeudekommunikation/snipdoo-ip | content | content_v1 | `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | L (Sonderseite) |
| 🟡 | A | D | gebaeudekommunikation.snipdoo-ip | /gebaeudekommunikation/snipdoo-ip | seo | content_v1 | `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | L (Sonderseite) |
| 🟡 | A | D | gebaeudekommunikation.snipdoo-ip | /gebaeudekommunikation/snipdoo-ip | systemversprechen | content_v1 | `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | L (Sonderseite) |
| 🟡 | A | D | gebaeudekommunikation.snipdoo-ip | /gebaeudekommunikation/snipdoo-ip | audiences | cards_v1 | `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | L (Sonderseite) |
| 🟡 | A | D | gebaeudekommunikation.snipdoo-ip | /gebaeudekommunikation/snipdoo-ip | subnav | content_v1 | `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | L (Sonderseite) |
| 🟡 | A | D | gebaeudekommunikation.snipdoo-ip | /gebaeudekommunikation/snipdoo-ip | nutzungAlltag | content_v1 | `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | L (Sonderseite) |
| 🟡 | A | D | gebaeudekommunikation.snipdoo-ip | /gebaeudekommunikation/snipdoo-ip | systemaufbau | content_v1 | `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | L (Sonderseite) |
| 🟡 | A | D | gebaeudekommunikation.snipdoo-ip | /gebaeudekommunikation/snipdoo-ip | inbetriebnahme | content_v1 | `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | L (Sonderseite) |
| 🟡 | A | D | gebaeudekommunikation.snipdoo-ip | /gebaeudekommunikation/snipdoo-ip | anwendungen | cards_v1 | `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | L (Sonderseite) |
| 🟡 | A | D | gebaeudekommunikation.snipdoo-ip | /gebaeudekommunikation/snipdoo-ip | rollen | content_v1 | `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | L (Sonderseite) |
| 🟡 | A | D | gebaeudekommunikation.snipdoo-ip | /gebaeudekommunikation/snipdoo-ip | kontakt | content_v1 | `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | L (Sonderseite) |
| 🟡 | A | D | gebaeudekommunikation.snipdoo-ip | /gebaeudekommunikation/snipdoo-ip | faq | faq_v1 | `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | L (Sonderseite) |
| 🟡 | B | D | gebaeudekommunikation.snipdoo-ip | /gebaeudekommunikation/snipdoo-ip | hero | hero_v1 | `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx` | Cluster C: zentral in `CmsPageLayout` loesen — nicht pro Page. | L (Sonderseite) |
| 🟡 | B | D | gebaeudekommunikation.snipdoo-ip | /gebaeudekommunikation/snipdoo-ip | seo | content_v1 | `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx` | Visibility-Guard einbauen oder Section in DB auf is_active=false setzen. | L (Sonderseite) |
| 🟡 | B | D | gebaeudekommunikation.snipdoo-ip | /gebaeudekommunikation/snipdoo-ip | systemversprechen | content_v1 | `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx` | Visibility-Guard einbauen oder Section in DB auf is_active=false setzen. | L (Sonderseite) |
| 🟡 | B | D | gebaeudekommunikation.snipdoo-ip | /gebaeudekommunikation/snipdoo-ip | audiences | cards_v1 | `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx` | Visibility-Guard einbauen oder Section in DB auf is_active=false setzen. | L (Sonderseite) |
| 🟡 | B | D | gebaeudekommunikation.snipdoo-ip | /gebaeudekommunikation/snipdoo-ip | subnav | content_v1 | `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx` | Visibility-Guard einbauen oder Section in DB auf is_active=false setzen. | L (Sonderseite) |
| 🟡 | B | D | gebaeudekommunikation.snipdoo-ip | /gebaeudekommunikation/snipdoo-ip | nutzungAlltag | content_v1 | `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx` | Visibility-Guard einbauen oder Section in DB auf is_active=false setzen. | L (Sonderseite) |
| 🟡 | B | D | gebaeudekommunikation.snipdoo-ip | /gebaeudekommunikation/snipdoo-ip | systemaufbau | content_v1 | `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx` | Visibility-Guard einbauen oder Section in DB auf is_active=false setzen. | L (Sonderseite) |
| 🟡 | B | D | gebaeudekommunikation.snipdoo-ip | /gebaeudekommunikation/snipdoo-ip | inbetriebnahme | content_v1 | `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx` | Visibility-Guard einbauen oder Section in DB auf is_active=false setzen. | L (Sonderseite) |
| 🟡 | B | D | gebaeudekommunikation.snipdoo-ip | /gebaeudekommunikation/snipdoo-ip | anwendungen | cards_v1 | `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx` | Visibility-Guard einbauen oder Section in DB auf is_active=false setzen. | L (Sonderseite) |
| 🟡 | B | D | gebaeudekommunikation.snipdoo-ip | /gebaeudekommunikation/snipdoo-ip | rollen | content_v1 | `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx` | Visibility-Guard einbauen oder Section in DB auf is_active=false setzen. | L (Sonderseite) |
| 🟡 | B | D | gebaeudekommunikation.snipdoo-ip | /gebaeudekommunikation/snipdoo-ip | kontakt | content_v1 | `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx` | Visibility-Guard einbauen oder Section in DB auf is_active=false setzen. | L (Sonderseite) |
| 🟡 | A | E | kontakt.root | /kontakt | sections | content_v1 | `src/features/kontakt/pages/KontaktPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | E | kontakt.root | /kontakt | cards | content_v1 | `src/features/kontakt/pages/KontaktPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | E | kontakt.root | /kontakt | form | content_v1 | `src/features/kontakt/pages/KontaktPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | E | legal.agb | /agb | content | content_v1 | `src/features/legal/pages/AgbPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | E | legal.datenschutz | /datenschutz | content | content_v1 | `src/features/legal/pages/DatenschutzPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | E | legal.impressum | /impressum | content | content_v1 | `src/features/legal/pages/ImpressumPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | E | serviceportal.login | /serviceportal | content | content_v1 | `src/features/serviceportal/pages/ServiceportalPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | E | serviceportal.passwort-vergessen | /serviceportal/passwort-vergessen | content | content_v1 | `src/features/serviceportal/pages/PasswortVergessenPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | E | serviceportal.registrieren | /serviceportal/registrieren | content | content_v1 | `src/features/serviceportal/pages/RegistrierenPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | E | wissen.akademie | /akademie | formate | cards_v1 | `src/features/wissen/pages/AkademiePage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | E | wissen.akademie | /akademie | zielgruppen | cards_v1 | `src/features/wissen/pages/AkademiePage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | E | wissen.akademie | /akademie | partner | cards_v1 | `src/features/wissen/pages/AkademiePage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | E | wissen.akademie | /akademie | faq | faq_v1 | `src/features/wissen/pages/AkademiePage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | F | gebaeudekommunikation.beschilderung | /gebaeudekommunikation/beschilderung | features | content_v1 | `src/features/signage/pages/BeschilderungPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | F | gebaeudekommunikation.beschilderung | /gebaeudekommunikation/beschilderung | faq | faq_v1 | `src/features/signage/pages/BeschilderungPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | B | F | gebaeudekommunikation.beschilderung | /gebaeudekommunikation/beschilderung | features | content_v1 | `src/features/signage/pages/BeschilderungPage.tsx` | Visibility-Guard einbauen oder Section in DB auf is_active=false setzen. | S (Codemod-faehig) |
| 🟡 | B | F | gebaeudekommunikation.root | /gebaeudekommunikation | anwendungsumfelder | cards_v1 | `src/features/gebaeudekommunikation/pages/TuerkommunikationPage.tsx` | Visibility-Guard einbauen oder Section in DB auf is_active=false setzen. | S (Codemod-faehig) |
| 🟡 | B | F | gebaeudekommunikation.systemloesungen | /gebaeudekommunikation/systemloesungen | vorteile | cards_v1 | `src/features/gebaeudekommunikation/pages/SystemloesungenPage.tsx` | Visibility-Guard einbauen oder Section in DB auf is_active=false setzen. | S (Codemod-faehig) |
| 🟡 | B | F | gebaeudekommunikation.systemloesungen | /gebaeudekommunikation/systemloesungen | fachplanung | cards_v1 | `src/features/gebaeudekommunikation/pages/SystemloesungenPage.tsx` | Visibility-Guard einbauen oder Section in DB auf is_active=false setzen. | S (Codemod-faehig) |
| 🟡 | B | F | gebaeudekommunikation.tuersprechanlagen | /gebaeudekommunikation/tuersprechanlagen | anwendungsumfelder | cards_v1 | `src/features/gebaeudekommunikation/pages/TuersprechanlagenPage.tsx` | Visibility-Guard einbauen oder Section in DB auf is_active=false setzen. | S (Codemod-faehig) |
| 🟡 | B | F | gebaeudekommunikation.tuersprechanlagen | /gebaeudekommunikation/tuersprechanlagen | vorteile | feature_grid_v1 | `src/features/gebaeudekommunikation/pages/TuersprechanlagenPage.tsx` | Visibility-Guard einbauen oder Section in DB auf is_active=false setzen. | S (Codemod-faehig) |
| 🟡 | A | F | gebaeudemanagement.alarmanlagenkopplung | /gebaeudemanagement/alarmanlagenkopplung | placeholder | content_v1 | `src/features/gebaeudemanagement/pages/AlarmanlagenkopplungPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | F | gebaeudemanagement.alarmanlagenkopplung | /gebaeudemanagement/alarmanlagenkopplung | faq | faq_v1 | `src/features/gebaeudemanagement/pages/AlarmanlagenkopplungPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | B | F | gebaeudemanagement.alarmanlagenkopplung | /gebaeudemanagement/alarmanlagenkopplung | placeholder | content_v1 | `src/features/gebaeudemanagement/pages/AlarmanlagenkopplungPage.tsx` | Visibility-Guard einbauen oder Section in DB auf is_active=false setzen. | S (Codemod-faehig) |
| 🟡 | A | F | gebaeudemanagement.root | /gebaeudemanagement | bcm | content_v1 | `src/features/gebaeudemanagement/pages/GebaeudemanagementPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | B | F | gebaeudemanagement.root | /gebaeudemanagement | bcm | content_v1 | `src/features/gebaeudemanagement/pages/GebaeudemanagementPage.tsx` | Visibility-Guard einbauen oder Section in DB auf is_active=false setzen. | S (Codemod-faehig) |
| 🟡 | A | F | home.start | / | stats | stats_v1 | `src/features/home/pages/HomePage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | F | home.start | / | content_blocks_intro | content_v1 | `src/features/home/pages/HomePage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | F | home.start | / | personas | cards_v1 | `src/features/home/pages/HomePage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | F | karriere.root | /karriere | benefits | cards_v1 | `src/features/karriere/pages/KarrierePage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | F | karriere.root | /karriere | jobs | cards_v1 | `src/features/karriere/pages/KarrierePage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | F | karriere.root | /karriere | initiative | content_v1 | `src/features/karriere/pages/KarrierePage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | F | kontakt-bcm.root | /kontakt/bcm | sections | content_v1 | `src/features/kontakt/pages/KontaktBcmPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | F | kontakt-bcm.root | /kontakt/bcm | cards | content_v1 | `src/features/kontakt/pages/KontaktBcmPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | F | kontakt-bcm.root | /kontakt/bcm | form | content_v1 | `src/features/kontakt/pages/KontaktBcmPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | F | presse.root | /presse | pressContact | content_v1 | `src/features/presse/pages/PressePage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | B | F | presse.root | /presse | releases | cards_v1 | `src/features/presse/pages/PressePage.tsx` | Visibility-Guard einbauen oder Section in DB auf is_active=false setzen. | S (Codemod-faehig) |
| 🟡 | A | F | service.downloads | /downloads | quickLinks | cards_v1 | `src/features/service/pages/DownloadsPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | F | service.downloads | /downloads | dokumente | content_v1 | `src/features/service/pages/DownloadsPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | F | service.downloads | /downloads | rma | cards_v1 | `src/features/service/pages/DownloadsPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | F | service.downloads | /downloads | bestellung | cards_v1 | `src/features/service/pages/DownloadsPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | F | service.downloads | /downloads | akademie | cards_v1 | `src/features/service/pages/DownloadsPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | F | service.downloads | /downloads | glossar | content_v1 | `src/features/service/pages/DownloadsPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | F | service.downloads | /downloads | ansprechpartner | content_v1 | `src/features/service/pages/DownloadsPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | B | F | service.downloads | /downloads | quickLinks | cards_v1 | `src/features/service/pages/DownloadsPage.tsx` | Visibility-Guard einbauen oder Section in DB auf is_active=false setzen. | S (Codemod-faehig) |
| 🟡 | A | F | service.ersatzteile | /ersatzteile | ersatzteile | cards_v1 | `src/features/service/pages/ErsatzteilePage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | F | service.ersatzteile | /ersatzteile | beschriftung | content_v1 | `src/features/service/pages/ErsatzteilePage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | F | service.ersatzteile | /ersatzteile | freischaltcodes | content_v1 | `src/features/service/pages/ErsatzteilePage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | F | service.ersatzteile | /ersatzteile | vorteile | cards_v1 | `src/features/service/pages/ErsatzteilePage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | F | service.ersatzteile | /ersatzteile | faq | faq_v1 | `src/features/service/pages/ErsatzteilePage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | F | service.hub | /service | sections | content_v1 | `src/features/service/pages/ServicePage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | B | F | service.hub | /service | sections | content_v1 | `src/features/service/pages/ServicePage.tsx` | Visibility-Guard einbauen oder Section in DB auf is_active=false setzen. | S (Codemod-faehig) |
| 🟡 | A | F | service.planen-konfigurieren | /planen-konfigurieren | anlagenplaner | content_v1 | `src/features/service/pages/PlanenKonfigurierenPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | F | service.planen-konfigurieren | /planen-konfigurieren | hoai | content_v1 | `src/features/service/pages/PlanenKonfigurierenPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | F | service.planen-konfigurieren | /planen-konfigurieren | planungsdaten | cards_v1 | `src/features/service/pages/PlanenKonfigurierenPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | F | service.planen-konfigurieren | /planen-konfigurieren | konfiguratoren | cards_v1 | `src/features/service/pages/PlanenKonfigurierenPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | F | service.planen-konfigurieren | /planen-konfigurieren | shops | cards_v1 | `src/features/service/pages/PlanenKonfigurierenPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | F | service.planen-konfigurieren | /planen-konfigurieren | bestellwege | cards_v1 | `src/features/service/pages/PlanenKonfigurierenPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | F | service.planen-konfigurieren | /planen-konfigurieren | ausschreibung | cards_v1 | `src/features/service/pages/PlanenKonfigurierenPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | F | service.planen-konfigurieren | /planen-konfigurieren | faq | faq_v1 | `src/features/service/pages/PlanenKonfigurierenPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | B | F | service.planen-konfigurieren | /planen-konfigurieren | hero | hero_v1 | `src/features/service/pages/PlanenKonfigurierenPage.tsx` | Cluster C: zentral in `CmsPageLayout` loesen — nicht pro Page. | S (Codemod-faehig) |
| 🟡 | A | F | service.technischer-support | /technischer-support | channels | cards_v1 | `src/features/service/pages/TechnischerSupportPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | F | service.technischer-support | /technischer-support | rma | cards_v1 | `src/features/service/pages/TechnischerSupportPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | F | service.technischer-support | /technischer-support | ersatzteile | cards_v1 | `src/features/service/pages/TechnischerSupportPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | F | service.technischer-support | /technischer-support | ansprechpartner | content_v1 | `src/features/service/pages/TechnischerSupportPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | F | zutrittskontrolle.bcm-handsender | /zutrittskontrolle/bcm-handsender | faq | faq_v1 | `src/features/zutrittskontrolle/pages/BcmHandsenderPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | B | F | zutrittskontrolle.bcm-handsender | /zutrittskontrolle/bcm-handsender | hero | hero_v1 | `src/features/zutrittskontrolle/pages/BcmHandsenderPage.tsx` | Cluster C: zentral in `CmsPageLayout` loesen — nicht pro Page. | S (Codemod-faehig) |
| 🟡 | A | F | zutrittskontrolle.bcm-online-leser | /zutrittskontrolle/bcm-online-leser | faq | faq_v1 | `src/features/zutrittskontrolle/pages/BcmOnlineLeserPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | B | F | zutrittskontrolle.bcm-online-leser | /zutrittskontrolle/bcm-online-leser | hero | hero_v1 | `src/features/zutrittskontrolle/pages/BcmOnlineLeserPage.tsx` | Cluster C: zentral in `CmsPageLayout` loesen — nicht pro Page. | S (Codemod-faehig) |
| 🟡 | A | F | zutrittskontrolle.elektronische-drueckergarnitur | /zutrittskontrolle/elektronische-drueckergarnitur | faq | faq_v1 | `src/features/zutrittskontrolle/pages/ElektronischeDrueckergarniturPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | B | F | zutrittskontrolle.elektronische-drueckergarnitur | /zutrittskontrolle/elektronische-drueckergarnitur | hero | hero_v1 | `src/features/zutrittskontrolle/pages/ElektronischeDrueckergarniturPage.tsx` | Cluster C: zentral in `CmsPageLayout` loesen — nicht pro Page. | S (Codemod-faehig) |
| 🟡 | B | F | zutrittskontrolle.elektronische-drueckergarnitur | /zutrittskontrolle/elektronische-drueckergarnitur | benefits | cards_v1 | `src/features/zutrittskontrolle/pages/ElektronischeDrueckergarniturPage.tsx` | Visibility-Guard einbauen oder Section in DB auf is_active=false setzen. | S (Codemod-faehig) |
| 🟡 | B | F | zutrittskontrolle.elektronische-drueckergarnitur | /zutrittskontrolle/elektronische-drueckergarnitur | useCases | cards_v1 | `src/features/zutrittskontrolle/pages/ElektronischeDrueckergarniturPage.tsx` | Visibility-Guard einbauen oder Section in DB auf is_active=false setzen. | S (Codemod-faehig) |
| 🟡 | A | F | zutrittskontrolle.elektronischer-knaufzylinder | /zutrittskontrolle/elektronischer-knaufzylinder | faq | faq_v1 | `src/features/zutrittskontrolle/pages/ElektronischerKnaufzylinderPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | B | F | zutrittskontrolle.elektronischer-knaufzylinder | /zutrittskontrolle/elektronischer-knaufzylinder | hero | hero_v1 | `src/features/zutrittskontrolle/pages/ElektronischerKnaufzylinderPage.tsx` | Cluster C: zentral in `CmsPageLayout` loesen — nicht pro Page. | S (Codemod-faehig) |
| 🟡 | A | F | zutrittskontrolle.fahrstuhlsteuerung | /zutrittskontrolle/fahrstuhlsteuerung | overview | content_v1 | `src/features/zutrittskontrolle/pages/FahrstuhlsteuerungPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | A | F | zutrittskontrolle.fahrstuhlsteuerung | /zutrittskontrolle/fahrstuhlsteuerung | faq | faq_v1 | `src/features/zutrittskontrolle/pages/FahrstuhlsteuerungPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | B | F | zutrittskontrolle.fahrstuhlsteuerung | /zutrittskontrolle/fahrstuhlsteuerung | overview | content_v1 | `src/features/zutrittskontrolle/pages/FahrstuhlsteuerungPage.tsx` | Visibility-Guard einbauen oder Section in DB auf is_active=false setzen. | S (Codemod-faehig) |
| 🟡 | B | F | zutrittskontrolle.fahrstuhlsteuerung | /zutrittskontrolle/fahrstuhlsteuerung | benefits | cards_v1 | `src/features/zutrittskontrolle/pages/FahrstuhlsteuerungPage.tsx` | Visibility-Guard einbauen oder Section in DB auf is_active=false setzen. | S (Codemod-faehig) |
| 🟡 | A | F | zutrittskontrolle.funkvernetzte-offline-leser | /zutrittskontrolle/funkvernetzte-offline-leser | faq | faq_v1 | `src/features/zutrittskontrolle/pages/FunkvernetzteOfflineLeserPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | B | F | zutrittskontrolle.funkvernetzte-offline-leser | /zutrittskontrolle/funkvernetzte-offline-leser | hero | hero_v1 | `src/features/zutrittskontrolle/pages/FunkvernetzteOfflineLeserPage.tsx` | Cluster C: zentral in `CmsPageLayout` loesen — nicht pro Page. | S (Codemod-faehig) |
| 🟡 | A | F | zutrittskontrolle.vorhaengeschloss | /zutrittskontrolle/vorhaengeschloss | faq | faq_v1 | `src/features/zutrittskontrolle/pages/VorhaengeschlossPage.tsx` | Renderpfad ergaenzen ODER Section im Admin bewusst deaktivieren. | S (Codemod-faehig) |
| 🟡 | B | F | zutrittskontrolle.vorhaengeschloss | /zutrittskontrolle/vorhaengeschloss | hero | hero_v1 | `src/features/zutrittskontrolle/pages/VorhaengeschlossPage.tsx` | Cluster C: zentral in `CmsPageLayout` loesen — nicht pro Page. | S (Codemod-faehig) |
| 🟡R | C | A | anwendungen.funktionen.bidirektionaleVideo | — | anforderungen | (kein CMS-Pendant) | `src/features/anwendungen/pages/BidirektionaleVideoPage.tsx` | Entscheiden: DB-Section nachziehen (Inhalt-zuerst-Regel) ODER bewusst hartcodiert markieren. | M (Inhaltsmigration) |
| 🟡R | C | A | anwendungen.funktionen.bidirektionaleVideo | — | leistungen | (kein CMS-Pendant) | `src/features/anwendungen/pages/BidirektionaleVideoPage.tsx` | Entscheiden: DB-Section nachziehen (Inhalt-zuerst-Regel) ODER bewusst hartcodiert markieren. | M (Inhaltsmigration) |
| 🟡R | C | A | anwendungen.funktionen.bidirektionaleVideo | — | systembausteine | (kein CMS-Pendant) | `src/features/anwendungen/pages/BidirektionaleVideoPage.tsx` | Entscheiden: DB-Section nachziehen (Inhalt-zuerst-Regel) ODER bewusst hartcodiert markieren. | M (Inhaltsmigration) |
| 🟡R | C | A | anwendungen.funktionen.bidirektionaleVideo | — | broschure | (kein CMS-Pendant) | `src/features/anwendungen/pages/BidirektionaleVideoPage.tsx` | Entscheiden: DB-Section nachziehen (Inhalt-zuerst-Regel) ODER bewusst hartcodiert markieren. | M (Inhaltsmigration) |
| 🟡R | C | A | anwendungen.funktionen.concierge | — | anforderungen | (kein CMS-Pendant) | `src/features/anwendungen/pages/ConciergePage.tsx` | Entscheiden: DB-Section nachziehen (Inhalt-zuerst-Regel) ODER bewusst hartcodiert markieren. | M (Inhaltsmigration) |
| 🟡R | C | A | anwendungen.funktionen.concierge | — | leistungen | (kein CMS-Pendant) | `src/features/anwendungen/pages/ConciergePage.tsx` | Entscheiden: DB-Section nachziehen (Inhalt-zuerst-Regel) ODER bewusst hartcodiert markieren. | M (Inhaltsmigration) |
| 🟡R | C | A | anwendungen.funktionen.concierge | — | systembausteine | (kein CMS-Pendant) | `src/features/anwendungen/pages/ConciergePage.tsx` | Entscheiden: DB-Section nachziehen (Inhalt-zuerst-Regel) ODER bewusst hartcodiert markieren. | M (Inhaltsmigration) |
| 🟡R | C | A | anwendungen.funktionen.concierge | — | broschure | (kein CMS-Pendant) | `src/features/anwendungen/pages/ConciergePage.tsx` | Entscheiden: DB-Section nachziehen (Inhalt-zuerst-Regel) ODER bewusst hartcodiert markieren. | M (Inhaltsmigration) |
| 🟡R | C | A | anwendungen.funktionen.digitaleNamensverwaltung | — | anforderungen | (kein CMS-Pendant) | `src/features/anwendungen/pages/DigitaleNamensverwaltungPage.tsx` | Entscheiden: DB-Section nachziehen (Inhalt-zuerst-Regel) ODER bewusst hartcodiert markieren. | M (Inhaltsmigration) |
| 🟡R | C | A | anwendungen.funktionen.digitaleNamensverwaltung | — | leistungen | (kein CMS-Pendant) | `src/features/anwendungen/pages/DigitaleNamensverwaltungPage.tsx` | Entscheiden: DB-Section nachziehen (Inhalt-zuerst-Regel) ODER bewusst hartcodiert markieren. | M (Inhaltsmigration) |
| 🟡R | C | A | anwendungen.funktionen.digitaleNamensverwaltung | — | systembausteine | (kein CMS-Pendant) | `src/features/anwendungen/pages/DigitaleNamensverwaltungPage.tsx` | Entscheiden: DB-Section nachziehen (Inhalt-zuerst-Regel) ODER bewusst hartcodiert markieren. | M (Inhaltsmigration) |
| 🟡R | C | A | anwendungen.funktionen.digitaleNamensverwaltung | — | broschure | (kein CMS-Pendant) | `src/features/anwendungen/pages/DigitaleNamensverwaltungPage.tsx` | Entscheiden: DB-Section nachziehen (Inhalt-zuerst-Regel) ODER bewusst hartcodiert markieren. | M (Inhaltsmigration) |
| 🟡R | C | A | anwendungen.funktionen.feuerwehrdurchsage | — | anforderungen | (kein CMS-Pendant) | `src/features/anwendungen/pages/FeuerwehrdurchsagePage.tsx` | Entscheiden: DB-Section nachziehen (Inhalt-zuerst-Regel) ODER bewusst hartcodiert markieren. | M (Inhaltsmigration) |
| 🟡R | C | A | anwendungen.funktionen.feuerwehrdurchsage | — | leistungen | (kein CMS-Pendant) | `src/features/anwendungen/pages/FeuerwehrdurchsagePage.tsx` | Entscheiden: DB-Section nachziehen (Inhalt-zuerst-Regel) ODER bewusst hartcodiert markieren. | M (Inhaltsmigration) |
| 🟡R | C | A | anwendungen.funktionen.feuerwehrdurchsage | — | systembausteine | (kein CMS-Pendant) | `src/features/anwendungen/pages/FeuerwehrdurchsagePage.tsx` | Entscheiden: DB-Section nachziehen (Inhalt-zuerst-Regel) ODER bewusst hartcodiert markieren. | M (Inhaltsmigration) |
| 🟡R | C | A | anwendungen.funktionen.feuerwehrdurchsage | — | broschure | (kein CMS-Pendant) | `src/features/anwendungen/pages/FeuerwehrdurchsagePage.tsx` | Entscheiden: DB-Section nachziehen (Inhalt-zuerst-Regel) ODER bewusst hartcodiert markieren. | M (Inhaltsmigration) |
| 🟡R | C | A | anwendungen.funktionen.interneKommunikation | — | anforderungen | (kein CMS-Pendant) | `src/features/anwendungen/pages/InterneKommunikationPage.tsx` | Entscheiden: DB-Section nachziehen (Inhalt-zuerst-Regel) ODER bewusst hartcodiert markieren. | M (Inhaltsmigration) |
| 🟡R | C | A | anwendungen.funktionen.interneKommunikation | — | leistungen | (kein CMS-Pendant) | `src/features/anwendungen/pages/InterneKommunikationPage.tsx` | Entscheiden: DB-Section nachziehen (Inhalt-zuerst-Regel) ODER bewusst hartcodiert markieren. | M (Inhaltsmigration) |
| 🟡R | C | A | anwendungen.funktionen.interneKommunikation | — | systembausteine | (kein CMS-Pendant) | `src/features/anwendungen/pages/InterneKommunikationPage.tsx` | Entscheiden: DB-Section nachziehen (Inhalt-zuerst-Regel) ODER bewusst hartcodiert markieren. | M (Inhaltsmigration) |
| 🟡R | C | A | anwendungen.funktionen.interneKommunikation | — | broschure | (kein CMS-Pendant) | `src/features/anwendungen/pages/InterneKommunikationPage.tsx` | Entscheiden: DB-Section nachziehen (Inhalt-zuerst-Regel) ODER bewusst hartcodiert markieren. | M (Inhaltsmigration) |
| 🟡R | C | A | anwendungen.funktionen.mobileTuerkommunikation | — | anforderungen | (kein CMS-Pendant) | `src/features/anwendungen/pages/MobileTuerkommunikationPage.tsx` | Entscheiden: DB-Section nachziehen (Inhalt-zuerst-Regel) ODER bewusst hartcodiert markieren. | M (Inhaltsmigration) |
| 🟡R | C | A | anwendungen.funktionen.mobileTuerkommunikation | — | leistungen | (kein CMS-Pendant) | `src/features/anwendungen/pages/MobileTuerkommunikationPage.tsx` | Entscheiden: DB-Section nachziehen (Inhalt-zuerst-Regel) ODER bewusst hartcodiert markieren. | M (Inhaltsmigration) |
| 🟡R | C | A | anwendungen.funktionen.mobileTuerkommunikation | — | systembausteine | (kein CMS-Pendant) | `src/features/anwendungen/pages/MobileTuerkommunikationPage.tsx` | Entscheiden: DB-Section nachziehen (Inhalt-zuerst-Regel) ODER bewusst hartcodiert markieren. | M (Inhaltsmigration) |
| 🟡R | C | A | anwendungen.funktionen.zutrittskontrolleBCM | — | anforderungen | (kein CMS-Pendant) | `src/features/anwendungen/pages/ZutrittskontrolleBCMPage.tsx` | Entscheiden: DB-Section nachziehen (Inhalt-zuerst-Regel) ODER bewusst hartcodiert markieren. | M (Inhaltsmigration) |
| 🟡R | C | A | anwendungen.funktionen.zutrittskontrolleBCM | — | leistungen | (kein CMS-Pendant) | `src/features/anwendungen/pages/ZutrittskontrolleBCMPage.tsx` | Entscheiden: DB-Section nachziehen (Inhalt-zuerst-Regel) ODER bewusst hartcodiert markieren. | M (Inhaltsmigration) |
| 🟡R | C | A | anwendungen.referenzen.detail | — | notFound | (kein CMS-Pendant) | `src/features/anwendungen/pages/ReferenzprojektDetailPage.tsx` | Entscheiden: DB-Section nachziehen (Inhalt-zuerst-Regel) ODER bewusst hartcodiert markieren. | M (Inhaltsmigration) |
| 🟡R | C | A | anwendungen.referenzen.detail | — | sections | (kein CMS-Pendant) | `src/features/anwendungen/pages/ReferenzprojektDetailPage.tsx` | Entscheiden: DB-Section nachziehen (Inhalt-zuerst-Regel) ODER bewusst hartcodiert markieren. | M (Inhaltsmigration) |
| 🟡R | C | A | anwendungen.referenzen.detail | — | cta | (kein CMS-Pendant) | `src/features/anwendungen/pages/ReferenzprojektDetailPage.tsx` | Entscheiden: DB-Section nachziehen (Inhalt-zuerst-Regel) ODER bewusst hartcodiert markieren. | M (Inhaltsmigration) |
| 🟡R | C | A | anwendungen.referenzprojekte | /anwendungen/referenzprojekte | projekte | (kein CMS-Pendant) | `src/features/anwendungen/pages/ReferenzprojektePage.tsx` | Entscheiden: DB-Section nachziehen (Inhalt-zuerst-Regel) ODER bewusst hartcodiert markieren. | M (Inhaltsmigration) |
| 🟡R | C | E | serviceportal.login | /serviceportal | sections | (kein CMS-Pendant) | `src/features/serviceportal/pages/ServiceportalPage.tsx` | Entscheiden: DB-Section nachziehen (Inhalt-zuerst-Regel) ODER bewusst hartcodiert markieren. | M (Inhaltsmigration) |
| 🟡R | C | E | serviceportal.login | /serviceportal | cta | (kein CMS-Pendant) | `src/features/serviceportal/pages/ServiceportalPage.tsx` | Entscheiden: DB-Section nachziehen (Inhalt-zuerst-Regel) ODER bewusst hartcodiert markieren. | M (Inhaltsmigration) |
| 🟡R | C | F | eingangssysteme.root | /entry-system | discover | (kein CMS-Pendant) | `src/features/eingangssysteme/pages/EntrySystemPage.tsx` | Entscheiden: DB-Section nachziehen (Inhalt-zuerst-Regel) ODER bewusst hartcodiert markieren. | M (Inhaltsmigration) |
| 🟡R | C | F | gebaeudekommunikation.root | /gebaeudekommunikation | bereiche | (kein CMS-Pendant) | `src/features/gebaeudekommunikation/pages/TuerkommunikationPage.tsx` | Entscheiden: DB-Section nachziehen (Inhalt-zuerst-Regel) ODER bewusst hartcodiert markieren. | M (Inhaltsmigration) |
| 🟡R | C | F | gebaeudemanagement.root | /gebaeudemanagement | functions | (kein CMS-Pendant) | `src/features/gebaeudemanagement/pages/GebaeudemanagementPage.tsx` | Entscheiden: DB-Section nachziehen (Inhalt-zuerst-Regel) ODER bewusst hartcodiert markieren. | M (Inhaltsmigration) |

