# D3/D5-Rest — Triage (Sprint 2k)

_Generiert: 2026-06-01T16:04:35.302Z_

Quelle: `scripts/cms/d3-d5-rest-triage.mjs` (read-only RPC `rpc_admin_export_contract_drift`).

## Klassen

| Klasse | Bedeutung |
|---|---|
| S1 | sicher seedbar, redaktionell sinnvoll |
| S2 | sicher whitelistingfähig, DB-Feld nur bei Bedarf |
| S3 | optional/variantenspezifisch, nicht pauschal seeden |
| S4 | Vertrag wahrscheinlich zu breit (Varianten nötig) |
| S5 | Spezialrenderer / i18n-Fallback — späterer Sprint |
| S6 | Legacy/Alias/Asset-Slot — nicht seeden |
| S7 | D9 / inaktiv / archiviert — nicht seeden |

## Summen

- D3 (Vertragsfelder ohne DB-Zeile, nur aktive Sections): **2004**
- D5 (Vertragsfelder ohne Whitelist-Eintrag, nur aktive Sections): **2000**

### D3 nach Klasse

| Klasse | Count |
|---|---:|
| S1 | 5 |
| S2 | 38 |
| S3 | 1541 |
| S4 | 88 |
| S5 | 256 |
| S7 | 76 |

### D5 nach Klasse

| Klasse | Count |
|---|---:|
| S1 | 5 |
| S2 | 38 |
| S3 | 1541 |
| S4 | 88 |
| S5 | 256 |
| S7 | 72 |

## D3 — Top-Gruppen (section_type · field_key · Klasse)

