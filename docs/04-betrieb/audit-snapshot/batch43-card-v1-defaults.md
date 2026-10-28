# Batch 43 — Default-Vorbelegung für `card_v1`-Standardkarten

Datum: 2026-06-05
Bereich: CMS-Light / Inhalte (Defaults, **keine** Sichtbarkeits- oder Ziel-Änderungen)
Modus: **Idempotente Daten-Backfill-Operation** auf `cms_section_fields` und
defensive Whitelist-Sicherung in `cms_admin_editable_fields`.
Keine Renderer-Änderung, keine Migration, keine RPC-Änderung,
keine Public-Sichtbarkeit verändert.

## 1. Ausgangslage (vorher)

Audit-Quelle: `cms_section_fields` × aktive `card_v1`-Sections
(746 Stück). Zähl-SQL siehe Bericht-Anhang.

| Feld | Zeilen DE/EN | leer DE | leer EN |
|---|---:|---:|---:|
| `link_1_label` | 746 / 746 | 4 | 4 |
| `link_2_label` | 721 / 721 | 0 | 0 |
| `link_3_label` | 721 / 721 | 0 | 0 |
| `bullets.0` | 721 / 721 | 689 | 692 |
| `bullets.1` | 721 / 721 | 690 | 692 |
| `bullets.2` | 721 / 721 | 693 | 694 |
| `bullets.3` | 721 / 721 | 697 | 697 |
| `bullets.4` | 721 / 721 | 699 | 699 |
| `chips.0` | 726 / 726 | 705 | 707 |
| `chips.1` | 726 / 726 | 706 | 707 |
| `chips.2` | 725 / 725 | 707 | 707 |
| `chips.3` | 721 / 721 | 721 | 721 |
| `chips.4` | 721 / 721 | 721 | 721 |

Beobachtung:

- Die Whitelist war bereits 100 % gepflegt (746/746 je Feld × Locale).
- Link-Labels waren in ~96 % der Karten schon mit den gewünschten Standard-
  texten gepflegt (`Mehr erfahren / Learn more`, `Zum Planer / To planner`,
  `Zum Konfigurator / To configurator`). Nur 25 Karten hatten gar keine
  `link_2_label`/`link_3_label`-Zeilen, 4 Karten hatten leere `link_1_label`.
- Bulletpoints/Chips: Zeilen meist vorhanden (721–726), aber überwiegend
  leer — typischer Zustand nach Strukturanlage, ohne redaktionellen Inhalt.
- Es existiert **keine zentrale Seed-Logik** für künftige Karten —
  Standardkarten werden heute pro Migrations-Batch (z. B. Batch 41 für
  P-077) explizit angelegt. Eine zweite Parallel-Logik wurde bewusst
  **nicht** aufgebaut (siehe Abschnitt 5).

## 2. Vertrag (Feldnamen)

Verwendet wurden ausschließlich Felder aus dem bestehenden
`card_v1`-Vertrag (`src/features/cms/contract/runtime/card_v1.ts`,
`CARD_V1_FIELD_INVENTORY`):

| Bereich | Field-Keys (canonical) | Sichtbarkeits-Toggle (nicht angefasst) |
|---|---|---|
| Link 1 | `link_1_label`, `link_1_href`, `link_1_kind` | `link_1_enabled` |
| Link 2 | `link_2_label`, `link_2_href`, `link_2_kind` | `link_2_enabled` |
| Link 3 | `link_3_label`, `link_3_href`, `link_3_kind` | `link_3_enabled` |
| Bulletpoints | `bullets.0` … `bullets.4` | `bullets_0_enabled` … `bullets_4_enabled` |
| Chips / Merkmale | `chips.0` … `chips.4` | `chips_0_enabled` … `chips_4_enabled` |

## 3. Ergänzte Defaults

Eine einzige idempotente DO-Block-Operation auf der DB:

