# Batch 34b — P-071 Renderer-Umschaltung & Legacy-Deaktivierung

Datum: 2026-06-05
Seite: P-071 `anwendungen.interne-kommunikation` (`/anwendungen/interne-kommunikation`)
Status: ✅ abgeschlossen, Wahrheits-Check grün.

## Auftrag

Nach Batch 34a (Staging) jetzt:
1. Die in Batch 34a parallel angelegten Standard-Sections live schalten.
2. Renderer-Datei DB-first umbauen (gleiches Muster wie P-057 / Batch 33d).
3. Alte Sondercontainer (`content_v1`) sauber ausblenden — nicht löschen.

## Was wurde geändert

### A) DB (data-only, idempotent)

In `cms_sections` für `page_key='anwendungen.interne-kommunikation'`:

- **Aktiviert** (`is_active=true`) und in finale Reihenfolge gebracht:
  - `einrichtung_intern` (teaser_2col_v1) — sort 1
  - `leistungen_intern_kommunikation` (cards_v1, 4 Karten) — sort 3
  - `leistungen_intern_automatik`     (cards_v1, 3 Karten) — sort 4
  - `leistungen_intern_einsatz`       (cards_v1, 4 Karten) — sort 5
  - `systembausteine_intern`          (cards_v1, 4 Karten) — sort 6
  - `broschure_intern`                (cta_v1)             — sort 7
  - Alle Kind-Cards der vier `cards_v1`-Container ebenfalls aktiv geschaltet.

- **Umsortiert** (unverändert aktiv):
  - `hero` (hero_v1) → sort 0
  - `anforderungen` (cards_v1, Bestandsdaten) → sort 2
  - `faq` (faq_v1) → sort 8
  - `standard_cta` (cta_v1) → sort 9

- **Deaktiviert** (`is_active=false`, Daten bleiben als Backup erhalten):
  - `content`         (content_v1)
  - `leistungen`      (content_v1)
  - `systembausteine` (content_v1)
  - `broschure`       (content_v1)

Keine Inhalte umgeschrieben, keine Felder gelöscht. Die alten Container und
ihre Felder existieren weiter im Backup — nur die RLS-Sicht filtert sie aus.

### B) Code

`src/features/anwendungen/pages/InterneKommunikationPage.tsx` komplett DB-first
umgeschrieben (Muster wie `BildungseinrichtungenPage.tsx` aus Batch 33d):

- Kein `AnwendungDetailPage` mehr.
- Kein hartkodierter Broschüre-Link, keine hartkodierten Icon-/Items-Listen
  über `useCmsI18n` mehr.
- Iteriert über `SECTION_ORDER` und ruft pro Section
  `renderPageSectionByType(...)` aus `@/features/cms/lib/renderPageSection`.
- `broschure_intern` (cta_v1) wird inline als kleiner Download-Link
  gerendert (`BroschureLink`), nicht als Tail-CTA — gleiches Muster wie P-057.
- `standard_cta` läuft automatisch über `CmsPageLayout` → `CmsTailCta`.

## Spiegel-Regel / Doppelrender

- Hero wird ausschließlich über `CmsPageLayout` aus DB gerendert.
- `standard_cta` ausschließlich über `CmsTailCta`.
- Keine eigenständigen Sections im Code, alle Inhalte stammen aus
  `cms_sections` / `cms_section_fields` / `cms_assets`.
- Doppelrender ausgeschlossen, da die alten `content_v1`-Container per RLS
  nicht mehr ausgeliefert werden und der neue Renderer ausschließlich aus dem
  DB-Snapshot iteriert.

## Prüfungen

- ✅ `node scripts/cms/wahrheits-check-ci.mjs` — grün (keine Drift, Body-Map
  vollständig, Launch-Gate erfüllt, FAQ/CTA orphan/mixed/dedup-only = 0).
- ✅ Harvester-Bericht `docs/04-betrieb/faq-cta-toggle-inventar.md` aktualisiert.
- ✅ Migration ist idempotent (Re-Run ändert nichts).

## Bekannte, nicht in diesem Batch gefixte Punkte

- **`anforderungen`-Container hat aktuell 4 Karten** (durchsage, automatik,
  mobil, integration), nicht 5. Die ursprüngliche Anforderung
  „raumZuRaum" existiert in den Legacy-i18n-Keys, aber nicht als eigene
  Karte in der DB. Der Nutzer wünscht 5 Karten (3+2 oder 4+1) — das ist
  **Inhaltspflege** und wurde laut Auftrag nicht in diesem Batch
  durchgeführt. → Folgeauftrag: 5. Karte „raumZuRaum" über Admin/Prompt
  unter `anforderungen` ergänzen.

## Bewusst NICHT geändert

- Navigation (`cms_navigation_nodes`) unverändert (N-100 bleibt wie bisher).
- Keine neuen Seiten, keine Produktkatalog-/PDP-Berührung, kein Auth-Code.
- Alte Sondercontainer bleiben als Backup in der DB (nicht gelöscht).
- Keine Verlinkung von P-057 → P-071 (das ist **Batch 34c**, separat).

## Folgekandidaten

- **Batch 34c**: Verlinkung — pro Einrichtung (Kita / Schule / Wohnheim)
  in `leistungen_<id>_kommunikation` eine zusätzliche Karte mit Link auf
  `/anwendungen/interne-kommunikation`.
- Inhaltspflege: 5. Anforderungs-Karte „raumZuRaum" ergänzen.
- Optional: Legacy `content_v1`-Sections nach Stabilisierungsphase entfernen
  (nicht in diesem Batch).

## Backout

Falls nötig, Rollback durch:

```sql
UPDATE cms_sections SET is_active = false
 WHERE page_key='anwendungen.interne-kommunikation'
   AND section_key IN (
     'einrichtung_intern','leistungen_intern_kommunikation',
     'leistungen_intern_automatik','leistungen_intern_einsatz',
     'systembausteine_intern','broschure_intern'
   );
UPDATE cms_sections SET is_active = true
 WHERE page_key='anwendungen.interne-kommunikation'
   AND section_key IN ('content','leistungen','systembausteine','broschure')
   AND section_type='content_v1';
```

Und `InterneKommunikationPage.tsx` aus Git auf den Stand vor Batch 34b
zurückrollen.
