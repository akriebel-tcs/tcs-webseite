# Stabilisierung — Preview-Check (Teil A)

Stand: 2026-06-04 · read-only · keine Code-/DB-Änderung.
Quelle: Browser-Sandbox-Preview (`/zutrittskontrolle/...`).
Bezug: Stabilisierungs-Auftrag „Eine Wahrheit".

## Zusammenfassung

| Fall | Ergebnis | Status |
|---|---|---|
| P021 Biometrie — kein Whiteout | Seite bleibt dauerhaft sichtbar, kein „kurz da, dann weiß" | ✅ |
| Zufahrtskontrolle (`/zutrittskontrolle/zufahrten-parkplaetze`) — Showcase-Typ | Seite lädt vollständig, Hero + Body sichtbar | ✅ |
| FAQ öffentlich sichtbar — Biometrie | FAQ-Section „Häufige Fragen – Antworten, die weiterhelfen" mit Items wird gerendert | ✅ |
| FAQ öffentlich sichtbar — BCM MiniCloud | FAQ-Section mit 5 Items wird gerendert | ✅ |
| Konsole sauber | Eine React-`key`-Warning in `ProductShowcaseListV1` — kein Whiteout-Auslöser, aber Tech-Hygiene-Punkt | ⚠️ |

Damit ist der akut gemeldete **Whiteout-Verdacht auf Biometrie/Zufahrtskontrolle nicht reproduzierbar** — der Showcase-Fix (Stand vor diesem Check) trägt im Preview.

## Detail

### 1. P021 Biometrie (`/zutrittskontrolle/biometrie`)

- Lädt vollständig, Hero („Zutrittskontrolle Biometrie") + Eyebrow + Intro + Hero-Image sichtbar.
- CMS-Overlay zeigt: `Body aus DB · zutrittskontrolle.biometrie · 4 Sections`.
- Keine Runtime-Errors. Einzige Konsolenmeldung:
  - `Warning: Each child in a list should have a unique "key" prop … at ProductShowcaseListV1`.
  - Bewertung: React-DEV-Warning, kein Funktionsfehler. Sollte in einem
    separaten Mini-Fix in `ProductShowcaseListV1.tsx` adressiert werden
    (Key auf Listenelement ergänzen). Nicht Teil dieser Stabilisierungsrunde.

### 2. Zufahrtskontrolle (`/zutrittskontrolle/zufahrten-parkplaetze`)

- Lädt vollständig, Headline + Intro + 6 Sections aus DB.
- CMS-Overlay: `Body aus DB · zutrittskontrolle.zufahrten-parkplaetze · 6 Sections`.
- Keine Whiteout-Symptome, keine zusätzlichen Konsolenfehler.

### 3. FAQ-Sichtbarkeit Public

#### Biometrie
- FAQ-Block sichtbar, Eyebrow „HÄUFIGE FRAGEN", Headline „Antworten, die weiterhelfen", 4+ sichtbare Items.

#### BCM MiniCloud (`/zutrittskontrolle/bcm-mini-cloud`)
- FAQ-Block sichtbar, 5 sichtbare Items.
- Standard-CTA „Lassen Sie uns Ihr Projekt gemeinsam planen" direkt darunter sichtbar.

### 4. FAQ-Schaltbarkeit (Admin → Public)

Nicht Bestandteil von Teil A (read-only). Wird in **Teil C** geprüft:
- Section-Schalter (gesamte FAQ aus)
- Item-Schalter (`items.<slug>.enabled` / `is_active` / `visible` / `hidden`)
- Persistenz nach Reload
- Spiegel Public ↔ Admin

## Offene Punkte (nicht Teil A)

1. React-`key`-Warning in `ProductShowcaseListV1` — Hygiene-Fix in eigener Iteration.
2. FAQ-Bedienbarkeit im Admin (Item-Toggles) — siehe Teil C.
3. 46 Befunde im `globaler-spiegel-audit` — siehe Teil D.

## Fazit Teil A

Die konkret befürchteten Bedien-/Render-Probleme (Whiteout Biometrie,
Whiteout Zufahrtskontrolle, FAQ unsichtbar Public) sind im Preview
**nicht reproduzierbar**. Damit ist der akute Stabilitäts-Druck
auf den Showcase-/Body-Renderer entschärft; die weiteren Teile
(B Gruppenschalter, C FAQ-Bedienbarkeit, D Spiegel-Audit-Abgleich,
E Admin-Baum-Policy, F Gates) können geordnet abgearbeitet werden.

Ampel Teil A: **🟢 grün** für die geprüften Public-Fälle.
Gesamt-Abnahme bleibt **gelb/rot** bis Teil D den Spiegel-Audit auf 0
echte offene Befunde gebracht oder begründet umklassifiziert hat.
