# Policy: Vertragsblöcke vs. Altbestand im Admin-Baum

Stand: 2026-06-02 · gilt für `/admin` → Seiten-Baum
(`SectionLevel.tsx`, `SectionRowView.tsx`,
`src/features/admin/lib/coreSectionKeys.ts`).

## Zwei klar getrennte Ebenen

Im Admin-Navigationsbaum unterscheiden wir bewusst zwei Arten von
ausgeblendeten Sections:

### 1. Vertragsblöcke (immer inline)

Blöcke, die zum **aktuellen Seitenvertrag** gehören und auf nahezu jeder
Seite systematisch vorhanden sind (z. B. **FAQ**, **Standard-CTA**).
Diese Sections bleiben **immer** an ihrer `sort_order`-Position im
Hauptbaum sichtbar — auch wenn sie ausgeblendet sind. Sie werden dann
ausgegraut dargestellt und tragen das Badge **„Ausgeblendet"**.

Damit kann der Redakteur sie jederzeit mit einem Klick wieder einblenden,
ohne sie im Altbestand-Bucket suchen zu müssen.

Aktuelle Liste (`src/features/admin/lib/coreSectionKeys.ts`):

- `section_key`: `standard_cta`, `cta`, `faq`
- `section_type`: `cta_v1`, `faq_v1`

Erweiterungen pflegen wir dort zentral; ein Eintrag genügt.

### 2. Altbestand (separater Bucket)

Alle anderen inaktiven Root-Sections — typischerweise alte Reste aus
früheren Iterationen, die nicht (mehr) zum Seitenvertrag gehören.
Sie wandern **standardmäßig** in den zugeklappten Bucket
**„Altbestand / ausgeblendete Bereiche"** am Ende des Baums.

Der Schalter **„Altbestand inline anzeigen"** macht sie bei Bedarf
inline sichtbar, lässt die Standardansicht aber sauber.

## Warum diese Trennung?

- **Vertragsblöcke** sind editorialer Alltag: Redakteure schalten FAQ /
  CTA bewusst je Seite ein oder aus. Sie müssen ohne Umweg sichtbar
  und erreichbar sein.
- **Altbestand** ist Archiv: gut, dass es nicht gelöscht ist
  (Sicherheitsnetz, Drift-Erkennung), aber im Alltag stört es nur.

## Verhaltensregeln

- Aktive Roots → immer im Hauptbaum.
- Inaktive Vertragsblöcke → immer im Hauptbaum, ausgegraut, Badge
  „Ausgeblendet".
- Inaktive Nicht-Vertragsblöcke → Altbestand-Bucket (Standard) oder
  inline (Schalter an).
- Kinder eines Vertragsblocks bleiben immer unter ihrem Elter.
- „Löschen" ist und bleibt ein eigener Weg, getrennt von „Ausblenden".

## Spiegel-Regel (Warnung)

Diese Policy regelt nur die **Sichtbarkeit im Admin-Baum**. Ob ein
ausgeblendeter Block auf der öffentlichen Website tatsächlich
verschwindet bzw. ein eingeblendeter erscheint, hängt zusätzlich davon
ab, ob die Seiten-Komponente den Block über `<CmsBodyRenderer/>` /
`<CmsTailCta/>` zieht. Seiten mit hartkodiertem JSX (Renderer-Orphans)
ignorieren `is_active` — das ist ein separates Thema (Sprint
`cms-light-renderer-orphan-cleanup`).

## Beispiel

```
hero                      aktiv
intro                     aktiv
features                  aktiv
faq                       Ausgeblendet  (inline, Vertragsblock)
standard_cta              aktiv

▸ Altbestand / ausgeblendete Bereiche (2)
   alte_teaser_v0         Ausgeblendet
   alte_kontaktkarte      Ausgeblendet
```
