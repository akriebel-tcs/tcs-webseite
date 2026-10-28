# Public-Bloecke ignorieren Admin-Visibility (D2b.2 / D3a.1)

Stand: 2026-06-04T21:44:05.214Z

Gegenrichtung zur Befundklasse `AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD`.
Findet alle Faelle, in denen ein Public-Block angezeigt wird, obwohl der
Admin-Schalter ihn ausgeblendet hat — oder der Schalter ueberhaupt keine
Wirkung haette.

## Ampel

| Ampel | Bedeutung | Anzahl |
|---|---|---|
| 🔴 rot | High-Blocker: DB aus, Public rendert trotzdem | **0** |
| 🟡 gelb | Medium-Kandidat: DB an, hartcodiert, Aus-Schalten wirkungslos | **0** |
| 🟡 gelb | Restschuld: Public-Block ohne CMS-Gegenstueck | **0** |
| ⚪ grau | Vermutlich bereits gegated (Heuristik unsicher) | **2** |

> Hinweis: Nur 🔴 rot ist akuter Spiegel-Bruch.
> 🟡 gelb ist Architektur-Restschuld (kein Sichtbarkeitsbruch heute).
> ⚪ grau braucht keine Aktion.

## 🔴 Rot — High-Blocker `PUBLIC_BLOCK_IGNORIERT_DB_VISIBILITY`

DB `is_active=false`, Public rendert trotzdem. Spiegel-Regel gebrochen.

**Keine Befunde.** ✅

## 🟡 Gelb — Medium-Kandidat `PUBLIC_BLOCK_IGNORIERT_DB_VISIBILITY`

DB-Section ist aktiv, Public-Block ist hartcodiert ohne Gate. Heute kein
sichtbarer Fehler, aber ein Aus-Schalten im Admin wuerde nichts bewirken.

Keine Befunde.

## 🟡 Gelb — Restschuld `PUBLIC_BLOCK_OHNE_DB_BINDUNG`

Page-Datei rendert einen i18n-Block, zu dem keine CMS-Section existiert.
Kein Sichtbarkeitsbruch, aber Inhalt ist still im Code und nicht im Admin
pflegbar.

Keine Befunde.

## ⚪ Grau — Vermutlich bereits gegated

Im Code wird `cms.sections.find/some/filter` mit dem section_key benutzt.
Heuristik ist unsicher; nur zur Information.

| page_key | section_key | section_type | DB is_active | Page-Datei |
|---|---|---|---|---|
| eingangssysteme.beratung | cta | content_v1 | aus | `src/features/eingangssysteme/pages/EntryBeratungPage.tsx` |
| eingangssysteme.root | cta | content_v1 | aus | `src/features/eingangssysteme/pages/EntrySystemPage.tsx` |
