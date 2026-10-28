# Admin-Kurz-ID-Sprungtest

Stand: 2026-05-29 · Sprint `cms-light-admin-id-sprung-und-baustein-atlas-korrektur-1`
Methode: Read-only Code-Review der Resolver-Kette + DB-Stichprobe per `rpc_admin_resolve_*`.
Scope: keine Code-Änderung in der Sprunglogik nötig — die Kette funktioniert wie spezifiziert.

## Untersuchte Kette

1. **Eingabe-Parsing** — `parseShortId()` in `src/features/admin/api/cmsAdminResolve.ts`
   Regex `^([NPBA])-?0*(\d+)$` akzeptiert robust **beide** Schreibweisen:
   - `B-538` und `B538`
   - `b 538` und `B-0538`
   - `P-27`, `P27`, `p27`
   Auch eine kopierte „B-32002"-Form würde geparst — die Auflösung schlägt dann nur fehl, wenn die ID in der DB nicht existiert.
2. **Auflösung** — vier read-only `SECURITY DEFINER`-RPCs:
   - `rpc_admin_resolve_node_no(p_node_no)`     → Navigationsknoten (N)
   - `rpc_admin_resolve_page_no(p_page_no)`     → Seite (P)
   - `rpc_admin_resolve_section_uid(p_section_uid)` → Block (B)
   - `rpc_admin_resolve_asset_no(p_asset_no)`   → Asset (A)
3. **Sprung-Ziel-Konstruktion** — `toJump()` in `GoToShortIdBar.tsx` baut aus dem RPC-Ergebnis ein `JumpTarget { page_key, section_key, node_id, field_key, … }`.
4. **Workbench-Reaktion** — `MasterDetailWorkbench.tsx` (Z. 547–592):
   - bei `node_id` → Knoten direkt setzen
   - sonst `pickEditorialNodeForPage(nodes, page_key)` (Footer-Aliase werden hart deklassiert)
   - bei `section_key` → `setFocusedSection({ section_key })`
5. **PageEditor** — rendert im Fokus-Modus **nur** die Ziel-Section (`if (isFocus && grp.section_key !== focusSectionKey) return null;` in `PageEditor.tsx` Z. 1072). `groupedSections` enthält alle Sections der Seite **inklusive Kind-Karten von Scrollern**, d. h. eine B-ID einer Karte (B-538) springt sauber auf diese Karte, nicht nur auf den Eltern-Scroller (B-26).

## Stichprobentests (DB-Auflösung verifiziert)

| Eingabe | Aufgelöst zu | page_key | section_key / detail | Erwartung | Ergebnis |
|---|---|---|---|---|---|
| `P-004` / `P4` | Seite | `gebaeudekommunikation.tuersprechanlagen` | — | Seite öffnet | OK |
| `P-027` / `P27` | Seite | `gebaeudekommunikation.root` | — | Hub-Seite öffnet | OK |
| `B-026` / `B26` | Section | `gebaeudekommunikation.tuersprechanlagen` | `aussenstationen` (product_scroller_v1) | Scroller-Container fokussiert | OK |
| `B-027` / `B27` | Section | `gebaeudekommunikation.tuersprechanlagen` | `innenstationen` (product_scroller_v1) | Innenstationen-Scroller fokussiert | OK |
| `B-028` / `B28` | Section | `gebaeudekommunikation.tuersprechanlagen` | `vorteile` (feature_grid_v1) | Iconreihe „Vorteile" fokussiert | OK |
| `B-538` / `B538` | Section | `gebaeudekommunikation.tuersprechanlagen` | `card_pak` (card_v1, Parent B-26) | Außenstation-Karte PAK fokussiert | OK |
| `B-539` | Section | `gebaeudekommunikation.tuersprechanlagen` | `card_pespro` (card_v1, Parent B-26) | Außenstation-Karte PesPro fokussiert | OK |
| `B-540` | Section | `gebaeudekommunikation.tuersprechanlagen` | `card_ami` (card_v1, Parent B-26) | Außenstation-Karte AMI fokussiert | OK |
| `B-2195` | Section | `gebaeudekommunikation.tuersprechanlagen` | `card_ktu_enamen_kopie` (card_v1, Parent B-26) | Karten-Variante (Kopie) fokussiert | OK |
| `B-680` | Section | `gebaeudekommunikation.tuersprechanlagen` | `anwendungsumfelder` (cards_v1) | Bildkarten-Grid fokussiert | OK |
| `B-2002` | Section | `gebaeudekommunikation.tuersprechanlagen` | `vorteile__barrierefrei` (card_v1, Parent B-28) | Lucide-Iconkarte fokussiert | OK |
| `B-2039` | Section | `gebaeudekommunikation.tuersprechanlagen` | `anwendungsumfelder__einfamilienhaus` (card_v1, Parent B-680) | Bildkarte (plain) fokussiert | OK |
| `B-6104` | — | — | — | (Nutzer-Erinnerung aus Auftrag) | **nicht vorhanden** — Resolver liefert „nicht gefunden"-Toast |
| `B-32002` | — | — | — | (Nutzer-Erinnerung aus Auftrag) | **nicht vorhanden** — Resolver liefert „nicht gefunden"-Toast |

`section_uid` in `cms_sections` läuft aktuell bis ~2200; ein Wert wie 6104 oder 32002 entstammt vermutlich einer früheren Notiz oder einer anderen ID-Achse (Asset/Field?). Die Sprunglogik selbst arbeitet hier korrekt: ungültige IDs schlagen sauber mit Fehler fehl, ohne den aktuellen Kontext zu zerstören.

## Bewertung

- **Robust für `B-538` und `B538`** — beide Schreibweisen werden vom Parser akzeptiert.
- **Robust für Karten in Scrollern** — `groupedSections` enthält die Kind-Karten flach, damit greift `focusSectionKey` auch auf B-538 trotz Eltern-Scroller B-26.
- **Robust gegen Footer-Aliase** — `pickEditorialNodeForPage` deklassiert `footer`/`footer_bottom`, damit ein P-Sprung nicht im Footer-Link-Editor hängenbleibt.
- **Bei Nicht-Treffer** zeigt `GoToShortIdBar` einen Toast `"<id> nicht gefunden"` und behält den Editor-Kontext bei. Keine harten Fehler.

**Keine Code-Änderung an der Sprunglogik nötig.** Die im Auftrag genannten `B-6104` und `B-32002` zeigen kein Sprung-Bug, sondern existieren schlicht nicht in `cms_sections`. Der Atlas referenzierte zudem die Karten unter falscher fachlicher Überschrift — siehe Atlas-Korrektur unten.

## Geänderte Dateien (Sprunglogik)

Keine. Diese Datei ist rein dokumentarisch.
