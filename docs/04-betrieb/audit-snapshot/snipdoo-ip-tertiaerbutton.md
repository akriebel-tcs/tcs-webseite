# Snipdoo-IP — Tertiärbutton „Schulung / Demo buchen"

Stand: 2026-06-04. Fachliche Notiz, **kein Bug**, kein automatischer Umbau.

## Sachstand

- **Vor Batch 6**: Die Seite `gebaeudekommunikation.snipdoo-ip` hatte einen CTA-Block mit **drei Buttons** (Primär, Sekundär, Tertiär). Die Buttons waren in JSX hartcodiert.
- **Nach Batch 6**: Der CTA-Block ist vollständig in `cms_section_fields` migriert und wird über `CtaV1` gerendert. `CtaV1` unterstützt vertraglich **nur Primär- und Sekundär-Button**.
- **Konsequenz**: Der dritte Button „Schulung / Demo buchen → /akademie" ist auf der öffentlichen Seite aktuell nicht mehr sichtbar.

## Bewertung

- Kein Linkverlust: `/akademie` ist über Hauptnavigation und Footer weiterhin direkt erreichbar.
- Kein Spiegelregel-Bruch: Was im Admin steht, wird 1:1 öffentlich gerendert. Der dritte Button steht weder in DB noch in Admin — es gibt also nichts zu spiegeln.
- Kein Audit-Befund: Wahrheits-Check, Spiegel-Audit und Renderer-Coverage sind grün für die Seite.

## Empfehlung

**Vor Launch**: nichts tun.

**Nach Launch**, in dieser Reihenfolge zu prüfen:

1. **Variante A — eigener kleiner CMS-Block `schulung_teaser`** unter `snipdoo-ip` (Bild + Headline + ein Button). Saubere Lösung, weil semantisch „Querverweis auf Akademie", nicht „dritte CTA-Aktion".
2. **Variante B — `cta_v1`-Vertrag um `cta_tertiary_*` erweitern**. Nur wenn sich der Bedarf an drei Aktionen auf weiteren Seiten zeigt. Dann mit Migration für ALLE betroffenen Seiten gleichzeitig, sonst zerfasert der Standard.

**Was wir bewusst nicht tun**: den Button wieder hartcodiert ins JSX schreiben. Das würde die in Batch 5/6 hergestellte Eine-Wahrheit aufweichen und in den Audits als `OK_DEDUP_ONLY` oder Spiegelregel-Bruch wieder auftauchen.
