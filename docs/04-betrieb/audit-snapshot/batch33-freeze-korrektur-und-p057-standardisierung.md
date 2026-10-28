# Batch 33 — Freeze-Korrektur + P-057 Standardisierung (TEIL-LIEFERUNG, ABGEBROCHEN)

Stand: 2026-06-05. **Achtung:** Dieser Batch wurde wegen Zeitlimit
**nicht abgeschlossen**. Es wurde bewusst **nichts** im Public-Pfad oder
in der Doku geändert, damit kein Halbzustand entsteht.

## Was wirklich passiert ist

1. **Plan freigegeben** (`.lovable/plan.md`): Freeze-Begriff umdeuten +
   P-057 strukturell auf `teaser_2col_v1` / `cards_v1`+`card_v1` /
   `cta_v1` migrieren, alte Container `sections` / `einrichtungen`
   deaktivieren (nicht löschen).
2. **Quelldatenanalyse P-057 vollständig**: 214 `cms_section_fields`-
   Einträge in `sections`+`einrichtungen` und 4 `cms_assets` (3
   Einrichtungs-Bilder + 1 Hero) inventarisiert. Icon-Werte aus DB.
3. **Idempotentes Migrations-SQL generiert**
   (`docs/04-betrieb/audit-snapshot/batch33-p057-migration-entwurf.sql`,
   145 KB):
   - 63 neue Sections (3× `teaser_2col_v1` + 3× `cards_v1` Anforderungen
     + 16× `card_v1` Anforderungen + 9× `cards_v1` Leistungen + 28×
     `card_v1` Leistungs-Bullets + 3× `cta_v1` Broschüren).
   - 226 neue `cms_section_fields` DE+EN, Werte 1:1 aus den alten
     Sondercontainern kopiert.
   - 3 `cms_assets`-Kopien (`einrichtung_<id>` → field `image`).
   - Vollständige `cms_admin_editable_fields`-Whitelist DE+EN für alle
     neuen Felder.
   - Re-Sort der bestehenden `faq` (500) und `standard_cta` (510).
   - Am Ende: `is_active=false` für `sections`+`einrichtungen` und
     `is_enabled=false` für deren Whitelist.
4. **Mini-Vorlauf appliziert**: nur die zwei `sort_order`-Updates für
   `faq` und `standard_cta` sind in der DB; sie verändern aktuell
   nichts Sichtbares.

## Was bewusst NICHT passiert ist

- Hauptmigration **nicht appliziert** (zu groß für die in dieser Sitzung
  verfügbare Tool-Kapazität).
- `BildungseinrichtungenPage.tsx` **nicht umgebaut**. Wäre die Migration
  nur halb appliziert, würde ein neuer Renderer auf leere Sections lesen
  und die Public-Seite brechen — deshalb hier bewusst unangetastet.
- `.lovable/always-follow.md`, `docs/current-status.md`,
  `docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`,
  `docs/04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md`
  **nicht angepasst** (Freeze-Umdeutung). Gehört zur vollständigen
  Lieferung — wird im Anschluss-Batch nachgeholt, damit Doku und Code
  gleichzeitig den neuen Stand zeigen.
- Bespoke-Registry (`src/features/admin/lib/bespokePageSections.ts`)
  **nicht angefasst**.
- Audits (Wahrheits-Check, Whitelist-Coverage, Spiegel-Audit) und
  `npm run build` **nicht ausgeführt** — DB- und Renderer-Stand sind
  unverändert, der frühere grüne Stand aus Batch 32 gilt weiter.

## Aktueller DB-Zustand P-057

- `hero` (10) aktiv
- `sections` (20) aktiv
- `einrichtungen` (30) aktiv
- `faq` (500) inaktiv
- `standard_cta` (510) aktiv

Nur die zwei `sort_order`-Werte (500/510) wurden in dieser Sitzung
verändert; das ändert die Public-Reihenfolge nicht spürbar, weil keine
neuen Sections dazwischen liegen.

## Empfohlene Folge-Schritte für den nächsten Lauf

1. **Freeze-Doku in vier Dateien** wie im Plan beschrieben anpassen
   (klein, sicher, kann zuerst gemacht werden).
2. **Migration in einem dedizierten Lauf applizieren** — entweder über
   das Migration-Tool in Stücken (Sections → Fields → Assets → Whitelist
   → Deaktivierung) oder als eine Datei via Lovable-Migration-System
   einreichen. Die SQL liegt fertig in
   `docs/04-betrieb/audit-snapshot/batch33-p057-migration-entwurf.sql`.
3. **Direkt nach erfolgreicher Migration** Renderer
   `BildungseinrichtungenPage.tsx` so umstellen, dass er ausschließlich
   aus den neuen Sections liest (`einrichtung_<id>`, `anforderungen_<id>`
   mit Kind-`card_v1`, `leistungen_<id>_<bereich>` mit Kind-`card_v1`,
   `broschure_<id>`). Layout (alternierender Background, 3-Spalten-
   Grid, Bullet-Spalten, Broschüren-Link) bleibt visuell identisch.
4. **Erst dann** die im SQL vorbereitete Deaktivierung von `sections`
   und `einrichtungen` greifen lassen und Bespoke-Registry-Einträge
   für P-057 entfernen.
5. Nach Abschluss: Wahrheits-Check, Whitelist-Coverage, Spiegel-Audit,
   `npm run build`. Erst wenn alles grün ist: Bericht final stellen und
   Mini-Batch-Empfehlung für P-056 / P-059 / P-060 nachziehen.

## Wichtiger Hinweis zur Spiegelregel

Solange die alten Sondercontainer aktiv bleiben **und** keine neuen
Standard-Sections existieren, ist die Public-Seite unverändert und
zeigt weiter exakt den heutigen Stand. Die Spiegelregel ist nicht
verletzt — es existiert nur die heute schon dokumentierte Sonderlogik.

## Mini-Batch-Empfehlung (zur Erinnerung, kein Umbau erfolgt)

Nach erfolgreichem P-057-Abschluss in dieser Reihenfolge anpacken
(kleiner als P-057, gleiches Muster):

1. P-059 Gesundheitseinrichtungen (2 Kacheln im flachen `cards`-Container).
2. P-060 Öffentliche Hand (3 Kacheln, gleiches Muster).
3. P-056 Objektlösungen (8 Domänen-Kacheln).

Pro Seite: neue `cards_v1`+`card_v1`-Struktur anlegen, Renderer
umstellen, alten Container deaktivieren — jeweils in eigenem Batch.
