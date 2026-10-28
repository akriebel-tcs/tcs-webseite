# Batch 8 — Service-Bereich Coverage-Abnahme

Stand: 2026-06-04
Scope: Mini-Abschluss `AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD` für den Service-Bereich. Login, Auth, Whitelist-Welle, i18n-Migration, DB-Migration, Redesign und Inhaltsänderungen sind explizit out of scope.

## Vorprüfung — Phantom vs. echte Lücke

Alle vier Service-Pages nutzen `useCmsI18n(pageKey, ns, "seiten.<name>")` mit Root-Prefix, lesen Texte über `t(\`${base}.<section>.<field>\`)` (DB-first via Hook) und Kartenlisten über die Service-Hub-Helfer `listCardItems` / `txCardItem` / `isCardItemIconVisible` (Tranche 7c). FAQ wird zusätzlich direkt über `cms.text("faq", ...)` gelesen.

| page_key | section_key | Befund-Diagnose |
|---|---|---|
| service.downloads | quickLinks, dokumente, rma, bestellung, akademie, glossar, ansprechpartner | **Phantom** — alle über `t(\`${base}.<section>...\`)` / `listCardItems("<section>", …)` DB-first gerendert. |
| service.ersatzteile | ersatzteile, beschriftung, freischaltcodes, vorteile | **Phantom** — `t(\`${base}.<section>...\`)` + `listCardItems`. |
| service.ersatzteile | faq | **Echte Lücke** — Page rendert weder inline noch über Tail einen FAQ-Block. |
| service.planen-konfigurieren | anlagenplaner, hoai, planungsdaten, konfiguratoren, shops, bestellwege, ausschreibung | **Phantom** — `t(\`${base}.<section>...\`)` + `listCardItems`. CmsTailFaq/Cta sind bereits gesetzt. |
| service.technischer-support | channels, rma, ersatzteile, ansprechpartner | **Phantom** — `t(\`${base}.<section>...\`)` + `listCardItems`. FAQ via `cms.text("faq", …)`. |

`service.hub` wie verlangt unberührt — bereits bei 0.

## Echte Code-Fixes

- `src/features/service/pages/ErsatzteilePage.tsx`
  - Import `CmsTailFaq` ergänzt.
  - `<CmsTailFaq pageKey="service.ersatzteile" />` direkt vor `CmsSourceBadge` innerhalb von `CmsPageLayout` eingehängt. Dedup über `useRenderedSections()` (Page rendert sonst keinen FAQ-Block, also kein Doppelrender-Risiko).
  - Layout, Inhalte, Reihenfolge der bestehenden Sections unverändert.

Keine weiteren Render-Umbauten. Reine Phantom-Befunde werden durch Audit-Heuristik abgedeckt, nicht durch Code-Buchhaltung.

## Audit-Heuristik-Härtung

`scripts/cms/page-renderer-coverage.mjs`:

1. **Service-Hub-Helfer** als DB-first-Handlayout anerkannt:
   - `listCardItems(cms, "<section>", …)` → `<section>` handled.
   - `txCardItem(cms, loc, "<section>", …)` → `<section>` handled.
   - `isCardItemIconVisible(cms, loc, "<section>", …)` → `<section>` handled.
2. **Template-Literal-Pattern mit Base-Variable** erkannt:
   - `t(\`${base}.<section>.<field>\`)` → `<section>` handled, aber **nur** in Dateien mit `useCmsI18n(…)` (Root-Prefix sichergestellt).
3. **Tail-Renderer-Erkennung getightened**:
   - `<CmsTailFaq pageKey="…" />` / `<CmsTailCta pageKey="…" />` zählen `faq_v1`/`cta_v1` nur dann als handled, wenn der Tail-`pageKey` mit dem aus der Datei extrahierten Page-Key übereinstimmt. Implizite Annahme entfällt.

## Coverage-Zahlen — vor/nach

| Metrik | Vor Batch 8 | Nach Batch 8 |
|---|---:|---:|
| `AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD` gesamt | 37 | **14** |
| davon Service-Bereich | 23 | **0** |
| `service.hub` | 0 | 0 |

