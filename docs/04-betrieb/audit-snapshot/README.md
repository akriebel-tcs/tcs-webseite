# Audit-Snapshot — Beleg- und Status-Ordner

Stand: 2026-06-05 (Batch 27).

Dieser Ordner ist **Beleg-/Audit-Snapshot**. Er spiegelt die Ausgaben der
Audit-Skripte ins Repo, damit sie im „Download Codebase"-ZIP landen und
an externe Reviewer übergeben werden können (`scripts/cms/output/` ist
in `.gitignore`).

## Was du zuerst liest

- **Aktueller Status:** [`cms-steuerbarkeit-status.md`](./cms-steuerbarkeit-status.md)
- **Abschluss / technische Abnahme:** [`batch25-cms-abschluss-freeze.md`](./batch25-cms-abschluss-freeze.md)
- **Doku-Hygiene-Abnahme:** [`batch27-doku-hygiene-abnahme.md`](./batch27-doku-hygiene-abnahme.md)

Frühere `batchNN-*.md`- und `p027-*`-Dateien sind **Historie**. Sie
dokumentieren den Weg und werden als Beleg behalten, sind aber nicht
mehr aktive Arbeitsgrundlage.

## Aktive Audit-Snapshots (laufende Belege)

- `globaler-spiegel-audit.{md,json}` — Pflicht-Gesamtbeweis „Eine Wahrheit"
- `eine-wahrheit-management.md` — Management-Summary
- `eine-wahrheit-offene-befunde-masterliste.{md,json}` — offene Befunde
- `seiten-klassifikation.{md,json}` — alle Routen + Klassifikation
- `bausteine-inventar.{md,json}` — Section-Typen mit Klasse
- `section-type-klassifikation.{md,json}` — 6-Klassen-Modell
- `cms-public-sperren{,-priorisiert}.{md,json}` — Sperren-Bericht
- `sonderseiten-entscheidungsvorschlag.{md,json}` — pro Sonderseite mit Confidence
- `vorlagenbereich-abgleich.{md,json}` — Vertrag · Whitelist · Felder pro `section_type`
- `export-risiko.{md,json}` — Privatserver-Reproduzierbarkeit pro Fund
- `harte-sonderlogik.{md,json}` — Hardcodings im React-Code
- `altbestand-report.{md,json}` — inaktive Sections
- `altbestand-bereinigung-2026-06-04.md` — Protokoll Altbestand-Cleanup
- `aktive-db-sections-ohne-renderpfad.{md,json}` — Coverage-Stand
- `page-renderer-coverage.{md,json}` — Renderer-Coverage
- `public-blocks-ignorieren-admin-visibility.{md,json}` — Spiegel-Befund
- `hartcode-steuerbarkeit-inventar.{md,json}` — UI-Fallback-Inventar
- `faq-section-toggle-audit.{md,json}` — FAQ-Toggle-Inventar
- `cms-steuerbarkeit-matrix.md` — Matrix-Ansicht

## Quelle der Wahrheit

Die Originale liegen in `scripts/cms/output/`. Folgende Skripte schreiben
**automatisch** in beide Verzeichnisse:

- `scripts/cms/eine-wahrheit-systemaudit.mjs`
- `scripts/cms/altbestand-report.mjs`
- `scripts/cms/teil-a-nachschaerfen.mjs`
- `scripts/cms/globaler-spiegel-audit.mjs`

Reihenfolge für einen vollständigen Lauf:

```bash
# Snapshots
psql -At -F'|' -c "select page_key, route_path, page_type, status, is_active::text, coalesce(title_de,'') from cms_pages" > /tmp/pages.tsv
psql -At -F'|' -c "select page_key, section_key, section_type, is_active::text, sort_order::text from cms_sections" > /tmp/sections.tsv
psql -At -F'|' -c "select s.page_key, s.section_key, s.section_type, s.is_active::text, coalesce(p.section_key,''), coalesce(p.section_type,'') from cms_sections s left join cms_sections p on p.id = s.parent_section_id" > /tmp/sections_with_parent.tsv
psql -At -F'|' -c "select page_key, section_key, field_key, locale, (value is not null)::text, (value_json is not null)::text from cms_section_fields" > /tmp/fields.tsv
psql -At -F'|' -c "select page_key, section_key, field_key, locale, is_enabled::text from cms_admin_editable_fields" > /tmp/whitelist.tsv

# Audits
node scripts/cms/eine-wahrheit-systemaudit.mjs
node scripts/cms/teil-a-nachschaerfen.mjs
node scripts/cms/globaler-spiegel-audit.mjs
node scripts/cms/altbestand-report.mjs
```

Stand der Spiegelung steht im `mtime` der Dateien.
