# Batch 18 — Admin-Schalter Welle 4 (Marketing-Pages)

Stand: 2026-06-04

## Ziel
Die letzten 4 komplexen Marketing-Pages der Befundklasse
`PUBLIC_BLOCK_IGNORIERT_DB_VISIBILITY` einzeln gaten und die
30er-Gruppe `admin_schalter_ohne_public_wirkung` vollständig
schließen.

## Vorgehen
Einzeln pro Seite, jeweils mit anschließendem
`scripts/cms/public-blocks-ignorieren-admin-visibility.mjs` Re-Run.

## Geänderte Seiten

### 1. TuerkommunikationPage (`gebaeudekommunikation.root`)
- **Section:** `anwendungsumfelder`
- **Fix:** Hardcoded Fallback-`<ContentSection>` entfernt; Renderer
  läuft jetzt nur noch, wenn die DB-Section aktiv ist
  (`anwendungsumfelderSection &&`).
- Audit: medium 15 → 14.

### 2. SystemloesungenPage (`gebaeudekommunikation.systemloesungen`)
- **Sections:** `vorteile`, `fachplanung`
- **Fix:** `vorteileActive` / `fachplanungActive` Gates via
  `cms.sections.some(s => !s.parent_section_key && s.section_key === "…")`,
  beide `<ContentSection>`-Blöcke umschlossen.
- Audit: medium 14 → 12.

### 3. TuersprechanlagenPage (`gebaeudekommunikation.tuersprechanlagen`)
- **Sections:** `vorteile`, `anwendungsumfelder`
- **Fix:** Page benutzt schon `dbOrder` zur Laufzeit, aber Variable
  hieß `cmsContent`, sodass der statische Audit-Regex nicht griff.
  Alias `const cms = cmsContent` + explizite
  `vorteileActive` / `anwendungsumfelderActive` Gate-Konstanten
  ergänzt (Laufzeitverhalten unverändert, nur Audit-Marker).
- Audit: medium 12 → 10.

### 4. SnipdooIpPage (`gebaeudekommunikation.snipdoo-ip`)
- **Sections (10):** `hero`, `seo`, `systemversprechen`, `audiences`,
  `subnav`, `nutzungAlltag`, `systemaufbau`, `inbetriebnahme`,
  `anwendungen`, `rollen`
- **Fix:** 10 `…Active`-Konstanten oben in der Komponente, jeder
  `<section>`-Block mit dem entsprechenden Gate umschlossen.
  `SubNavSticky` läuft jetzt nur bei `subnavActive`, das SEO-Meta-
  `useEffect` setzt Title/Description nur bei `seoActive`.
- Audit: medium 10 → **0**.

## Ergebnis

| Kennzahl | vor B18 | nach B18 |
|---|---:|---:|
| `admin_schalter_ohne_public_wirkung` (Pages) | 4 | **0** |
| public-blocks `gelb_medium_kandidat` | 15 | **0** |
| Globaler Spiegel-Audit (rot) | 0 | **0** |
| page-renderer-coverage (Befunde) | 3 | **3** (Serviceportal, geparkt) |
| Wahrheits-Check CI | grün | **grün** |
| FAQ/CTA orphan / mixed / dedup-only | 0/0/0 | **0/0/0** |
| Hartcode `db_aktiv_aber_public_ignoriert` | 3 | **3** (unverändert, separater Track) |

## Verbleibend
- 3 Coverage-Befunde Serviceportal/Login — bewusst geparkt.
- 33 Public-Blocks `gelb_restschuld_ohne_bindung` (hartcodierte
  Blöcke ohne DB-Gegenpart, keine Spiegel-Verletzungen).
- 13 Pages `public_ohne_admin_pflege` (Fließtext-/Layout-only).
- 3 Pages `db_aktiv_aber_public_ignoriert` (Klasse-A Marketing-Track).

## Empfehlung für Batch 19
Wahlweise:
1. **Public-Blocks-Restschuld (33)** — hartcodierte Blöcke in CMS
   überführen (neue Sections + Whitelist) oder als bewussten
   Hardcode dokumentieren.
2. **Klasse-A Marketing-Pages (3)** — `db_aktiv_aber_public_ignoriert`
   sauber spiegeln.

Empfehlung: Erst Public-Blocks-Restschuld triagieren, weil daraus
am ehesten echte „Eine Wahrheit"-Lücken werden können.
