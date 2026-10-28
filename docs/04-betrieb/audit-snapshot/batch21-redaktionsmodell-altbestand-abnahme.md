# Batch 21 — Abnahme: Redaktionsmodell-Altbestand

Stand: 2026-06-04 · Read-only · Wahrheits-Check stabil grün

## Kurzfassung

- **Wahrheits-Check, Spiegel-Audit, D1, D2b, CI**: alle 0 / grün (vor und nach Batch 21 byte-identisch).
- **`service.hub / P-078`** ist redaktionell unbedient: 16 Public-Kacheln in 5 Gruppen, aber im Admin nur als 132 Altbestand-Punktfelder editierbar.
- **Globales Inventar:** Nur **4 Fälle** projektweit erfüllen das Punktfeld-Muster. Davon **3 echte Kartenwolken (A)** und **1 sachgerechte Bullet-Liste (B)**.
- **Empfehlung:** `service.hub` als Pilot für Batch 22 migrieren. Beschilderung + Digital-Signage folgen separat. `grossanlagen/leistungen` bleibt als `content_v1`.

## Warum Wahrheits-Check grün ist, obwohl der Admin nicht karten-editierbar ist

Wahrheits-Check prüft Inhalts-Spiegelung (DB-Wert = Public-Wert + Whitelist + Renderer-Pfad + kein UI-Fallback). Bei `service.hub` stimmt jeder einzelne Slot:

- DB hält jeden Kacheltext.
- Renderer (`ServicePage.tsx`) liest jeden Wert über `useCmsI18n`.
- Whitelist deckt alle 132 Felder.

**Was fehlt, ist nicht Inhalt, sondern Struktur:** Gruppenzahl, Item-Zahl, Reihenfolge, Icons, Routen und Placeholder-Flag stehen hart im Code (`sectionsMeta`). Strukturänderungen brauchen heute einen Code-Deploy. Genau diese Klasse von Problemen erkennt der Wahrheits-Check nicht — sie braucht ein neues Sub-Audit „Redaktionsmodell-Parität" (Vorschlag siehe Batch-22-Prompt).

## Inventar-Ergebnis (Aufgabe 1)

| Klasse | Anzahl | Fälle |
|---|---:|---|
| A — echte Kartenwolke | **3** | `service.hub/sections`, `gebaeudekommunikation.beschilderung/features`, `gebaeudemanagement.digital-signage/products` |
| B — Textblock mit Punktfeldern | **1** | `gebaeudekommunikation.grossanlagen/leistungen` (Bullet-Listen) |
| C — Wrapper-Helfer | 0 | — |
| D — Legacy | 0 | — |
| E — Sonderseite | 0 | — |

Details: `batch21-altbestand-punktfelder-inventar.{md,json}`.

## Risikoentscheidung Aufgabe 3 — `service.hub` als Pilot

**Sicher migrierbar?** Ja, unter klaren Bedingungen:

| Punkt | Bewertung |
|---|---|
| Renderer-Reife | `CardsSectionV1` existiert und ist erprobt. Zwei kleine Ergänzungen nötig (Stripe-Hintergrund, Placeholder-State). |
| DB-Migration | Idempotent möglich: 5 neue `cards_v1` + 16 `card_v1` einfügen, B-324 auf `is_active=false` setzen, Whitelist mitziehen. |
| Rollback | Trivial: B-324 wieder `is_active=true`, neue Gruppen `is_active=false`, alte Page-Komponente bleibt funktionsfähig. |
| Inhaltsverlust | Keiner — alle Texte werden 1:1 in neue Felder kopiert. |
| Public-Risiko | Niedrig, solange Stripe + Placeholder im Renderer korrekt umgesetzt sind. Smoke auf `/service`, `/en/service` und 6 Zielrouten reicht. |
| Audit-Risiko | Mittel: D1 könnte kurzfristig Befunde melden, weil 5 neue Sections in `ServicePage.tsx` nicht direkt referenziert werden. Lösung: Migration auf `GenericCmsPage`-Wrapper. |

**Entscheidung:** Pilot ist sicher, **aber nicht in Batch 21**. Batch 21 endet hier. Batch 22 startet die Pilot-Migration nach freigegebenem Prompt.

## Re-Audit (Aufgabe 4)

