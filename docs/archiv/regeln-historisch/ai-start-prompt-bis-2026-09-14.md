> **ARCHIV — nicht führend.**
> Ursprungspfad: `docs/ai-start-prompt.md`
> Archiviert: 2026-09-14 (Etappe 1, Restkorrekturen)
> Stand dieser Fassung: 2026-06-05 (nennt Batch-25-Gates als Ist-Zustand)
> Nachfolger (aktiv): `docs/ai-start-prompt.md` (Kurzverweis) und
> `docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`
> Relative Verweise in dieser Fassung gingen von der Basis `docs/` aus und
> wurden hier NICHT umgeschrieben.

# Einstieg für KI / neue Mitarbeit

Stand: 2026-06-05 (nach Batch 26/27, CMS-Freeze).

> **Zuerst lesen — in dieser Reihenfolge:**
> 1. [`03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`](./03-redaktion/redaktions-uebergabe-und-prompt-regeln.md) — Dachdokument für Redaktion und Prompt-Arbeit
> 2. [`current-status.md`](./current-status.md) — Kurzstatus
> 3. [`04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md`](./04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md) — technischer Live-Status
> 4. [`../.lovable/always-follow.md`](../.lovable/always-follow.md) — Projektregeln

Wenn du eine KI bist, die dieses Projekt zum ersten Mal sieht, lies bis zum
Ende. Wenn du ein Mensch bist auch — es ist kurz.

## Worum geht es

TCS-Unternehmenswebseite. Frontend in **React 18 + Vite + Tailwind + TypeScript**,
Backend über **Lovable Cloud (Supabase)**. Inhalte (Texte, Bilder, Alt-Texte,
Navigation) liegen in 6 CMS-Tabellen und werden über ein eigenes Admin-UI
(`/admin`) gepflegt. Die öffentliche Website rendert ausschließlich aus der DB.

## Source of Truth: die Datenbank

```text
cms_pages             1 Zeile = 1 Seite (Slug, Locale, Sichtbarkeit)
cms_sections          1 Zeile = 1 Section auf einer Seite (sort_order, is_active, type)
cms_section_fields    1 Zeile = 1 Feld einer Section (Heading, Subline, CTA, …)
cms_assets            1 Zeile = 1 Bild-Slot (mit alt-Text, Viewport)
cms_navigation_nodes  Navigation (Main, Meta, Footer, Persona)
cms_admin_editable_fields  Whitelist (welches Feld ist im Admin pflegbar)
```

Details: [`02-architektur/datenmodell-erklaert.md`](./02-architektur/datenmodell-erklaert.md).

## Goldene Regeln

1. **Inhalt zuerst**: Texte/Bilder/Reihenfolgen gehören in die DB — nie hart
   in den Code.
2. **Spiegelregel**: Reihenfolge (`sort_order`), Sichtbarkeit (`is_active`)
   und Inhalte aus der DB bilden sich 1:1 auf der Public-Website ab.
3. **Grün-by-default**: Jeder neue Slot/Section/Karte folgt dem
   Dachdokument — korrekter T-Code (siehe
   [`01-strategie/seitentyp-taxonomie.md`](./01-strategie/seitentyp-taxonomie.md)),
   richtiger Container-Typ (siehe
   [`02-architektur/section-typen-katalog.md`](./02-architektur/section-typen-katalog.md))
   und Karten-Raster nach
   [`02-architektur/karten-raster-regel.md`](./02-architektur/karten-raster-regel.md),
   Whitelist im selben Schritt. Ziel: sofort „Eine Wahrheit" im
   [Wahrheits-Check](./04-betrieb/wahrheits-check.md).
4. **Schreibwege**: nur über `rpc_admin_*` (Whitelist + RLS). Kein
   `.insert/.update/.upsert/.delete` aus dem Frontend.
5. **Rendering**: Page-Komponenten benutzen
   `useCmsI18n(pageKey, ns, rootPrefix)` aus
   `@/features/cms/hooks/useCmsI18n` statt `useTranslation`.
6. **Migrationen**: idempotent. Dubletten nicht blind löschen, sondern melden.
7. **Public-Schutz**: Produktdatenbank (`src/lib/supabase/client.ts`,
   Produktkatalog/PDP) und öffentliche Routen/Navigation bleiben
   unangetastet, sofern nicht ausdrücklich beauftragt.
8. **CMS-Freeze (richtig gelesen)**: Kein unkontrollierter Umbau.
   Kontrollierte redaktionelle Arbeit innerhalb des bestehenden
   CMS-Light-Baukastens ist ausdrücklich erlaubt — Seiten/Unterseiten
   anlegen, Navigation anpassen (Knoten anlegen/verschieben/ausblenden,
   Sortierung, `nav_area`, „Hauptmenü aus"), Karten ergänzen/sortieren/
   entfernen, Bausteine sortieren, Bilder tauschen, Links setzen,
   bestehende Seitentypen / Section-Typen / Kartenmodelle verwenden.
   Wenn ein Wunsch außerhalb des Baukastens liegt (neuer Seitentyp,
   neuer Section-Typ, neue Renderer-Logik, DB-Migration außerhalb
   normaler CMS-Datenpflege, Produkt-DB, Login/Auth, Änderung der
   technischen Routing-/Navigationsarchitektur): nicht improvisieren —
   kurz erklären, welches Systemelement fehlt, und einen sauberen
   Folgeauftrag vorschlagen (siehe Eskalationspfad im Dachdokument).
   Die Redaktion selbst wird dadurch nicht ausgebremst.
9. **Vor jeder größeren Änderung**: `.lovable/always-follow.md` lesen.

## Prototyp-Phase

`/admin` läuft ohne Login. Auth-Komponenten **nicht** einbauen. Wenn der
User Inhalte per Chat liefert („pack das auf Seite X, Slot Y"), schreibst
du sie über `rpc_admin_*` direkt in `cms_assets` / `cms_section_fields` —
nicht in den Code.

## Sprache

Klares Deutsch, ohne Buzzwords. Fachbegriffe (Eyebrow, Subline, Slug,
nav_area) bekommen beim ersten Auftritt im Sichtbereich eine kurze
Klammer-Erklärung.

## Bei Konflikt

Wenn Auftrag und Regelwerk auseinanderlaufen: **stoppen und melden**, nicht
improvisieren. Hierarchie der Doku siehe `.lovable/always-follow.md`,
Abschnitt 16.
