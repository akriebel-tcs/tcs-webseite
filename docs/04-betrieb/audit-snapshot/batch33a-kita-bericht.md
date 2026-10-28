# Batch 33a — Kita standardisiert (Vorlauf, ohne Renderer-Umschaltung)

Stand: 2026-06-05. Teil 1 der zerlegten P-057-Standardisierung.

## Was passiert ist (alles auf P-057 `anwendungen.bildungseinrichtungen`)

1. **20 neue Standard-Sections** für die Kita angelegt:
   - 1× `teaser_2col_v1` (`einrichtung_kita`, sort 100)
   - 1× `cards_v1` Anforderungen (`anforderungen_kita`, sort 110) + 5× `card_v1` Kinder
   - 3× `cards_v1` Leistungen (sort 120/122/124) + je 3× `card_v1` Kinder = 9
   - 1× `cta_v1` Broschürenlink (`broschure_kita`, sort 160)
2. **Parent-Verknüpfungen** (`parent_section_id`) für alle 14 Kind-`card_v1` korrekt gesetzt.
3. **72 `cms_section_fields`** DE+EN (Texte, Icons, Bilder, CTA-Label/Link)
   1:1 aus den alten Sondercontainern `sections` + `einrichtungen` übernommen.
4. **1 Bild** (`cms_assets`) für den Kita-Teaser aus dem alten Container in den
   neuen `einrichtung_kita` kopiert (idempotent via NOT EXISTS).
5. **Whitelist (`cms_admin_editable_fields`)**: 25 Container-Felder
   (Teaser/Cards/CTA) freigegeben; Karten-Whitelist (72 Felder je `card_v1`)
   wird vom System automatisch erzeugt.
6. **Neue Sections vorerst `is_active=false`** gesetzt, damit Public weiter
   ausschließlich aus den alten Containern rendert und kein Doppelblock
   entsteht. Reaktivierung in Batch 33d zusammen mit der Renderer-Umschaltung.

## Was bewusst NICHT passiert ist

- `BildungseinrichtungenPage.tsx` **nicht verändert**. Renderer liest weiter aus
  `sections` + `einrichtungen`.
- Alte Container B-255 `sections` / B-256 `einrichtungen` **bleiben aktiv**.
- Navigation, Routing, `cms_pages`, Bespoke-Registry: **unangetastet**.
- Keine Schule-/Wohnheim-Sections angelegt — kommen in Batch 33b/c.

## Verifikation

- `node scripts/cms/wahrheits-check-ci.mjs` → **grün** („Harvester
  reproduzierbar, keine Drift, Launch-Gate erfüllt").
- Public-Seite P-057 unverändert (alte Container rendern weiter, neue Sections
  sind inaktiv → kein Doppelrender).
- `npm run build` nicht gesondert ausgeführt: kein Codepfad geändert.

## Idempotenz

Migration `docs/04-betrieb/audit-snapshot/batch33a-kita-migration.sql`
nutzt durchgängig `ON CONFLICT DO NOTHING` (Sections, Fields) bzw.
`ON CONFLICT DO UPDATE SET is_enabled=EXCLUDED.is_enabled` (Whitelist) und
`NOT EXISTS` (Asset-Kopie). Re-Lauf verändert nichts an redaktionellen Edits.

## Nächster Schritt

Auf Anweisung: **Batch 33b — Schule standardisieren** nach demselben Muster.
