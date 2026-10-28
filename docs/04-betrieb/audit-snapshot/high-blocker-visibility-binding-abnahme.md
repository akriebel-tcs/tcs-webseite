# Abnahme D2b.3 — High-Blocker `PUBLIC_BLOCK_IGNORIERT_DB_VISIBILITY`

Stand: nach Patch, Audit-Skript `scripts/cms/public-blocks-ignorieren-admin-visibility.mjs`.

## Ergebnis

| # | page_key | section_key | DB is_active | Fix | Status |
|---|----------|-------------|--------------|-----|--------|
| 1 | gebaeudekommunikation.root | snipdoo | aus | `snipdooActive`-Guard in `TuerkommunikationPage.tsx` | grün |
| 2 | eingangssysteme.beratung | cta | aus | `ctaActive`-Guard in `EntryBeratungPage.tsx` | grün |
| 3 | eingangssysteme.root | cta | aus | `ctaActive`-Guard in `EntrySystemPage.tsx` | grün |

Audit-Lauf nach Patch: **high = 0**, medium = 69, Klasse B (ohne DB-Bindung) = 34.

## Pattern (Musterfix)

```ts
// HARDCODED_CONTENT_WITH_ADMIN_VISIBILITY_BINDING (D2b.3)
const xyzActive = cms.sections.some(s => s.section_key === "xyz");
...
{xyzActive && ( <HartcodierterBlock /> )}
```

Begründung: RLS liefert ausschließlich aktive Sections aus. Fehlt der Eintrag in
`cms.sections`, ist die Section entweder DB-seitig nicht vorhanden oder im Admin
ausgeblendet — in beiden Fällen darf der hartcodierte Public-Block nicht erscheinen.

## Restschuld

- Inhalte der drei Blöcke bleiben i18n/hartcodiert (Label `HARDCODED_CONTENT_WITH_ADMIN_VISIBILITY_BINDING`).
- Inhaltsumbau erst in einer eigenen Etappe (kein Bestandteil von D2b.3).

## Manuelle Prüfung Preview

- snipdoo / CTA-Blöcke sind aktuell unsichtbar (DB `is_active=false`), Konsole sauber.
- Keine doppelten CTAs (PageLayout-Tail-CTA bleibt unberührt).
- FAQ / P027-Renderpfad unverändert (handledSectionKeys unangetastet).
- Aktivieren der Section im Admin (`is_active=true`) blendet den Block wieder ein.
