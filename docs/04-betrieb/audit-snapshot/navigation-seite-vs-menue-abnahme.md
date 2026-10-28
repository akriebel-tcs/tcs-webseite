# Services-Subseiten: Seite-vs-Menü-Abnahme

Stand: 2026-06-04 · read-only Abgleich gegen Live-DB.

## 1. Datenbild

Alle untersuchten Services-Seiten sind in `cms_pages` **published + is_active=true** und haben eine Route. Das Hauptmenü zeigt sie trotzdem als „Ausgeblendet", weil die zugehörigen `cms_navigation_nodes` im Bereich `main` `is_active=false` haben.

| Page-Nr | page_key | route_path | cms_pages | main-Node is_active | main show_in_public_nav | Footer-Node aktiv? |
|---|---|---|---|---|---|---|
| P078 | service.hub | /service | published / true | **true** (`services`) | true | — |
| P080 | service.planen-konfigurieren | /planen-konfigurieren | published / true | false (`sv.planen`) | false | **ja** (`f.sv.konfigurator`) |
| P081 | service.downloads | /downloads | published / true | false (`sv.downloads`) | false | **ja** (`f.sv.downloads`) |
| P082 | service.technischer-support | /technischer-support | published / true | false (`sv.support`) | false | **ja** (`f.sv.support`) |
| P083 | service.ersatzteile | /ersatzteile | published / true | false (`sv.ersatzteile`) | false | **ja** (`f.sv.ersatzteile`) |
| P257 | service.installation-wartung | /service/installation-wartung | published / true | false (`sv.installation-wartung`) | false | — |
| P258 | service.beratung-schulung | /service/beratung-schulung | published / true | false (`sv.beratung-schulung`) | false | — |
| P259 | service.garantie-sicherheit | /service/garantie-sicherheit | published / true | false (`sv.garantie-sicherheit`) | false | — |
| P260 | service.planungshilfen | /service/planungshilfen | published / true | false (`sv.planungshilfen`) | false | — |
| P261 | service.konfiguratoren | /service/konfiguratoren | published / true | false (`sv.konfiguratoren`) | false | — |
| P262 | service.datenblaetter-software | /service/datenblaetter-software | published / true | false (`sv.datenblaetter-software`) | false | — |

## 2. Befund — Bug oder UI-Missverständnis?

**UI-Missverständnis, kein DB-Bug.** Die Seiten sind live und über ihre Routen erreichbar. Sie werden über den Services-Hub (Karten-Block in `service.hub`) und den Footer verlinkt — nicht über das Hauptmenü. Die alte Anzeige „🚫 Ausgeblendet" auf der Nav-Zeile las sich aber so, als sei die Seite komplett offline. Spiegel-Regel ist **nicht** verletzt (DB ↔ Public ↔ Admin stimmen überein), nur die Darstellung war irreführend.

## 3. UI-Korrektur (umgesetzt, read-only)

`src/features/admin/components/tree/SortableRow.tsx`:

- **Neue Badge „Seite live"** (grün) / **„Seite offline"** (amber), gespeist aus `cms_pages.status` + `is_active`. Steht direkt am Label und zeigt die Seiten-Wahrheit unabhängig vom Nav-Knoten.
- **Inaktiv-Badge wird nav-area-spezifisch**: „Hauptmenü aus" / „Footer aus" / „Nav aus" statt pauschalem „inaktiv".
- **Toggle-Button** zeigt nav-area-spezifischen Text („👁 Im Hauptmenü" / „🚫 Hauptmenü aus" usw.) und der Tooltip macht explizit: „Die Seite selbst (status/is_active in cms_pages) wird dadurch NICHT verändert."

`src/features/admin/components/NavigationTreeEditor.tsx` baut `pageStatusByPageKey` aus `readPagesWithNav()` und reicht es durch `SortableBranch` an `SortableRow` durch.

## 4. Wirkung für die Services-Subseiten

In der neuen Anzeige sieht der Redakteur bei z. B. `sv.ersatzteile` jetzt:

- 🟢 **Seite live** (aus `cms_pages`)
- 🟠 **Hauptmenü aus** (aus `cms_navigation_nodes.main.is_active`)
- Tooltip: „Die Seite bleibt live und über ihre Route erreichbar (Direkt-Link, andere Nav-Bereiche, Karten-Verlinkungen)."

Damit ist klar: die Seite ist **nicht** offline, sie ist nur bewusst nicht im Hauptmenü.

## 5. Keine DB-Änderungen

- Keine Migration.
- Keine Änderung an `cms_pages.is_active` / `status`.
- Keine Änderung an `cms_navigation_nodes.is_active` / `show_in_public_nav`.
- Keine Sichtbarkeitsänderung im Hauptmenü oder Footer.

## 6. Gate-Regel `NAV_NODE_STATUS_MISLEADING`

Dokumentarisch (kein neues Skript in diesem Schritt, weil scope-konservativ):

- **OK (kein Befund)**: Seite live + Hauptmenü-Knoten aus + (Footer-Knoten an ODER Karten-Verlinkung dokumentiert). → Das ist der reguläre „Unterseite über Hub erreichbar"-Fall.
- **WARN**: Seite live + überall im Nav aus + keine Karten-Verlinkung dokumentiert (verwaister Direkt-Link).
- **CRITICAL**: Seite **offline** (cms_pages.is_active=false oder status≠published) **aber** main-Knoten `is_active=true` → echter Spiegelbruch.

Aktuell bei den 11 untersuchten Services-Seiten: kein WARN, kein CRITICAL. Alle Seiten sind live, Hauptmenü-Knoten bewusst aus, 4 davon zusätzlich über den Footer verlinkt, alle über den Services-Hub als Karten erreichbar.
