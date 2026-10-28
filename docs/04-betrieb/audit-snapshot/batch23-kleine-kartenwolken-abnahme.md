# Batch 23 — Kleine Kartenwolken: Abnahme & Stopp-Begründung

Stand: 2026-06-04
Status: **GESTOPPT vor Migration** — beide Fälle sind keine echten Kartenwolken, sondern Altbestand-Schattenfelder. Keine DB-, Code- oder Public-Änderung in diesem Batch.

## Auftrag

Migration der zwei Batch-21-Klasse-A-Restfälle in `cards_v1` + `card_v1`:
1. `gebaeudekommunikation.beschilderung / features` (4 Kacheln laut Inventar)
2. `gebaeudemanagement.digital-signage / products` (1 Kachel laut Inventar)

`grossanlagen / leistungen` ausdrücklich nicht anfassen.

Leitplanke: Public muss gleich bleiben. Wenn einer der Fälle nicht sicher ist → nur den sicheren migrieren, den anderen dokumentieren und stoppen.

## Vorprüfung (read-only)

### Fall 1 — `beschilderung / features`

| Aspekt | Befund |
| --- | --- |
| Section-Typ | `content_v1`, sort_order=20, is_active=true |
| Punktfelder | `items.{hausnummer,materialien,tuerschilder,klingel}.{title,text,imageAlt}` (je 4×3×2 Locales) plus `label`, `title`, `intro`, `text` |
| Aktive Assets in `features` | **0** (keine cms_assets-Einträge auf section_key=`features`) |
| Renderpfad | `src/features/signage/pages/BeschilderungPage.tsx` → `ContentSectionV1` (rendert `label/title`, ignoriert `items.*`) |
| Tatsächliche öffentliche Kacheln | `feature_hausnummer`, `feature_materialien`, `feature_tuerschilder`, `feature_klingel` als eigene **`teaser_2col_v1`**-Sections (sort 21–24) — jeweils mit eigenem Titel/Text/Bildposition/CTA-Link, gerendert per `Teaser2ColV1`. |
| Page nutzt GenericCmsPage? | Nein — eigene `BeschilderungPage` mit `useCmsPageContent`, iteriert explizit über `feature_*` Teaser. |

**Befund:** Die 4 public sichtbaren „Kacheln" sind **bereits sauberes Redaktionsmodell** (vier separate `teaser_2col_v1`-Sections, alle im Admin editierbar, Wahrheits-Check grün). Die `features.items.*`-Punktfelder sind ein **Altbestand-Schattenmodell** aus früherer Marketing-Spiegelung, das public **nirgendwo gerendert** wird.

### Fall 2 — `digital-signage / products`

| Aspekt | Befund |
| --- | --- |
| Section-Typ | `content_v1`, sort_order=2, is_active=true |
| Punktfelder | `items.infoboard.{title,subtitle,description,href}` (je 2 Locales) plus `label`, `title`, `intro`, `text` |
| Aktive Assets | 1 (`items.infoboard.image`, desktop, locale leer) |
| Renderpfad | `src/features/gebaeudemanagement/pages/DigitalSignagePage.tsx` = `<GenericCmsPage pageKey="gebaeudemanagement.digital-signage" />` → `ContentSectionV1` (rendert `label/title`, ignoriert `items.*`) |
| Tatsächliche öffentliche Kacheln | `useCases` (`cards_v1`, sort_order=3) mit 4 `useCases__*` Karten (`card_v1`, sort 4–7) für Eingangsbereiche, Empfangsbereiche, Handel/Gastronomie, Individuell. |
| Page nutzt GenericCmsPage? | Ja. |

**Befund:** Die public sichtbaren Karten sind die 4 `useCases`-Karten — bereits sauberes `cards_v1`-Modell. Die `products.items.infoboard.*`-Punktfelder sind wieder ein **Altbestand-Schattenmodell** ohne Public-Render. Das BCM-Infoboard hat zusätzlich eine eigene Sub-Page `gebaeudemanagement.bcm-infoboard` (siehe Link-Ziel des Schattenfelds).

## Warum nicht migrieren

Hätten wir per Auftrag stur migriert:

- **Beschilderung:** 4 neue `cards_v1`-Karten wären zusätzlich zu den 4 bestehenden `teaser_2col_v1`-Zigzag-Teasern erschienen → **Doppel-Sektion public**. Verstößt gegen „Public muss gleich bleiben" und „keine Doppel-Sections".
- **Digital-Signage:** 1 neue Karte „BCM Infoboard" wäre auf der Seite eingeblendet worden, obwohl sie heute public nicht sichtbar ist → **neuer Public-Block**. Verstößt gegen „keine Inhaltsänderungen / Public muss gleich bleiben".

