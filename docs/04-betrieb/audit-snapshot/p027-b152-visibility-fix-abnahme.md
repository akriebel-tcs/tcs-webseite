# Abnahme P027 / B152 — Visibility-Fix

Teil des D2b.3-Musterfixes. Vollständige Befundliste siehe
[`high-blocker-visibility-binding-abnahme.md`](./high-blocker-visibility-binding-abnahme.md).

## Befund

`gebaeudekommunikation.root` / `snipdoo`: DB-Section war `is_active=false`,
hartcodierter Public-Block ("snipdoo IP" inkl. Zielgruppen-Kacheln) wurde
trotzdem gerendert.

## Fix

In `src/features/gebaeudekommunikation/pages/TuerkommunikationPage.tsx`:

```ts
const snipdooActive = cms.sections.some(s => s.section_key === "snipdoo");
...
{snipdooActive && ( <ContentSection ...>... snipdoo IP ... </ContentSection> )}
```

- `handledSectionKeys` bleibt unverändert (`snipdoo` weiterhin enthalten), damit
  der generische Rest-Renderer den Block nicht zusätzlich rendert, falls künftig
  ein DB-Section-Type-Renderer ergänzt wird.
- Inhalt bleibt i18n. Restschuld-Label: `HARDCODED_CONTENT_WITH_ADMIN_VISIBILITY_BINDING`.

## Status

- Audit: `PUBLIC_BLOCK_IGNORIERT_DB_VISIBILITY` high = 0.
- P027-Renderpfad (FAQ, anwendungsumfelder, bereich_*) unverändert.
