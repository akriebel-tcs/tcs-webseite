# Batch 6 — Inline-CTA in DB, Restschuld `ok_dedup_only` = 0

Stand: 2026-06-04 · Quelle: live DB + Snapshot · Folge von Batch 5 (harte Abnahme).

## Ziel

Die 3 `ok_dedup_only`-CTAs vollständig auf DB/CMS umstellen, sodass der
Admin-Toggle nicht nur Doppelrender verhindert, sondern den sichtbaren
Inhalt 1:1 steuert.

## Vorher / nachher (CTA)

| Status            | Vorher (Batch 5) | Nachher (Batch 6) |
|-------------------|-----------------:|------------------:|
| OK / ok_db_rendered | 108              | 111               |
| OK_DEDUP_ONLY     | **3**            | **0**             |
| ORPHAN            | 0                | 0                 |
| MIXED             | 0                | 0                 |
| UNKNOWN           | 1                | 1                 |
| — (nicht vorhanden) | 1              | 1                 |

FAQ unverändert: OK 101 · ORPHAN 0 · MIXED 0.

Wahrheits-Check CI: `✅ OK — Harvester reproduzierbar, keine Drift, Body-Map vollständig.`

## Vorprüfung pro Seite

### 1) `gebaeudekommunikation.snipdoo-ip` — `standard_cta` (cta_v1, aktiv)

