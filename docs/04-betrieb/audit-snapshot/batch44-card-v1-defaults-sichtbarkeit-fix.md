# Batch 44 — Sichtbarkeits-Fix für `card_v1`-Defaults (Korrektur zu Batch 43)

Datum: 2026-06-05
Bereich: CMS-Light / Daten-Korrektur (Sichtbarkeits-Schalter)
Modus: **Daten-Hotfix** — keine Schema-, Migrations-, RPC- oder Renderer-Änderung.

## 1. Ursache des Fehlers

Batch 43 hatte für alle 746 aktiven `card_v1`-Karten neutrale Platzhalter-
texte in optionale Slots geschrieben:

- `bullets.0..4` → „Punkt 1…5" / „Point 1…5"
- `chips.0..4`  → „Merkmal 1…5" / „Feature 1…5"

Die zugehörigen Sichtbarkeits-Schalter (`bullets_N_enabled`,
`chips_N_enabled`) wurden bewusst **nicht** angefasst. Der Resolver
`src/features/cms/lib/cardVisibility.ts` (Zeilen 174–195) wertet diese
Schalter aber **back-compat**-fähig aus:

```ts
const enabled = rawBulletEnabled === ""
  ? readBool(v, `features_${i}_enabled`, true)   // default TRUE
  : rawBulletEnabled === "1";
bulletsVisible.push(text.length > 0 && enabled);
```

Heißt: **leerer/fehlender Toggle = default an**, sobald Text vorhanden
ist. Das gleiche gilt für Chips (Zeile 193, `defaultIfBlank=true`).
Damit wurden die Platzhalter aus Batch 43 öffentlich sichtbar, weil
~690 Karten je Slot keinen expliziten Toggle gepflegt hatten.

Dieses Default-an-Verhalten ist absichtlich, weil Bestandskarten mit
echten Bullets/Chips nie einen `*_enabled='1'`-Eintrag geschrieben
bekamen — eine Renderer-Änderung würde sie alle blind ausblenden
(Spiegel-Bruch). Daher: **Renderer bleibt unverändert**, Korrektur
erfolgt rein in den Daten.

## 2. Welche Sichtbarkeiten wurden korrigiert?

Zielselektion: Nur Karten, deren Slot-Text **exakt** einer der zehn
DE-/EN-Platzhalter aus Batch 43 entspricht UND deren Toggle in dieser
Locale **nicht bereits explizit `'1'`** ist. Damit bleiben alle bewusst
aktivierten Module unangetastet.

| Slot | Toggle | Karten vorher mit Toggle '0' | nachher | gepflegt '1' (unverändert) |
|---|---|---:|---:|---:|
| `bullets.0` | `bullets_0_enabled` | 16 | 730 | 16 |
| `bullets.4` | `bullets_4_enabled` | 1 | 738 | 8 |
| `chips.0` | `chips_0_enabled` (de) | 2 | 725 | 16 |
| `chips.0` | `chips_0_enabled` (en) | 2 | 726 | 15 |
| `chips.4` | `chips_4_enabled` | 0 | 746 | 0 |

Vorgehen (idempotent):

1. Fehlende Toggle-Zeile als `'0'` neu angelegt (`INSERT … ON CONFLICT
   DO NOTHING`).
2. Vorhandene leere/null Toggle-Zeile auf `'0'` gesetzt.
3. Whitelist (`cms_admin_editable_fields`) für die Toggle-Felder
   defensiv gesichert (war bereits 100 % gepflegt).
4. Vier Sonderfälle: Slots mit bereits eingeschaltetem Toggle in
   einer Locale, deren andere Locale durch Batch 43 mit Platzhalter
   befüllt wurde, wurden auf leeren Text zurückgesetzt — der
   `readBoth`-Fallback (DE → EN) zeigt damit weiter die gepflegte
   Sprache und keine Platzhalter:
   - `anwendungen.root / card_sf_concierge / bullets.0 (en)`
   - `anwendungen.root / card_sf_concierge / bullets.1 (en)`
   - `gebaeudekommunikation.root / anwendungsumfelder_item_pflege / chips.0 (en)`
   - `eingangssysteme.material / card_aluminium / chips.0 (de)`

