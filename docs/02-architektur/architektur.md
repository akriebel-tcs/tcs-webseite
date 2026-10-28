# Architektur

Stand: 2026-06-05 (nach Batch 25/26/27 — CMS-Freeze + Doku-Hygiene).

Ein zusammenhängendes Bild aus DB, Renderer, RPC-Schicht und Admin-UI.
Frühere Architektur-Snapshots (Checkpoints 5d / 8d / 10e / 11f, Code-Landkarte,
Technical-Hygiene-Check) liegen unter
[`../archiv/architektur-historisch/`](../archiv/architektur-historisch/) und
[`../archiv/checkpoints/`](../archiv/checkpoints/).

## Übersicht

```text
                ┌──────────────────────────┐
                │   Public-Website (React) │
                │   useCmsI18n() liest:     │
                └────────────┬──────────────┘
                             │  read-only via PostgREST + RLS
                             ▼
        ┌─────────────────────────────────────────┐
        │            cms_* Tabellen                │
        │  pages · sections · section_fields ·     │
        │  assets · navigation_nodes · section_types│
        └─────────────────────────────────────────┘
                             ▲
                             │  Schreiben NUR über rpc_admin_*
                             │  (Whitelist + RLS + SECURITY DEFINER)
                ┌────────────┴──────────────┐
                │   Admin-UI (/admin)        │
                │   Prototyp ohne Login      │
                └───────────────────────────┘
```

## Datenbank

Sechs CMS-Tabellen. Detail-Erklärung mit InDesign-Vergleich:
[`datenmodell-erklaert.md`](./datenmodell-erklaert.md).

- `cms_pages` — Seite (Slug, Locale, Sichtbarkeit)
- `cms_sections` — Inhaltsblock auf einer Seite (Reihenfolge, Sichtbarkeit, Typ)
- `cms_section_fields` — einzelne Felder (Heading, Subline, CTA-Label …)
- `cms_assets` — Bild-Slots mit Alt-Text und Viewport
- `cms_navigation_nodes` — Navigation (Main / Meta / Footer / Persona)
- `cms_section_types` — Katalog erlaubter Section-Typen, siehe
  [`section-typen-katalog.md`](./section-typen-katalog.md)

RLS ist überall aktiv. Lese-Policies sind öffentlich (Website lebt davon).
Schreib-Policies sind eng — siehe [`rls-rpc-uebersicht.md`](./rls-rpc-uebersicht.md).

## Renderer (Frontend)

- Hook: `src/features/cms/hooks/useCmsI18n.ts`
- Auflösung pro `t("…")`-Aufruf: erst `cms_section_fields`, dann i18n-JSON.
- Bilder über `asset(sectionUid, fieldKey, viewport?)`.
- Sections werden **immer** über `cms.sections` iteriert. Kein Hardcoding der
  Reihenfolge.

## Navigation

`cms_navigation_nodes` ist die **redaktionelle Navigationsstruktur**
(Knoten, Sortierung, Sichtbarkeit, `nav_area`, Parent/Child). Sie wird
über `rpc_admin_*` gepflegt und folgt der Spiegelregel: was im Admin
steht, wirkt 1:1 auf der Website — und umgekehrt.

Der Code (`src/navigation/*`, `src/app/routes.tsx`) bleibt zuständig für
**technische Routing-Mechanik** (Route-Matching, Code-Splitting,
NotFound, Redirects).

Pflicht bei Navigations-Änderungen:

- Parent/Child-Beziehungen, Routen, Breadcrumbs und Kartenlinks müssen
  konsistent bleiben.
- Nach jeder Navi-Änderung: Wahrheits-Check + kurze Preview-Stichprobe.
- Sonderfälle (fachlich umgehängte Routen, z. B. einzelne
  `/zutrittskontrolle/...`-Pfade mit Top-Level Gebäudemanagement) werden
  über `AutoBreadcrumb`-Overrides + `MainNavigation`-exactMap gepflegt;
  beide Stellen IM SELBEN SCHRITT anpassen. Diese doppelte Pflege ist
  ein bekannter Restpunkt — Konsolidierung auf reine DB-Auflösung steht
  als Folgearbeit im Backlog.


## Schreibschicht (RPC)

34 Funktionen `rpc_admin_*`. Gruppen:

- **Pages**: upsert, archive, restore, duplicate, delete, resolve_no
- **Sections**: reorder, set_position, set_parent, set_active, duplicate,
  paste, delete, resolve_uid
- **Fields**: update_section_field, set_editable_field_enabled
- **Assets**: upsert, update_alt, delete, read, resolve_no
- **Navigation**: create, move, update_label, set_active, archive, delete,
  read, resolve_no
- **Lesen für Admin**: read_pages_with_nav, read_page_sections, read_assets,
  read_navigation_nodes, read_pilot_pflege, search_short_ids

Vollständige Liste mit Beschreibung und Whitelist-Hinweis:
[`rls-rpc-uebersicht.md`](./rls-rpc-uebersicht.md).

## Admin-UI

- Pfad: `/admin`
- **Prototyp-Phase**: kein Login. Auth wird erst eingebaut, wenn Inhalt und
  Modell final stehen.
- Code unter `src/features/admin/`.
- Schreibt ausschließlich über `rpc_admin_*`. Direkter Tabellenschreibzugriff
  ist im Admin-Code verboten (kein `.insert/.update/.upsert/.delete`).
- Sprache: klares Deutsch, Fachbegriffe mit Klammer-Erklärung.

## Migrations-Konvention

- Eine Migration pro Etappe, idempotent.
- Liegt unter `supabase/migrations/`.
- Wird über das Migrations-Tool ausgeführt, nie manuell.
- Dubletten / Konflikte werden gemeldet, nicht blind gelöscht.

## Was *nicht* zur Architektur gehört

- Produktdatenbank (`src/lib/supabase/client.ts`, Produktkatalog/PDP) —
  eigenes, älteres System, Public-Schutz.
- Externe Mailversand-Pipeline — noch nicht eingebaut.
- Stripe / Paddle — heute nicht im Scope.
