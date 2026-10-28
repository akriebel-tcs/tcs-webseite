# Betriebs-Notiz: Produktkatalog/PDP auf Zieldatenbank `ncvxzkwazdemivdolpzc`

Stand: 2026-08-28. Auftrag: Umstellung des Online-Produktkatalogs inklusive
Produktdetailseiten (PDP) von der bisherigen Produktdatenbank
`tkscpnwbkjmqopnddxle` auf die Zieldatenbank `ncvxzkwazdemivdolpzc`
(dieselbe Datenbank, die das Download-Center speist).

Keine Migrationen, keine Policy-Änderungen, keine Schreibvorgänge, keine
Edge-Function-Deployments. CMS-Light, Navigation, Download-Center und
Admin-Bereich sind unverändert.

## Was umgestellt wurde

| Datei | Änderung |
| --- | --- |
| `.env` | `VITE_PRODUCT_SUPABASE_URL` / `VITE_PRODUCT_SUPABASE_PUBLISHABLE_KEY` auf die Zieldatenbank gesetzt |
| `src/lib/supabase/client.ts` | Hartkodierter Default (URL + publishable Key) auf `ncvxzkwazdemivdolpzc`; Kopf-Doku angepasst. Kein stiller Rückfall auf `tkscpnwbkjmqopnddxle` mehr möglich |
| `src/features/service/catalog/api/diagnostics.ts` | `EXPECTED_SUPABASE_PROJECT_ID = "ncvxzkwazdemivdolpzc"` |
| `src/features/service/catalog/api/pdp.ts` | Slug-Lookup-Reihenfolge `pdp_slug` → `artikel_nr` → (Restversuch) `pdp_slug_resolved`; Datenblatt-RPC ruft zuerst `p_variant: "public"` und fällt nur bei Signatur-Fehler auf `p_visibility` zurück |

## Benötigte Umgebungsvariablen

```
VITE_PRODUCT_SUPABASE_URL=https://ncvxzkwazdemivdolpzc.supabase.co
VITE_PRODUCT_SUPABASE_PUBLISHABLE_KEY=<publishable Key der Zieldatenbank>
```

Es wird ausschließlich der publishable (öffentlich lesbare) Key verwendet —
niemals ein `service_role`-Key. Fehlen die Variablen (z. B. nach einem Remix),
greift der hartkodierte publishable Default auf dieselbe Zieldatenbank.

Das Download-Center bleibt getrennt: eigene Variablen
`VITE_DOWNLOAD_SUPABASE_*` bzw. Edge Function `download-center`.

## Contract-Abweichungen der Zieldatenbank

- `api_v1_product_pdp` enthält `pdp_slug` und `artikel_nr`, aber **kein**
  `pdp_slug_resolved`. Deshalb neue Lookup-Reihenfolge (siehe oben). Es wurde
  keine Slug-Heuristik im Frontend eingeführt.
- `rpc_get_product_datasheet` erwartet `p_artikel_nr`, `p_locale`, `p_variant`
  (statt `p_visibility`). Der Code ist gegen beide Signaturen tolerant.
- Die früher gemeldete Lücke
  `42501 permission denied for function rpc_get_product_datasheet` ist mit
  dem publishable Key der Zieldatenbank aktuell **nicht** reproduzierbar
  (Antwort 200, `found: true`). Sollte sie wieder auftreten, ist
  datenbankseitig nötig — **nicht in diesem Auftrag ausgeführt**:
  `GRANT EXECUTE ON FUNCTION public.rpc_get_product_datasheet(...) TO anon, authenticated;`

## Offene Lücke: Suche (nur dokumentiert, nicht umgesetzt)

`rpc_get_product_listing` ist eine reine Teilstring-Suche. Übliche
Kurzschreibweisen finden deshalb nichts:

