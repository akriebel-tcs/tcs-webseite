# Eine-Wahrheit-Systemaudit · Management-Zusammenfassung (Teil A8)

_Read-only Lauf. Quelle: Live-DB-Dump (psql) + Code-Scan unter `src/features/**`._

**Gesamtstatus:** `rot`

## Zahlen

| Kennzahl | Wert |
| --- | --- |
| Standardseiten | 90 |
| Detailseiten | 11 |
| Sonderseiten (unregistriert) | 9 |
| Sonderseiten (registriert) | 0 |
| Legacy/unklar | 1 |
| Redirects (Navigate) | 7 |
| Harte Sonderlogik-Funde | 9 |
| CMS/Public-Sperren gesamt | 9 |
| … davon `wert_ohne_whitelist` | 0 |
| … davon `whitelist_ohne_section` | 0 |
| … davon `whitelist_ohne_page` | 0 |
| … davon `section_type_ohne_renderer` | 0 |
| … davon `sonderseite_ohne_cms_page` | 9 |
| Risiko grün/gelb/rot (Seiten) | 60 / 55 / 3 |

## Top-Risiken

| Typ | Ziel | Bedeutung/Begründung |
| --- | --- | --- |
| sonderseite_ohne_cms_page | kontakt.root | /kontakt ist Sonderseite und hat keinen Eintrag in cms_pages — Inhalte ausschließlich im Code. |
| sonderseite_ohne_cms_page | (route:/kontakt/bcm) | /kontakt/bcm ist Sonderseite und hat keinen Eintrag in cms_pages — Inhalte ausschließlich im Code. |
| sonderseite_ohne_cms_page | (route:/produkte/merkliste) | /produkte/merkliste ist Sonderseite und hat keinen Eintrag in cms_pages — Inhalte ausschließlich im Code. |
| sonderseite_ohne_cms_page | (route:/produkte/tuerkommunikation/:pdpSlug) | /produkte/tuerkommunikation/:pdpSlug ist Sonderseite und hat keinen Eintrag in cms_pages — Inhalte ausschließlich im Code. |
| sonderseite_ohne_cms_page | produkte.zutrittskontrolle | /produkte/zutrittskontrolle ist Sonderseite und hat keinen Eintrag in cms_pages — Inhalte ausschließlich im Code. |
| sonderseite_unregistriert | /produkte/merkliste | Custom *Page ohne CMS-Shell. Hartfunde: keine. |
| sonderseite_unregistriert | /produkte/tuerkommunikation/:pdpSlug | Custom *Page ohne CMS-Shell. Hartfunde: keine. |
| legacy_unklar | /service/online-produktkatalog/:pdpSlug | Renderer-Datei konnte nicht aufgelöst werden. |

## Vorschlag für Teil B (zur fachlichen Entscheidung)

### Als registrierte Sonderseite dokumentieren
- /kontakt (KontaktPage)
- /kontakt/bcm (KontaktBcmPage)
- /serviceportal/passwort-vergessen (PasswortVergessenPage)

### Auf Standardbausteine migrieren prüfen
- /produkte/merkliste (MerklistePage) — Custom *Page ohne CMS-Shell. Hartfunde: keine.
- /produkte/tuerkommunikation/:pdpSlug (ProductDetailPage) — Custom *Page ohne CMS-Shell. Hartfunde: keine.
- /produkte/zutrittskontrolle (CategoryListPage) — Listen-Hub mit lokaler linkMap/externalActionMap — Verlinkungen sind hartcodiert.
- /produkte/eingangsloesungen (CategoryListPage) — Listen-Hub mit lokaler linkMap/externalActionMap — Verlinkungen sind hartcodiert.
- /serviceportal (ServiceportalPage) — Sonderseite (Kontakt/Auth/Recht/Formular). Hartfunde: formular_submit.
- /serviceportal/registrieren (RegistrierenPage) — Sonderseite (Kontakt/Auth/Recht/Formular). Hartfunde: formular_submit.

### Noch fehlende Gates / Folge-Audits
- Gate `gate-sonderseiten-register.mjs`: jede `*Page.tsx`, die nicht in `sonderseiten-register.json` steht und kein Standard-Shell nutzt, lässt CI rot werden.
- Gate `gate-section-type-renderer.mjs`: jeder aktive `section_type` ohne registrierten Renderer = rot.
- Gate `gate-whitelist-coverage.mjs` strikt: `wert_ohne_whitelist` > 0 → rot (statt nur Bericht).

### Prototyp-Blocker
- 3 Seiten mit Risiko rot — Prototyp-Abnahme nicht „eine Wahrheit".
- Alle aktiven Section-Typen haben einen Renderer.

_Wenn diese Liste passt: Teil B startet erst, nachdem du je Sonderseite entschieden hast: registrieren · migrieren · archivieren._
