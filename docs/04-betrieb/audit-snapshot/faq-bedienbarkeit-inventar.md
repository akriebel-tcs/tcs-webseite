# FAQ-Bedienbarkeit - Inventar (Teil C1)

Stand: 2026-06-04 - Read-only Snapshot, keine Schreibvorgaenge.

Quelle: `psql` gegen die produktive Lovable-Cloud-DB; Cross-Check mit
`scripts/cms/faq-section-toggle-audit.mjs` (Ausgabe identisch).

## Kennzahlen

| Bereich | Wert |
|---|---:|
| FAQ-Sections insgesamt (`section_type='faq_v1'`) | 102 |
| Davon aktiv (`is_active=true`) | 80 |
| Davon inaktiv (`is_active=false`) | 22 |
| FAQ-Items insgesamt (distinct slug ueber alle Seiten) | 533 |
| Items mit `items.<slug>.enabled` in der DB | 533 |
| Items mit `items.<slug>.is_active` | 0 |
| Items mit `items.<slug>.visible` | 0 |
| Items mit `items.<slug>.hidden` | 0 |
| Whitelist-Eintraege `items.*.enabled` (DE+EN, `is_enabled=true`) | je 533 |
| Sections mit `__section__`-Whitelist-Eintrag | 0 |

## Beantwortung der Inventarfragen

1. **Wie viele FAQ-Sections gibt es?** 102.
2. **Wie viele sind aktiv/inaktiv?** 80 aktiv, 22 inaktiv.
3. **Wie viele FAQ-Items insgesamt?** 533.
4. **Wie viele Items haben ein Sichtbarkeitsfeld?** 533 (alle, ueber `items.<slug>.enabled`).
5. **Wie viele Items sind im Admin bedienbar (Whitelist `is_enabled=true`)?**
   533 in DE und 533 in EN.
6. **Items oeffentlich sichtbar, aber im Admin nicht ein-/ausblendbar?**
   Vor Teil C2: ja, weil das `enabled`-Feld im Admin nur als reines Text-Feld
   erschien (Redaktion haette "0"/"1" tippen muessen). Nach Teil C2: nein -
   der neue `VisibilityFieldSwitch` rendert pro Sichtbarkeitsfeld einen
   physischen Schalter.
7. **Items im Admin vorhanden, aber Public ignoriert den Schalter?**
   Keine. `FaqV1.tsx` respektiert `enabled`/`is_active`/`visible`/`hidden`
   bereits seit Teil A; alle aktuell vorhandenen Felder sind `enabled`.
8. **FAQ-Sections ohne sauberen Section-Schalter?**
   Section-Sichtbarkeit laeuft global ueber `cms_sections.is_active` und
   ist im Navigations-Baum (SectionRowView) direkt schaltbar. Ein
   separater `__section__`-Whitelist-Eintrag existiert nicht und wird
   nicht gebraucht; das Audit-Script meldet das als Hinweis, nicht als
   Befund.

## Kontrollfaelle

| Seite | FAQ-Section | aktiv | Items (mit enabled / mit frage) |
|---|---|---|---|
| `zutrittskontrolle.biometrie` | `faq` | ja | 5 / 5 |
| `zutrittskontrolle.bcm-mini-cloud` | `faq` | ja | 5 / 5 |
| `anwendungen.pflege` | `faq` | ja | 5 / 5 |

Alle drei Seiten haben fuer jedes Item den `enabled`-Schalter inkl.
Whitelist - sie sind nach Teil C2 vollstaendig per UI bedienbar.

## Bewertung

- **DB-Schicht:** vollstaendig vorbereitet. Keine Migration noetig.
- **Whitelist:** vollstaendig (533/533 in beiden Locales).
- **Public-Renderer:** korrekt (`FaqV1.tsx` akzeptiert alle vier Schaltervarianten).
- **Admin-UI:** war der einzige Engpass - in Teil C2 mit einem generischen
  `VisibilityFieldSwitch` global geloest.