**Bestehende echte redaktionelle Bullets/Chips** (Karten mit echtem
Text und/oder explizit gesetztem `'1'`-Toggle) wurden in **keinem**
Fall geändert.

## 3. Wurde Renderer / Vertrag angepasst?

**Nein.** Der Standardkarten-Vertrag
(`src/features/cms/contract/runtime/card_v1.ts`) und der Resolver
(`src/features/cms/lib/cardVisibility.ts`) bleiben Wort für Wort
unverändert. Die Korrektur erfolgt vollständig in den Daten.

Begründung:

- Eine Renderer-Änderung (Default-Toggle auf `false`) hätte alle
  Bestandskarten mit `*_enabled=""` und echtem Bullet-Text auf einen
  Schlag unsichtbar gemacht — das wäre ein Spiegel-Bruch und hätte
  die seit Batch 25 grünen Gates (Globaler Spiegel-Audit, Public-
  Blocks) rot gefärbt.
- Der Vertrag erlaubt **beide** Wahrheiten (`""` als „default an" für
  Bestand, `'0'` als „explizit aus" für neu vorbereitete Slots).
  Batch 44 nutzt die zweite Spur konsistent.

## 4. Nachweis: Platzhalter erscheinen nicht mehr öffentlich

Quercheck-SQL (Karten, deren Platzhalter-Text bei aktivem Toggle stehen
würde):

```sql
WITH active_cards AS (
  SELECT page_key, section_key FROM cms_sections
  WHERE section_type='card_v1' AND is_active=true
)
SELECT count(*)
FROM cms_section_fields f
JOIN active_cards USING (page_key, section_key)
WHERE (
   (f.field_key LIKE 'bullets.%' AND f.value IN ('Punkt 1','Punkt 2','Punkt 3','Punkt 4','Punkt 5',
                                                  'Point 1','Point 2','Point 3','Point 4','Point 5'))
  OR (f.field_key LIKE 'chips.%' AND f.value IN ('Merkmal 1','Merkmal 2','Merkmal 3','Merkmal 4','Merkmal 5',
                                                  'Feature 1','Feature 2','Feature 3','Feature 4','Feature 5'))
  )
  AND EXISTS (
    SELECT 1 FROM cms_section_fields t
    WHERE t.page_key=f.page_key AND t.section_key=f.section_key
      AND t.field_key = replace(f.field_key,'.','_') || '_enabled'
      AND t.locale=f.locale AND t.value='1'
  );
```

Ergebnis nach Batch 44: **0**.

Renderer-Logik (`bulletsVisible[i] = text.length > 0 && enabled`):
mit Toggle = `'0'` ist `enabled=false`, also `bulletsVisible[i]=false`
unabhängig vom Text — Platzhalter wird nicht in den DOM geschrieben.
Gleiches gilt für `chipsVisible[i]`.

Stichprobe Renderer (`CardsSectionV1`, `ProductScrollerV1`,
`CmsProductSolutionShell`): alle drei lesen `bulletsVisible[i]` /
`chipsVisible[i]` aus dem zentralen Resolver — eine einzige Wahrheit,
keine Parallel-Logik.

## 5. Nachweis: Admin-Defaults sind weiterhin vorhanden

| Feld | Anzahl Karten mit gefülltem Wert |
|---|---:|
| `bullets.0` (de) | 746 |
| `bullets.4` (en) | 746 |
| `chips.0` (de) | 745 (1 Sonderfall geleert, EN bleibt) |
| `chips.0` (en) | 745 (1 Sonderfall geleert, DE bleibt) |
| `link_1/2/3_label` (de/en) | 746 |

Im Admin-Arbeitsbereich (`BildkartenCardWorkspace`) erscheinen die
Platzhalter weiter in den Eingabefeldern als vorbereiteter Wert.
Sobald die Redaktion einen Platzhalter durch echten Inhalt ersetzt
UND den Slot über den Toggle aktiviert (`bullets_N_enabled='1'` bzw.
`chips_N_enabled='1'`), wird der Wert öffentlich sichtbar — wie
gewünscht.

Test-Pfad (manuell):

1. `/admin` → eine `card_v1`-Karte öffnen → Bereich „Bulletpoints":
   Felder zeigen „Punkt 1…5" als Vorbelegung.
2. Toggle Bulletpoint 1 auf „an" → Public-Vorschau zeigt „Punkt 1"
   (oder den überschriebenen redaktionellen Text).
3. Toggle wieder „aus" → Public-Vorschau zeigt den Bulletpoint nicht
   mehr; der Text bleibt im Admin gespeichert.

## 6. Zukünftige Defaults

Regel ab Batch 44 (Ergänzung zur Default-Konvention aus Batch 43):

- Default-**Texte** für optionale Slots (Bullets, Chips) dürfen
  vorbereitet werden.
- Default-**Sichtbarkeit** für diese Slots ist **aus**: bei jeder
  Default-Insert-Operation MUSS im selben Schritt
  `bullets_N_enabled='0'` bzw. `chips_N_enabled='0'` gesetzt werden.
- Link-Labels (`link_1/2/3_label`) bleiben vom Sichtbarkeits-Pattern
  ausgenommen — sie erscheinen ohnehin nur, wenn zusätzlich
  `link_N_href` und (für N≥2) `link_N_enabled='1'` vorliegen
  (Resolver-Zeilen 197–209). Default-Link-Labels brauchen also keinen
  Toggle-Eingriff.

Diese Regel ist in der Batch-43-Default-Tabelle direkt anschlussfähig
(siehe Batch 43, Abschnitt 6, „Empfehlung für künftige Karten-
Migrationen"): Block einmal mit Toggle-`'0'`-Insert ergänzen.

## 7. Verifikation

| Kriterium | Status |
|---|---|
| Betroffene öffentliche Karten zeigen keine „Punkt N"/„Merkmal N" | ✅ — 0 leakende Platzhalter (Quercheck oben). |
| Admin-Arbeitsbereich zeigt Platzhalter weiter als Vorbelegung | ✅ — Texte unverändert in DB. |
| Bewusst aktivierter Bullet/Chip erscheint öffentlich | ✅ — Resolver-Pfad unverändert; `*_enabled='1'` + Text rendert weiter. |
| Bestehende echte Bullets/Chips nicht deaktiviert | ✅ — Toggle-Update nur bei exaktem Platzhalter-Text-Match + Schutzfilter „nicht überschreiben wenn '1'". |
| Wahrheits-Check CI grün | ✅ — `node scripts/cms/wahrheits-check-ci.mjs` → grün. |

## 8. Geänderte Artefakte

- **DB-Daten**: `cms_section_fields` (Toggles auf `'0'` gesetzt /
  ergänzt; 4 Sonderfall-Texte geleert), `cms_admin_editable_fields`
  (defensive Whitelist-Sicherung, 0 Neueinträge nötig).
- **Doku**: dieser Bericht.
- **Code / Renderer / Vertrag**: keine Änderung.
- **Migrationen / RPCs**: keine.
- **Navigation**: nicht angefasst.
- **i18n-JSONs**: nicht angefasst.
- **Produkt-DB**: nicht angefasst.

## 9. Scope-Bestätigung

- Produktdatenbank: **nicht angefasst**.
- Public-Renderer / Routen: **nicht angefasst**.
- Standardkarten-Vertrag (`card_v1.ts`, `cardVisibility.ts`): **nicht angefasst**.
- Navigation: **nicht angefasst**.
- i18n-JSONs: **nicht angefasst**.
- Neue Section-Typen: **keine**.
- Inhalte gelöscht: **keine** (4 Sonderfall-Slots auf leeren String,
  nicht entfernt — anderssprachiger Text bleibt sichtbar).
- P-077-Folgearbeit: **nicht gestartet**.