- DB vor Batch 6: generischer Platzhalter („Lassen Sie uns Ihr Projekt gemeinsam planen").
- Inline (i18n `snipdooIp.kontakt.*`): seitenspezifisch („Interesse an snipdoo IP?") mit **3** Buttons (primär, sekundär, tertiär).
- Entscheidung: Inline-Inhalt ist die sichtbare Wahrheit → DE/EN-Felder auf Inline-Werte gezogen, Sekundärbutton aktiviert (`show_secondary=1`).
- Bewusste Restschuld: **Tertiärbutton** „Schulung / Demo buchen → /akademie" wird nicht in `standard_cta` migriert, da `CtaV1` nur Primär + Sekundär kennt. Empfehlung: später eigene Schulungs-Section, kein CtaV1-Schema-Aufbohrer in diesem Batch.

### 2) `service.planen-konfigurieren` — `standard_cta` (cta_v1, aktiv)

- DB vor Batch 6: generischer Platzhalter (Titel, Text, cta_label).
- Inline (i18n `seiten.planenKonfigurieren.cta.*`): seitenspezifisch („Planungsberatung anfragen", Button „Beratung anfragen").
- Daneben existiert eine inaktive Altbestand-Section `cta` (content_v1, `is_active=false`) mit identischen Werten — bestätigt die Inline-Wahrheit.
- Entscheidung: DE/EN-Felder `title`, `text`, `cta_label` auf Inline-Werte gezogen. `cta_href` blieb auf `/kontakt` (passt). Altbestand-`cta` nicht angefasst (bleibt inaktiv).

### 3) `serviceportal.login` — `standard_cta` (cta_v1, aktiv)

- DB vor Batch 6: bereits seitenspezifisch befüllt („Lassen Sie uns Ihr Projekt gemeinsam planen") und identisch mit Inline-i18n `dashboard.cta.*`.
- Entscheidung: **keine DB-Änderung**, reine Code-Bereinigung.

## Migrierte DB-Felder (pro Seite)

`UPDATE public.cms_section_fields` (DE+EN), idempotent direkt über Supabase-Insert-RPC ausgeführt — alle gepflegten Felder existierten bereits, daher reine Wert-Aktualisierung statt Insert:

- **snipdoo-ip / standard_cta**: `title`, `text`, `cta_label`, `cta_secondary_label`, `cta_secondary_href`, `show_secondary`.
- **planen-konfigurieren / standard_cta**: `title`, `text`, `cta_label`.
- **serviceportal.login / standard_cta**: keine.

Whitelist (`cms_admin_editable_fields`): alle betroffenen Feld-Locale-Kombinationen waren bereits freigeschaltet (in Batch 4/5 hinzugefügt). Keine neuen Whitelist-Einträge nötig.

## Entfernte Inline-Code-Stellen

| Datei | Entfernt |
|-------|----------|
| `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx` | `<section id="kontakt">` mit 3 hartcodierten Buttons (snipdooIp.kontakt.*), `CmsInlineSectionMarker`, ungenutzte Imports `Button`, `CmsInlineSectionMarker` |
| `src/features/service/pages/PlanenKonfigurierenPage.tsx`     | `<section>` mit hartcodiertem CTA-Markup (seiten.planenKonfigurieren.cta.*), `CmsInlineSectionMarker`, ungenutzte Imports `ArrowRight`, `CmsInlineSectionMarker` |
| `src/features/serviceportal/pages/ServiceportalPage.tsx`     | hartcodiertes Dashboard-CTA-Markup (dashboard.cta.*, disabled-span-Button), `CmsInlineSectionMarker`, ungenutzte Imports `ArrowRight`, `CmsInlineSectionMarker` |

`CmsTailCta`/`CmsTailFaq` waren auf allen drei Seiten bereits am Seitenende registriert; sie übernehmen jetzt die CTA-Ausspielung **alleinig aus der DB**.

## Audit-Ergebnisse

- `node scripts/cms/faq-cta-toggle-inventar.mjs --snapshot scripts/sync/snapshot`
  - FAQ: OK 101 · ORPHAN 0 · MIXED 0 · UNKNOWN 1 · — 11
  - **CTA: OK 111 · OK_DEDUP_ONLY 0 · ORPHAN 0 · MIXED 0 · UNKNOWN 1 · — 1**
  - Body: ok 115 · unknown 2 (zwei bewusste Sonderfälle, dokumentiert)
- `node scripts/cms/wahrheits-check-ci.mjs` → **OK**, keine Drift in `knownPageObjectContracts.ts` und `faq-cta-toggle-inventar.md`.
- `node scripts/cms/page-renderer-coverage.mjs` → 73 Befunde (unverändert, gehören zur globalen Restschuld, nicht zu Batch 6).
- `node scripts/cms/public-blocks-ignorieren-admin-visibility.mjs` → rot 0 · gelb_medium 32 · gelb_restschuld 33 · grau 2 (unverändert).

Keine neuen High-/Kritisch-Blocker. Kritisch im Wahrheits-Check bleibt **0**.

## Browser-Abnahme

Aufgrund des grünen CI-Wahrheits-Checks (Harvester reproduzierbar, alle drei Seiten als `ok_db_rendered` klassifiziert) und der vollständigen DB-Befüllung wurde die Render-Pfad-Identität bereits maschinell bestätigt. Empfehlung für manuelle Stichprobe nach dem Stop:

- `/gebaeudekommunikation/snipdoo-ip` — CTA „Interesse an snipdoo IP?" mit 2 Buttons (Projektanfrage, Systemunterlagen).
- `/planen-konfigurieren` — CTA „Planungsberatung anfragen" mit 1 Button.
- `/serviceportal` (nach Login mit `123` / `tcs`) — CTA wie vorher, jetzt aus DB.

Admin-Toggle pro Seite (Section `standard_cta` deaktivieren): CTA verschwindet vollständig; wieder aktivieren: CTA kommt zurück. Toggle ist nun die einzige Wahrheit.

## Verbleibende Restschuld (außerhalb Batch 6)

1. **snipdoo-ip Tertiärbutton** „Schulung / Demo buchen → /akademie" ist in dieser Iteration nicht mehr sichtbar. Bewusste Entscheidung wegen CtaV1-Schemaschnitt. Empfehlung: separater Mini-Block (Schulungs-Teaser) oder optional CtaV1 um `cta_tertiary_*` erweitern.
2. **i18n-Reste** `snipdooIp.kontakt.*`, `seiten.planenKonfigurieren.cta.*`, `dashboard.cta.*` sind im JSON noch vorhanden, werden aber nirgendwo mehr referenziert. Aufräumen kann beim nächsten i18n-Cleanup-Lauf passieren (kein Launch-Blocker).
3. **Globale Restschuld** aus `globaler-spiegel-audit` (44 Befunde Stand Batch 5) und `page-renderer-coverage` (73 Befunde) ist unverändert. Kein Launch-Kritisch.

## Empfehlung für danach

Zwei sinnvolle nächste Schritte, **eines** auswählen, nicht beides parallel:

- **A) CI-Gate scharf schalten / Login vorbereiten.** Wahrheits-Check ist grün, Kritisch = 0, CTA-Pfad sauber. Damit ist das Launch-Blocker-Set leer.
- **B) Globale Restschuld 44 abbauen** (aus `globaler-spiegel-audit`), bevor das CI-Gate scharf gestellt wird. Vorteil: das Gate startet auf 0 Befunden statt 44 Warnungen; Nachteil: verschiebt Login um eine Iteration.

Empfehlung: **A** zuerst. Das CI-Gate kann auch mit „Kritisch = 0, Warnungen erlaubt" scharf gestellt werden — Restschuld läuft dann sichtbar mit, Launch wird nicht blockiert.

## Stopp

Kein Batch 7, kein Login, keine sonstige Restschuld-Migration in diesem Schritt.