| Feld | DE | EN |
|---|---|---|
| `link_1_label` | Mehr erfahren | Learn more |
| `link_2_label` | Zum Planer | To planner |
| `link_3_label` | Zum Konfigurator | To configurator |
| `bullets.0` … `bullets.4` | Punkt 1 … Punkt 5 | Point 1 … Point 5 |
| `chips.0` … `chips.4` | Merkmal 1 … Merkmal 5 | Feature 1 … Feature 5 |

Lokale Konvention für Link-Labels war bereits identisch mit dem
Auftragstext (siehe Bestand 722× „Mehr erfahren" / „Learn more",
623× „Zum Planer" / „To planner" usw.) — die Defaults setzen das fort
und brechen kein bestehendes Muster.

Für Bullets/Chips existierte keine bestehende Default-Konvention im
Projekt — die im Auftrag vorgeschlagenen neutralen Platzhalter wurden
1:1 übernommen.

## 4. Backfill-Logik (idempotent, nicht überschreibend)

```sql
-- 1) Fehlende Zeilen anlegen mit Default-Wert
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT s.page_key, s.section_key, d.field_key, d.locale, d.default_value
FROM cms_sections s CROSS JOIN _card_v1_defaults d
WHERE s.section_type = 'card_v1' AND s.is_active = true
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

-- 2) Vorhandene, aber LEERE Zeilen mit Default befüllen
UPDATE cms_section_fields f
SET value = d.default_value, updated_at = now()
FROM _card_v1_defaults d, cms_sections s
WHERE f.page_key=s.page_key AND f.section_key=s.section_key
  AND s.section_type='card_v1' AND s.is_active=true
  AND f.field_key=d.field_key AND f.locale=d.locale
  AND (f.value IS NULL OR f.value = '');

-- 3) Whitelist defensiv sichern (war bereits 100 % gepflegt)
INSERT INTO cms_admin_editable_fields (...)
SELECT ... ON CONFLICT DO NOTHING;
```

Eigenschaften:

- **Niemals überschreibend**: Schritt (1) nutzt `ON CONFLICT DO NOTHING`,
  Schritt (2) filtert auf `value IS NULL OR value = ''`. Gepflegte Inhalte
  bleiben bitidentisch.
- **Keine Sichtbarkeitsänderung**: weder `link_N_enabled` noch
  `bullets_N_enabled` / `chips_N_enabled` werden gelesen oder geschrieben.
- **Keine Link-Ziele**: `link_N_href` wird nicht angefasst.
- **Mehrfach-Lauf**: zweiter Aufruf ergibt 0 Inserts / 0 Updates.

## 5. Bestehende Karten nachgezogen

Nach Lauf:

| Feld | leer DE | leer EN | Zeilen ges. |
|---|---:|---:|---:|
| `link_1_label` | 0 | 0 | 746 |
| `link_2_label` | 0 | 0 | 746 |
| `link_3_label` | 0 | 0 | 746 |
| `bullets.0` … `bullets.4` | 0 | 0 | je 746 |
| `chips.0` … `chips.4` | 0 | 0 | je 746 |

**Alle 746 aktiven `card_v1`-Karten** haben jetzt in DE und EN für die
13 Default-Slots gefüllte Zeilen plus Whitelist-Eintrag.

## 6. Absicherung für künftige Karten

- Es gibt heute **keine zentrale RPC `rpc_admin_seed_card`** oder
  vergleichbare Schöpfungs-Pipeline für `card_v1`. Neue Standardkarten
  werden pro Bereich/Etappe per Migration angelegt (zuletzt Batch 41
  für P-077-Referenzprojekte, `20260605184953_...sql`).
- Auftrag: „Keine zweite Parallel-Logik bauen" — daher wurde **keine**
  neue Seed-RPC oder Hook erfunden.
- Die hier eingeführte Backfill-Operation ist idempotent: künftige
  Karten erhalten ihre Defaults automatisch, sobald dieser Backfill
  erneut läuft (z. B. als Routine-Schritt im jeweiligen Anlage-Batch).
- **Empfehlung** für künftige Karten-Migrationen: am Ende der Migration
  die drei Default-Blöcke aus diesem Bericht einmal mitschreiben
  (Copy/Paste der DO-Operation oder Verweis auf Batch 43). Damit bleibt
  EINE Wahrheit — die Default-Tabelle steht im Migrations-SQL, nicht
  im Renderer und nicht im Admin-Code.

