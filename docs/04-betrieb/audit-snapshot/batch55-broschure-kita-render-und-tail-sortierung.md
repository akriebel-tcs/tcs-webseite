# Batch 55 — B-2521 sichtbar + typübergreifende Tail-Sortierung

Datum: 2026-06-18
Auslöser: B-2521 (`broschure_kita`) blieb auf P-266
`anwendungen.kindertagesstaetten` trotz Batch 54 unsichtbar.

## 1. Root Cause

1. **Inhaltlich:** `broschure_kita` ist `cta_v1`. `CtaV1` rendert
   nur, wenn `title`, `cta_label` und `cta_href` in der aktiven Locale
   gepflegt sind. Die ursprüngliche Migration hatte ausschließlich
   `cta_label`, `cta_href` und `cta_link` befüllt — kein `title`.
   Batch 54 hat lediglich die **Whitelist** für `title` aktiviert,
   nicht den **Feldinhalt** ergänzt. Pflichtfeldvertrag von `CtaV1`
   wurde dabei korrekt nicht gelockert.
2. **Render-Reihenfolge:** `PageLayout` rief getrennt erst
   `CmsTailFaq`, dann `CmsTailCta` auf. Damit erschien immer
   `FAQ → alle CTAs`, unabhängig vom typübergreifenden
   `sort_order`. Die in Batch 54 dokumentierte Reihenfolge
   `B-2521 (50) → FAQ (55) → standard_cta (60)` war so technisch
   nicht erreichbar.

## 2. Geänderte Dateien

- `src/features/cms/components/CmsTailSections.tsx` **(neu)** —
  unifizierter Tail-Renderer: filtert aktive, nicht-inline gerenderte
  `cta_v1`/`cta`/`faq_v1`/`faq`-Sections der Seite und rendert sie
  sortiert nach `sort_order` mit der jeweils passenden V1-Komponente.
  Dedup weiter über `useRenderedSections()`.
- `src/components/PageLayout.tsx` — getrennte Aufrufe von
  `CmsTailFaq` und `CmsTailCta` durch einen einzigen Aufruf von
  `CmsTailSections` ersetzt.
- `supabase/migrations/…_batch55_broschure_kita_title.sql` —
  Reproduktionsmigration (siehe unten).

Keine Änderungen an Routen, Navigation, Produktdatenbank, Auth,
i18n-JSONs, `KindertagesstaettenPage`, `CtaV1`-Pflichtfeldvertrag.

## 3. Migration

Idempotent, ohne Überschreiben bestehender Texte:

```sql
INSERT INTO public.cms_section_fields
  (page_key, section_key, field_key, locale, value)
VALUES
  ('anwendungen.kindertagesstaetten','broschure_kita','title','de',
   'Broschüre für Kindertagesstätten'),
  ('anwendungen.kindertagesstaetten','broschure_kita','title','en',
   'Brochure for daycare centres')
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

INSERT INTO public.cms_admin_editable_fields
  (page_key, section_key, field_key, locale, is_enabled)
VALUES
  ('anwendungen.kindertagesstaetten','broschure_kita','title','de',true),
  ('anwendungen.kindertagesstaetten','broschure_kita','title','en',true)
ON CONFLICT (page_key, section_key, field_key, locale)
DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
```

## 4. DB-/Public-Belege

- `cms_pages.anwendungen.kindertagesstaetten`: `status = published`,
  `is_active = true`.
- `cms_sections.broschure_kita`: `section_type = cta_v1`,
  `is_active = true`, `sort_order = 50`, kein `parent_section_id`
  (top-level).
- `cms_section_fields`:
  - `de / title` = „Broschüre für Kindertagesstätten"
  - `en / title` = „Brochure for daycare centres"
  - `de/en cta_label` = „Broschüre herunterladen (PDF)" /
    „Download brochure (PDF)"
  - `de/en cta_href` = TCS-PDF-Download-URL (Kita-Broschüre).
- RLS-Policies auf `cms_pages`, `cms_sections`, `cms_section_fields`
  geben für `anon` genau diese Zeilen frei (Page published+aktiv,
  Section aktiv, Felder via EXISTS-Join).

## 5. Tests / Audit / Build

- `node scripts/cms/globaler-spiegel-audit.mjs`:
  `CTA_AKTIV_ABER_NULL_RENDER` für `broschure_kita` ist **weg**.
  Verbleibende 3 Treffer betreffen `broschure_schule`,
  `broschure_wohnheim` (beide auf
  `anwendungen.bildungseinrichtungen`) sowie `broschure_intern`
  (auf `anwendungen.interne-kommunikation`) — gleiche Ursache,
  außerhalb des Auftrags dieser Batch (siehe Restpunkte).
- Build: `vite build` läuft automatisch über die Lovable-Pipeline
  nach jeder Änderung — keine Fehler.

## 6. Visuell bestätigte Reihenfolge

Im DOM von P-266 erscheinen die Tail-Sections genau in dieser
Reihenfolge (sortiert nach `sort_order`):

1. `data-cms-section="broschure_kita"` (cta_v1, sort 50)
2. `data-cms-section="faq"` (faq_v1, sort 55)
3. `data-cms-section="standard_cta"` (cta_v1, sort 60)

Der Download-Button im B-2521-Block verweist auf den TCS-PDF-Link
und ist klickbar.

## 7. Restpunkte (nicht in diesem Batch)

- Drei weitere Broschüre-CTAs ohne `title` (siehe Audit oben). Wenn
  gewünscht, in einem identisch strukturierten Folge-Batch idempotent
  ergänzen.
- Atomare Move-RPC (`rpc_admin_move_section_between_pages`) für
  Whitelist + Children — bleibt offen wie in Batch 54 notiert.

## 8. Korrektur zu Batch 54

Der Batch-54-Bericht hatte die Reihenfolge
`B-2521 → FAQ → standard_cta` als „grün" ausgewiesen, obwohl
`PageLayout` zu diesem Zeitpunkt FAQ vor allen CTAs gerendert hat
und `broschure_kita` mangels `title` gar nicht gerendert wurde.
Beide Punkte sind erst mit Batch 55 reproduzierbar erfüllt.
