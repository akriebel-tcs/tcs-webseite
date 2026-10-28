# `db_dupes` & `section_inactive` — Triage-Inventar

Stand: 2026-06-03 · Quelle: live `psql` gegen `cms_assets` / `cms_sections`.

Reines **Read-only-Inventar**. Keine Datenänderung in diesem Sprint.

## 1. `db_dupes` (mehrere aktive Assets im selben Slot/Viewport)

```sql
SELECT page_key, section_key, field_key, viewport, COUNT(*)
  FROM cms_assets
 WHERE is_active = true
 GROUP BY 1,2,3,4
HAVING COUNT(*) > 1;
```

**Ergebnis: 0 Zeilen.** Es gibt aktuell keine aktiven Bild-Dubletten. Der
Wahrheits-Check kann `db_dupes` daher nicht mehr als rote Ampel werfen.
Inaktive Alt-Versionen bleiben absichtlich liegen (siehe Asset-Strategie).

**Entscheidung:** nichts zu tun. CI würde Drift sofort sichtbar machen.

## 2. `section_inactive` (Sections mit `is_active = false`)

**Gesamt:** 140 Sections über 31 Seiten.

### Verteilung nach Section-Typ

| section_type     | Anzahl |
|------------------|-------:|
| `card_v1`        |     73 |
| `cards_v1`       |     25 |
| `faq_v1`         |     21 |
| `content_v1`     |      9 |
| `teaser_2col_v1` |      7 |
| `rich_v1`        |      5 |

### Verteilung nach Seite (Top 10)

| page_key | inaktiv |
|----------|--------:|
| `anwendungen.root` | 23 |
| `home.start` | 13 |
| `gebaeudemanagement.root` | 9 |
| `zutrittskontrolle.biometrie` | 8 |
| `personas.architekt` | 6 |
| `personas.bauherr` | 6 |
| `personas.fachhandel` | 6 |
| `personas.fachplaner` | 6 |
| `personas.handwerk` | 6 |
| `personas.wohnungswirtschaft` | 6 |

### Klassifizierung der Befunde

Per Stichprobe und Abgleich mit den jüngsten Sprintberichten lassen sich
die 140 Treffer in drei Buckets sortieren:

1. **Absichtlich ausgeblendete Alt-Karten (Mehrheit)** — `card_v1`,
   `cards_v1`. Die Karten gehören zu Seiten, deren Raster aktuell aus
   weniger Karten besteht als historisch. Sie bleiben in der DB liegen,
   damit die Redaktion sie über den Inline-Schalter wieder einblenden
   kann.
   **Quelle der Policy:** `docs/04-betrieb/ausgeblendete-sections-policy.md`
   (Inline-ausgegraut als Standard, „Altbestand"-Bucket nur bei
   abgeschaltetem Inline-Schalter).
   **Entscheidung:** behalten, nicht löschen.

2. **FAQ-Skeleton-Sections auf neuen CMS-Light-Seiten** — `faq_v1` mit
   `is_active = false`. Stichprobe (`produkte.eingangsloesungen`,
   `produkte.zutrittskontrolle`): leere FAQ-Slots, die beim Aufbau der
   Seite vorgesehen wurden, aber redaktionell noch nicht bestückt sind.
   Per Spiegel-Regel ist es korrekt, sie inaktiv zu halten — sie werden
   öffentlich nicht gerendert.
   **Entscheidung:** behalten. Sobald die Redaktion FAQ-Inhalte einpflegt,
   wird im Admin der Inline-Schalter umgelegt.

3. **Historische Layout-Varianten** (`teaser_2col_v1`, `rich_v1`,
   `content_v1` auf `anwendungen.root` und `home.start`) — Sections, die
   beim Übergang auf das aktuelle Body-Layout deaktiviert wurden, aber
   noch Inhalte tragen, die als Referenz wertvoll sind.
   **Entscheidung:** behalten, dokumentiert als Altbestand.

**Migration nötig?** Nein. Es existiert kein Befund, der eindeutig als
„sicher löschbar" qualifiziert wäre. Eine Migration würde im aktuellen
Sprint Inhalte zerstören und der Inhalt-zuerst-Regel widersprechen.

## 3. Was kommt aus der CI-Sicht?

Der laufende Wahrheits-Check (`scripts/cms/wahrheits-check-ci.mjs`)
würde durch Änderungen an `cms_assets` / `cms_sections` automatisch
Drift melden. Solange `db_dupes = 0` und die Anzahl `section_inactive`
stabil bleibt, ist hier nichts weiter zu tun.

Sollte sich in Zukunft ein Befund als **redundant** herausstellen (z. B.
zwei `faq_v1` mit identischem Inhalt auf derselben Seite, eine aktiv,
eine inaktiv), erfolgt die Bereinigung über eine idempotente Supabase-
Migration mit Whitelist auf den jeweiligen `id`-Werten — niemals als
Pauschal-Cleanup.
