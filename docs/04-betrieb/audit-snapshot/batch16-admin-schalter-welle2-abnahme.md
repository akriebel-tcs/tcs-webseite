# Batch 16 — Admin-Schalter Welle 2 (Abnahme)

Stand: 2026-06-04, nach Batch 15 (Standardkarten-Slot-Vertrag).

## Ziel

Den Befund `admin_schalter_ohne_public_wirkung` weiter abbauen, ohne Inhalts-
oder Funktionscode zu ändern. Nur Visibility-Gates nach dem in Batch 14
etablierten Muster:

```ts
const xxxActive = cms.sections.some(
  s => !s.parent_section_key && s.section_key === "xxx",
);

{xxxActive && (<section>…</section>)}
```

Dieses Muster wird sowohl vom Public-Blocks-Audit (regex auf
`cms.sections.(find|some|filter)(… section_key === "xxx")`) als auch vom
Hartcode-Inventar als gültiger Gate erkannt.

## Heuristik-Vorprüfung

Vor dem Patch standen **14 Pages** mit `admin_schalter_ohne_public_wirkung`
und **28 medium-Befunde** in `public-blocks-ignorieren-admin-visibility`.

Klassifikation der 14 Pages:

| Klasse | Anzahl | Beispiele | Vorgehen |
|---|---:|---|---|
| **Welle 2 – einfacher Single-Section-Gate** | 6 | bcm-handsender (hero), bcm-online-leser (hero), elektronischer-knaufzylinder (hero), funkvernetzte-offline-leser (hero), vorhaengeschloss (hero), service.downloads (quickLinks) | jetzt gepatcht |
| **Welle 3 – Multi-Section-Pages** | 6 | elektronische-drueckergarnitur (3 Sections), fahrstuhlsteuerung (2), systemloesungen (2), tuersprechanlagen (2), service.hub (sections), service.planen-konfigurieren (hero) | später, einzeln |
| **Welle 4 – komplexe Marketing-Pages** | 2 | snipdoo-ip (10 Sections), gebaeudekommunikation.root (anwendungsumfelder + Restschuld) | später, redaktionell prüfen |

## Welle 2 — gepatchte Pages (6)

| Page | Datei | Gate |
|---|---|---|
| zutrittskontrolle.bcm-handsender | `src/features/zutrittskontrolle/pages/BcmHandsenderPage.tsx` | `heroActive` |
| zutrittskontrolle.bcm-online-leser | `src/features/zutrittskontrolle/pages/BcmOnlineLeserPage.tsx` | `heroActive` |
| zutrittskontrolle.elektronischer-knaufzylinder | `src/features/zutrittskontrolle/pages/ElektronischerKnaufzylinderPage.tsx` | `heroActive` |
| zutrittskontrolle.funkvernetzte-offline-leser | `src/features/zutrittskontrolle/pages/FunkvernetzteOfflineLeserPage.tsx` | `heroActive` |
| zutrittskontrolle.vorhaengeschloss | `src/features/zutrittskontrolle/pages/VorhaengeschlossPage.tsx` | `heroActive` |
| service.downloads | `src/features/service/pages/DownloadsPage.tsx` | `quickLinksActive` |

Pro Page genau **eine** Änderung: Konstante einfügen + den hartcodierten Block
mit dem Gate umschließen. Keine i18n- oder Inhaltsänderung, keine
Layout-/Komponenten-Änderung, keine DB-Migration.

## Vorher / nachher

| Kennzahl | vor Batch 16 | nach Batch 16 |
|---|---:|---:|
| `admin_schalter_ohne_public_wirkung` (Pages) | 14 | **8** |
| Public-Blocks `gelb_medium_kandidat` (Befunde) | 28 | **22** |
| Public-Blocks `rot_high_blocker` | 0 | 0 |
| Globaler Spiegel-Audit (Restschuld rot) | 0 | **0** |
| Coverage `AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD` | 3 | **3** (Serviceportal, geparkt) |
| Wahrheits-Check CI | ✅ grün | **✅ grün** |
| FAQ orphan / mixed / dedup-only | 0 / 0 / 0 | 0 / 0 / 0 |
| CTA orphan / mixed / dedup-only | 0 / 0 / 0 | 0 / 0 / 0 |
| Sub-Gates (Persona, Card-Parität, Sort-Order, persona-eine-wahrheit) | grün × 4 | grün × 4 |

## Was bleibt übrig (8 Pages)

`admin_schalter_ohne_public_wirkung`:

- gebaeudekommunikation.root — `anwendungsumfelder` + 1 Restschuld
- gebaeudekommunikation.snipdoo-ip — 10 Sections (komplex)
- gebaeudekommunikation.systemloesungen — `vorteile`, `fachplanung`
- gebaeudekommunikation.tuersprechanlagen — `anwendungsumfelder`, `vorteile`
- service.hub — `sections`
- service.planen-konfigurieren — `hero`
- zutrittskontrolle.elektronische-drueckergarnitur — `hero`, `benefits`, `useCases`
- zutrittskontrolle.fahrstuhlsteuerung — `overview`, `benefits`

Separater Track bleibt:
- 3 Coverage-Befunde Serviceportal/Login (geparkt, wartet auf Auth)
- 2 Klasse-A Marketing-Pages mit Hartcode-Anteil (ProduktHub, TuerkommunikationHub)
- 33 Public-Blocks `gelb_restschuld_ohne_bindung` (eigener Aufräum-Track)

## Empfehlung für Batch 17

**Welle 3** der Admin-Schalter-Pages: die einfacheren Multi-Section-Pages
mit jeweils 1–2 zusätzlichen Gates abräumen, in dieser Reihenfolge:

1. `zutrittskontrolle.fahrstuhlsteuerung` (`overview`, `benefits`)
2. `service.planen-konfigurieren` (`hero`)
3. `service.hub` (`sections`)
4. `zutrittskontrolle.elektronische-drueckergarnitur` (`hero`, `benefits`, `useCases`)

Snipdoo-IP, Tuersprechanlagen, Systemloesungen und gebaeudekommunikation.root
sind redaktionell sensible Marketing-Seiten — die sollten in einer eigenen
Welle 4 mit Sichtprüfung im Browser laufen, nicht en bloc.

Batch 17 **nicht** in diesem Lauf starten.
