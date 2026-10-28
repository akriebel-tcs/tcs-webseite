# Batch 7c — Custom-Renderpfad Welle 1, Miniabschluss

Stand: 2026-06-04. Auftrag: zwei echte Renderpfad-Lücken aus Batch 7a schließen, die Audit-Heuristik so erweitern, dass bestehende DB-first-Handlayouts nicht weiter als „Renderpfad-Lücke" gezählt werden, Welle-1-Pages im Coverage-Audit auf 0 offene Befunde bringen — und stoppen.

## 1. Zwei echte Lücken geschlossen

| Page | Datei | Eingriff |
|---|---|---|
| `gebaeudemanagement.alarmanlagenkopplung` | `src/features/gebaeudemanagement/pages/AlarmanlagenkopplungPage.tsx` | `<CmsTailFaq pageKey="gebaeudemanagement.alarmanlagenkopplung" />` direkt nach dem `<section>`-Platzhalterblock, vor `<CmsSourceBadge>`. Layout unverändert. |
| `gebaeudekommunikation.beschilderung` | `src/features/signage/pages/BeschilderungPage.tsx` | `<CmsTailFaq pageKey="gebaeudekommunikation.beschilderung" />` vor `<CmsSourceBadge>`. Layout unverändert. |

Keine Inhaltsänderung, keine i18n-Migration, keine DB-Migration. Es wurden ausschließlich die zwei Tail-Renderer ergänzt sowie der zugehörige Import.

Doppelrender-Schutz: `CmsTailFaq` nutzt `useRenderedSections()` aus dem `CmsRenderRegistry` und überspringt FAQ-Sections, die bereits inline gerendert wurden. Auf beiden Seiten gab es bisher keinen FAQ-Renderer — keine Doppelung.

## 2. Phantom-/Buchhaltungs-Befunde aus Welle 1

Diese sechs Pages waren in der Coverage-Audit-Liste, aber im Code bereits DB-first sauber gerendert (siehe `batch7a-vorpruefung-custom-pages.md`):

- `gebaeudekommunikation.snipdoo-ip` — Hand-Layout über `t("snipdooIp.<section>.…")`, `cms.text(...)`, `<CmsTailFaq>`/`<CmsTailCta>` schon vorhanden
- `home.start` — Switch-Dispatcher `renderTopLevel(key)` mit `case "stats"|"content_blocks_intro"|"personas"` über `dbOrder.map(...)`
- `karriere.root` — Hand-Layout mit `t(...)`, `listChildItems(cms, "benefits", …)`, `listChildItems(cms, "jobs", …)`
- `kontakt.root` — `tcms("cards", …)`, `t("sections.…")`, `t("form.…")`
- `kontakt-bcm.root` — gleicher Mechanismus wie `kontakt.root`
- `gebaeudemanagement.root` — `<ContentSection label={t("root.bcm.label")} …>` plus `cms.sections.filter(...).map(...Teaser2ColV1...)` für die fünf `teaser_*`-Sections

Zwei kleine Buchhaltungs-Ergänzungen waren nötig:

- `SnipdooIpPage.tsx`: `const handledSectionKeys = new Set<string>(["content", "kontakt"])` markiert die SEO-Meta-Section (`content`, via `useEffect` aus `t("snipdooIp.seo.…")`) und die `kontakt`-Section (SubNav-Anker + globaler CTA) als handled.

Keine andere Welle-1-Page brauchte Code-Buchhaltung.

## 3. Audit-Heuristik erweitert

`scripts/cms/page-renderer-coverage.mjs`:

- `<CmsTailFaq pageKey="…">` markiert `faq_v1`/`faq` als handled (page-lokal, da das Audit je Page-Datei mit ihrem eigenen `pageKey` läuft und der Tail-Renderer denselben `pageKey` als Prop bekommt).
- `<CmsTailCta pageKey="…">` markiert `cta_v1`/`standard_cta` als handled, gleiche Logik.
- Beide Varianten (self-closing und mit Children) werden erkannt.

Neuer „Handlayout"-Pass sammelt Kandidaten-Section-Keys aus DB-first-Lesepfaden und schneidet sie gegen die tatsächlichen DB-Section-Keys der Seite. Erkennt:

- `t("a.b…")` und `t(\`a.b…\`)` — erstes und zweites Segment (für `useCmsI18n`-Namespaces)
- `cms.text("sectionKey", …)`
- `listChildItems(cms, "sectionKey", …)`
- `txChildField(cms, "sectionKey", …)`
- `cmsOr("sectionKey.…", …)`
- `tcms("sectionKey", …)`
- `renderTopLevel("sectionKey")`
- `case "sectionKey":` (nur in Dateien mit `renderTopLevel`/`CMS_RENDERERS`/`cms.sections`-Dispatcher)

Keine pauschale globale Ausnahme — nur Treffer, deren Key tatsächlich eine aktive DB-Section auf derselben Seite ist, gelten als handled. Keine Renderer-Logik geändert.

## 4. Coverage vorher/nachher

| Metrik | vor 7c | nach 7c |
|---:|---:|---:|
| AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD gesamt | 73 | **37** |
| Welle-1-Befunde (8 Pages) | 8 echte/Phantom | **0** |

Die verbleibenden 37 Befunde verteilen sich auf:

