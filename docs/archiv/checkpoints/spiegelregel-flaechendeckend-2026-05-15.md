# Spiegel-Regel flächendeckend aktiviert — 2026-05-15

## Status

**Renderer scharf geschaltet auf 67 von 69 CMS-fähigen Seiten.**

Was heißt das konkret: Sobald in `cms_sections` für eine Seite mindestens eine renderbare Top-Level-Section liegt UND mindestens ein Feld in `cms_section_fields` gepflegt ist, rendert die Public-Seite die DB-Sections in der Reihenfolge aus `sort_order`, mit Sichtbarkeit aus `is_active`. Andernfalls greift der unveränderte Code-Fallback (i18n + hartcodierte Struktur).

## Mechanik (pro Seite)

```tsx
const cms = useCmsPageContent("page.key");
const dbBody = useCmsBody("page.key", cms);

return (
  <CmsPageLayout … heroImage={cms.asset(…)}>
    {dbBody ?? (<>… code-fallback …</>)}
    <CmsSourceBadge pageKey="…" source={dbBody ? "db" : "fallback"} … />
  </CmsPageLayout>
);
```

Der Badge unten rechts zeigt im Dev/Preview-Modus an:
- 🟢 grün „DB · N Sections" — Renderer aktiv, Inhalte aus Datenbank
- 🟡 gelb „Code (Fallback)" — DB hat noch keine renderbaren Sections, Code rendert

## Abdeckung

| Domain | Seiten | Renderer scharf |
|---|---:|---:|
| anwendungen | 7 | 7 |
| eingangssysteme | 8 | 8 |
| gebaeudekommunikation | 5 | 5 |
| gebaeudemanagement | 6 | 6 |
| home | 2 | 2 |
| karriere | 1 | 1 |
| kontakt | 2 | 2 |
| legal | 3 | 3 |
| personas | 7 | 6 (WoWiHero ausgenommen, Inline-Hero) |
| presse | 1 | 1 |
| service | 6 | 6 |
| serviceportal | 3 | 3 |
| signage | 2 | 2 |
| wissen | 1 | 1 |
| zutrittskontrolle | 12 | 12 |
| **gesamt** | **69** | **67** |

**Bewusst ausgenommen:**
- `personas/wohnungswirtschaft/components/WoWiHero.tsx` — reines Hero-Element, paart mit `WohnungswirtschaftContent.tsx` (= ist gepatcht)
- `anwendungen/components/AnwendungDetailPage.tsx` — generische Detail-Komponente mit dynamischem `pageKey` aus Props

## Was Redaktion ab jetzt kann

1. **Texte** ändern → erscheinen sofort live (war auch vorher schon so)
2. **Bilder** im Admin hochladen → erscheinen sofort live (war auch vorher schon so)
3. **NEU: Section-Reihenfolge** ändern (`sort_order`) → spiegelt sich auf Public
4. **NEU: Sections aus-/einblenden** (`is_active`) → spiegelt sich auf Public
5. **NEU: Sections löschen oder hinzufügen** → wenn alle Sections weg sind, fällt Public automatisch auf den Code-Fallback zurück (= Seite bleibt sichtbar)

## Was Redaktion NICHT machen muss

- Keine Datenmigration. DB ist bereits mit ~5.700 Feld-Einträgen über 84 Seiten befüllt.
- Keine Code-Änderungen. Alles läuft über `/admin`.

## Sicherheitsnetz

- Code-Fallback bleibt überall erhalten. Selbst wenn jemand versehentlich ALLE Sections einer Seite deaktiviert, bleibt die Seite sichtbar (gerendert aus Code).
- `useCmsBody` rendert NUR wenn:
  - mindestens eine Top-Level-Section mit bekanntem Renderer-Typ existiert UND
  - mindestens ein DB-Feld auf der Seite gesetzt ist

## Bekannte offene Punkte (für nach Übergabe)

1. Bilder-Lücken in einzelnen Sections (ProductScroller-Karten ohne Asset → Karte rendert ohne Bild). Wird per Admin-Upload behoben.
2. Section-Typen-Inventur (DB hat 17 Typen, alle abgedeckt). Falls neue Typen ergänzt werden, Renderer in `CmsBodyRenderer.tsx` erweitern.
3. Endgültiger Wegfall des Code-Fallbacks pro Seite — erst dann „echt CMS-only". Empfehlung: nicht vor mindestens einer kompletten Editier-Runde durch Redaktion.

## Geänderte Dateien

67 Page/Component-Files in `src/features/**/*.tsx` (siehe git diff dieser Etappe).