| section_type | field_key | Klasse | Sections | Pages | Begründung |
|---|---|---|---:|---:|---|
| hero_v1 | `cta_label` | S5 | 92 | 92 | Hero-CTA heute oft aus i18n; Abbau geplant |
| hero_v1 | `cta_href` | S5 | 92 | 92 | Hero-CTA heute oft aus i18n; Abbau geplant |
| card_v1 | `href` | S4 | 88 | 17 | href dupliziert cta_href — Variantenmodell trennt Click-/CTA-Karte |
| card_v1 | `features.0` | S3 | 88 | 17 | Für Variante `image_card` nicht vorgesehen — Admin filtert es heraus, kein Seeding |
| card_v1 | `features.1` | S3 | 88 | 17 | Für Variante `image_card` nicht vorgesehen — Admin filtert es heraus, kein Seeding |
| card_v1 | `features.2` | S3 | 88 | 17 | Für Variante `image_card` nicht vorgesehen — Admin filtert es heraus, kein Seeding |
| card_v1 | `features.3` | S3 | 88 | 17 | Für Variante `image_card` nicht vorgesehen — Admin filtert es heraus, kein Seeding |
| card_v1 | `features.4` | S3 | 88 | 17 | Für Variante `image_card` nicht vorgesehen — Admin filtert es heraus, kein Seeding |
| card_v1 | `link_1_label` | S3 | 88 | 17 | Für Variante `image_card` nicht vorgesehen — Admin filtert es heraus, kein Seeding |
| card_v1 | `link_1_href` | S3 | 88 | 17 | Für Variante `image_card` nicht vorgesehen — Admin filtert es heraus, kein Seeding |
| card_v1 | `link_1_kind` | S3 | 88 | 17 | Für Variante `image_card` nicht vorgesehen — Admin filtert es heraus, kein Seeding |
| card_v1 | `link_2_label` | S3 | 88 | 17 | Für Variante `image_card` nicht vorgesehen — Admin filtert es heraus, kein Seeding |
| card_v1 | `link_2_href` | S3 | 88 | 17 | Für Variante `image_card` nicht vorgesehen — Admin filtert es heraus, kein Seeding |
| card_v1 | `link_2_kind` | S3 | 88 | 17 | Für Variante `image_card` nicht vorgesehen — Admin filtert es heraus, kein Seeding |
| card_v1 | `link_3_label` | S3 | 88 | 17 | Für Variante `image_card` nicht vorgesehen — Admin filtert es heraus, kein Seeding |
| card_v1 | `link_3_href` | S3 | 88 | 17 | Für Variante `image_card` nicht vorgesehen — Admin filtert es heraus, kein Seeding |
| card_v1 | `link_3_kind` | S3 | 88 | 17 | Für Variante `image_card` nicht vorgesehen — Admin filtert es heraus, kein Seeding |
| card_v1 | `cta_label` | S3 | 84 | 16 | CTA-Feld nur in Varianten mit CTA (`image_card`) |
| card_v1 | `cta_href` | S3 | 84 | 17 | CTA-Feld nur in Varianten mit CTA (`image_card`) |
| card_v1 | `subtitle` | S3 | 73 | 15 | Subtitle optional, variantenspezifisch |
| card_v1 | `icon` | S3 | 51 | 13 | Für Variante `image_card` nicht vorgesehen — Admin filtert es heraus, kein Seeding |
| hero_v1 | `eyebrow` | S5 | 31 | 31 | Hero-Header heute oft aus i18n (S2-Seiten) |
| hero_v1 | `subline` | S5 | 21 | 21 | Hero-Header heute oft aus i18n (S2-Seiten) |
| hero_v1 | `headline` | S5 | 20 | 20 | Hero-Header heute oft aus i18n (S2-Seiten) |
| cards_v1 | `intro` | S2 | 15 | 15 | Container-Header sinnvoll — Whitelist eintragen, DB-Zeile bei Bedarf |
| content_v1 | `title` | S2 | 12 | 2 | Container-Header sinnvoll — Whitelist eintragen, DB-Zeile bei Bedarf |
| content_v1 | `label` | S2 | 10 | 2 | Container-Header sinnvoll — Whitelist eintragen, DB-Zeile bei Bedarf |
| content_v1 | `text` | S3 | 6 | 2 | Standard-Default: optional, vor Seeding fachlich prüfen |
| card_v1 | `description` | S1 | 5 | 1 | Karten-Basisfeld (gilt für alle Varianten) — sicher seedbar |
| catalog_filter_grid_v1 | `label` | S3 | 4 | 4 | Standard-Default: optional, vor Seeding fachlich prüfen |
| card_v1 | `description` | S7 | 4 | 1 | Section ist in D9 (Vertragsverletzung) — kein Seeding bevor D9 entschieden |
| card_v1 | `icon` | S7 | 4 | 1 | Section ist in D9 (Vertragsverletzung) — kein Seeding bevor D9 entschieden |
| card_v1 | `cta_label` | S7 | 4 | 1 | Section ist in D9 (Vertragsverletzung) — kein Seeding bevor D9 entschieden |
| card_v1 | `cta_href` | S7 | 4 | 1 | Section ist in D9 (Vertragsverletzung) — kein Seeding bevor D9 entschieden |
| card_v1 | `href` | S7 | 4 | 1 | Section ist in D9 (Vertragsverletzung) — kein Seeding bevor D9 entschieden |
| card_v1 | `features.0` | S7 | 4 | 1 | Section ist in D9 (Vertragsverletzung) — kein Seeding bevor D9 entschieden |
| card_v1 | `features.1` | S7 | 4 | 1 | Section ist in D9 (Vertragsverletzung) — kein Seeding bevor D9 entschieden |
| card_v1 | `features.2` | S7 | 4 | 1 | Section ist in D9 (Vertragsverletzung) — kein Seeding bevor D9 entschieden |
| card_v1 | `features.3` | S7 | 4 | 1 | Section ist in D9 (Vertragsverletzung) — kein Seeding bevor D9 entschieden |
| card_v1 | `features.4` | S7 | 4 | 1 | Section ist in D9 (Vertragsverletzung) — kein Seeding bevor D9 entschieden |
| card_v1 | `link_1_label` | S7 | 4 | 1 | Section ist in D9 (Vertragsverletzung) — kein Seeding bevor D9 entschieden |
| card_v1 | `link_1_href` | S7 | 4 | 1 | Section ist in D9 (Vertragsverletzung) — kein Seeding bevor D9 entschieden |
| card_v1 | `link_1_kind` | S7 | 4 | 1 | Section ist in D9 (Vertragsverletzung) — kein Seeding bevor D9 entschieden |
| card_v1 | `link_2_label` | S7 | 4 | 1 | Section ist in D9 (Vertragsverletzung) — kein Seeding bevor D9 entschieden |
| card_v1 | `link_2_href` | S7 | 4 | 1 | Section ist in D9 (Vertragsverletzung) — kein Seeding bevor D9 entschieden |
| card_v1 | `link_2_kind` | S7 | 4 | 1 | Section ist in D9 (Vertragsverletzung) — kein Seeding bevor D9 entschieden |
| card_v1 | `link_3_label` | S7 | 4 | 1 | Section ist in D9 (Vertragsverletzung) — kein Seeding bevor D9 entschieden |
| card_v1 | `link_3_href` | S7 | 4 | 1 | Section ist in D9 (Vertragsverletzung) — kein Seeding bevor D9 entschieden |
| card_v1 | `link_3_kind` | S7 | 4 | 1 | Section ist in D9 (Vertragsverletzung) — kein Seeding bevor D9 entschieden |
| catalog_filter_grid_v1 | `intro` | S3 | 3 | 3 | Standard-Default: optional, vor Seeding fachlich prüfen |

