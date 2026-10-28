# Batch 14 — Vorprüfung: `admin_schalter_ohne_public_wirkung`

Stand: 2026-06-04. READ-ONLY-Analyse vor Welle-1-Patch.

## Wie die Zahl 30 zustande kam

`scripts/cms/hartcode-steuerbarkeit-inventar.mjs` setzte vor Batch 14 die Kategorie `admin_schalter_ohne_public_wirkung` immer dann, wenn `publicBlocksWarn > 0` — und `publicBlocksWarn` summierte **alle** Buckets aus `public-blocks-ignorieren-admin-visibility.json`:

- `gelb_medium_kandidat` (32 Befunde, 12 Page-Keys): **echter Schalterbruch** — DB-Section existiert + ist aktiv, Public rendert hartcodiert ohne `is_active`-Gate.
- `gelb_restschuld_ohne_bindung` (33 Befunde, 13 Page-Keys): **kein Schalterbruch** — Public-Block ruft `t("…")` für einen Key, zu dem überhaupt keine DB-Section existiert. Admin kann hier nicht „ausschalten", weil es nichts zum Ausschalten gibt. Das ist eine eigene Klasse („public_ohne_admin_pflege").
- `rot_high_blocker`: 0.

Effekt: die 30 enthielt ~12–13 Phantom-Treffer, primär aus `anwendungen.funktionen.*` (0 aktive DB-Sections — die Pages haben gar keinen DB-Schalter, der gebrochen sein könnte).

## Schärfung der Heuristik

`hartcode-steuerbarkeit-inventar.mjs` zählt die Public-Blocks-Buckets jetzt getrennt:

- `publicBlocksMedium` → `admin_schalter_ohne_public_wirkung`
- `publicBlocksHigh`   → `admin_schalter_ohne_public_wirkung` (Spiegelbruch)
- `publicBlocksRestschuld` → `public_ohne_admin_pflege`

Ergebnis nach Schärfung (vor Welle-1-Patch):

| Kategorie | vorher | nachher |
|---|---:|---:|
| `admin_schalter_ohne_public_wirkung` | 30 | 18 |
| `public_ohne_admin_pflege` | 0 | 13 |

Die Summe (31) stimmt mit der vorherigen 30 überein (1 Überlapp: Pages mit Befunden in beiden Buckets).

## Klassifizierung der echten 18 Schalterbruch-Pages

Aus den 18 Pages mit `publicBlocksMedium > 0`:

| Klasse | Pages | Bemerkung |
|---|---|---|
| **Welle-1-Kandidat** (klein, klare Section, eindeutiges Gate) | 4 | AlarmanlagenkopplungPage, BeschilderungPage, GebaeudemanagementPage, PressePage |
| **Welle-2-Kandidat** (mittlere Größe, klare Section) | 4 | ServicePage, DownloadsPage, PlanenKonfigurierenPage, SystemloesungenPage |
| **Riskant** (große Custom-Pages mit Hero/CardGrid-Hartcode, >180 LOC) | 10 | SnipdooIpPage, TuersprechanlagenPage, TuerkommunikationPage + 7× zutrittskontrolle.* |

## Auswahlkriterien für Welle 1

Risikoarm bedeutet hier:

- Page ist klein (≤130 LOC).
- Page nutzt bereits `useCmsI18n` + `cms.sections`.
- Page nutzt bereits `CmsPageLayout` (Hero ist nicht Teil des Hartcodes).
- Befund ist **eine** klar abgrenzbare Section (kein Hero, kein useCases-Cluster).
- Section ist fachlich Inhalt (kein reines Layout/Wrapper).

Pages mit Hero-Hartcode in handgebauten Layouts (alle 7 zutrittskontrolle.*-Befunde) werden **nicht** Welle 1, weil:

- Hero sitzt nicht in `CmsPageLayout`, sondern in lokalem JSX zusammen mit Breadcrumb/Spacing/Motion.
- Ein Section-Gate würde die Page-Topologie ändern (Hero-Block fehlt → Layout-Sprung).
- Risiko/Nutzen ist nicht Welle-1-tauglich.

## Layout-/Sonderfall-Markierung

Nicht alle der 14 verbleibenden Pages müssen reparierbar sein. Spätere Wellen werden pro Page prüfen, ob:

- der Hartcode-Block tatsächlich fachliches Inhaltselement ist → Section-Gate sinnvoll.
- der Hartcode-Block Layout/Strukturelement ist (z. B. Hero in handgebauten Pages) → Section sollte aus DB entfernt oder explizit als „nicht steuerbar" markiert werden.

## Fazit Vorprüfung

- Die echten Welle-1-Fixes sind **4** — über dem Mindestschwellwert von 3.
- Die anderen 14 Befunde sind klassifiziert, aber nicht Teil dieser Welle.
- Heuristik ist jetzt ehrlich: Schalterbruch ≠ Restschuld.
