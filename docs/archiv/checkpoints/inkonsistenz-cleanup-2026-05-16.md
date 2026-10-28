# Inkonsistenz-Cleanup 2026-05-16

Adressiert die vier kleineren Inkonsistenzen aus dem letzten Doppelcheck.
Punkt 5 (Auth im `/admin`) bleibt bewusst offen — Prototyp-Phase.

## 1. Renderer-Ausnahmen pinnen — ERLEDIGT

`scripts/cms/renderer-audit.mjs` hat eine hartcodierte `EXEMPT`-Liste mit
drei Pfaden (Admin, ProductDetail, TuersprechanlagenPage). Strict-Mode
`--strict` lässt nur diese drei durch; neue Ausnahmen brauchen eine
sichtbare Code-Änderung in dieser Liste = PR-Diff = bewusste Entscheidung.

Konsequenz: keine schleichende Erosion mehr.

## 2. Tote i18n-Keys — POLICY BESTÄTIGT, KEIN AUTO-CLEANUP

Maschinelles Löschen ist hier gefährlich (Interpolation, Plural, Arrays,
Re-Exports). Workflow in `docs/05-checkpoints/dead-i18n-inventory.md`:
pro Template Sichtprüfung im Preview, dann gezieltes Löschen.

Verantwortlich: Redaktionsteam + Thomas pro Seite, beim nächsten Touch.

## 3. Code-Fallback-Imports für Assets — DOKUMENTIERT

Verhalten ist gewollt und dauerhaft:

- DB-Wert vorhanden + Asset `is_active=true` → DB gewinnt
- DB-Wert fehlt / Slot inaktiv → Code-Import wird gerendert

Damit gilt: Wenn die Redaktion ein Bild im `/admin` "deaktiviert", fällt
die Seite NICHT auf einen leeren Slot, sondern auf das Originalbild aus
dem Repo zurück. Wer ein Bild dauerhaft entfernen will, muss DB-Slot
inaktiv setzen UND den Code-Import löschen.

Für Redaktion ohne Code-Zugriff bedeutet das: Bild ersetzen funktioniert
allein im `/admin`. Bild komplett entfernen geht nur via Prompt an Thomas.

## 4. CI-Hook — ERLEDIGT

- Neuer npm-Script `cms:audit` bündelt `renderer-audit --strict` +
  `validate-no-fout`.
- GitHub Actions Workflow `.github/workflows/cms-audit.yml` läuft bei
  jedem Push/PR auf `main`. Statischer Check, keine DB nötig.
- Lokal vor Push: `npm run cms:audit`.

## Was bleibt offen (Punkt 5, kein Blocker für Prototyp)

Auth im `/admin` ist aus. Vor Go-Live für externe Redakteure zwingend
nachziehen (Supabase Auth + `has_role`-Pattern aus den Projekt-Memories).
