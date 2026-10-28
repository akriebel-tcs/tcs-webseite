# Shared datasheet module

**Module version: 1.4.1** (`DATASHEET_MODULE_VERSION` in `template.ts`)

Portable A4 datasheet layout for `datasheet-contract-2.0`. Pure React + CSS,
no app imports (`@/...`), no router, no data fetching, no i18n hooks —
everything arrives through props. Copy this whole folder unchanged into other
apps (e.g. Web Neu); do not fork the layout.

## Files
- `types.ts` — contract input + render props, incl. `DatasheetBrandProfile`
- `normalize.ts` — `normalizeDatasheet()` parser for `datasheet-contract-2.0`
- `template.ts` — supported template gate (`standard-product-sheet`, v1)
- `contrast.ts` — hex validation, readable foreground fallback, `resolveBrandColors()`
- `DatasheetSheet.tsx` / `datasheet.css` — layout
- `page.ts` — A4 geometry + `@page` CSS
- `signature.ts` — `contentSignature()` for the frame's `contentKey`
- `paginate.ts` — paged.js run, asset wait, footer placement
- `printDocument.ts` — print entry point for host apps
- `DatasheetPrintFrame.tsx` — preview + print host
- `pagedjs.d.ts` — minimal typing for `pagedjs`
- `index.ts` — public exports

## Brand profile contract
Source: `rpc_get_datasheet_brand_profile(p_profile_key)`. Required for
rendering: `found: true`, `is_active !== false`, matching `profile_key`,
`template_key = 'standard-product-sheet'`, `template_version = 1`.
`accent_text_color` drives `--ds-accent-fg`; `secondary_accent_color` drives
`--ds-accent-secondary` (used by `.ds-serie`) and falls back to the primary
accent when missing or invalid; only a missing/invalid value
falls back to the computed `readableForeground()` (legacy profiles).
Price needs three gates: contract `show_price`, brand `show_price`, and the
app-level `showPrices` prop.

## Print frame (1.4.1)
The sheet is paginated into explicit A4 page boxes by [paged.js](https://pagedjs.org)
(`pagedjs@0.4.3`, lazy-imported, browser only). No repeating `tfoot` any more.

- `page.ts` — page geometry: 210x297 mm, margins 15 mm top, 14 mm sides,
  26 mm bottom (reserved footer band), footer baseline 13 mm; `pageCss()`
  emits the `@page` rule handed to the engine.
- `paginate.ts` — `waitForAssets()` (fonts + images), `paginateDatasheet()`
  (abortable, clears the target, keeps the generated stylesheet of the current
  run alive and disposes the previous one) and `placeFooter()`, which puts
  exactly **one** brand footer into the reserved band of the **last real page**
  (short one-pagers included). No artificial trailing block, no empty page.
- `DatasheetPrintFrame.tsx` — hosts the hidden measured source flow plus the
  rendered pages (`#print-area`), shows busy/error/retry, re-paginates on
  `contentKey` change (SKU, locale, price toggle) and aborts stale runs.
  The screen preview scales the finished pages down (`--ds-page-scale`);
  the scale is only applied **after** pagination so the engine never measures
  a transformed DOM.
- `printDocument.ts` — `registerPrintTarget()` / `printDatasheet(title)`:
  waits for a ready pagination, is idempotent (no double print), restores the
  document title, throws `DatasheetPrintError` when the pages are not usable.

Host apps must not position `.ds-footer` themselves and must not add their own
page padding; the `@page` margin of the engine is the single source of truth.
The app-level print stylesheet only needs `@page { size: A4; margin: 0 }` plus
isolation of the print area (see `src/styles.css`).

## Changelog
- **1.4.1** — concurrency and identity hardening: every run owns its engine,
  stylesheet and offscreen staging container and publishes atomically only
  while it still owns the target (`disposePagination()` on unmount);
  `printDatasheet()` captures frame + content generation before awaiting and
  refuses to print stale pages; the frame tracks status/generation
  synchronously; `contentSignature()` covers content, brand values, labels and
  resolved components; asset waiting is abortable, time-boxed and raises
  `DatasheetAssetError` instead of silently dropping images/logo; the sheet no
  longer reacts to host viewport media queries (A4 is canonical, narrow
  screens only scale finished pages). New file `signature.ts`.
- **1.4.0** — real pagination with paged.js: explicit A4 pages, repeated
  margins on every page, single brand footer in the reserved bottom band of
  the last page, abortable/idempotent print preparation, on-screen preview of
  the very same pages. New files `page.ts`, `paginate.ts`, `printDocument.ts`,
  `DatasheetPrintFrame.tsx`, `pagedjs.d.ts`; removed the repeating `tfoot`.
  New dependency: `pagedjs@0.4.3`.
- **1.3.0** — portable print page frame (`.ds-page` table with repeating
  footer row); `.ds-footer` renders inside the repeating `tfoot` and stays in
  normal flow (no fixed positioning).
- **1.2.0** — `secondary_accent_color` added to `DatasheetBrandProfile`;
  `--ds-accent-secondary` CSS variable; `.ds-serie` uses the secondary accent;
  colour resolution centralized in `resolveBrandColors()`.
- **1.1.0** — `accent_text_color`, `template_key`, `template_version` added to
  `DatasheetBrandProfile`; template gate introduced; accent foreground taken
  from the profile.
- **1.0.0** — initial portable extraction (normalizer, layout, contrast).