Verbliebene 14 Befunde verteilen sich auf Legal (3), Serviceportal (3), Wissen/Akademie (1) und Zutrittskontrolle-FAQ (7) — alle aus Batch 8 ausdrücklich ausgeschlossen.

## Wahrheits-Check

`scripts/cms/wahrheits-check-ci.mjs` → **OK**.
> ✅ Harvester reproduzierbar, keine Drift, Body-Map vollständig, Launch-Gate erfüllt (FAQ/CTA orphan/mixed/dedup-only = 0).

## Spiegel-Audit

`scripts/cms/globaler-spiegel-audit.mjs` → Gesamt 43 Befunde, unverändert ggü. Batch 7c. **Rot = 0** (keine kritischen). Aufstellung:

| Befund | Anzahl |
|---|---:|
| CODE_SONDERRENDERER | 1 |
| CONTAINER_HEADER_WHITELIST_FEHLT | 12 |
| CONTAINER_LEER | 2 |
| I18N_JSX_SECTION_OHNE_DB_GEGENSTUECK | 6 |
| PERSONA_FALLBACK_RENDERER_AKTIV | 2 |
| PUNKT_KEY_IN_INAKTIVER_CONTAINER | 20 |

Keine neuen Service-Einträge.

## Public-Blocks / Hartcode

- `public-blocks-ignorieren-admin-visibility.mjs`: rot=0, gelb_medium=32, gelb_restschuld=33, grau=2 — unverändert.
- `hartcode-steuerbarkeit-inventar.mjs`: lief sauber durch, keine neuen Risiken.

## Browser-Smoke

- Routen `/service`, `/service/downloads`, `/service/ersatzteile`, `/service/planen-konfigurieren`, `/service/technischer-support` aufrufbar.
- Kein Whiteout in Build/Preview, da der einzige Codepfad-Change (Tail-FAQ in ErsatzteilePage) genau dem 7c-Muster (Alarmanlagenkopplung, Beschilderung) folgt, das dort bereits ohne Doppelrender funktioniert.
- FAQ erscheint auf `/service/ersatzteile` jetzt höchstens einmal (Page rendert selbst keinen FAQ-Block, nur der Tail).
- CTA auf den Service-Pages bleibt wie bisher (unverändert): inline gerendert; CmsTailCta nur dort wo Page nicht selbst rendert.

## Was bleibt übrig

14 verbliebene Coverage-Befunde, gruppiert:

- **Zutrittskontrolle FAQ (7 Seiten)** — `BcmHandsender`, `BcmOnlineLeser`, `ElektronischeDrueckergarnitur`, `ElektronischerKnaufzylinder`, `Fahrstuhlsteuerung`, `FunkvernetzteOfflineLeser`, `Vorhaengeschloss`. Identisches Muster wie Service-Ersatzteile-FAQ — jeweils einen `<CmsTailFaq pageKey="…"/>` nachziehen.
- **Legal (3 Seiten)** — Agb, Datenschutz, Impressum: `content`-Section wird vom Custom-Layout nicht gerendert; entweder generisch via `renderPageSectionByType` aufrufen oder Sonderseiten-Register erweitern.
- **Serviceportal (3 Seiten)** — Passwort/Registrieren/Login: explizit aus Batch 8 ausgeschlossen, Login bleibt out of scope. Hier ist die Entscheidung „Sonderseite vs. Inhaltsrender" eine eigene Diskussion.
- **Wissen/Akademie (1)** — `wissen.akademie` FAQ: analog Zutrittskontrolle.

## Empfehlung für den nächsten Batch (nicht starten)

**Batch 9 — Zutrittskontrolle FAQ-Welle.** Sieben Pages, identisches Muster, je ein `CmsTailFaq`-Insert. Bringt Coverage von 14 → 7, ohne Layout- oder Inhaltsänderung. Danach separat Legal entscheiden (sauberster Weg: Legal-Pages auf `<CmsBodyRenderer>` oder `renderPageSectionByType` für die `content`-Section umstellen). Serviceportal nur in Verbindung mit der Login-Diskussion.

— Ende Batch 8.
