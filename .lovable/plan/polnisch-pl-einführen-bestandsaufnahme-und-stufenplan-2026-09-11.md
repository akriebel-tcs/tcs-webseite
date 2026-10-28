# Polnisch (pl) einführen — Bestandsaufnahme und Stufenplan

Reine Analyse, keine Änderung durchgeführt, nichts veröffentlicht.

## 1. Bestandsaufnahme (geprüft)

### Website-Code (Web-neu)
- `src/i18n/types.ts`: `SUPPORTED_LANGUAGES = ["de","en"]`, Default `de`.
- `src/i18n/index.ts`: 18 Namespaces, je Sprache statisch importiert (`locales/de/*`, `locales/en/*`). Für `pl` fehlt der komplette Ressourcenzweig.
- `src/components/LanguageSwitcher.tsx`: fest zwei Knöpfe DE | EN, eigener Typ `Lang = "de" | "en"`.
- Locale-Typ ist an **mindestens 9 Stellen** eigenständig als `"de" | "en"` definiert (u. a. `CmsBodyRenderer.tsx`, `useCmsPageContent.ts`, `contract/renderability.ts`, `lib/cardCanonical.ts`, `i18n/foutSelfCheck.ts`, `api/cmsContent.ts`).
- Normalisierung ist nicht zentral: viele Stellen prüfen `language.startsWith("en") ? "en" : "de"` — jede unbekannte Sprache landet damit stillschweigend auf Deutsch (kein Absturz, aber auch kein Polnisch).
- Hartcodierte Zwei-Sprachen-Texte in Renderern: „Mehr erfahren / Learn more“ (`CardsSectionV1`, `ProductScrollerV1`, `ProductShowcaseListV1`), Scroll-Aria-Labels, Sprachumschalter-Label.

### CMS-Light-Datenbank
- `cms_section_fields`: **CHECK-Constraint erlaubt nur 'de','en'** (55.145 DE- / 54.501 EN-Zeilen). Ein `pl`-Insert scheitert heute.
- `cms_admin_editable_fields`: gleicher CHECK (Whitelist: 62.646 DE / 61.350 EN).
- `cms_assets`: CHECK `locale IN ('de','en') OR NULL`; zusätzlich **Spalten pro Sprache**: `alt_de`, `alt_en`, `alt_text_de`, `alt_text_en`.
- `cms_pages`: `title_de`, `title_en` als Spalten.
- `cms_navigation_nodes`: `label_de`, `label_en`, `description_de`, `description_en` als Spalten; von `useNavigationTree.ts` direkt gelesen.
- Zeilenbasierte Tabellen (`cms_section_fields`) skalieren auf `pl` sauber; die spaltenbasierten Sprachfelder (Assets/Seiten/Navigation) tun das **nicht** und sind der eigentliche Umbaupunkt.
- Alle relevanten RPCs (`rpc_admin_update_section_field`, `rpc_admin_update_asset_alt`, `rpc_admin_update_navigation_label`/`_description`, `rpc_admin_set_editable_field_enabled`, `rpc_public_read_navigation_tree`/`_overlay`, `rpc_public_resolve_breadcrumb`, `rpc_admin_read_page_sections`) enthalten fest verdrahtete `de`/`en`-Logik und müssen erweitert werden.

### Übersetzungs-Workflow
- Edge Function `cms-translate-field`: akzeptiert nur `["de","en"]`, sonst `locale_not_allowed`; Systemprompt ist auf „German↔English“ formuliert; Modell Gemini 2.5 Flash mit Lite-Fallback.
- `EditableField.tsx` ruft die Übersetzung fest mit `source_locale: "de", target_locale: "en"` auf und zeigt genau zwei Felder (DE/EN). Es gibt **keinen Freigabe-/Review-Zustand** — eine Maschinenübersetzung wird direkt als redaktioneller Wert gespeichert.

### Produktseite (klare Trennung)
- Produktliste/Suche/Filter, PDP und Datenblatt kommen aus der **zentralen TCS Product Base** über `rpc_get_channel_product_listing`, `rpc_get_channel_product_pdp`, `rpc_get_channel_product_datasheet` — jeweils mit `p_locale`. Kanalschlüssel sind heute `pdp_de` / `datenblatt_de`.
- Folge: Produkttexte, Merkmale, technische Werte, Dokumente und Datenblätter sind **nicht** in Web-neu übersetzbar. Polnisch dort ist eine Lieferung der zentralen Datenbank (neuer Kanal bzw. `pl`-Inhalte). Web-neu kann nur `p_locale` weitergeben.
- Technische Werte (Maße, Materialien, Hex-Farbwerte) werden nicht übersetzt, nur ihre Labels — und die kommen ebenfalls zentral.

