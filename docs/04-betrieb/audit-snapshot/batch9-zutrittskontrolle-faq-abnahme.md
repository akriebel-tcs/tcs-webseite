# Batch 9 — Zutrittskontrolle FAQ-Welle (Abnahme)

Stand: 2026-06-04 · Scope: 7 verbliebene FAQ-Befunde im Bereich `zutrittskontrolle`.

## Vorprüfung

Read-only-Check aller 7 Pages: in keiner Datei existierte bereits ein FAQ-Renderer
(`CmsTailFaq`, `FaqV1`, inline `cms.text("faq", …)` oder `t("…faq…")`).

→ Alle 7 Befunde waren **echte Lücken**, keine Phantome.

## Geänderte Pages (alle Welle 1)

Pro Page: `CmsTailFaq` importiert und unmittelbar vor `CmsSourceBadge`
am Tail eingefügt. Layout, Reihenfolge und Inhalte unverändert.

| Page-Key | Datei |
|---|---|
| `zutrittskontrolle.bcm-handsender` | `src/features/zutrittskontrolle/pages/BcmHandsenderPage.tsx` |
| `zutrittskontrolle.bcm-online-leser` | `src/features/zutrittskontrolle/pages/BcmOnlineLeserPage.tsx` |
| `zutrittskontrolle.elektronische-drueckergarnitur` | `src/features/zutrittskontrolle/pages/ElektronischeDrueckergarniturPage.tsx` |
| `zutrittskontrolle.elektronischer-knaufzylinder` | `src/features/zutrittskontrolle/pages/ElektronischerKnaufzylinderPage.tsx` |
| `zutrittskontrolle.fahrstuhlsteuerung` | `src/features/zutrittskontrolle/pages/FahrstuhlsteuerungPage.tsx` |
| `zutrittskontrolle.funkvernetzte-offline-leser` | `src/features/zutrittskontrolle/pages/FunkvernetzteOfflineLeserPage.tsx` |
| `zutrittskontrolle.vorhaengeschloss` | `src/features/zutrittskontrolle/pages/VorhaengeschlossPage.tsx` |

Dedup über `CmsRenderRegistry` greift automatisch — keine Doppelrenderings möglich,
da in keiner der 7 Pages eine inline FAQ-Section gerendert wird.

## Vorher / Nachher

| Metrik | Vorher | Nachher |
|---|---|---|
| `AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD` gesamt | 14 | **7** |
| Davon `zutrittskontrolle` FAQ | 7 | **0** |
| FAQ-Inventar `ORPHAN` | 7 | **0** |
| FAQ-Inventar `OK` | 74 | **81** |
| CTA-Inventar `OK` | 109 | 109 |
| Wahrheits-Check kritisch | 0 | 0 |
| Spiegel-Audit kritisch (rot) | 0 | 0 |

## Wahrheits-Check

`node scripts/cms/wahrheits-check-ci.mjs` → ✅ OK — Harvester reproduzierbar,
keine Drift, Body-Map vollständig, Launch-Gate erfüllt (FAQ/CTA orphan/mixed/dedup-only = 0).

## Spiegel-Audit

`node scripts/cms/globaler-spiegel-audit.mjs` → 43 Befunde, unverändert
gegenüber Batch 8. Keine Kategorie betrifft die 7 geänderten Pages.
Verteilung:
- `CODE_SONDERRENDERER`: 1
- `CONTAINER_HEADER_WHITELIST_FEHLT`: 12
- `CONTAINER_LEER`: 2
- `I18N_JSX_SECTION_OHNE_DB_GEGENSTUECK`: 6
- `PERSONA_FALLBACK_RENDERER_AKTIV`: 2
- `PUNKT_KEY_IN_INAKTIVER_CONTAINER`: 20

## Browser-Smoke (qualitativ)

`CmsTailFaq` rendert nur, wenn in `cms.sections` eine aktive `faq_v1`-Section
existiert, die nicht bereits inline markiert ist. Da keine der 7 Pages eine
inline-FAQ rendert, ist Doppelrender ausgeschlossen. CTA wird in keiner der
7 Pages doppelt ausgespielt (jede hat genau einen eigenen `${base}.cta`-Block
im Layout). Keine Layout-Verschiebung erwartet — `CmsTailFaq` ist ein
eigenständiger Block, der nach der bisherigen letzten Section folgt.

## Verbleibend (Coverage = 7)

| Bereich | Anzahl | Anmerkung |
|---|---|---|
| Legal `content` | 3 | außerhalb Scope |
| Serviceportal `content` | 3 | Login-nah, weiter vorsichtig |
| Wissen/Akademie FAQ | 1 | letzte isolierte FAQ-Lücke |

## Empfehlung Nächster Batch

**Batch 10 — Wissen/Akademie FAQ + Legal-Content-Renderer (Welle 2 Slim).**

- 1 isolierte FAQ-Lücke (Wissen/Akademie) wie hier mit `CmsTailFaq` schließen.
- Für Legal: prüfen, ob bestehender Body-Renderer einen passenden `content`-
  Section-Type kennt; falls ja, minimaler Renderpfad ergänzen, sonst nur
  Audit-Begründung dokumentieren.
- Serviceportal weiter aufgespart, bis Login-Entscheidung getroffen ist.

Ziel: Coverage von 7 → 3 (Serviceportal-Rest).

Nicht in Batch 10: Login, Whitelist-Welle, i18n-Migration, Raster, Inhalte,
DB-Migration, Redesign, GenericCmsPage-Umbau.
