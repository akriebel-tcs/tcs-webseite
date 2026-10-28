# Batch 47a — Admin-Link-Pillen folgen dem aktuellen Linkziel

Datum: 2026-06-05
Bereich: CMS-Light Admin / Navigationsbaum (Anzeige, keine Schreibwege,
keine Public-Renderer-Änderung)
Modus: **Anzeige-Sync-Fix** — die graue/blaue/rote „Verlinkt auf …"-Pille
muss nach jedem Speichern im Arbeitsbereich das aktuelle `link_N_href`
zeigen, nicht den zuletzt geladenen Wert.

## 1. Ursache der falschen „P128 Kontakt"-Pille bei B-1956

| Frage | Antwort |
|---|---|
| Wo wird die Pille gerendert? | `src/features/admin/components/tree/SectionRowView.tsx` → `CardLinkPill` |
| Wo werden die Linkziele gelesen? | `src/features/admin/api/cmsAdminCardLinks.ts` → `readPageCardLinks(pageKey)` |
| Wo wird das Lesen ausgelöst? | `src/features/admin/components/tree/SectionLevel.tsx`, `useEffect([pageKey, sections])` |
| Werden die richtigen Felder gelesen? | Ja — seit Batch 42 inkl. `link_1_href`/`link_2_href`/`link_3_href`/`cta_href`, plus `link_N_enabled`-Slot-Disable + Dedup. |
| Stale-Cache? | **Ja.** `useEffect` löst nur bei Änderung von `pageKey` oder der `sections`-Array-Referenz aus. Beim Speichern eines Linkfeldes über `rpc_admin_update_section_field` ändert sich aber nur `cms_section_fields` — die `sections`-Liste bleibt referenzgleich → Effekt feuert nicht → die Pille zeigt weiter den Wert vom **ersten** Laden. |
| Konkret bei B-1956 | Bei der ersten Anzeige stand `link_1_href = /kontakt` (Default aus Batch 38/43). Batch 44 hat den Wert auf `/anwendungen/grossanlage` korrigiert. Der Arbeitsbereich zeigt sofort `/anwendungen/grossanlage` (er lädt seine Felder selbst neu). Der Navigationsbaum dagegen behielt den alten Cache → Pille blieb auf `P128 Kontakt` (das ist die Auflösung von `/kontakt`). |

**Globales Problem, kein Einzelfall der Snipdoo-IP-Seite.** Jede Karten-
/CTA-Seite, deren Linkfeld nach dem ersten Tree-Render geändert wird,
zeigt die alte Pille — bis man die Seite im Baum aus- und wieder
einklappt oder den ganzen Baum reloadet.

Nicht betroffen: Navigationsknoten-Pillen (`resolveNavNodeLink` in
`SortableRow`) — die werden bei jedem Render aus den frisch geladenen
`cms_navigation_nodes` neu aufgelöst.

## 2. Korrektur

Eine zusätzliche Refresh-Achse `linksRefreshToken` wird vom Workbench
nach jedem Feld-Save in den Section-Tree gereicht. `SectionList` nimmt
sie in die `useEffect`-Deps auf — `readPageCardLinks` wird neu
ausgeführt, die Pillen folgen dem aktuellen Wert. **Keine zweite
Auflösungslogik**, kein neuer Renderer, kein neues UI-Element. Der
Refresh-Pfad ist getrennt vom `treeRefreshToken` (kompletter Reload),
damit Expand-/Scroll-Zustand erhalten bleibt.

Datenfluss (Batch 47a):

```
PageEditor.handleSavedField()
  → onSectionFieldsMutated()                       // neu
    → MasterDetailWorkbench: setLinksRefreshToken(t => t + 1)
      → NavigationTreeEditor: linksRefreshToken={…}
        → SortableBranch: linksRefreshToken={…}    // rekursiv
          → SectionList: useEffect([pageKey, sections, linksRefreshToken])
            → readPageCardLinks(pageKey)           // re-read
              → linksByKey neu gesetzt
                → CardLinkPill mit aktuellem href
```

## 3. Geänderte Dateien

| Datei | Änderung |
|---|---|
| `src/features/admin/components/PageEditor.tsx` | Neue Prop `onSectionFieldsMutated?: () => void`; `handleSavedField` ruft sie nach `reload()`/`onPilotSaved()` auf. |
| `src/features/admin/components/MasterDetailWorkbench.tsx` | Neuer State `linksRefreshToken`; wird in `<PageEditor … onSectionFieldsMutated={…}>` erhöht und an `<NavigationTreeEditor … linksRefreshToken={…}>` durchgereicht. |
| `src/features/admin/components/NavigationTreeEditor.tsx` | Neue optionale Prop `linksRefreshToken?: number`; weitergereicht an `<SortableBranch … linksRefreshToken={…}>`. |
| `src/features/admin/components/tree/SortableBranch.tsx` | Prop durchgereicht (an `SectionList` + rekursiv an Kind-`SortableBranch`). |
| `src/features/admin/components/tree/SectionLevel.tsx` | `SectionListProps` um `linksRefreshToken?: number` erweitert; `useEffect` für `readPageCardLinks` nimmt das Token in die Deps auf. |

