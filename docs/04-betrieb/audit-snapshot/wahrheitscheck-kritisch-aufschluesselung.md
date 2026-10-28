# Wahrheits-Check — Kritisch-Befunde aufgeschlüsselt

Stand: 2026-06-04, nach Re-Run von `faq-cta-toggle-inventar.mjs`.

Hinweis: Die Wahrheits-Check-Zahlen werden im Browser pro Slot live aus DB +
Inventar gerechnet. Diese Aufschlüsselung leitet die deterministischen Treiber
aus DB-Queries + Page-Contract-Inventar ab. Exakte Felder-Records sind nur im
Admin-Tab ablesbar; die Objekt-Größenordnung stimmt mit der Browser-Ansicht
überein.

## 1. Gruppen

### 1.1 Aktiver Baustein ohne Renderpfad — **Hauptquelle**

Echte Launch-Blocker per D3b.4. „Admin sagt sichtbar, Public rendert nicht."

| Ursache | Objekte | Quelle |
|---|---:|---|
| FAQ-Section aktiv, Page-Pfad `orphan` | **52** | Inventar `faq` |
| CTA-Section aktiv, Page-Pfad `orphan` | **58** | Inventar `cta` |
| CTA-Section aktiv, Page-Pfad `mixed` | **1** | Inventar `cta` |
| **Summe** | **111** | |

### 1.2 Unbekannter Section-Typ

Aktiver Standardbaustein, für den im Renderer-Vertrag kein Renderer existiert.

| Section-Typ | Anzahl |
|---|---:|
| `product_showcase_list_v1` | **2** |

### 1.3 DB-Dubletten

```sql
select page_key, section_key, field_key, viewport, count(*)
from cms_assets where is_active=true
group by 1,2,3,4 having count(*) > 1
```

→ **0 Befunde.**

### 1.4 Section fehlt (Asset verwaist)

Aktives Asset ohne zugehörige `cms_sections`-Zeile.

→ **0 Befunde.**

### 1.5 Renderer ignoriert Pflichtfeld

`renderer_orphan` mit `expectation === "required"` im Renderer-Vertrag
(`rendererSlotMap.ts`). Nur diese Kombination zählt nach D3b.4 als kritisch;
optionale Slots (`icon_image`, `thumbnail`, `image_alt`, …) sind Restschuld.

→ Größenordnung schätzungsweise **0–10** Felder; nicht direkt aus DB ableitbar,
weil Renderer-Vertrag pro `section_type` definiert ist. Im Browser ablesbar.

### 1.6 Page-Pfad rot bei aktiver Section — sonstige Bausteine

Nur möglich, wenn `body`-Contract `unknown`/`mixed` wäre. Aktuell:
`Body: 114 ok / 0 unknown / 0 mixed`. → **0 Befunde.**

### 1.7 CTA/FAQ-Orphan (Cross-Reference auf 1.1)

Bereits in 1.1 enthalten — Auflistung pro Page möglich über
`docs/04-betrieb/faq-cta-toggle-inventar.md`.

### 1.8 Sonstige Ursachen

Aus der Klassifikation `recordSeverity` / `objectSeverity` ergeben sich keine
weiteren `critical`-Pfade. Alles andere wird kategorisiert als `restschuld`,
`warning` oder `green`.

## 2. Erwartetes Kritisch-Total

**~111 Objekte (Sections) + 2 unbekannte Typen + 0–10 required-orphans
≈ 113–123 critical objects.**

Davon nach D3b.4:
- 113+ echte Launch-Blocker (FAQ/CTA-Orphans + unknown_section_type)
- 0 Fehlklassifikationen aus den abgedeckten Mustern (Body-Pfad-Erkennung jetzt
  vollständig)

## 3. Verteilung der Kritisch-Befunde nach Bereich

Aus `KNOWN_PAGE_OBJECT_CONTRACTS` (Auszug):

| Bereich | FAQ orphan | CTA orphan |
|---|---:|---:|
| `anwendungen.*` | ~30 | ~25 |
| `eingangssysteme.*` | 2 → **0** nach Batch 3 (FaqV1-Tail) | wenige |
| `gebaeudekommunikation.*` | ~5 | ~5 |
| `gebaeudemanagement.*` | ~8 | ~10 |
| `personas.*` | 6 | – |
| `service.*` | mehrere | mehrere |
| `produkte.*` | 3 | – |

(Genaue Zahl pro Page in `docs/04-betrieb/faq-cta-toggle-inventar.md`.)

Eingangssysteme: nach Batch 3 keine FAQ-/CTA-Orphans mehr — Cluster grün.