- `service.downloads` (7), `service.planen-konfigurieren` (7), `service.ersatzteile` (5), `service.technischer-support` (4), `service.hub` (1) — Service-Bereich, nicht Teil von Welle 1.
- `serviceportal.{login, registrieren, passwort-vergessen}` (je 1) — Sonderseiten.
- `legal.{agb, datenschutz, impressum}` (je 1) — Rechtstexte.
- 7 Zutrittskontrolle-Detailseiten (je 1, jeweils dieselbe Section).
- `wissen.akademie` (1).

Alles bewusst außerhalb von Welle 1 belassen.

## 5. Ergebnis Wahrheits-Check + Spiegel-Audit

```
node scripts/cms/wahrheits-check-ci.mjs
✅ Wahrheits-Check CI OK — Harvester reproduzierbar, keine Drift, Body-Map vollständig,
   Launch-Gate erfüllt (FAQ/CTA orphan/mixed/dedup-only = 0).

node scripts/cms/faq-cta-toggle-inventar.mjs
FAQ: { OK: 81, OK_DEDUP_ONLY: 0, ORPHAN: 0, UNKNOWN: 0, MIXED: 0, '—': 28 }
CTA: { OK: 109, OK_DEDUP_ONLY: 0, ORPHAN: 0, UNKNOWN: 0, MIXED: 0, '—': 0 }

node scripts/cms/public-blocks-ignorieren-admin-visibility.mjs
[D2b.2/D3a.1] 80 Page-Dateien — Ampel: rot=0, gelb_medium=32, gelb_restschuld=33, grau=2.

node scripts/cms/globaler-spiegel-audit.mjs
43 Befund(e) — unverändert zur Vorperiode (kein neues Rot, kein neues High).
```

Kritisch bleibt 0. FAQ/CTA orphan/mixed/dedup-only bleibt 0. Spiegel-Audit-Zähler unverändert (Batch 7c hat keine neuen Befunde erzeugt).

## 6. Browser-Smoke

Geprüft im Preview-Sandbox:

| Route | Whiteout | FAQ-Anzahl | CTA-Anzahl | Status |
|---|---|---:|---:|---|
| `/gebaeudemanagement/alarmanlagenkopplung` | nein | 1 (neu) | 1 | OK, FAQ erstmals sichtbar |
| `/gebaeudekommunikation/beschilderung` | nein | 1 (neu) | 1 | OK, FAQ erstmals sichtbar |
| `/gebaeudekommunikation/snipdoo-ip` | nein | 1 | 1 | OK, inhaltlich vollständig |
| `/karriere` | nein | 0 | 0 | OK (Seite hat keine FAQ/CTA-Section) |

Stichprobe ausreichend — die anderen vier Welle-1-Routen (`/`, `/kontakt`, `/kontakt/bcm`, `/gebaeudemanagement`) wurden im Code nicht angefasst und sind seit Wochen stabil; Coverage-Audit bestätigt jetzt 0 offene Befunde für sie.

## 7. Was bleibt übrig

- 37 offene Coverage-Befunde außerhalb von Welle 1 (Service-Hub-Detailseiten, Serviceportal-Stubs, Legal-Texte, sieben Zutrittskontrolle-Detailseiten, Wissen/Akademie). Jeder Befund ist klein und einzeln, nicht systemisch.
- Spiegel-Audit-Restschuld (43 Befunde, baseline): `CONTAINER_HEADER_WHITELIST_FEHLT` (12), `PUNKT_KEY_IN_INAKTIVER_CONTAINER` (20), `I18N_JSX_SECTION_OHNE_DB_GEGENSTUECK` (6), `PERSONA_FALLBACK_RENDERER_AKTIV` (2), `CONTAINER_LEER` (2), `CODE_SONDERRENDERER` (1) — unverändert.
- Raster-Welle (Batch 7b Wave C/D) noch offen — bewusst ausgeklammert.

## 8. Empfehlung für nächsten Batch (nicht starten)

**Batch 8 — Service-Bereich Coverage-Abräumen (Mini-Welle).**

Begründung: 23 der verbleibenden 37 Coverage-Befunde stammen aus fünf Service-Pages (`service.downloads`, `service.planen-konfigurieren`, `service.ersatzteile`, `service.technischer-support`, `service.hub`). Vermutlich derselbe Phantom-Mechanismus wie in Welle 1 — die Pages lesen ihre Sections über `t(...)`/`cms.text(...)`, das Audit erkennt es heuristisch nicht. Vorgehen analog 7c:

1. Vorprüfung je Service-Page: Phantom oder echte Lücke?
2. Echte Lücken mit `<CmsTailFaq>`/`<CmsTailCta>` schließen oder kleine `handledSectionKeys`-Buchhaltung.
3. Wenn nach Vorprüfung <3 echte Lücken übrig: stoppen wie 7c.

**Nicht starten** — der hier vorliegende Bericht ist der Endpunkt von Batch 7c.

## 9. Geänderte Artefakte

- `src/features/gebaeudemanagement/pages/AlarmanlagenkopplungPage.tsx` (+2 Zeilen)
- `src/features/signage/pages/BeschilderungPage.tsx` (+2 Zeilen)
- `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx` (+5 Zeilen Audit-Buchhaltung, kein Render-Verhalten geändert)
- `scripts/cms/page-renderer-coverage.mjs` (Tail-Komponenten + Handlayout-Heuristik)
- `docs/04-betrieb/audit-snapshot/page-renderer-coverage.{json,md}` (neu erzeugt)
- `docs/04-betrieb/audit-snapshot/aktive-db-sections-ohne-renderpfad.{json,md}` (neu erzeugt)
- `docs/04-betrieb/audit-snapshot/batch7c-custom-renderpfad-miniabschluss.md` (dieser Bericht)
