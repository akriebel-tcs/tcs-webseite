# Sprint 2c — D9 Owner-Entscheidungen

_Generiert: 2026-05-29T12:07:26.201Z_

Quelle: `scripts/cms/d9-owner-buckets.mjs` (read-only, nutzt `rpc_admin_export_contract_drift`).

## Zusammenfassung

- D9-Treffer gesamt: **25**
- Verteilt auf **3** Seiten und **2** Section-Typen.
- Davon aktiv (`is_active = true`): **5**, inaktiv: **20**.

## Entscheidungsklassen

| Klasse | Bedeutung |
|---|---|
| **O1** | Vertrag falsch oder zu eng — Vertrag korrigieren möglich (allowed_parents/allowed_children erweitern, top_level lockern) |
| **O2** | Historische Struktur, öffentlich korrekt gerendert — spätere Strukturmigration nötig (Container einziehen / Typ ändern) |
| **O3** | Source-only / Legacy — spätere Cleanup- oder Deaktivierungsentscheidung |
| **O4** | Spezialrenderer-Owner — Vertrag/Audit muss Owner kennen (special status) |
| **O5** | Unklar — nicht anfassen, fachliche Prüfung nötig |

## D9-Muster im Überblick

| Muster | Count | Empfehlung |
|---|---:|---|
| `child_only_at_top_level` | 19 | O2/O5 — historische Top-Level-Karten/Tabs. Vertrag korrigieren ist riskant; spätere Strukturmigration (Container einziehen oder Typ erweitern). |
| `top_level_only_under_parent` | 6 | O1 — Vertrag prüfen, evtl. top_level lockern oder allowed_parents erweitern. |

### Muster: `child_only_at_top_level` — 19 Treffer

**Owner-Empfehlung:** O2/O5 — historische Top-Level-Karten/Tabs. Vertrag korrigieren ist riskant; spätere Strukturmigration (Container einziehen oder Typ erweitern).

| section_type | parent_type | Count | Beispiele |
|---|---|---:|---|
| card_v1 | (none) | 19 | `anwendungen.root / card_wohnen_einfamilienhaus_kopie (inactive)`<br>`anwendungen.root / card_efh (inactive)`<br>`anwendungen.root / card_mfh (inactive)`<br>`anwendungen.root / card_ktu_groanl (inactive)`<br>`anwendungen.root / card_ami (inactive)`<br>`anwendungen.root / card_tcu_bka (inactive)` |

### Muster: `top_level_only_under_parent` — 6 Treffer

**Owner-Empfehlung:** O1 — Vertrag prüfen, evtl. top_level lockern oder allowed_parents erweitern.

| section_type | parent_type | Count | Beispiele |
|---|---|---:|---|
| rich_v1 | rich_v1 | 6 | `home.start / persona_architekten`<br>`home.start / persona_bauherren (inactive)`<br>`home.start / persona_wohnungswirtschaft (inactive)`<br>`home.start / persona_fachplaner (inactive)`<br>`home.start / persona_handwerk (inactive)`<br>`home.start / persona_fachhandel (inactive)` |

## Spezialfall: `tab_v1` auf `mobile-tk-preview.root`

Keine `tab_v1`-Treffer auf `mobile-tk-preview.root` im aktuellen D9-Set.

## Was Sprint 2c NICHT tut

- Keine Parent/Child-Struktur wird verändert.
- Keine Section wird aktiviert oder deaktiviert.
- Keine Inhalte, Bilder, Whitelist oder Feldwerte werden berührt.
- Kein neuer Schreib-RPC. Keine Vertragsänderung in diesem Lauf.
- Kein Public-Renderer, keine Route, keine Navigation, kein Footer, keine i18n-Datei verändert.

---

Nächste Etappe: `cms-light-eine-wahrheit-sprint-2d-d9-strukturmigration-pilot-1` — Pilot-Migration für ein klar abgegrenztes D9-Muster (Owner-Pick).