Nicht angefasst:
- `CardLinkPill` (Anzeige unverändert).
- `resolveCardLink` / `resolveNavNodeLink` (Auflösung unverändert).
- `readPageCardLinks` (Lese-Logik unverändert — Slot-Disable + Dedup
  aus Batch 42 weiter gültig).
- Public-Renderer, `cms_navigation_nodes`, Routen, i18n, Produkt-DB.

## 4. Verifikation

| Kriterium | Status |
|---|---|
| DB-Wahrheit B-1954/B-1955/B-1956 (`link_1_href`) | ✅ `/anwendungen/einfamilienhaus`, `/anwendungen/mehrfamilienhaus`, `/anwendungen/grossanlage` (DE + EN) — unverändert seit Batch 44, hier nur als Quelle der Wahrheit gegen-geprüft. |
| Zielseiten im CMS published | ✅ P061 Einfamilienhaus, P062 Mehrfamilienhaus, P063 Großanlage, alle `published`/`is_active=true`. |
| Slot-Disable für `link_2`/`link_3` (`/kontakt`-Defaults) | ✅ `link_2_enabled = link_3_enabled = '0'` → `readPageCardLinks` filtert serverseitig (Batch 42), keine Geister-Pille. |
| Nach Save im Arbeitsbereich aktualisiert sich die Pille | ✅ über neuen `linksRefreshToken`-Pfad. |
| Expand-/Scroll-Zustand bleibt nach Feld-Save erhalten | ✅ separater Token, kein `reload()` des ganzen Baums. |
| P-077 Referenzkarten (Batch 41) — bestehende Pillen | ✅ unverändert — selber Lesepfad, selbe Auflösung. |
| Externe Linkfelder (`http(s)://`, `mailto:`) | ✅ unverändert — `resolveCardLink` schlägt vor `pagesByRoute`-Lookup an. |
| Wahrheits-Check CI (`scripts/cms/wahrheits-check-ci.mjs`) | ✅ grün. |
| TypeScript (`tsc --noEmit`) | ✅ ohne Fehler. |
| DB-Migrationen | keine. |
| RPCs | keine. |

## 5. Prüfung pro Karte (B-063)

| Karte | `link_1_href` (DB, DE+EN) | Aufgelöste Pille im Baum | Erwartet |
|---|---|---|---|
| B-1954 `anwendungen.efh` | `/anwendungen/einfamilienhaus` | **P061 Einfamilienhaus** (blau, intern-found) | ✅ |
| B-1955 `anwendungen.mfh` | `/anwendungen/mehrfamilienhaus` | **P062 Mehrfamilienhaus** (blau, intern-found) | ✅ |
| B-1956 `anwendungen.gewerbe` | `/anwendungen/grossanlage` | **P063 Großanlage** (blau, intern-found) | ✅ |

Keine der drei Karten zeigt nach diesem Batch mehr `P128 Kontakt`,
sofern der Workbench-User die Pille nach einer Änderung im
Arbeitsbereich beobachtet — die Pille folgt dem neuen Wert ohne
Tree-Reload.

## 6. Konsistenz-Aussage `card_v1`

Ab Batch 47a gilt für ALLE `card_v1`-Pillen im Admin-Baum:

- **Quelle**: ausschließlich `cms_section_fields` über `readPageCardLinks`
  (eine Lesepipeline, keine zweite Wahrheit).
- **Auflösung**: ausschließlich `resolveCardLink` gegen
  `cms_pages.route_path` (gemeinsam mit Arbeitsbereich/`CardLinkInfoBox`).
- **Aktualität**: nach jedem Save im Arbeitsbereich wird die Pille
  zwingend neu berechnet (`linksRefreshToken`). Keine stale Anzeige.
- **Slot-Disable**: deaktivierte Slots (`link_N_enabled = '0'`) und
  identische `href`s je Section werden serverseitig dedupliziert.

## 7. Scope-Bestätigung

- Produktdatenbank: **nicht angefasst**.
- Public-Renderer / Routen / Navigation (`cms_navigation_nodes`,
  MainNav, Footer): **nicht angefasst**.
- i18n-JSONs: **nicht angefasst**.
- DB / Migrationen / RPCs: **keine**.
- Inhalte: **keine** — der Batch ist reiner Admin-Anzeige-Sync-Fix.
- Auth/Login: **nicht angefasst**.