## 7. Verifikation (Akzeptanzkriterien aus Auftrag)

| Kriterium | Status |
|---|---|
| Standardkarte zeigt im Arbeitsbereich Default-Linklabels | ✅ — alle 746 Karten haben `link_1/2/3_label` gefüllt; der Admin liest die DB-Werte direkt (kein Code-Default nötig). |
| Deaktivierte Links erzeugen weiterhin keine Link-Pille | ✅ — `link_N_enabled` wurde nicht geändert; `cmsAdminCardLinks.ts` (Batch 42) filtert deaktivierte Slots weiterhin serverseitig heraus. |
| Aktivierte Links zeigen weiterhin die Link-Pille (Batch 42) | ✅ — `link_N_href` und `link_N_enabled` unverändert; P-077-Referenzkarten zeigen weiter die blauen internen Pillen. |
| Bulletpoints / Chips vorbereitet, aber nicht öffentlich sichtbar solange deaktiviert | ✅ — `bullets_N_enabled` / `chips_N_enabled` wurden nicht angefasst; Renderer (`CardsSectionV1`, `ProductScrollerV1`) blenden Felder mit `enabled=false` aus. |
| Wahrheits-Check grün | ✅ — `node scripts/cms/wahrheits-check-ci.mjs` → grün, Launch-Gate erfüllt. |

## 8. Public-Auswirkungen

**Keine.** Die Defaults landen ausschließlich in optionalen, per
Toggle gesteuerten Slots. Da kein Toggle umgelegt wurde, rendert die
öffentliche Website exakt dasselbe wie vorher.

Stichprobe Renderer-Logik:

- `cardVisibility.ts` → `bullets[i]` ist nur sichtbar, wenn
  `bullets_N_enabled=1` UND Text vorhanden. Neue „Punkt 1"-Defaults
  sind ohne Toggle unsichtbar.
- `chips[i]` analog mit `chips_N_enabled`.
- `link_N` analog mit `link_N_enabled` UND `link_N_href` (Ziel
  wurde nicht befüllt → kein Klick-Pfad).

## 9. Geänderte Artefakte

- **DB-Daten**: `cms_section_fields` (Backfill), `cms_admin_editable_fields`
  (defensiver `ON CONFLICT DO NOTHING`-Sync — 0 Neueinträge nötig).
- **Doku**: dieser Bericht.
- **Code/Renderer**: keine Änderung.
- **Migrationen/RPCs**: keine Änderung.
- **Navigation**: nicht angefasst.
- **i18n-JSONs**: nicht angefasst.
- **Produkt-DB**: nicht angefasst.
- **P-077-Folgearbeit**: nicht gestartet.

## 10. Restpunkte

- **R43-1**: Sobald die Redaktion erste Bullets/Chips inhaltlich pflegt,
  empfiehlt sich eine kurze Sichtkontrolle der „Punkt N / Merkmal N"-
  Platzhalter — sie sind bewusst neutral und sollen redaktionell ersetzt
  werden, sobald passender Inhalt vorliegt.
- **R43-2**: Falls künftig eine `rpc_admin_seed_card_v1`/Anlage-Pipeline
  entsteht, sollte sie diese Default-Tabelle 1:1 wiederverwenden
  (Single Source). Bis dahin: Bei jeder neuen Card-Migration die
  Default-Block-Operation aus Batch 43 mitlaufen lassen.

## 11. Scope-Bestätigung

- Produktdatenbank: **nicht angefasst**.
- Public-Renderer / Routen: **nicht angefasst**.
- Navigation (`cms_navigation_nodes`, MainNav, Footer): **nicht angefasst**.
- i18n-JSONs: **nicht angefasst**.
- Neue Section-Typen: **keine**.
- Sichtbarkeitsschalter (`*_enabled`): **nicht verändert**.
- Link-Ziele (`link_N_href`): **nicht verändert**.
- P-077-Folgearbeit: **nicht gestartet**.