| Audit | Vorher | Nachher |
|---|---|---|
| `wahrheits-check-ci.mjs` | grün | grün |
| `globaler-spiegel-audit.mjs` | 0 | 0 |
| `page-renderer-coverage.mjs` (D1) | 0 | 0 |
| `public-blocks-ignorieren-admin-visibility.mjs` (D2b) | 0/0/0 | 0/0/0 |
| `hartcode-steuerbarkeit-inventar.mjs` | siehe Snapshot | unverändert |

Keine Veränderung durch reine Analyse — wie erwartet.

---

## Fertiger Prompt-Entwurf für Batch 22 (NICHT starten)

```
Starte Batch 22 — Pilot-Migration `service.hub / P-078`: 5 cards_v1-Gruppen + 16 card_v1-Karten.

Grundlage:
- docs/04-betrieb/audit-snapshot/batch21-service-hub-redaktionsmodell-vorpruefung.md
- docs/04-betrieb/audit-snapshot/batch21-service-hub-zielmodell.md
- docs/04-betrieb/audit-snapshot/batch21-altbestand-punktfelder-inventar.md

Ziel:
- `service.hub` ist nach Batch 22 vollständig im Admin als Karten editierbar.
- Public sieht identisch aus (5 Sektionen mit Eyebrow/H2/Intro + Kachelraster, alternierender Hintergrund, Placeholder-Kacheln ausgegraut).
- Wahrheits-Check, Spiegel-Audit, D1, D2b, CI bleiben 0/grün.
- B-324 `sections` bleibt als `is_active=false` zur Rollback-Sicherung in der DB.

Aufgabe 1 — Renderer-Vorbereitung (Code, klein):
- `CardsSectionV1.tsx` um zwei Lesefelder erweitern:
  - `section_bg` ("default" | "secondary") → alternierender Hintergrund.
  - `is_placeholder` pro Karte → ausgegraute Disabled-Kachel (analog
    heutiger ServicePage.tsx-Logik, kein Klick, aria-disabled).
- Bestandsverhalten anderer Pages darf sich nicht ändern (Defaults beibehalten).

Aufgabe 2 — DB-Migration (idempotent):
- Eine Migration mit:
  - INSERT der 5 cards_v1-Sections (`group_<g>`, sort 20/30/40/50/60).
  - INSERT der 16 card_v1-Sections (`card_<key>`) als Kinder.
  - INSERT der card-Felder (title/description/link_1_label/link_1_href/icon/is_external/is_placeholder/section_bg/link_page_key).
  - Werte mappen aus B-324 sections (Texte) + sectionsMeta (icon/href/placeholder).
  - UPDATE B-324 sections SET is_active=false.
  - INSERT in cms_admin_editable_fields für jedes neue Feld × Locale (Whitelist-Pflicht).
- Re-run muss denselben Zustand erzeugen (kein Doppelinsert, kein Reset).

Aufgabe 3 — Page-Komponente:
- `src/features/service/pages/ServicePage.tsx` auf `<GenericCmsPage pageKey="service.hub" />` reduzieren.
- `sectionsMeta`, `HubItemBody`, Lucide-Imports entfernen.
- Routes-Konstanten nur entfernen, wenn sie nirgendwo sonst importiert sind (prüfen).

Aufgabe 4 — Audit-Erweiterung (klein):
- `page-renderer-coverage.mjs`: `GenericCmsPage`-Wrapper-Erkennung deckt die 5 neuen Sections automatisch ab — verifizieren.
- Optional: neues Sub-Audit „Redaktionsmodell-Parität" (Vorschlag für späteren Batch, nicht Pflicht in 22): findet content_v1-Sections mit Karten-Muster (Kriterium aus Batch 21) und meldet sie als Klasse A-Restschuld.

Aufgabe 5 — Smoke + Re-Audit:
- Public: `/service` und `/en/service` rendern alle 5 Gruppen mit identischer Reihenfolge, Icons, Texten, Placeholder-Status, alternierendem Hintergrund.
- Zielrouten Stichprobe: Katalog, Downloads, Support, Planen, Ersatzteile, Akademie, Serviceportal.
- Alle Audits laufen lassen, müssen 0/grün bleiben.
- Admin: 5 cards_v1-Gruppen sind als Karteneditor sichtbar; Karten lassen sich
  sortieren; B-324 erscheint im Altbestand-Bucket.

Aufgabe 6 — Abnahme:
- docs/04-betrieb/audit-snapshot/batch22-service-hub-pilot-abnahme.md
- Update docs/migration-log.md
- Stoppen.

Wenn unsicher oder ein Audit unerwartet schlechter wird: stoppen und melden,
nichts ungefragt reparieren.
```
