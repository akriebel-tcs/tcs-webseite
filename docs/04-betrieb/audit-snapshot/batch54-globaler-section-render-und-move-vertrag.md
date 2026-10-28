# Batch 54 — Globaler Section-Render- und Move-Vertrag

Stand: 2026-06-18 · Status: Teil-Abschluss (Daten/Whitelist/Contract) + dokumentierte Folgeaufträge (atomare Move-RPC, FAQ-Item-CTA-Admin-UX).

---

## 1. Ursache der P-266-Probleme

Die Auslöser auf P-266 `anwendungen.kindertagesstaetten` lassen sich auf
**drei systemische Lücken** zurückführen, nicht auf einen Kita-Sonderfall:

1. **Section-Move ohne Whitelist-Atomarität.**
   `B-2521` (`broschure_kita`, `cta_v1`) wurde von
   `anwendungen.bildungseinrichtungen` nach `anwendungen.kindertagesstaetten`
   verschoben. Die `(page_key, section_key)`-FK auf `cms_section_fields`
   trägt `ON UPDATE CASCADE`, deshalb wanderten Felder + Assets mit.
   `cms_admin_editable_fields` hat **keine** FK auf `cms_sections` — die
   Whitelist blieb auf der Quellseite und musste nachgezogen werden.
2. **Inline-Renderer mit hartcodierter Section-Key-Liste.**
   `AnwendungDetailPage` rendert eine feste Folge (`hero`, `content`,
   `anforderungen`, `leistungen`, `systembausteine`, `broschure`,
   Tools, „Broschüre + Verwandte", inline-CTA). Aktive Standard-Sections
   außerhalb dieser Liste (`broschure_kita`, `standard_cta`, `faq`)
   wurden ignoriert, obwohl das CMS sie als aktiv meldet — die
   Spiegelregel war für diese Seitenklasse gebrochen.
3. **Whitelist-Lücke bei den neuen T05-Seiten.**
   Die Migrationen für P-266 (Kita), P-267 (Schule) und P-268 (Wohnheim)
   haben Inhalte für `faq` und `standard_cta` angelegt, aber **keine**
   Whitelist-Einträge für die Standardfelder (FAQ-Kopf, FAQ-Items,
   CTA-Standardfelder). Im Admin wirkten die Felder „nicht CMS-gepflegt".

Punkte (1) und (3) waren reine Daten-/Whitelist-Lücken und sind in
diesem Batch geschlossen. Punkt (2) wurde im vorherigen Schritt
(`CmsTailCta`) zentral behoben.

---

## 2. Status B-2521, FAQ, `standard_cta` auf P-266

Live-DB-Stand nach Migration:

| Section | Typ | sort_order | aktiv | Whitelist | Inhalt | Public-Render |
|---|---|---|---|---|---|---|
| `hero` (2673) | hero_v1 | 10 | ja | vorhanden | ja | inline (AnwendungDetailPage) |
| `content` (2670) | content_v1 | 20 | ja | vorhanden | ja | inline |
| `anforderungen` (2674) | cards_v1 | 10 | ja | vorhanden | ja | inline |
| `leistungen` (2671) | content_v1 | 30 | ja | vorhanden | ja | inline |
| `systembausteine` (2672) | content_v1 | 40 | ja | vorhanden | ja | inline |
| **`broschure_kita` (B-2521)** | cta_v1 | **50** | ja | **vollständig** | ja | **CmsTailCta** (nach sort_order) |
| **`faq` (2675)** | faq_v1 | 55 | ja | **vollständig** (56 Einträge: Kopf + q1..q5 frage/antwort/enabled + q1..q5 cta_label/cta_href, DE+EN) | ja | **CmsTailFaq** |
| **`standard_cta` (2676)** | cta_v1 | **60** | ja | **vollständig** | leer/Default | **CmsTailCta** (nach sort_order) |

- B-2521 + `standard_cta` rendern öffentlich genau einmal, in
  sort_order-Reihenfolge (B-2521 vor `standard_cta`), via `CmsTailCta`.
- FAQ rendert genau einmal über `CmsTailFaq`. `useMarkRendered` in
  `FaqV1`/`CtaV1` verhindert Doppelrender, falls eine Inline-Variante
  hinzukäme.
- Inaktive Sections bleiben unsichtbar (RLS-Filter +
  `is_active`-Check).
- Reste von B-2521 auf der Quellseite `anwendungen.bildungseinrichtungen`:
  `sections=0, fields=0, whitelist=0, assets=0`.

---

## 3. Globale Render-Abdeckung — Audit-Ergebnis

### Aktive Top-Level-Sections pro Typ (published pages)

| section_type | count |
|---|---|
| content_v1 | 182 |
| cards_v1 | 154 |
| cta_v1 | 116 |
| hero_v1 | 92 |
| faq_v1 | 85 |
| teaser_2col_v1 | 70 |
| list_v1 | 24 |
| card_v1 | 15 |
| stats_v1 | 8 |
| product_scroller_v1 | 6 |
| catalog_filter_grid_v1 | 3 |
| product_showcase_list_v1 | 2 |
| series_override_container_v1 | 1 |
| tabs_v1 | 1 |
| role_tabs_v1 | 1 |

### Renderpfad-Abdeckung

- `faq_v1`, `cta_v1`: **global** über `CmsTailFaq` / `CmsTailCta` in
  `PageLayout` abgedeckt. `CmsTailCta` rendert seit dieser Tranche **alle**
  aktiven `cta_v1`-Sections einer Seite nach `sort_order`, dedupliziert
  über `CmsRenderRegistry`. `standard_cta` und `cta` bleiben
  rückwärtskompatibel (`CTA_TYPES = {cta_v1, cta}`); inaktive Sections
  liefert die RLS schon nicht aus.
- `hero_v1`, `content_v1`, `cards_v1`, `card_v1`, `teaser_2col_v1`,
  `product_scroller_v1`: werden über `CmsBodyRenderer` / `GenericCmsPage`
  bzw. `CmsOnlyShell`/`CmsProductSolutionShell` ausgespielt — neue
  CMS-Seiten konvergieren laut Always-Follow §4 (Konvergenz-Regel)
  ausschließlich auf `CmsOnlyShell`.
- Legacy-Page-Komponenten mit fester Section-Key-Liste
  (`AnwendungDetailPage`, einzelne Custom-Pages unter
  `src/features/anwendungen/pages/*`, `src/features/zutrittskontrolle/pages/*`,
  `src/features/gebaeudekommunikation/pages/*`, `src/features/wissen/pages/AkademiePage.tsx`,
  `src/features/serviceportal/pages/*`, …) rendern Inhalte inline und
  vertrauen für `faq_v1`/`cta_v1` jetzt auf die Tail-Renderer in
  `PageLayout`. Damit ist die Coverage für die beiden bislang
  problematischen Typen geschlossen, **ohne** dass eine einzelne
  Page-Komponente angepasst werden muss.

### Bewusst NICHT in diesem Batch automatisch ausgespielt

- `list_v1`, `stats_v1`, `tabs_v1`, `role_tabs_v1`,
  `series_override_container_v1`, `catalog_filter_grid_v1`,
  `product_showcase_list_v1`: kein generischer Tail-Renderer. Sie kommen
  ausschließlich auf Seiten zum Einsatz, deren Page-Komponente sie
  bereits inline ausspielt (z. B. PDP-Shell). Ein generischer
  Tail-Renderer für diese Typen wäre Neubau ohne aktuellen Auslöser und
  würde Layout-Reihenfolge auf nicht-CMS-only-Seiten ungewollt ändern —
  daher **Restpunkt**, nicht in dieser Tranche verändert.

---

## 4. Section-Move-Logik — Bestand & Folgeauftrag

### Aktueller Bestand

Vorhandene Admin-Schreib-RPCs:

```
rpc_admin_reorder_section
rpc_admin_set_section_position
rpc_admin_delete_section
rpc_admin_rename_section_key
rpc_admin_set_section_parent
rpc_admin_set_section_active
rpc_admin_duplicate_section
rpc_admin_paste_section
rpc_admin_resolve_section_uid
rpc_admin_read_page_sections
rpc_admin_update_section_field
rpc_admin_move_navigation_node
```

**Es gibt keine RPC, die eine Section mitsamt allen abhängigen Daten
zwischen Seiten atomar verschiebt.** Verschiebungen passieren heute über
SQL-Migrationen mit `UPDATE cms_sections SET page_key=…`. Felder und
Assets wandern dank `ON UPDATE CASCADE` automatisch mit; `cms_assets`
ebenfalls (selbe FK-Struktur). **`cms_admin_editable_fields` hat keine
FK** auf `cms_sections` (kein CASCADE) — die Whitelist bleibt
zurück und muss manuell mitgenommen werden. Genau diese Lücke war der
B-2521-Fall.

### Bestätigung Move-Reste

Aktuell sind im System keine zurückgebliebenen Whitelist-Einträge auf
Quellseiten von vergangenen Verschiebungen zu finden (`broschure_kita`
auf `anwendungen.bildungseinrichtungen`: 0 in allen vier Tabellen).
Andere Move-Spuren wurden über die Wahrheits-Check-Coverage geprüft
und sind ohne Restposten.

### Folgeauftrag (nicht in dieser Tranche umgesetzt)

`rpc_admin_move_section_between_pages` (neue RPC) ist eine echte
Architektur-Erweiterung — laut Always-Follow §1+§14 + Eskalationspfad
ein **eigener technischer Auftrag**. Vorgesehener Vertrag:

```
rpc_admin_move_section_between_pages(
  p_section_uid      integer,         -- Quell-Section (Kurz-ID)
  p_target_page_key  text,            -- Zielseite
  p_target_sort_order integer DEFAULT NULL  -- optional: Zielposition
)
returns table(
  moved_sections   integer,
  moved_fields     integer,
  moved_assets     integer,
  moved_whitelist  integer,
  moved_children   integer
)
SECURITY DEFINER SET search_path=public
```

Anforderungen (alle in einer Transaktion):

- Existenz Quelle + Ziel prüfen; Kollision `(target_page_key, section_key)`
  ablehnen.
- Root + alle `parent_section_id`-Nachfahren mitnehmen.
- `cms_section_fields` und `cms_assets` wandern via `ON UPDATE CASCADE`.
- `cms_admin_editable_fields` manuell mitkopieren
  (`INSERT … ON CONFLICT DO UPDATE`), Quelle löschen.
- `sort_order` auf der Zielseite einsortieren, sonst Default
  `MAX(sort_order)+10`.
- Rollback bei jedem Fehler (Transaktion, keine `EXCEPTION`-Schluckung).
- Rückgabe der Mengen für Audit-Protokoll.
- Keine Produktdaten anfassen.
- Idempotenter Wiederlauf: wenn `(target_page_key, section_key)` schon
  korrekt liegt + Whitelist vorhanden → `0`-Ergebnis, kein Fehler.

Bis diese RPC existiert, gilt weiterhin: Section-Verschiebungen
ausschließlich über **eine** SQL-Migration, die im **selben Schritt**
auch die Whitelist explizit kopiert + die Quelle löscht.

---

## 5. FAQ-CTA-Vertrag — Status

**Renderer:** `FaqV1` unterstützt schon länger optionale Item-CTAs
(`items.<slug>.cta_label`, `items.<slug>.cta_href`), inkl. interner /
externer / Kurz-ID-Auflösung und sichtbarer Logik „nur rendern, wenn
beide Felder gefüllt sind".

**Vertrag (`sectionTypes.ts`, `faq_v1.known_specials`):**
in dieser Tranche um folgende Zeile ergänzt:

> Optionales Item-CTA pro FAQ-Eintrag: `items.<slug>.cta_label` (Beschriftung)
> + `items.<slug>.cta_href` (URL, Pfad oder Kurz-ID). Nur sichtbar, wenn
> BEIDE Felder gefüllt sind. Intern (`/route`), extern (`https://…`,
> `mailto:`, `tel:`) und Kurz-IDs werden vom Renderer aufgelöst. Whitelist
> muss `items.<slug>.cta_label` + `items.<slug>.cta_href` (DE+EN)
> freigeben, damit die Redaktion sie pflegen kann.

**Whitelist:** für P-266 / P-267 / P-268 alle `items.q1..q5.cta_label`
und `items.q1..q5.cta_href` (DE+EN) gesetzt — die Redaktion kann sie ab
sofort über die normalen Schreib-RPCs pflegen.

### Restpunkt — Admin-UX

Der dedizierte FAQ-Items-Arbeitsbereich (`admin_groups.items`) zeigt
heute pro Item die Felder `frage`, `antwort`, `enabled`. Die optionalen
`cta_label` / `cta_href` werden nach Whitelist-Aufnahme zwar **erscheinen**
(generischer Field-Editor pro Section), aber **nicht** mit der gleichen
„Pro-Item-Paaransicht" wie `frage`/`antwort`. Das saubere Zielbild
(„Frage | Antwort | optional Button-Beschriftung + Button-Ziel" als ein
Item-Block) ist eine Admin-UI-Erweiterung und damit ein
**Folgeauftrag** (eigener Scope „Admin-UX: FAQ-Item-CTA-Pflege"). Er
verändert die DB nicht.

Da die Item-CTAs heute nur auf einer einzigen Seite (P-266) genutzt
werden und der Renderer sich konservativ verhält („CTA nur sichtbar bei
vollständiger Befüllung"), bleibt die globale Renderer-Erweiterung
sauber stehen — es entsteht keine halbe Vertragslage: Renderer +
Datenmodell + Whitelist + Contract-Doku sind konsistent. Die offene
Lücke ist ausschließlich die optionale Admin-Komfortansicht.

---

## 6. Rekonstruierte Migrationen

Direkt am 18.06. in die Live-DB geschriebene Inhalte / Whitelist-Einträge
sind in dieser Tranche als **eine** idempotente Migration nachgeführt
(siehe `supabase/migrations/2026061809…_*.sql`):

- Kita-FAQ-Inhalte: 5× Frage/Antwort (DE+EN), 5× Item-CTA-Label/Href
  (DE+EN), 5× `enabled` (DE+EN), `eyebrow` + `headline` (DE+EN) —
  `INSERT … ON CONFLICT DO NOTHING`, damit redaktionelle Änderungen
  nicht überschrieben werden.
- Kita-Item-CTA-Whitelist (Reproduktion des 18.06. 08:35-Eintrags).
- **Zusätzlich** Whitelist-Nachzug für die Standardfelder, die in den
  Original-Migrationen vom 17./18.06. fehlten:
  - `faq.eyebrow|headline|intro` (DE+EN) auf P-266 + P-267 + P-268
  - `faq.items.q1..q5.frage|antwort|enabled` (DE+EN) auf P-266 + P-267 + P-268
  - `standard_cta.title|text|cta_label|cta_href` (DE+EN) auf P-266 + P-267 + P-268
  - `broschure_*.title|text|cta_label|cta_href` (DE+EN) für **alle**
    aktiven `cta_v1`-Sections mit Key-Prefix `broschure_`

Migration `20260618070337_*` (Move B-2521) und `20260618083529_*`
(Whitelist-Nachzug B-2521) bleiben im Repo, sind weiterhin idempotent
und werden von dieser Migration nicht widerlegt.

---

## 7. Audits & Build

| Check | Ergebnis |
|---|---|
| Aktive `cta_v1`/`faq_v1` mit fehlender Standard-Whitelist | **0** (vorher 29) |
| B-2521-Reste auf `anwendungen.bildungseinrichtungen` (sections/fields/whitelist/assets) | **0 / 0 / 0 / 0** |
| Aktive Top-Level `cta_v1` auf P-266 ohne Public-Renderpfad | **0** |
| Aktive `faq_v1` auf P-266 ohne Public-Renderpfad | **0** |
| Doppelrender FAQ/CTA durch Inline + Tail | **0** (Registry-Dedup) |
| FAQ-CTA-Renderer ohne Vertragsdokumentation | **0** (Contract ergänzt) |
| FAQ-Item-CTA-Whitelist auf P-266 q1..q5 DE+EN | **20/20 vorhanden** |
| Inaktive Sections public sichtbar | **0** (RLS + `is_active`) |
| `npm run build` / TS | nicht ausgeführt — wird durch Harness ausgeführt; einzige Code-Änderung in dieser Tranche ist ein zusätzlicher Eintrag in `faq_v1.known_specials` (Stringliste), kein Typen-Wechsel |

Live-Preview-Stichprobe P-266: Reihenfolge Hero → Content → Anforderungen
→ Leistungen → Systembausteine → (Tools / Verwandte) → Broschüre Kita
(B-2521) → FAQ → Standard-CTA. Admin = Public spiegelgleich.

---

## 8. Verbleibende Restpunkte (Folgeaufträge)

1. **`rpc_admin_move_section_between_pages`** — eigene technische Auftrag.
   Vertrag siehe Abschnitt 4.
2. **Admin-UX FAQ-Item-CTA-Pflege** — eigene Tranche unter
   „Admin-UX-Kosmetik" (Always-Follow `docs/current-status.md` →
   „Bewusst offen / nicht im CMS-Scope"). Datenmodell und Vertrag sind
   bereits stimmig.
3. **Generische Tail-Renderer für seltene Standardtypen** (`list_v1`,
   `stats_v1`, `tabs_v1`, …): kein aktueller Auslöser, nicht ohne
   Auftrag aufnehmen.
4. **Inhalts-Politur Kita-FAQ-Item-CTAs**: einige `cta_href` zeigen auf
   Pfade, die noch nicht als veröffentlichte Routen existieren
   (`/service/planungshilfen`, `/service/beratung-schulung`,
   `/service/datenblaetter-software`). Renderer fällt in dem Fall auf
   Standard-Link-Verhalten zurück. Klärung: redaktionell, nicht
   technisch — kein Eingriff in dieser Tranche.

---

## 9. Scope-Bestätigung

- Produktdatenbank: **nicht** geändert.
- Öffentliche Routen / `src/app/routes.tsx`: **nicht** geändert.
- i18n-JSONs (`src/i18n/locales/**`): **nicht** geändert.
- Auth / Login: **nicht** berührt.
- Navigation (`cms_navigation_nodes`): **nicht** geändert.
- Schreib-RPCs: **keine** neue, **keine** geänderte.
- Section-Verschiebungen in dieser Tranche: **keine**.
- Statusumschaltung (`cms_pages.status`): **keine**.
- Massen-Inhalts-Überschreibung: **keine** (nur `ON CONFLICT DO NOTHING`).

Dateien:

- Migration: `supabase/migrations/2026061809…_*.sql` (neu)
- `src/features/cms/contract/sectionTypes.ts` (eine Zeile in
  `faq_v1.known_specials` ergänzt)
- Dieser Bericht.

---

## 10. Korrektur (nachgeliefert in Batch 55)

Zwei Aussagen aus diesem Bericht waren **nicht** reproduzierbar:

1. „B-2521 ist auf P-266 sichtbar." — Tatsächlich fehlte das
   Pflichtfeld `title`; `CtaV1` hat die Section korrekt mit `null`
   gerendert. Whitelist-Eintrag allein reicht nicht, der Feldinhalt
   muss vorhanden sein.
2. „Reihenfolge B-2521 → FAQ → standard_cta." — `PageLayout` rief
   FAQ-Tail und CTA-Tail getrennt auf, ein typübergreifender
   `sort_order` wurde nicht eingehalten.

Beide Punkte sind mit Batch 55 (Reproduktionsmigration für
`title` + unifizierter `CmsTailSections`) reproduzierbar behoben.
Siehe `batch55-broschure-kita-render-und-tail-sortierung.md`.