## D5 — Top-Gruppen

| section_type | field_key | Klasse | Sections | Pages | Begründung |
|---|---|---|---:|---:|---|
| hero_v1 | `cta_label` | S5 | 92 | 92 | Hero-CTA heute oft aus i18n; Abbau geplant |
| hero_v1 | `cta_href` | S5 | 92 | 92 | Hero-CTA heute oft aus i18n; Abbau geplant |
| card_v1 | `href` | S4 | 88 | 17 | href dupliziert cta_href — Variantenmodell trennt Click-/CTA-Karte |
| card_v1 | `features.0` | S3 | 88 | 17 | Für Variante `image_card` nicht vorgesehen — Admin filtert es heraus, kein Seeding |
| card_v1 | `features.1` | S3 | 88 | 17 | Für Variante `image_card` nicht vorgesehen — Admin filtert es heraus, kein Seeding |
| card_v1 | `features.2` | S3 | 88 | 17 | Für Variante `image_card` nicht vorgesehen — Admin filtert es heraus, kein Seeding |
| card_v1 | `features.3` | S3 | 88 | 17 | Für Variante `image_card` nicht vorgesehen — Admin filtert es heraus, kein Seeding |
| card_v1 | `features.4` | S3 | 88 | 17 | Für Variante `image_card` nicht vorgesehen — Admin filtert es heraus, kein Seeding |
| card_v1 | `link_1_label` | S3 | 88 | 17 | Für Variante `image_card` nicht vorgesehen — Admin filtert es heraus, kein Seeding |
| card_v1 | `link_1_href` | S3 | 88 | 17 | Für Variante `image_card` nicht vorgesehen — Admin filtert es heraus, kein Seeding |
| card_v1 | `link_1_kind` | S3 | 88 | 17 | Für Variante `image_card` nicht vorgesehen — Admin filtert es heraus, kein Seeding |
| card_v1 | `link_2_label` | S3 | 88 | 17 | Für Variante `image_card` nicht vorgesehen — Admin filtert es heraus, kein Seeding |
| card_v1 | `link_2_href` | S3 | 88 | 17 | Für Variante `image_card` nicht vorgesehen — Admin filtert es heraus, kein Seeding |
| card_v1 | `link_2_kind` | S3 | 88 | 17 | Für Variante `image_card` nicht vorgesehen — Admin filtert es heraus, kein Seeding |
| card_v1 | `link_3_label` | S3 | 88 | 17 | Für Variante `image_card` nicht vorgesehen — Admin filtert es heraus, kein Seeding |
| card_v1 | `link_3_href` | S3 | 88 | 17 | Für Variante `image_card` nicht vorgesehen — Admin filtert es heraus, kein Seeding |
| card_v1 | `link_3_kind` | S3 | 88 | 17 | Für Variante `image_card` nicht vorgesehen — Admin filtert es heraus, kein Seeding |
| card_v1 | `cta_label` | S3 | 84 | 16 | CTA-Feld nur in Varianten mit CTA (`image_card`) |
| card_v1 | `cta_href` | S3 | 84 | 17 | CTA-Feld nur in Varianten mit CTA (`image_card`) |
| card_v1 | `subtitle` | S3 | 73 | 15 | Subtitle optional, variantenspezifisch |
| card_v1 | `icon` | S3 | 51 | 13 | Für Variante `image_card` nicht vorgesehen — Admin filtert es heraus, kein Seeding |
| hero_v1 | `eyebrow` | S5 | 31 | 31 | Hero-Header heute oft aus i18n (S2-Seiten) |
| hero_v1 | `subline` | S5 | 21 | 21 | Hero-Header heute oft aus i18n (S2-Seiten) |
| hero_v1 | `headline` | S5 | 20 | 20 | Hero-Header heute oft aus i18n (S2-Seiten) |
| cards_v1 | `intro` | S2 | 15 | 15 | Container-Header sinnvoll — Whitelist eintragen, DB-Zeile bei Bedarf |
| content_v1 | `title` | S2 | 12 | 2 | Container-Header sinnvoll — Whitelist eintragen, DB-Zeile bei Bedarf |
| content_v1 | `label` | S2 | 10 | 2 | Container-Header sinnvoll — Whitelist eintragen, DB-Zeile bei Bedarf |
| content_v1 | `text` | S3 | 6 | 2 | Standard-Default: optional, vor Seeding fachlich prüfen |
| card_v1 | `description` | S1 | 5 | 1 | Karten-Basisfeld (gilt für alle Varianten) — sicher seedbar |
| catalog_filter_grid_v1 | `label` | S3 | 4 | 4 | Standard-Default: optional, vor Seeding fachlich prüfen |
| card_v1 | `description` | S7 | 4 | 1 | Section ist in D9 |
| card_v1 | `cta_label` | S7 | 4 | 1 | Section ist in D9 |
| card_v1 | `cta_href` | S7 | 4 | 1 | Section ist in D9 |
| card_v1 | `href` | S7 | 4 | 1 | Section ist in D9 |
| card_v1 | `features.0` | S7 | 4 | 1 | Section ist in D9 |
| card_v1 | `features.1` | S7 | 4 | 1 | Section ist in D9 |
| card_v1 | `features.2` | S7 | 4 | 1 | Section ist in D9 |
| card_v1 | `features.3` | S7 | 4 | 1 | Section ist in D9 |
| card_v1 | `features.4` | S7 | 4 | 1 | Section ist in D9 |
| card_v1 | `link_1_label` | S7 | 4 | 1 | Section ist in D9 |
| card_v1 | `link_1_href` | S7 | 4 | 1 | Section ist in D9 |
| card_v1 | `link_1_kind` | S7 | 4 | 1 | Section ist in D9 |
| card_v1 | `link_2_label` | S7 | 4 | 1 | Section ist in D9 |
| card_v1 | `link_2_href` | S7 | 4 | 1 | Section ist in D9 |
| card_v1 | `link_2_kind` | S7 | 4 | 1 | Section ist in D9 |
| card_v1 | `link_3_label` | S7 | 4 | 1 | Section ist in D9 |
| card_v1 | `link_3_href` | S7 | 4 | 1 | Section ist in D9 |
| card_v1 | `link_3_kind` | S7 | 4 | 1 | Section ist in D9 |
| catalog_filter_grid_v1 | `intro` | S3 | 3 | 3 | Standard-Default: optional, vor Seeding fachlich prüfen |
| rich_v1 | `body` | S3 | 1 | 1 | Standard-Default: optional, vor Seeding fachlich prüfen |

