# Etappe S — Sync von redaktioneller Quelle nach CMS-Light

Migration der Inhalte aus dem Quellprojekt **TCS-Unternehmenswebseite_Content_V1** in dieses CMS-Light. Siehe `.lovable/plan.md` (Etappe S).

## Verzeichnisstruktur

```
scripts/sync/
  README.md                       # dieses Dokument
  source-raw/                     # 1:1-Kopien aus dem Quellprojekt (read-only)
    navigation/                   # mainNavigation.ts, metaNavigation.ts, …, routes.ts, types.ts
    i18n/de/                      # alle DE-Locale-JSONs
    i18n/en/                      # alle EN-Locale-JSONs
  snapshot/                       # normalisierte Snapshot-JSONs (S1)
    navigation.json
    pages.json
    sections.json
    fields.json
    assets-manifest.json
  pull-source-snapshot.mjs        # S1 — baut snapshot/* aus source-raw/*
  diff-report.mjs                 # S2 — vergleicht snapshot/* ↔ DB
  apply-snapshot.mjs              # S4 — schreibt snapshot/* in DB via RPCs
  key-mapping.json                # Mapping Quellkey ↔ DB-node_key (hand-curated)
```

## Re-Pull aus Quelle

`source-raw/` enthält 1:1-Kopien aus dem Quellprojekt. Re-Pull erfolgt
durch den Agent (cross_project--copy_project_asset). Nach Re-Pull immer
`pull-source-snapshot.mjs` neu laufen lassen, dann `diff-report.mjs`.

## Reihenfolge

1. **S1** `bun scripts/sync/pull-source-snapshot.mjs`
2. **S2** `bun scripts/sync/diff-report.mjs` → Output nach `docs/archiv/sync/diff-report.md`
3. **S3** Bulk-RPCs als Migration einspielen
4. **S4** `bun scripts/sync/apply-snapshot.mjs` (idempotent)
5. **S5** Asset-Migration
6. **S6** Diff erneut laufen lassen, muss leer sein
