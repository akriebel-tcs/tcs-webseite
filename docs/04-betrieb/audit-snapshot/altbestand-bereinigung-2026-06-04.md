# Altbestand-Bereinigung — 2026-06-04

## Was passiert ist

Alle 63 inaktiven Nicht-Vertrags-Root-Sections aus dem CMS-Light wurden
pauschal entfernt — inklusive aller daran hängenden Felder, Bilder/Assets,
Whitelist-Einträge und Kind-Sections.

Vertragsblöcke (FAQ / Standard-CTA) wurden **nicht** angefasst. Sie bleiben
weiterhin pro Seite vorhanden und werden über den Admin-Schalter `is_active`
ein- und ausgeblendet.

## Zahlen

- **Vorher** (Stand des Altbestand-Reports):
  - 111 inaktive Root-Sections insgesamt
  - 48 Vertragsblöcke (behalten)
  - 63 echte Altbestand-Kandidaten auf 22 Seiten
  - hängende Daten: 1.268 Felder · 63 Assets · 1.532 Whitelist-Einträge · 109 Kind-Sections
- **Nachher** (Re-Run von `node scripts/cms/altbestand-report.mjs`):
  - 48 inaktive Root-Sections (= alle Vertragsblöcke)
  - 0 Altbestand-Kandidaten
  - 0 hängende Felder/Assets/Whitelist/Kinder im Altbestand

## Wie es passiert ist

Eine idempotente Migration (siehe `supabase/migrations/*altbestand*`) hat
in einer `DO`-Transaktion:

1. alle Root-Sections mit `is_active=false` selektiert, die **nicht**
   Vertragsblock sind (`section_key NOT IN ('standard_cta','cta','faq')`
   UND `section_type NOT IN ('cta_v1','faq_v1')`),
2. rekursiv alle Kind-Sections dazugesammelt,
3. die zugehörigen Einträge in `cms_section_fields`, `cms_assets` und
   `cms_admin_editable_fields` gelöscht,
4. die Sections selbst gelöscht (Kinder zuerst, dann Eltern).

Die Migration ist idempotent: beim zweiten Lauf findet sie nichts mehr und
ändert nichts.

## Was unverändert bleibt

- `cms_sections` mit `is_active=true` — alles Aktive.
- Vertragsblöcke (FAQ/CTA), auch wenn sie auf einzelnen Seiten gerade
  ausgeschaltet sind.
- Produktdatenbank und öffentliche Website.

## Wiederherstellung

Falls ein gelöschter Inhalt doch noch gebraucht wird: er liegt im
Migration-Log und in den historischen Snapshots unter
`scripts/sync/snapshot/` und `docs/archiv/` und kann von dort per neuer
Migration zurückgespielt werden.
