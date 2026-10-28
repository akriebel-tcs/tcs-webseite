# Card dividers: global setting plus a per-block override

## Goal
A thin divider line above the links on cards. It's switched on everywhere by default and can be changed in the admin:
- **Global switch** "Trennstrich über Links" (divider above links): on/off for all cards on all pages.
- **Per card block** (e.g. B-026, B-3271): "Wie global" (follow global, the default), "An" (on) or "Aus" (off).
- The line only appears on cards that have at least one active link with a target. Cards without links stay as they are.
- Initial state: global = on, every block = "Wie global". Result: the line shows on all cards with links.

## What changes for editors
- In the admin, each card block gets a small selector next to its existing background setting.
- A global settings area gets the main switch. It's a new CMS page "Globale Einstellungen" that isn't shown on the website and has no web address.

## Database changes (need your approval through the migration card)
1. New hidden settings page `global.einstellungen` with one block `card_settings`. It isn't public, has no route and doesn't appear in navigation.
2. New field `card_dividers` (DE only, language-neutral):
   - global value `on`
   - for each card block, an entry that allows editing in the admin (whitelist). No value is stored, so the block follows the global setting.
3. The migration can run more than once without changing the result. It deletes nothing and leaves existing texts, links and backgrounds unchanged.
4. Rollback: remove the new whitelist rows and the settings page.

## Display (code only)
- One shared rule `resolveCardDividers(block, global)` → on/off.
- The line uses one shared look (`border-t border-border pt-3`), the same as B-538 today.
- Applied to all card renderers that show links: general card block, product row, advantages grid, Zielgruppen block, product solution pages, Technischer Support. Special pages with their own cards (Türsprechanlagen, snipdoo IP, Zutrittskontrolle pages, Entry System and others) switch to the same rule. The fixed line on B-026 is replaced by it.
- While the setting is still loading, the line shows (the agreed default), so the layout doesn't jump.

## Checks
- Type check, tests (new test for the on/off/global rule), cms:preflight, build.
- Read the values back from the database. Preview desktop and phone: B-538/B-026, a general card block, the Zielgruppen block. Then switch one block to "Aus" in the admin, confirm the line disappears, and switch it back.
- Nothing published.

## Open points
- Card containers inside special pages that aren't stored as card blocks in the CMS can only follow the global switch.