| Suchbegriff | Treffer |
| --- | --- |
| `PES Pro` | 50 |
| `PS Pro` | 0 (Serie heißt „PES PRO") |
| `Senso` | 12 |
| Artikelnummer aus dem Listing (`100205`) | 1 |

Bewusst **keine** Frontend-Verdrahtung, keine Synonymliste im Code. Empfohlene
datenbankseitige Lösungen (Folgeauftrag nötig):

1. **Empfohlen — Synonym-/Alias-Tabelle mit Normalisierung.**
   Tabelle `product_search_alias (alias_norm text, target_norm text, kind text)`.
   Normalisierung serverseitig: lowercase, Trim, Mehrfach-Leerzeichen,
   Sonderzeichen und Bindestriche entfernen. `rpc_get_product_listing`
   normalisiert die Eingabe, ersetzt/erweitert sie über die Aliastabelle
   (z. B. `ps pro` → `pes pro`) und sucht dann wie bisher. Vorteil:
   redaktionell pflegbar, deterministisch, erklärbar.
2. **Alternativ — Trigramm-Ähnlichkeitssuche (`pg_trgm`).**
   GIN-Index auf den relevanten Suchfeldern, Treffer über `similarity()` mit
   Schwellwert und Sortierung nach Score. Vorteil: fängt Tippfehler ab;
   Nachteil: unscharfe, schwerer erklärbare Trefferlisten.

## Abnahme-Ergebnis (2026-08-28)

- Katalog lädt aus `ncvxzkwazdemivdolpzc` — im Browser geprüft, es gehen nur
  Requests an `ncvxzkwazdemivdolpzc` (Produkt) und `uvkubrrljyzfvbvejepl`
  (CMS-Light); keine Requests mehr an `tkscpnwbkjmqopnddxle`: **ok**
- Kategorienavigation und Filter (Serien mit Zählern, kaskadierend): **ok**
- PDP öffnet über Slug: **ok**
- Produktbilder aus der Zieldatenbank: **ok** (18/18 geladen in der Serienliste)
- Technische Daten (`rpc_get_product_specs_display`): **ok**
- Paketkomponenten (`api_v1_paket_komponenten`): **ok**
- Datenblatt (`p_variant`): **ok** (200, `found: true`)
- Suche: geprüft, Teilstring-Schwäche dokumentiert (siehe Tabelle oben)
- CMS-Inhalte, Navigation, Download-Center: unverändert funktionsfähig
- Build: erfolgreich

## Nachtrag 2026-09-09: Zentraler Ausgabekanal-Vertrag

Der öffentliche Online-Produktkatalog läuft ausschließlich über die
Kanal-RPCs. Kein stiller Fallback auf breitere Produktquellen.

| Datei | Änderung |
| --- | --- |
| `src/features/service/catalog/api/catalog.ts` | Listing/Suche/Filter über `rpc_get_channel_product_listing` mit `p_channel_key='pdp_de'`; Direkt-Reads auf `api_v1_products_catalog` (`getProductsCatalog`, `getAllProductsCatalog`) entfernt |
| `src/features/service/catalog/api/pdp.ts` | Slug→Artikelnummer kanalbegrenzt über die Kanal-Listing-RPC (paginiert, 1000er-Blöcke); PDP über `rpc_get_channel_product_pdp` (Wert `pdp`); Datenblatt über `rpc_get_channel_product_datasheet('datenblatt_de')` (Wert `datasheet`); `api_v1_product_pdp`, `rpc_get_product_pdp`, `rpc_get_product_datasheet` entfernt |
| `src/features/service/pages/ProductDetailPage.tsx`, `src/features/service/catalog/hooks/usePdpData.ts` | Locale wird an die kanalbegrenzte Slug-Auflösung übergeben |
| `src/features/produkte/api/products.ts` | gelöscht (ungenutzte breite Produktquelle: `products_public_view`, `article_images`, Paketdokumente) |

Abnahme: Typprüfung und Build grün, 107 Tests grün, Kanal-Listing meldet
`total_count = 1394`, Katalog/Serienfilter/PDP-Popup laden über die
Kanal-RPCs, direkte PDP-URL eines nicht freigegebenen Artikels
(`/produkte/tuerkommunikation/bala-032-xxxx`) zeigt „Produkt nicht
gefunden". Nicht veröffentlicht.

## Nachtrag 2026-09-13: Sprachweitergabe an die Produktbasis

Die öffentliche Sprachwahl ist dynamisch (`de`, `en`, `pl`, `nl`, …). Im
Produktbereich wurde der Locale vorher an mehreren Stellen auf `de`/`en`
reduziert; Niederländisch forderte deshalb deutsche Produktdaten an.

| Datei | Änderung |
| --- | --- |
| `src/features/service/catalog/lib/productLocale.ts` (neu) | Zentraler Normalizer (`normalizeProductLocale`), Rückfallkette `productLocaleChain` (angefordert → en → de), `readDeliveredLocale`, `resolveProductLocaleValue`, `pickProductLocalized`, `productIntlLocale` |
| `src/features/service/catalog/api/pdp.ts` | Locale-Typen auf beliebige Sprachcodes; neue Loader `loadProductPdpLocalized` / `loadProductDatasheetLocalized` mit Kette |
| `src/features/service/catalog/api/catalog.ts` | `normalizeLocale` delegiert an den zentralen Normalizer |
| `src/features/service/catalog/hooks/usePdpData.ts` | Locale als Sprachcode; meldet `requestedLocale`, `resolvedLocale`, `usedFallback` |
| `ProductPdpModal`, `ProductDetailPage`, `ProductDatasheetModal`, `CatalogProductGrid`, `CatalogMvp`, `pdpReaders` | kein `startsWith("en")` mehr, sprachsuffigierte Felder über `pickProductLocalized`, Preis-/Zahlenformat über `productIntlLocale` |
| `ProductLocaleNotice.tsx` (neu) | kurze Kennzeichnung, wenn Produktdaten aus einer Ersatzsprache stammen |
| `src/lib/catalog-contract.ts` | `CatalogLocale` ist ein Sprachcode (kein `"de" \| "en"`) |

Rückfallerkennung: der von der RPC gelieferte `locale`/`text_locale` im
Envelope wird geprüft. Fällt die Produktbasis für `nl` still auf Deutsch
zurück, wird zuerst `en` versucht; Deutsch wird nur akzeptiert, wenn `en`
fehlt. PDP und Datenblatt nutzen dieselbe Kette (keine Mischsprachen).

Tests: `lib/__tests__/productLocale.test.ts`,
`api/__tests__/pdpLocalePassthrough.test.ts`,
`hooks/__tests__/usePdpData.localeSwitch.test.tsx` (Sprachwechsel bei
geöffnetem Produkt lädt neu). 24 Testdateien / 270 Tests grün, Typprüfung
grün. Keine Migration, kein Übersetzungslauf, nicht veröffentlicht.

## Statusentscheidung: `proposed` wird ausgespielt (Stand 2026-09-13)

Fachentscheidung: Produktübersetzungen im Status `proposed` werden öffentlich
genauso ausgespielt wie `approved`. Ein redaktionelles Freigabe-Gate gibt es
vorerst nicht — geprüft und korrigiert wird direkt an der Website.

Umsetzung in der Sprachlogik (`src/features/service/catalog/lib/productLocale.ts`):

- `isProductTranslationUsable(status)` bewertet Statuswerte. Ausspielbar sind
  u. a. `proposed`, `approved`, `machine`, `human`. Nur `missing`, `empty`,
  `stale`, `outdated`, `veraltet`, `needs_update`, `error` erlauben einen
  Rückfall. Unbekannte oder fehlende Statuswerte gelten als ausspielbar.
- `pickProductLocalizedDetailed` prüft je Wert `<feld>_<sprache>_status`
  (bzw. `<feld>_status`, `translation_status`, `locale_status`) und überspringt
  nur wirklich fehlende/leere/veraltete Werte.
- `resolveProductLocaleValue` akzeptiert eine Nutzlast im Status `proposed`
  sofort; nur bei fehlend/veraltet folgt der nächste Kettenschritt.
- Die Kennzeichnung (`ProductLocaleNotice`) erscheint ausschließlich bei einem
  echten Sprachwechsel (`usedFallback`), nie wegen `proposed`.
- Listing-Probe (`resolveListingLocale`): teilweise übersetzte Sprachen werden
  über eine breitere zweite Probe (60 Zeilen) erkannt, damit `proposed`-Bestände
  nicht wegen der ersten fünf noch deutschen Zeilen verworfen werden.

Tests: `lib/__tests__/productLocaleProposed.test.ts` (Karten, PDP, Datenblatt in
PL mit `proposed`), `api/__tests__/listingLocaleProposed.test.ts`.

## Nachtrag Code-Review (2026-09-13)

1. **Envelope-Sprache erhalten.** `getProductPdp` / `getProductDatasheet`
   schälen den Kanal-Envelope ab. Die tatsächlich gelieferte Sprache aus dem
   Envelope wird jetzt als `delivered_locale` an die innere Nutzlast geheftet
   (nur, wenn dort keine Sprachangabe steht). `readDeliveredLocale` liest
   zusätzlich verschachtelte Pfade (`meta.locale`, `meta.resolved_locale`,
   `datasheet.meta.locale`, `pdp.text_locale`). Test:
   `api/__tests__/pdpEnvelopeLocale.test.ts` — NL-Anfrage mit outer
   `locale='de'` und inner `meta.locale='de'` wird nicht als NL akzeptiert,
   sondern führt zum EN-Versuch.
2. **Listing über denselben Resolver.** Neu:
   `getProductListingLocalized(params)` in `api/catalog.ts` — ermittelt via
   `resolveListingLocale` die wirksame Sprache (angefordert → `en` → `de`) und
   lädt danach genau einmal mit dieser Sprache. `CatalogMvp` nutzt diese
   Funktion für die Produktliste; keine Sprachmischung je Zeile. Test:
   `api/__tests__/listingLocaleContract.test.ts`.
3. **Offene Vertragslücke der Produktbasis (ehrlicher Stand).** Die
   sprachneutralen Views führen **kein** `label_pl` / `label_nl`:
   - `product_filter_options_view`: `label_de`, `label_en`, `label_da`,
     `field_label_de/_en/_da`
   - `api_v1_product_color_facets`, `api_v1_product_colors`: `label_de`,
     `label_en` (Facetten zusätzlich `label_da`)
   - `api_v1_filter_series_by_category`, `product_catalog_navigation_view`:
     `label_de`, `label_en`

   Folge: Filterbezeichnungen, Filterwerte, Farbnamen, Serien- und
   Navigationslabels erscheinen unter PL/NL fachlich auf **Englisch** (nicht
   Deutsch). Vollständiges PL/NL im Katalog erfordert eine Erweiterung des
   Produktbasis-Vertrags um `label_pl` / `label_nl` (inkl. `proposed`). Die
   Website ist dafür vorbereitet: die Abfragen lesen die Views mit `*`, und
   `pickProductLocalized` nutzt neue Sprachspalten automatisch (Test:
   `lib/__tests__/filterLocaleProposed.test.ts`). Die Website ist damit
   **nicht** als vollständig übersetzt zu bezeichnen.
4. **Kein `approved`-only-Gate.** `proposed` ist überall nutzbar; nur
   `missing`/`empty`/`stale`-artige Status lösen den Sprachfallback aus.

## Abgleich mit dem live korrigierten Sprachvertrag (Stand 2026-09-13)

Die Produktbasis löst den Sprachvertrag inzwischen **serverseitig** auf. Der
Client reicht den gewählten Localecode deshalb nur noch normalisiert durch und
probiert keine Sprachen mehr aus.

Verbindliche RPCs (read-only):

| Zweck | RPC | Sprachparameter |
| --- | --- | --- |
| Produktliste | `rpc_get_channel_product_listing` (`p_channel_key='pdp_de'`) | `p_locale` |
| Produktdetail | `rpc_get_channel_product_pdp(channel, artikel, locale)` | 3. Argument |
| Datenblatt | `rpc_get_channel_product_datasheet(channel, artikel, locale)` | 3. Argument |
| Filter | `rpc_get_localized_filter_options(p_locale)` | `p_locale` |

Client-Regeln:

- `resolveListingLocale` ist eine reine Durchreiche (`requested == effective`).
  Einzelne Feld-Rückfälle der Datenbank schalten die Sprache **nicht** global
  auf Deutsch um.
- Filter kommen ausschließlich aus `rpc_get_localized_filter_options`:
  `option_key` = technischer Wert (nie übersetzt), `option_label` = Anzeige,
  `field_label` = Gruppenbezeichnung, `option_count` = unveränderte Zahl,
  `hex_code` = Farbwert. Die alte View `product_filter_options_view` und jede
  hartkodierte DE/EN-Auswahl im Client sind entfallen.
- Karten-Badges: `label` ist die serverseitig lokalisierte Anzeige;
  `label_de`/`label_en` sind nur Herkunftsangaben und dürfen `label` nicht
  überstimmen (`lib/__tests__/badgeLocale.test.ts`).
- `proposed` und `approved` werden gleich ausgespielt; kein Freigabe-Gate.
- Sprachwechsel lädt Bedienoberfläche und Produktdaten neu (Liste, Filter,
  Karten, PDP, Datenblatt hängen an `i18n.language`).

Betriebshinweis Produktbasis (nicht durch die Website behebbar): große
Listenabfragen (`p_limit=1000`) laufen bei übersetzten Sprachen gelegentlich in
`57014 statement timeout`. `getProductListing` lädt dieselbe Abfrage in diesem
Fall seitenweise in Schritten von 200 Zeilen mit stabiler Sortierung nach; das
Ergebnis bleibt identisch. Dauerhafte Abhilfe wäre eine Optimierung in der
Produktbasis.

Ehrlicher Rest: Farbnamen und die Gruppenbezeichnung „Colour" liegen in der
Produktbasis teils nur auf EN/DE vor (z. B. `weiss → white`, `schwarz → Black`,
`bronze → Bronze`), ebenso Kategorie-/Serienbezeichnungen der
Navigationsansicht („Outdoor stations"). Das ist ein Datenstand der
Produktbasis, kein Website-Fehler.

## Abschlussprüfung 2026-09-13 (DE/EN/PL/NL)

Geprüft im Browser: Navigation, Bedienoberfläche, Produktliste, Filtergruppen
und Filterwerte, Produktkarten, PDP-Modal und Datenblatt-Modal für
ADA45015-0030 (Serie AD4) und ADA59010-0030 (Serie ADX5) in EN, PL und NL.
Ergebnis: Titel, Teaser, Merkmale, Badges (Aufputz/Unterputz → „Natynkowy" /
„Opbouw"), Ja/Nein (→ „Tak/Nie" / „Ja/Nee"), Montageart, Preisformat und die
Datenblatt-Abschnitte erscheinen in der gewählten Sprache. `<html lang>` und
alle Datenabfragen wechseln mit (`nl` geht unverändert an die Kanal-RPCs).

Zwei Restfehler in dieser Runde behoben (nur Anzeige, keine Datenänderung):

1. Kategorie-Untertitel im Produkt-Hub las direkt die Produktbasis
   (`label_de`/`label_en`) und zeigte deshalb bei PL/NL das englische Label.
   Jetzt gilt dieselbe Bezeichnung wie auf der Kategoriekarte (CMS-Light zuerst,
   danach Produktbasis-Kette angefordert → en → de).
2. Kopf des Datenblatt-Fensters zeigte `branding.document_type` aus der
   Produktbasis, das dort sprachunabhängig „Datenblatt" ist. Jetzt gewinnt der
   Oberflächentext `katalog.pdp.datasheet.title` (EN „Data sheet", PL „Karta
   katalogowa", NL „Datasheet"); die Produktbasis-Angabe ist nur noch Rückfall.

Weiter offen (Datenstand Produktbasis, nicht durch die Website behebbar):
einzelne Farbnamen (`white`, `Black`, `Bronze`), die Gruppenbezeichnungen
„Colour"/„Color", „Documents", „Product type", Optionswerte wie „Audio 2-wire",
„1 units", „built-in", die Spec-Gruppen „Ordering & logistics" /
„Material & finish" sowie technische Kurzwerte im Datenblatt (z. B. `AP`).

## Öffentlicher Bereich ohne Statusanzeigen (Stand 2026-09-13)

Fachregel: Im öffentlichen Produktbereich (Liste, Filter, Karten, PDP,
Datenblatt) werden alle vorhandenen Übersetzungen wie kuratierte Inhalte
ausgespielt. Dort erscheint keine Kennzeichnung „KI“/„maschinell“/„Vorschlag“/
„freigegeben“, keine Coverage-Zeile und kein technischer Hinweis auf eine
Ersatzsprache. Diese Angaben gehören ausschließlich in den internen
Übersetzungsbereich unter `/admin`.

Umsetzung: Die Komponente `ProductLocaleNotice` und ihre Einbindungen in
`CatalogMvp`, `ProductPdpModal`, `ProductDatasheetModal` und
`ProductDetailPage` sind entfernt, ebenso der Textbaustein
`katalog.pdp.localeFallback.note` in DE/EN/PL. Die feldweise Rückfallkette
angefordert → en → de bleibt unverändert wirksam, nur ohne sichtbaren Hinweis.
