# Launch-Entscheidungsvorlage

Stand: 2026-06-04, nach Batch 6 + Launch-Freeze-Abnahme.

## Sind wir launchfähig aus technischer Sicht?

**Ja.** Keine offene Klasse von Befunden ist launch-blockierend.

- Wahrheits-Check Kritisch: 0
- FAQ/CTA orphan / mixed / dedup-only: 0 / 0 / 0
- Spiegel-Audit High: 0
- Persona-Eine-Wahrheit, Card-Parität, Persona-Sort-Order: grün
- Body-Pfad ok auf 115/117 Seiten (2 dynamische Slug-Templates erwartet)
- Smoke-Test (9 Seiten + Admin): keine Whiteouts, keine Laufzeitfehler, CTA/FAQ je einmal sichtbar, Live-Vorschau im Admin lädt

## Was blockiert noch wirklich?

Nichts. Drei Hinweise, die explizit **kein** Blocker sind:

1. **`/ich-bin/bauherr` ist keine eigene URL.** Personas werden als Tabs/Karten auf der Startseite gerendert (`HomePage` mit `personaComponents`), nicht als `/ich-bin/<persona>`-Route. Der Smoke-Punkt war eine Fehlannahme im Auftrag — kein Routing-Bug.
2. **React-Key-Warnung in `GenericCmsPage` → `ProductShowcaseListV1`** auf `/zutrittskontrolle/biometrie` (Dev-only). Im Rahmen dieses Schritts gefixt: `topSections.map` rendert jetzt über `<Fragment key={s.section_key}>`. Keine Sichtbarkeitsänderung.
3. **Snipdoo-IP Tertiärbutton** fehlt seit Batch 6 bewusst (siehe `snipdoo-ip-tertiaerbutton.md`). Akademie ist über Nav + Footer erreichbar.

## Was ist Restschuld?

Vollständig in `launch-restschuld-backlog.md` klassifiziert. Kurzfassung:

- 43 Spiegel-Audit-Befunde (Whitelist-Lücken, Punkt-Keys in inaktiven Containern, i18n→DB-Hebung). Wird nur reportet, blockiert CI nicht.
- 73 page-renderer-coverage-Befunde (Sections in DB aktiv, aber von keiner Page gelesen). Aufräumarbeit, ohne Public-Impact.
- 65 Public-Blocks gelb (32 medium + 33 restschuld). Admin-Schalter wirken auf Layout-Bereiche teilweise nicht 1:1. Konsistent gerendert, aber nicht jeder Toggle hat Bühnenwirkung.

## Was haben wir in diesem Schritt geändert?

Nur Reporting, CI-Gates und ein Mini-Fix — keine Inhalts-Migration, kein Login, keine Restschuld-Reparatur:

- `scripts/cms/wahrheits-check-ci.mjs` — neue harte Assertion auf FAQ/CTA `orphan/mixed/ok_dedup_only = 0`. CI blockt jetzt sofort bei jeder Regression.
- `.github/workflows/cms-audit.yml` — Kopfkommentar „Launch-Gate: Kritisch verboten, Restschuld erlaubt und dokumentiert" + neuer `tsc --noEmit`-Job.
- `src/features/cms/components/GenericCmsPage.tsx` — Key-Warnung behoben durch `Fragment key={section_key}`.
- Drei neue Markdown-Artefakte:
  - `docs/04-betrieb/audit-snapshot/launch-freeze-abnahme.md`
  - `docs/04-betrieb/audit-snapshot/launch-restschuld-backlog.md`
  - `docs/04-betrieb/audit-snapshot/snipdoo-ip-tertiaerbutton.md`
  - `docs/04-betrieb/audit-snapshot/admin-login-vorbereitung.md` (reiner Plan)

## Nächster konkreter Schritt

**Empfehlung: Admin-Login aktivieren.** Restschuld kann nach Login parallel abgebaut werden, ohne Launch zu verzögern.

Reihenfolge (Plan steht in `admin-login-vorbereitung.md`):
1. Plan freigeben.
2. `app_role` + `user_roles` + `has_role`-Function — eine Migration.
3. RPC-Härtung — eine Migration.
4. Erst-Editoren manuell anlegen.
5. `/admin/login`-Seite + `ProtectedRoute` + Session-Listener.
6. Preview-Test.
7. Core-Regel umschreiben.

**Alternative**: Erst Restschuld-Welle 1 (Whitelist-Hygiene, leere Container, i18n→DB-Hebung der 6 betroffenen Sections — geschätzt 3–4 PT). Reduziert die Restschuld-Liste um ca. 20 von 43 Spiegel-Audit-Befunden, ändert aber nichts an der Launch-Fähigkeit.

Meine Empfehlung wäre: **Login zuerst**, weil das der einzige Punkt ist, der zwischen „technisch fertig" und „Public Live mit echter Redaktion" steht.

## Stopp

Keine weiteren Code-Änderungen über diesen Schritt hinaus. Keine neue Migration außer den oben dokumentierten CI/Report-Anpassungen.
