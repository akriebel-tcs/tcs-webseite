# `src/features/`

Zielordner für **Feature-Domains** der TCS-Hauptwebsite (z. B. `zutrittskontrolle`, `eingangssysteme`, `personas/architekt`).

Jede Feature-Domain bündelt später ihre eigenen `pages/`, `components/`, `content/`, `data/` und `assets/` und exportiert ihre Public API über eine `index.ts`.

**Modulgrenzen:** Cross-Feature-Imports sind verboten. Querverweise erfolgen über `src/navigation/` und `src/shared/`.

> Status: leer. Produktivcode wird erst in späteren Migrationsetappen hierher verschoben. Siehe [`docs/architecture.md`](../../docs/architecture.md) und [`docs/migration-log.md`](../../docs/migration-log.md).
