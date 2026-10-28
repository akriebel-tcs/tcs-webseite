# Batch 19 — Restschuld + zentrale Anwendungs-Gates (Abnahme)

Datum: 2026-06-04

## Ausgangslage
- `gelb_restschuld_ohne_bindung`: 33 Befunde (vor Batch 19)
- 27 davon waren Audit-False-Positives durch falsch zugeordnete `pageKey` in 7 `anwendungen/`-Pages.
- 6 davon waren legitime Infrastruktur-Hardcodes ohne Section-Charakter.

## Maßnahmen

### 1. pageKey-Korrektur in 7 Anwendungs-Pages (Spiegel-Regel)
`useCmsI18n(...)` Erstargument an echte CMS-Seite gekoppelt:
- `BidirektionaleVideoPage`, `ConciergePage`, `DigitaleNamensverwaltungPage`,
  `FeuerwehrdurchsagePage`, `InterneKommunikationPage`,
  `MobileTuerkommunikationPage`, `ZutrittskontrolleBCMPage`

Wirkung: DB-Sections aus `anwendungen.<slug>` werden jetzt vom Renderer korrekt
gefunden. Dadurch wurden anschließend 24 vorher unsichtbare „Klasse-A"-
Lücken sichtbar (Admin-Schalter wirkungslos).

### 2. Zentraler Visibility-Gate in `AnwendungDetailPage`
Vier Standard-Sections werden in der Wrapper-Komponente an `cms.sections`
gekoppelt. Wenn die Seite keinen `pageKey` hat oder keine Sections lädt
(Legacy/Fallback), bleibt alles sichtbar — keine Regression.

```ts
const cmsHasSections = !!pageKey && cms.sections.length > 0;
const anforderungenActive   = !cmsHasSections || cms.sections.some((s) => s.section_key === "anforderungen");
const leistungenActive      = !cmsHasSections || cms.sections.some((s) => s.section_key === "leistungen");
const systembausteineActive = !cmsHasSections || cms.sections.some((s) => s.section_key === "systembausteine");
const broschureActive       = !cmsHasSections || cms.sections.some((s) => s.section_key === "broschure");
```

Wrapping der 4 Render-Blöcke entsprechend, mit `data-cms-section`-Marker.

### 3. Audit-Script lernt den zentralen Anwendungs-Gate
`scripts/cms/public-blocks-ignorieren-admin-visibility.mjs`:
- `hasGate()` erkennt jetzt Pages, die über `AnwendungDetailPage` mit `pageKey`
  laufen, analog zur bestehenden `CmsPageLayout`-Hero-Ausnahme.
- Klasse-B-Schleife überspringt die 4 zentralen Keys (`anforderungen`,
  `leistungen`, `systembausteine`, `broschure`) wenn der Wrapper benutzt wird.

### 4. Whitelist `KNOWN_HARDCODED_OK`
Infrastruktur-Helper, die bewusst kein CMS-Section sind und auch keinen werden:

| page_key | hardcoded_key | Grund |
|---|---|---|
| `anwendungen.referenzen.detail` | `notFound`, `sections`, `cta` | Detail-Wrapper-Logik, kein redaktioneller Block |
| `anwendungen.referenzprojekte` | `projekte` | Projektliste aus separater Quelle |
| `eingangssysteme.root` | `discover` | Navigations-/Discover-Liste |
| `gebaeudekommunikation.root` | `bereiche` | Bereichsnavigation |
| `gebaeudemanagement.root` | `functions` | Funktionsnavigation |
| `serviceportal.login` | `sections` | Parkiert (Login zuletzt) |

## Ergebnis

| Audit | Vor B19 | Nach B19 |
|---|---:|---:|
| `gelb_restschuld_ohne_bindung` | 33 | **0** |
| `gelb_medium_kandidat` (Admin-Schalter wirkungslos) | (verdeckt) | **0** |
| `rot_high_blocker` | 0 | **0** |
| `grau_vermutlich_gegated` | 2 | 2 (CTA-Erbe, Heuristik) |
| Globaler Spiegel-Audit | 0 | **0** |
| Wahrheits-Check CI | grün | **grün** |

## Geänderte Dateien
- `src/features/anwendungen/components/AnwendungDetailPage.tsx`
  (4 zentrale Sichtbarkeits-Gates + Marker)
- `scripts/cms/public-blocks-ignorieren-admin-visibility.mjs`
  (Anwendungs-Wrapper-Erkennung, `KNOWN_HARDCODED_OK`)
- 7 Anwendungs-Page-Files (pageKey-Korrektur, in Vorlauf von Batch 19)
- Diverse Audit-Snapshots `.json`/`.md`
- `docs/04-betrieb/faq-cta-toggle-inventar.md`,
  `src/features/admin/lib/knownPageObjectContracts.ts` (Harvester-Re-Snapshot)

## Empfehlung
- „Eine Wahrheit" — Launch-kritisch: weiterhin **100 % geschlossen**.
- Verbleibende offene Fronten:
  - `aktive-db-sections-ohne-renderpfad`: 41 (Klasse D1, primär Detail-/Sub-
    Sections ohne dedizierte Renderer — meist Karten-/Listen-Items).
  - 13 Pages `public_ohne_admin_pflege` (Layout-/Textseiten ohne Spiegel-Bruch).
- Nächster sinnvoller Batch 20: Klasse D1 triagieren — viele Befunde dort sind
  vermutlich `card_v1`-Kindsections, die der Renderer schon zeigt, aber im
  Audit als ungerendert geführt werden (vergleichbar mit dem Standardkarten-
  Slotvertrag-Fall aus Batch 15). Erst Kalibrierung, dann fehlende Renderer.
