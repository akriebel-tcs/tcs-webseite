# Batch 34a — P-071 Standard-Sections gestaged (inaktiv)

Stand: 2026-06-05 · Status: erledigt, Stage-Stand inaktiv im Admin sichtbar.
Folgebatches 34b (Renderer-Umschaltung) + 34c (Verlinkung von P-057) noch offen.

## Auftrag

Seite **P-071 `anwendungen.interne-kommunikation`** (T05 Detail-Seite)
strukturell auf das Bildungseinrichtungen-Muster bringen
(vgl. Batch 33a–d). Die bisherigen `content_v1`-Blöcke (`content`,
`leistungen`, `systembausteine`, `broschure`) sollen durch
Standard-Bausteine ersetzt werden.

Variante A (vom Auftrag bestätigt):
- 1× `teaser_2col_v1` für den Einrichtungs-/Themenblock
- 3× `cards_v1` für die Systemleistungs-Gruppen (Kommunikation,
  Türöffnerautomatik, Einsatzbereiche)
- 1× `cards_v1` für die Systembausteine (Innen / Leitstelle /
  Türöffnermodule / Außen)
- 1× `cta_v1` für die Broschüre
- Anforderungen-Karten bleiben bei 5 (3+2 Raster), keine
  Inhaltsänderung.

## Umgesetzt in Batch 34a

Reine Stage-Migration. **Alle neuen Sections sind `is_active=false`**,
damit kein Public-Doppelrender entsteht. Die alten Sections
(`content`, `leistungen`, `systembausteine`, `broschure`) bleiben
unverändert aktiv — die öffentliche Seite rendert weiter aus der
bestehenden Quelle.

### Neue Sections (21)

| section_key | section_type | sort_order | is_active |
|---|---|---|---|
| `einrichtung_intern` | `teaser_2col_v1` | 900 | false |
| `leistungen_intern_kommunikation` | `cards_v1` | 901 | false |
| `leistungen_intern_automatik` | `cards_v1` | 902 | false |
| `leistungen_intern_einsatz` | `cards_v1` | 903 | false |
| `systembausteine_intern` | `cards_v1` | 904 | false |
| `broschure_intern` | `cta_v1` | 905 | false |
| `leist_intern_komm_1…4` | `card_v1` | 1–4 | false |
| `leist_intern_auto_1…3` | `card_v1` | 1–3 | false |
| `leist_intern_eins_1…4` | `card_v1` | 1–4 | false |
| `sys_intern_innen` / `_leitstelle` / `_tueroeffner` / `_aussen` | `card_v1` | 1–4 | false |

`parent_section_id` für alle 15 `card_v1`-Kinder gesetzt
(`leistungen_intern_*` → 4/3/4 Kinder, `systembausteine_intern` →
4 Kinder).

### Inhalte

- 70 redaktionelle Felder DE+EN in `cms_section_fields` 1:1 aus den
  Alt-Sections übernommen (Headline / Subline / Bullets / Produktnamen /
  Broschüren-Link). Broschüren-URL aus der bisher hartcodierten
  `InterneKommunikationPage.tsx` in die DB überführt.
- Whitelist (`cms_admin_editable_fields`) wurde durch die bestehende
  Vertrags-Logik automatisch für alle Standard-Felder der neuen
  Section-Typen freigegeben (`title`, `subtitle`, `description`,
  `icon`, `bullets.*`, `chips.*`, `link_1/2/3_*`, `image_*` für
  `card_v1`; `label`, `title`, `text`, `image_position`,
  `background_variant` für `teaser_2col_v1`; `cta_label`, `cta_href`,
  `cta_link` für `cta_v1`).

## Verifikation

- `node scripts/cms/wahrheits-check-ci.mjs` — **grün** (Harvester
  reproduzierbar, keine Drift, Launch-Gate erfüllt).
- `node scripts/cms/standardbaustein-vertrag.mjs` — die neuen
  Sections erzeugen **keine** neuen Verstöße (bestehende 88 Verstöße
  betreffen ausschließlich andere Seiten/Sections, vor allem
  `anwendungen.bildungseinrichtungen / anf_kita_*` — pre-existing,
  außerhalb dieses Batches).
- Public-Rendering: unverändert aus den alten `content_v1`-Blöcken,
  weil neue Sections inaktiv sind und RLS sie herausfiltert.

## Nicht im Scope dieses Batches

- Renderer-Umschaltung von `InterneKommunikationPage.tsx` auf DB-first
  → **Batch 34b**.
- Sort-Order der Alt-Sections, Deaktivierung von `content`,
  `leistungen`, `systembausteine`, `broschure` → **Batch 34b**.
- Karten-Link von P-057 (Bildungseinrichtungen) auf P-071 → **Batch
  34c**, pro Einrichtung im Kommunikation-Block.
- Bild für `einrichtung_intern`: bisher kein eigenes `cms_assets`-Slot
  angelegt. Falls die Redaktion ein eigenes Bild wünscht, wird der
  Slot beim Renderer-Umbau in 34b ergänzt; sonst bleibt der Bild/Text-
  Baustein bildlos oder erbt das Hero-Bild.

## Backout

Idempotent rückbaubar:

```sql
DELETE FROM cms_admin_editable_fields
WHERE page_key='anwendungen.interne-kommunikation'
  AND section_key IN (
    'einrichtung_intern','leistungen_intern_kommunikation',
    'leistungen_intern_automatik','leistungen_intern_einsatz',
    'systembausteine_intern','broschure_intern',
    'leist_intern_komm_1','leist_intern_komm_2','leist_intern_komm_3','leist_intern_komm_4',
    'leist_intern_auto_1','leist_intern_auto_2','leist_intern_auto_3',
    'leist_intern_eins_1','leist_intern_eins_2','leist_intern_eins_3','leist_intern_eins_4',
    'sys_intern_innen','sys_intern_leitstelle','sys_intern_tueroeffner','sys_intern_aussen'
  );

DELETE FROM cms_sections
WHERE page_key='anwendungen.interne-kommunikation'
  AND section_key IN ( /* gleiche Liste */ );
```

(Felder werden über `cms_section_fields_section_fkey` mit
`ON DELETE CASCADE` automatisch entfernt.)

## Nächster Schritt

Auf ausdrückliche Beauftragung **Batch 34b** starten:
`InterneKommunikationPage.tsx` analog zu
`BildungseinrichtungenPage.tsx` (Batch 33d) auf
`renderPageSectionByType` umstellen, neue Sections aktivieren,
Alt-Sections deaktivieren, Sort-Order final setzen
(hero=0, anforderungen=1, einrichtung_intern=2, leistungen_intern_*=3–5,
systembausteine_intern=6, broschure_intern=7, faq=8, standard_cta=9),
Wahrheits-Check + Build verifizieren.