## 2. Was in Web-neu zwingend geändert werden muss
1. Zentrale Sprachliste + **eine** Normalisierungsfunktion; alle lokalen `"de" | "en"`-Typen darauf umstellen.
2. `pl`-Ressourcenzweig in i18next (mind. `common`, `navigation` für UI-Texte).
3. LanguageSwitcher datengetrieben statt zwei fester Knöpfe.
4. Hartcodierte DE/EN-Textpaare in Renderern durch i18n-Keys ersetzen.
5. Fallback-Kette festlegen: `pl` → `de` (Inhalt nie leer anzeigen).
6. `p_locale` im Produktpfad korrekt durchreichen, mit definiertem Verhalten, falls die zentrale Datenbank kein Polnisch liefert.

## 3. Stufenplan (risikoarm, DB-first)

**Stufe 0 — Entscheidungen (nötig vor Stufe 1)**
- URLs: Polnisch unter denselben Pfaden (nur Umschalten) oder eigene Adressen? Annahme, falls keine Antwort: **gleiche Pfade**, kein Routing-Umbau.
- Umfang: Pilot (Startseite + ein Bereich) statt aller 94 Seiten. Annahme: **Pilot**.
- Produkt-Polnisch: separater Auftrag an die zentrale Produktdatenbank, nicht Teil dieses Plans.

**Stufe 1 — DB öffnet sich für `pl` (rein additiv)**
- CHECK-Constraints auf `cms_section_fields`, `cms_admin_editable_fields`, `cms_assets` um `'pl'` erweitern.
- Spaltenbasierte Sprachfelder ergänzen: `cms_pages.title_pl`, `cms_navigation_nodes.label_pl`/`description_pl`, `cms_assets.alt_pl`/`alt_text_pl` — alle nullable, kein Datenverlust.
- Keine bestehenden Zeilen verändern. Prüfung: DE/EN-Zählwerte unverändert (55.145 / 54.501).

**Stufe 2 — RPCs sprachoffen**
- Whitelist in allen betroffenen `rpc_admin_*`/`rpc_public_*` von zwei auf drei Sprachen; Navigations-Lese-RPCs geben `pl` mit Fallback auf `de` zurück.
- Idempotent, gleiche Signaturen, keine Verhaltensänderung für DE/EN.

**Stufe 3 — Web-neu sprachoffen (Punkt 2 oben)**
- Zentrale Sprachliste, Normalisierung, `pl`-Namespaces, Switcher, Fallback `pl → de`.
- Renderer-Textpaare in i18n überführen.

**Stufe 4 — Übersetzung + Freigabe**
- `cms-translate-field` auf `pl` erweitern, Systemprompt sprachneutral.
- Neuer Freigabezustand je Feld/Sprache: `maschinell` → `geprüft`. Maschinelle Werte werden gespeichert, aber im Admin sichtbar markiert; öffentlich ausgespielt wird `pl` nur bei Status `geprüft`, sonst greift der DE-Fallback. Damit ist keine unkontrollierte Maschinenübersetzung live.
- Admin: dritte Spalte PL, Stapel-Übersetzen pro Block, „geprüft“-Schalter.

**Stufe 5 — Pilot, Tests, Abnahme**
- Wahrheits-Check/CI-Skripte auf drei Sprachen erweitern (`scripts/cms/*`, `scripts/i18n/i18n-check.config.json`).
- Typecheck, Build, Vitest-Suite; Playwright-Sichtprüfung Pilotseiten in DE/EN/PL.
- Regressionsnachweis: DE- und EN-Ausgabe vor/nach identisch.

**Stufe 6 — Flächendeckung**
- Rest der Seiten bereichsweise, jeweils mit Freigabe-Durchlauf.

## 4. Risiken
- Spaltenbasierte Sprachfelder (Assets/Seiten/Navigation) sind der Hauptaufwand; eine spätere vierte Sprache würde sich wiederholen. Alternative Zeilenmodell-Umstellung wäre ein eigenes, größeres Projekt — nicht empfohlen für diesen Schritt.
- Ohne zentrale Normalisierung fällt `pl` still auf Deutsch zurück und der Fehler wird spät sichtbar; deshalb Stufe 3 vor jeder Inhaltsarbeit.
- Produktbereich bleibt zunächst DE/EN — muss gegenüber Nutzern klar kommuniziert werden.
