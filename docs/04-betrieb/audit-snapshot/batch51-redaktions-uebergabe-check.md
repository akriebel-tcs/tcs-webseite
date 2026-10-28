# Batch 51 — Finaler Redaktions-Übergabe-Check (CMS-Light)

Stand: 2026-06-05 · Scope: reiner Status-/Übergabe-Check, **keine** Änderungen
am Code, an der DB, an Inhalten oder an der Navigation.

---

## Übergabe-Ampel: 🟢 GRÜN

**Empfehlung: Kann in den Redaktionstest gehen.**

Der harte Launch-Kern ist stabil; offene Punkte sind dokumentierte Restschuld
oder Diagnose, kein Blocker für den redaktionellen Probebetrieb.

---

## 1. Kernstatus CMS-Light (frisch gemessen)

| Gate | Wert | Quelle |
|---|---:|---|
| Wahrheits-Check CI (Launch-Gate) | ✅ grün | `scripts/cms/wahrheits-check-ci.mjs` |
| FAQ orphan / mixed / dedup-only | 0 / 0 / 0 | `scripts/cms/faq-cta-toggle-inventar.mjs` |
| CTA orphan / mixed / dedup-only | 0 / 0 / 0 | dto. |
| FAQ OK / „—" / UNKNOWN | 82 / 27 / 0 | dto. |
| CTA OK / „—" / UNKNOWN | 109 / 0 / 0 | dto. |
| Body-Pfad ok / unknown | 114 / 0 | dto. |
| Page-Renderer-Coverage `AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD` | **0** | `page-renderer-coverage.mjs` |
| Sichtbare Platzhalter (`Punkt/Merkmal/Point/Feature N` mit Toggle=true) | **0** | DB-Stichprobe |
| Sichtbare `/kontakt`-Defaultlinks (`link_*_href='/kontakt'` mit Toggle=true) | **0** | DB-Stichprobe |
| Kartenscroller B-082 / B-075 | ✅ scrollt | Batch 49b |
| B-566 (signage.root) | ✅ Legacy/Bespoke, Page archiviert | Batch 49d |
| Admin-Link-Pillen | ✅ live (Rückfall aus `cms_pages.route_path`) | Batch 49b |

### Bekannte Diagnose-Klassen (kein Launch-Blocker)

`globaler-spiegel-audit.mjs` meldet **797 Diagnose-Befunde** (keine
Kritisch-/High-Klasse):

- `LINK_OHNE_ZIEL`: 656 — Links mit Toggle aus oder leerem Ziel; öffentlich nicht
  klickbar. Reine Diagnose.
- `CONTAINER_HEADER_WHITELIST_FEHLT`: 72 — Container-Header-Felder (label/intro)
  ohne Whitelist-Eintrag, fällt aber nicht im Public auf, weil die Werte
  weiterhin gerendert werden. Redaktioneller Schliff.
- `WHITELIST_FEHLT`: 62 — analog auf Standardbausteinen.
- `CTA_AKTIV_ABER_NULL_RENDER`: 4 — vier CTAs aktiv, aber Renderer ergibt keine
  Ausgabe (typischerweise leere Werte). Diagnose, nicht öffentlich kaputt.
- `PUNKT_KEY_IN_INAKTIVER_CONTAINER`: 2 — kosmetischer Altbestand.
- `CODE_SONDERRENDERER`: 1 — Treffer aus `card-renderer-paritaet` (6 Code-Stellen
  auf bekannten Bespoke-Pages: `SnipdooIpPage`, `BildungseinrichtungenPage`,
  `InterneKommunikationPage`). Bewusste Bespoke-Sonderpfade, im Bespoke-
  Register bereits ausgewiesen.

Diese Klassen sind im Backlog seit `launch-restschuld-backlog.md` als
**Restschuld** klassifiziert, nicht als Launch-Blocker.

---

## 2. Redaktionsworkflow — Was Redaktion live nutzen kann

Stichprobenartig gegen die letzten Batch-Berichte und Audits verifiziert:

- **Standardkarte bearbeiten** (Titel/Text/Bild/Link an-aus): vollständig im
  `BildkartenCardWorkspace`; Link-Pille zieht jetzt auch `cms_pages.route_path`
  als Rückfall (Batch 49b). ✅
- **FAQ ein-/ausblenden**: Toggle-System grün, 0 orphan/mixed. ✅
- **CTA-Link prüfen**: 109/109 OK, 0 orphan. ✅
- **Seite mit `Hauptmenü aus`**: bleibt erreichbar (Breadcrumb-RPC ignoriert
  `is_active`), Hinweistext vorhanden (Service-Hub-Track). ✅
- **Navigation / Unterseiten-Verlinkung**: `cms_navigation_nodes` ist Quelle,
  nach Batch 50-Fix Dropdown „Gebäudekommunikation" wieder vollständig. ✅
- **Live-Vorschau „Seite ansehen"**: funktioniert (Spiegel-Regel greift,
  DB-first-Rendering überall aktiv). ✅

---

## 3. Vorlagen / Admin-Verständlichkeit

- **Vorlagen-Katalog** zählt plausibel (Batch 29-Stand, durch Batch 49/50
  nicht verändert). Keine irreführenden aktiven Legacy-Blöcke aufgefallen;
  `signage.root|products` ist nach Batch 49d im Audit-Datenstand als
  Legacy/Bespoke ausgewiesen. ✅
