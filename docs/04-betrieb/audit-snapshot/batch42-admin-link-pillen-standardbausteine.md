# Batch 42 — Admin-Link-Pillen für Standardbausteine

Datum: 2026-06-05
Bereich: CMS-Light Admin / Navigationsbaum (Anzeige, keine Schreibwege)
Modus: **Anzeige-Erweiterung** der bestehenden „Verlinkt auf …"-Pille auf
weitere Standard-Linkfelder. Keine neue Parallel-Logik, keine
Public-Renderer-Änderung, keine DB-Migration, keine Inhaltsänderung.

## 1. Vorher: welche Bausteine zeigten bereits eine Pille?

- Sichtbar im Navigationsbaum als graue/blaue/rote „Verlinkt auf …"-Pille
  unter der Section-Zeile (`CardLinkPill`).
- Quelle: `readPageCardLinks(pageKey)` → `cms_section_fields` mit
  `field_key IN ('href', 'cta_link')`.
- Auflösung: gemeinsame Funktion `resolveCardLink` gegen
  `cms_pages.route_path` (intern gefunden / intern fehlend / extern).
- Treffer im Bestand:
  - `card_v1` mit Feld `href` (alte Bildkarten, Hub-Karten, Service-Hub).
  - `content_v1` mit Feld `cta_link` (Inhalts-Block mit Folge-CTA).
  - Navigations-Knoten (`cms_navigation_nodes`) — eigener Pfad über
    `resolveNavNodeLink`, unverändert.

## 2. Warum erschien für P-077 keine Pille?

Die 12 neuen Referenzkarten (Batch 41) tragen ihren Sprung-Link im
Standard-Slot **`link_1_href`** (`card_v1` Standardvertrag) — nicht in
`href`. `readPageCardLinks` filterte nur auf `href`/`cta_link`, also
landeten die Links gar nicht erst im Cache, und der Baum konnte keine
Pille rendern.

## 3. Welche Standardbausteine haben vergleichbare Linkfelder?

Auswertung über `cms_section_fields` + Vertrag (`sectionTypes.ts`):

| Section-Typ | Linkfelder im Vertrag |
|---|---|
| `card_v1` | `link_1_href`, `link_2_href`, `link_3_href` (mit `link_N_label`/`link_N_kind`/`link_N_enabled`), zusätzlich Legacy: `href`, `cta_href` |
| `cta_v1` | `cta_href` |
| `teaser_2col_v1` | `cta_link` (Sonderfall — bewusst nicht `cta_href`) |
| `content_v1` | `cta_link`, `cta_href` |
| sonstige | `href`, `cta_href`, vereinzelt `items.N.href` (Bauwerkzeug-Listen) |

## 4. Umsetzung (DB-first, keine Parallel-Logik)

Genau eine Stelle erweitert — die zentrale Lese-/Auflösungs-Pipeline:

1. **`src/features/admin/api/cmsAdminCardLinks.ts`** (`LINK_FIELD_KEYS`
   erweitert) — liest jetzt zusätzlich `cta_href`, `link_1_href`,
   `link_2_href`, `link_3_href`. Lädt parallel die zugehörigen
   `link_N_enabled`-Schalter und entfernt deaktivierte Slots schon
   serverseitig aus dem Ergebnis. Mehrfach-Treffer pro Section
   bleiben erhalten; identische `href`s werden je Section dedupliziert
   (damit nicht `link_1_href` und `cta_href` zweimal dieselbe Pille
   erzeugen).
2. **`src/features/admin/components/tree/SectionLevel.tsx`** — `linksByKey`
   ist jetzt `Map<sectionKey, CachedLink[]>`. `hasLinkable`-Vorfilter
   erweitert auf `cta_v1` / `teaser_2col_v1` / `cards_v1` (zusätzlich
   zu `card_v1` und `content_v1`), damit das Lade-Gate auch dann
   triggert, wenn nur ein CTA-Block auf der Seite steht.
   `cardLinks` ist jetzt `Map<sectionKey, SectionCardLink[]>`.
3. **`src/features/admin/components/tree/SectionRowView.tsx`** — Prop
   `cardLink?` → `cardLinks?: SectionCardLink[]`. Pro Section werden
   alle Pillen untereinander gerendert (gleiche `CardLinkPill`-
   Komponente, keine neue UI). Der „Ausgeblendet"-Tooltip nimmt wie
   bisher den ersten Link für die Sprung-Beschreibung.