## Seed-Entscheidung

- Modus: **dry-run**
- Anwenden in Sprint 2k: **nein**
- S1-Kandidaten (D3): 5
- S2-Kandidaten (D3): 38
- Begründung: Sprint 2k: keine S1-Gruppe ist klein/sauber genug für blindes Seeding. card_v1.title/description ist über alle 165+ aktiven Karten verteilt — zuerst Variantenmodell (Sprint 2l) klären, dann gezielt seeden.

## Empfehlung Sprint 2l (Vertragsschärfung)

1. **`card_v1` aufteilen oder Feldgruppen einführen** — heute deklariert der Vertrag `href`, `cta_label`, `cta_href`, `link_1..3_*`, `features.0..4`, `icon`, `subtitle` als Pflicht/Standardfelder für **alle** Karten. Renderer-seitig sind das aber Variantenfelder:
   - Click-Card: nur `href` (oder `cta_href`)
   - CTA-Card: `cta_label`+`cta_href`
   - Icon-Card (feature_grid_v1-Kinder): `icon`, kein `image`
   - Download-Card (download_list_v1-Kinder): `file_label`, `cta_href`
   - Multi-Link-Card: `link_1..3_*`
   - Feature-Card: `features.0..4`
   Vorschlag: `card_v1` behält nur `title`/`description` als Standard, alle anderen werden in **Variantengruppen** verschoben, die abhängig vom Parent-Container freigegeben werden.
2. **`hero_v1`-i18n-Fallback** für S2-Seiten in Sprint 2l auflösen — gezielt pro Bereich, nicht pauschal.
3. **`cards_v1`/`content_v1` Container-Header** (`label`/`title`/`intro`) optional kennzeichnen statt erwartet — Renderer behandelt sie bereits als optional.

---

**Hinweis:** Dieses Triage-Audit ist read-only. Es ändert keine Inhalte, keine Bilder, keine Whitelist und keine Public-Renderer.
