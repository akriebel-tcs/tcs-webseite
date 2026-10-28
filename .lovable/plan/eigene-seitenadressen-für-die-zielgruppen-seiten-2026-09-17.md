# Eigene Seitenadressen für die Zielgruppen-Seiten

## Ziel
Jede Seite der Zielgruppen-Leiste bekommt eine eigene, verlinkbare Adresse mit
ihrer sichtbaren Bezeichnung — ohne den Begriff „Personas":

| Zielgruppe (Leiste) | neue Adresse |
| --- | --- |
| Bauherren | `/bauherren` |
| Architekten | `/architekten` |
| Wohnungswirtschaft | `/wohnungswirtschaft` |
| Fachplaner | `/fachplaner` |
| Handwerk | `/handwerk` |
| Fachhandel | `/fachhandel` |

Damit sind Direktlinks, Lesezeichen, Weitergabe per Link und eigene
Auffindbarkeit möglich.

## Was gebaut wird
1. **Echte Adressen**: Für die sechs Zielgruppen-Inhalte werden Adressen
   eingerichtet, die die bereits vorhandenen Inhalts-Bausteine aus der
   Datenbank anzeigen (dieselben Inhalte wie heute in der Startseiten-Ansicht).
2. **Leiste verlinkt echt**: Die Zielgruppen-Knöpfe oben werden zu echten
   Verweisen auf diese Adressen; die aktive Zielgruppe wird an der Adresse
   erkannt. Das bisherige Umschalten auf der Startseite bleibt als Rückfall
   erhalten und wird nicht entfernt.
3. **Alte Adressen bleiben gültig**: `/personas/<slug>` leitet dauerhaft auf
   die neue Adresse um, damit bestehende Verweise (z. B. die Karten der
   Startseite) nicht ins Leere laufen.
4. **Brotkrumen und Titel**: Brotkrumen zeigen die Bezeichnung der Zielgruppe;
   Seitentitel und Kurzbeschreibung kommen wie üblich aus der Datenbank.

## Technische Umsetzung
- Neues `src/features/personas/routes.tsx` mit einer Route je Zielgruppe
  (`/bauherren`, `/architekten`, `/wohnungswirtschaft`, `/fachplaner`,
  `/handwerk`, `/fachhandel`) auf je eine schlanke Page-Komponente, die den
  bestehenden `*Content`-Baustein rendert; Einbindung in `src/app/routes.tsx`.
- Zusätzlich `Navigate`-Redirects von `/personas/:slug` auf die neue Adresse
  (Mapping `architekt → architekten`, `bauherr → bauherren`, sonst identisch).
- Eine gemeinsame Zuordnungstabelle (Persona-ID ↔ Slug ↔ Seitenschlüssel) in
  `src/navigation/personaRoutes.ts`, genutzt von Routen, Leiste und Redirects —
  keine zweite parallele Liste.
- `src/components/MetaNavigation.tsx`: Persona-Einträge rendern als `Link` auf
  den Slug, Aktiverkennung über `personaSlugFromPathname`; DB-Pfad
  (`route_path` aus `cms_navigation_nodes`) hat weiter Vorrang, wenn gesetzt.
- `src/navigation/breadcrumbVisibility.ts`: `/personas/`-Ausnahme bleibt,
  neue Slugs werden regulär angezeigt.
- Kein Umbau des CMS-Renderers, keine neuen Bausteintypen.

## Datenbank (nur nach Ihrer Freigabe)
Die Seiten führen in der Datenbank noch die alte Adresse `/personas/…`.
Für einen sauberen Gleichstand müssten sechs Werte `route_path` in `cms_pages`
auf die neuen Adressen gesetzt werden (über den vorhandenen sicheren
Schreibweg, keine Strukturänderung). Ohne diese Anpassung funktioniert die
Website vollständig, im Bearbeiten-Bereich steht aber weiter die alte Adresse.
Ich führe diese Anpassung nur aus, wenn Sie sie ausdrücklich beauftragen.

## Prüfung
Typprüfung, Tests, Preflight und Build; Vorschau Desktop und Smartphone:
Direktaufruf aller sechs Adressen, Klick in der Leiste, Umleitung einer alten
`/personas/…`-Adresse, Startseiten-Karten. Keine Veröffentlichung.
