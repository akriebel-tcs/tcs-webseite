# CMS-Light — Source of Truth

Stand: 2026-06-05 (nach Batch 25/26/27 — CMS-Freeze + Doku-Hygiene).
Aktuelle Live-Zahlen stehen ausschließlich in
[`../04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md`](../04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md).
Dieses Dokument beschreibt das Modell, nicht den Tagesstand.

## Idee in einem Satz

Inhalte (Texte, Bilder, Reihenfolge, Sichtbarkeit, Navigation) leben in
**6 CMS-Tabellen** und werden über ein eigenes Admin-UI gepflegt. Der
Code rendert nur Layout und Interaktion.

## Die 6 Tabellen

```text
cms_pages             Seiten
cms_sections          Sections (Reihenfolge, Sichtbarkeit, Typ)
cms_section_fields    Einzelne Felder einer Section (Heading, Subline, CTA …)
cms_assets            Bild-Slots mit Alt-Text und Viewport
cms_navigation_nodes  Navigation (Main / Meta / Footer / Persona)
cms_section_types     Katalog der erlaubten Section-Typen
```

Plus Whitelist-Tabelle `cms_admin_editable_fields` (welches Feld der
Admin pflegen darf). Vollständige Erklärung mit InDesign-Vergleich:
[`../02-architektur/datenmodell-erklaert.md`](../02-architektur/datenmodell-erklaert.md).

## Stand der Etappen

| Etappe | Inhalt                                              | Status |
| ------ | --------------------------------------------------- | ------ |
| B      | Basisschema, RLS                                    | ✅ fertig |
| C      | Sections + Reihenfolge                              | ✅ fertig |
| D      | Felder (`cms_section_fields`)                       | ✅ fertig |
| E      | Asset-Slots + Viewports                             | ✅ fertig |
| F      | Navigation                                          | ✅ fertig |
| G      | RPC-only Schreibwege + Whitelist                    | ✅ fertig |
| H      | DB-first Rendering (`useCmsI18n`) auf allen aktiven CMS-Seiten | ✅ fertig |

Seit Batch 25 (2026-06-04) ist der harte CMS-Kern **freeze-reif**:
Wahrheits-Check, Coverage, Spiegel-Audit, FAQ/CTA und Public-Blocks
stehen auf 0. Aktuelle Zahlen siehe Live-Status.

Vollständiges Migrations-Log: [`../migration-log.md`](../migration-log.md).

## Warum dieser Ansatz

- **Kein zusätzliches CMS-Produkt nötig.** Lovable Cloud reicht.
- **Idempotente Migrationen** machen Re-Runs gefahrlos.
- **Whitelisted RPCs + RLS** verhindern Schreibunfälle aus dem Frontend.
- **Spiegelregel** macht „Admin = Website" zur einzigen Wahrheit.

## Was *nicht* in die DB gehört

- Layout-Entscheidungen (Grid, Spacing, Animation)
- Komponenten-Struktur
- Interaktion (Hover-States, Modal-Logik)
- Routing-Mechanik (Router-Konfiguration, Route-Matching)

## Was nach dem Freeze noch offen ist

Eigenes Folgeprojekt, nicht Teil des CMS-Kerns:

- Login / Auth / Rollenmodell für `/admin`.
- Restliche Klasse-A-Marketing-Pages (noch hartcodiert).
- Admin-UX-Kosmetik.
- Inhalts-Audit nach nächstem Marketing-Update.

Siehe [`../04-betrieb/naechste-schritte.md`](../04-betrieb/naechste-schritte.md).
