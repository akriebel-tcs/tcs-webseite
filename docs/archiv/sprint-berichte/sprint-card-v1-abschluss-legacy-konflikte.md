# Sprint „card_v1 Abschluss" — Legacy-Konflikte & Endbericht

Stand 2026-06-03 nach DB-Backfill, Renderer-Migration aller lokalen
Sonderrenderer, Aktivierung der Pflichtkarten-E2E **und** flächiger
B-538-Normalisierung auf alle aktiven `card_v1`.

## Endstatus

| Prüfung | Ergebnis |
|---|---|
| Aktive `card_v1`-Karten | **701** |
| `link_1_label` DE gepflegt | **701 / 701** |
| `link_1_label` EN gepflegt | **701 / 701** |
| `link_2_label` DE/EN gepflegt | **701 / 701** |
| `link_3_label` DE/EN gepflegt | **701 / 701** |
| Karten mit fehlenden Standardlinklabels | **0** |
| Karten mit `chips.*` gepflegt (Backfill aus `tags`) | 27 |
| Karten mit `bullets.*` gepflegt (Backfill aus `features.*`) | 31 |
| Admin-Whitelist `cms_admin_editable_fields` Lücken | 0 (16.826 Linkzeilen + Chips/Bullets-Toggles) |
| Verbleibende lokale Sonderrenderer mit direktem Legacy-Read | **0** |
| Gate `card-renderer-paritaet.mjs` (V1–V3 + R5/R6) | **grün** |
| Pflichtkarten E2E (B-538, B-2084) | **grün** |
| CI hart (`cms-audit.yml`, kein `continue-on-error`) | bestätigt |

**card_v1 abgeschlossen: ja.**

## B-538-Standard flächig ausgerollt

Migration `…_card_v1_b538_standard_rollout` (idempotent, Re-Lauf = 0
Schreibvorgänge):

| Schritt | Wirkung |
|---|---|
| A1 `chips.N` ← `tags` (CSV) | 26 + 1 Karte je locale, nur wo `chips.*` leer |
| A2 `bullets.N` ← `features.N` | Sicherheitsnetz, 0 zusätzliche Karten (Etappen-Backfill war schon vollständig) |
| A3 `link_1_href` ← `cta_href`, sonst `href` | füllt leere Slots auf, überschreibt keine gepflegten Werte |
| A4 `link_1_label`/`link_2_label`/`link_3_label` Standardlabels | „Mehr erfahren / Learn more", „Zum Planer / To planner", „Zum Konfigurator / To configurator" — alle 701 Karten in DE+EN vorbeschrieben |
| A4 Override-Whitelist | bestehende Werte aus {`Details`, `Detail`, `Mehr`, `More`, `Read more`, `Weiterlesen`, `Details →`, `Mehr →`} werden auf Standard normalisiert |
| A4b `link_N_enabled` Defaults | leere Schalter auf `1` (Renderer zeigt nur Links mit gültigem `href` — keine kaputten Schalter mehr) |
| A4c `link_N_kind` Defaults | abgeleitet aus `link_N_href`: `intern`, `extern`, `kurz-id` |
| A5 Admin-Whitelist | alle 3 Linkslots × 4 Felder × 2 Locales = 24 Whitelist-Einträge pro Karte, plus chips.0..4 + bullets.0..4 + Toggles |

## Linkauflösung (vier Zielarten)

`resolveHref(raw, shortIdMap)` in `src/features/cms/lib/cardCanonical.ts`:

| Eingabe | Auflösung |
|---|---|
| `/kontakt` | intern, direkt verwendet |
| `https://…`, `mailto:…`, `tel:…` | extern, durchgereicht |
| `#anchor` | Anker auf gleicher Seite, durchgereicht |
| `P-265` | `cms_pages.route_path` mit `page_no=265` |
| `B-357` | `cms_pages.route_path` zur Seite von `section_uid=357` plus `#section_key` als Anker |
| `#`, leer, unaufgelöste Kurz-ID, freier Text ohne `/` | `valid=false` → **nicht** öffentlich gerendert |

Kurz-ID-Map wird einmalig in der App-Session via `useShortIdResolver()`
geladen (`src/features/cms/hooks/useShortIdResolver.ts`) und an die
zentralen Renderer (`CardsSectionV1`, `ProductScrollerV1`,
`FeatureGridV1`) sowie `AnwendungenPage` übergeben. Keine kaputten
`href="#"` mehr im Public-Render.

## B-2084 `card_sf_internekommunikation` (`anwendungen.root`)

| Feld | nach Sprint | Ergebnis |
|---|---|---|
| `link_1_href` DE | `/Kontakt` | öffentlich aktiv |
| `link_1_href` EN | `/anwendungen/interne-kommunikation` (Backfill aus `cta_href`) | öffentlich aktiv |
| `link_1_label` DE | `mehr erfahren` (editorial belassen) | öffentlich aktiv |
| `link_1_label` EN | `Learn more` | öffentlich aktiv |
| `chips.0..2` DE/EN | `Raum-zu-Raum`, `Durchsagen`, `Türautomation` / `Room-to-room`, `Announcements`, `Door automation` | öffentlich aktiv |
| `tags` (Legacy) | unverändert in DB | **nicht** ausgespielt (Renderer ignoriert Legacy) |
| „Details →" Output | entfällt | Renderer bildet `${label} →` aus `link_1_label`; kein hartcodiertes „Details" mehr |

## B-538 `card_pak` (`gebaeudekommunikation.tuersprechanlagen`)

Goldstandard — alle 3 Linkslots aktiv, Eyebrow + Bild + Description +
Bullets-Schalter (aktuell DE-Stichproben) + Labels DE/EN gepflegt.
Verhalten 1:1 auf alle 700 weiteren `card_v1`-Karten übertragen.

## Override-Whitelist (für Wiederholungs-Rollouts)

```
'details', 'detail', 'mehr', 'more', 'read more', 'weiterlesen', 'details →', 'mehr →'
```

Werte werden case-insensitiv geprüft. „Mehr erfahren" / „Learn more" /
„Zum Planer" usw. zählen **nicht** als Altwert und bleiben erhalten.

## Renderer-Pflichtweg

Lokale Page-Renderer dürfen Karten-Links ausschließlich über

```ts
import { canonicalLink, resolveHref } from "@/features/cms/lib/cardCanonical";
import { useShortIdResolver } from "@/features/cms/hooks/useShortIdResolver";
```

beziehen. Direkter Read von `tags`, `cta_label`, `cta_href`, `href`,
`features.N` ist durch das Gate `card-renderer-paritaet.mjs` (Regeln
R5/R6) verboten und führt zu rotem CI-Lauf.