Nicht angefasst:
- `CardLinkPill` (Anzeige unverändert).
- `resolveCardLink` (Auflösungslogik unverändert).
- `resolveNavNodeLink` / Navigations-Pillen (eigener, intakter Pfad).
- `CardLinkInfoBox` im Arbeitsbereich (lädt seine Items selbst, nicht
  betroffen — Erweiterung dort kann separate Etappe sein).

## 5. Wie werden Links jetzt angezeigt?

**Interne Treffer (`internal-found`)**: blaue Pille
„→ P251 Campus Westend, Frankfurt — published". Klick öffnet die
Zielseite im Arbeitsbereich (`onJumpToPage`). Beispiel P-077 →
`card_campus_westend`: zeigt jetzt
`→ P251 Campus Westend, Frankfurt` mit Sprung auf P-251.

**Interne Fehltreffer (`internal-missing`)**: rote Pille
„⚠ 404 /pfad/der/nicht/existiert".

**Externe Links (`external`)**: graue Pille
„↗ extern beispiel.de" (oder die jeweilige URL). Kein Sprung-Handler,
kein erzwungenes Verlassen des Admins.

**Mehrere Links pro Karte**: stapeln sich vertikal unter der Section-
Zeile (Reihenfolge `link_1` → `link_2` → `link_3` → `href` →
`cta_href` → `cta_link`). Deaktivierte Slots (`link_N_enabled=0`)
und Duplikate (gleicher `href`) werden unterdrückt.

## 6. Verifikation

- **P-077**: alle 12 Referenzkarten (`card_pulse_berlin` …
  `card_seniorenresidenz_am_park`) zeigen jetzt im Admin-Baum eine
  blaue interne Link-Pille mit `P-241` … `P-252` und korrektem
  Routen-Label. Klick springt zur jeweiligen Subseite.
- **Bestehende Pillen** (Service-Hub-Karten mit `href`, Footer-/Nav-
  Knoten, `content_v1` mit `cta_link`): unverändert sichtbar — selber
  Code-Pfad, nur die Filterliste wurde erweitert.
- **Externe Beispiele**: Footer-Bottom-Links (extern) rendern wie
  bisher via `resolveNavNodeLink` (eigener, intakter Pfad).
- **Live-Vorschau / „Seite ansehen"-Sprünge**: nicht angefasst —
  `onJumpToPage` ist derselbe Handler wie zuvor.
- **Wahrheits-Check CI**: `node scripts/cms/wahrheits-check-ci.mjs`
  → ✅ grün.
- **Public-Renderer**: nicht angefasst (keine Änderung an `src/features/
  cms/**` oder Page-Renderern).
- **DB / Migrationen**: keine.
- **Navigation / `cms_navigation_nodes`**: keine.
- **i18n**: keine.

## 7. Restpunkte

- **R42-1**: `CardLinkInfoBox` im rechten Arbeitsbereich (PageEditor)
  zeigt aktuell nur `href`/`cta_link`/`cta_href` — sinngemäße
  Erweiterung auf `link_N_href` ist konsistent möglich, betrifft aber
  nur die Read-only-Box im Editor, nicht den Baum. Außerhalb dieses
  Batches.
- **R42-2**: Verschachtelte Karten-Felder (`items.N.href`) bleiben
  außen vor — in Bestand selten und bewusst aus Scope-Gründen nicht
  in `LINK_FIELD_KEYS` aufgenommen.

## 8. Geänderte Dateien

- `src/features/admin/api/cmsAdminCardLinks.ts` (Filter erweitert,
  Slot-Disable + Dedup, mehrere Rows pro Section).
- `src/features/admin/components/tree/SectionLevel.tsx` (Cache-Form
  auf Liste umgestellt, `hasLinkable` erweitert, `cardLinks`-Map
  liefert jetzt Listen).
- `src/features/admin/components/tree/SectionRowView.tsx` (Prop
  `cardLink` → `cardLinks: SectionCardLink[]`, rendert alle Pillen
  vertikal gestapelt).
- `docs/04-betrieb/audit-snapshot/batch42-admin-link-pillen-standardbausteine.md`
  (dieser Bericht).

## 9. Scope-Bestätigung

- Produktdatenbank: **nicht angefasst**.
- Public-Renderer / Routen: **nicht angefasst**.
- Navigation (`cms_navigation_nodes`, MainNav, Footer): **nicht angefasst**.
- i18n-JSONs: **nicht angefasst**.
- DB / Migrationen / RPCs: **keine**.
- Inhalte: **keine**.