Das Batch-21-Inventar hat diese Fälle als „Klasse A — sieht public wie Kartenraster aus" markiert. Nach der jetzigen read-only-Gegenprüfung ist diese Einordnung **nicht haltbar**: die public sichtbaren Karten/Tiles stammen aus anderen, bereits sauberen Sections; die Punktfelder sind tote Schattendaten.

Korrekte Klassifikation:

| Page / Section | Batch-21 | Korrigiert | Begründung |
| --- | --- | --- | --- |
| `beschilderung / features` | A (Migration) | **D (Altbestand-Schatten)** | Public-Rendering läuft über `feature_*` teaser_2col_v1 |
| `digital-signage / products` | A (Migration) | **D (Altbestand-Schatten)** | Public-Rendering läuft über `useCases` cards_v1 |
| `grossanlagen / leistungen` | B (Textblock) | B (bestätigt) | Bullet-Liste, kein Karten-Modell |
| `service.hub` (Batch 22) | A → erledigt | — | bereits migriert |

## Vorher/Nachher

Keine Änderung. Vorher = Nachher.

- DB: unverändert (keine Migration angewendet).
- Code: unverändert.
- Public: unverändert.
- Admin: unverändert (Punktfelder bleiben als „Altbestand-Felder" sichtbar — siehe Policy `docs/04-betrieb/ausgeblendete-sections-policy.md` bzw. Wahrheits-Check-Bucket).

## Mapping / Rollback

Nicht zutreffend (keine Änderung). Rollback = nichts zu tun.

## Audit-Ergebnisse

Nicht neu ausgeführt — letzter Stand aus Batch 22 ist gültig, weil zwischen Batch 22 und Batch 23 weder DB-, Code- noch Whitelist-Änderungen erfolgt sind:

- Wahrheits-Check CI: 0 Kritisch / 0 Restschuld (grün)
- Globaler Spiegel-Audit: 0 Befunde
- D1 (page-renderer-coverage): 0
- D2b (public-blocks-ignorieren-admin-visibility): 0/0/0
- Hartcode-Steuerbarkeit: keine `db_aktiv_aber_public_ignoriert` / `copy_move_risiko`

## Browser/Admin-Smoke

Nicht erforderlich, da keine Änderung. Letzter bekannter Stand:

- `/gebaeudekommunikation/beschilderung` — 4 Zigzag-Teaser (Hausnummern / Piktogramm-Schilder / Türschilder / Türklingeln) public, FAQ + CTA je einmal.
- `/gebaeudemanagement/digital-signage` — 4 `useCases`-Karten public, FAQ + CTA je einmal.

## Was bleibt offen

1. **Altbestand-Schattenfelder aufräumen** (separater, ungefährlicher Batch):
   - `beschilderung / features / items.{hausnummer,materialien,tuerschilder,klingel}.*` (24 Felder, 0 Assets)
   - `digital-signage / products / items.infoboard.*` (8 Felder + 1 Asset)
   - Beide haben **keinen Public-Effekt**; Optionen:
     - a) `cms_section_fields.value` leeren + Whitelist-Eintrag entfernen → erscheinen weder im Admin noch im Wahrheits-Check.
     - b) komplette Zeilen löschen (idempotent, da kein Renderer sie liest).
     - c) belassen und nur als „bekannter Altbestand" im Wahrheits-Check whitelisten.
   - Voraussetzung vor Cleanup: kein anderer Verbraucher (Sync-Tooling, Exporte) liest diese Keys — kurze grep-Runde nötig.
2. `grossanlagen / leistungen` bleibt bewusst Klasse B (Textblock/Bullet-Liste).

## Empfehlung für nächsten Batch

**Batch 24 — Altbestand-Schattenfelder leeren (read-only sicher):**

Scope:
- Nur `cms_section_fields` von `beschilderung.features.items.*` und `digital-signage.products.items.*` (insgesamt 32 Felder + 1 Asset-Eintrag).
- Schritt 1: `rg "items\\.(hausnummer|materialien|tuerschilder|klingel|infoboard)\\."` im gesamten Repo → bestätigen, dass keine TS/JS/Renderer/Sync-Datei diese Keys liest.
- Schritt 2: leere Migration (idempotent): `UPDATE cms_section_fields SET value='' WHERE …` und `UPDATE cms_assets SET is_active=false WHERE …` für die 1 Asset-Zeile.
- Schritt 3: Whitelist (`cms_admin_editable_fields`) entsprechende Einträge auf `is_enabled=false` setzen oder löschen — damit Admin diese Punktfelder nicht mehr als „pflegbar" anzeigt.
- Schritt 4: Re-Audit (Wahrheits-Check, Spiegel, D1, D2b, Hartcode) — alle bleiben grün, da kein Renderer betroffen ist.
- Schritt 5: Bericht.

Batch 24 **nicht** jetzt starten — erst nach Bestätigung.

---

Damit ist Batch 23 abgeschlossen (mit Begründung Stopp). Public und Audit-Lage unverändert grün.