- **„Nicht öffentlich verwendete Altfelder"** (Batch 50): Headline und
  Hilfetext entschärft, Alias-/Asset-Slot-Coverage in
  `sectionWorkspaceGroups.ts` ergänzt. Box erscheint nur noch dort, wo es
  wirklich Diagnose ist. ✅
- **Bespoke-/Legacy-Fälle** sind durch `bespokePageSections.ts` als
  „Sonderfeld · wirkt öffentlich" markiert, nicht als Standardbaustein. ✅
- **HelpDrawer / Hilfe & Legende**: aktuell genug für Redaktion; Folge-Schliff
  (z. B. Refproj-Hero, Teaser-Alias `cta_href`) ist im Restschuld-Plan.

---

## 4. Offene Restpunkte

### A. Muss vor Redaktion erledigt sein
- **Keine.** Kein offener Punkt ist Übergabe-Blocker.

### B. Darf im Redaktionstest mitlaufen
- 72× `CONTAINER_HEADER_WHITELIST_FEHLT` (Container-Header
  `label`/`title`/`intro` einzelner `cards_v1` ohne Whitelist).
- 62× `WHITELIST_FEHLT` auf Standardbausteinen.
- 4× `CTA_AKTIV_ABER_NULL_RENDER` (leere CTA-Werte).
- 6× Bespoke-Sonderpfade in der Karten-Paritäts-Prüfung
  (`SnipdooIpPage`, `BildungseinrichtungenPage`, `InterneKommunikationPage`) —
  bewusste Bespoke-Renderer, kein Spiegelproblem.
- Optionaler Cleanup leerer `cms_section_fields` (z. B. ~130× leere
  `image`-Text-Zeile auf `hero_v1`, leere bullet/feature-Platzhalter).
- Refproj-Hero Workspace-Vertrag (`meta_units`, `meta_year`) — Folge-Batch.
- Teaser-Alias `cta_href` → `cta_link` Verschmelzungslauf (idempotent,
  niedrige Priorität).

### C. Späteres Technikprojekt
- **Login / Auth / Rollenmodell** — bekannter späterer Punkt, nicht im
  CMS-Light-Scope, hier nur als Hinweis genannt.
- Klasse-A-Track für die 3 verbleibenden hartcodierten Marketing-Seiten.
- Admin-UX-Welle 2 (Whitelist-Race-Glitch, Refproj-Workspace, weitere
  Helptexte).

---

## 5. Geprüft / nicht geprüft

**Geprüft (in diesem Batch ausgeführt):**
- `wahrheits-check-ci.mjs` ✅
- `faq-cta-toggle-inventar.mjs` ✅
- `page-renderer-coverage.mjs` ✅
- `globaler-spiegel-audit.mjs` (Befunde gesichtet und klassifiziert)
- `card-renderer-paritaet.mjs` (Bespoke-Sonderpfade bestätigt)
- DB-Stichproben: sichtbare Platzhalter / sichtbare `/kontakt`-Defaults

**Nicht ausgeführt:**
- Build (`tsc --noEmit`) — kein Quellcode geändert, Sandbox-Regel.
- Manuelle Klick-Tour durch jede Seite (Stichprobe genügt für Übergabe).

---

## 6. Einschränkungen, die Redaktion wissen sollte

- **Admin läuft ohne Login** (Prototyp-Phase). Änderungen wirken sofort live.
- **Inhalt-zuerst-Regel**: Texte, Bilder, Linktitel über `/admin` pflegen,
  nicht über Code-Anfragen — außer es ist explizit ein Bespoke-Block.
- **Spiegelregel**: Reihenfolge/Sichtbarkeit aus Admin spiegelt sich 1:1
  in der Live-Vorschau und umgekehrt.
- **Bekannte „Diagnose"-Hinweise** im Admin (orange „Nicht öffentlich
  verwendete Altfelder") sind in der Regel harmlose Migrationsreste oder
  bereits gepflegte Aliase — **nicht löschen**, sondern als Cleanup-Kandidat
  vormerken.
- Bei größeren Wünschen (neue Section-Typen, Navigation, neue Seiten,
  Login) bitte stoppen und an die Technik melden — die Freeze-Regeln
  unter `.lovable/always-follow.md` greifen.

---

## 7. Empfehlung

**🟢 Kann in den Redaktionstest gehen.**

Der harte CMS-Kern ist freeze-reif und stabil:
Launch-Gate grün, Coverage 0, keine sichtbaren Platzhalter, keine
sichtbaren `/kontakt`-Defaultlinks, Kartenscroller B-082/B-075 sauber,
B-566 als Legacy klassifiziert, Admin-Link-Pillen live, Dropdown-Navigation
nach Batch 50-Fix konsistent.

Verbleibende 797 Spiegel-Audit-Befunde sind Diagnose/Restschuld (keine
Kritisch-Klasse) und sind im Redaktionstest aushaltbar; sie werden in
Folge-Batches kosmetisch abgeräumt.

---

## 8. Geänderte Dateien

- `docs/04-betrieb/audit-snapshot/batch51-redaktions-uebergabe-check.md`
  (dieser Bericht).

Keine weiteren Änderungen.
