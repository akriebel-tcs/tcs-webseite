# SQL-Entwurf — Einzelbaustein-/Unterbaum-Kopie (`rpc_admin_paste_section`)

Stand: 2026-09-15 · Etappe 3B · **INSTALLIERT** (geprüfter Stand, unverändert angewendet)

Der SQL-Block unten wurde am 2026-09-15 unverändert als Migration
`supabase/migrations/20260915005640_625cc3fb-3c01-4f1b-a02e-961ab3cf0f1e.sql`
angewendet: genau **ein** bestehender Funktionskörper ersetzt, keine neue
Funktion, kein Trigger, kein Recht, keine Tabelle, keine Policy, keine
Inhalte. Das Zurücklesen der installierten Definition ist bytegleich zum
Entwurf; Rechte und alle Bestände sind unverändert. Es wurde **keine** echte
Kopie ausgeführt, nichts deployed und nichts veröffentlicht.


Führende Regelquelle: `docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`
(Abschnitt 11). Technische Schutzregeln: `.lovable/always-follow.md`.

Vorbedingung: Etappe 3A ist installiert (Commit
`15bce6491b04563497f2fb5e67f80ad29644dcb6`). Die transaktionslokale Kennung
`cms.suppress_page_copy_autopilot` und ihre Prüfung in den fünf vorhandenen
Triggerfunktionen (`cms_autopilot_trg_pages`, `_assets`, `_section_fields`,
`_nav`, `cms_card_v1_seed_whitelist`) existieren bereits. **Dieser Entwurf
ändert keinen Trigger, legt keine neue Funktion an und setzt keine Rechte.**
Ersetzt wird genau **ein** vorhandener Funktionskörper:
`rpc_admin_paste_section`.

---

## 1. Warum

Die live installierte Fassung von `rpc_admin_paste_section` wurde unabhängig in
isoliertem PostgreSQL mit den realen Tabellen, Constraints und Triggern
(einschließlich der Etappe-3A-Trigger) ausgeführt: 17 Prüfungen, 8 bestanden,
9 fehlgeschlagen.

| Befund (live) | Wirkung |
| --- | --- |
| Wurzel wird immer `is_active = true` eingefügt | ein ausgeblendeter Container wird beim Einfügen sichtbar |
| `review_status` / `source_hash` der Felder fehlen im Insert | maschinelle Werte gelten in der Kopie als „geprueft" |
| Whitelist-Insert mit `ON CONFLICT DO NOTHING` nach Karten-Seed | eine bewusst deaktivierte Zeile (`is_enabled = false`) wird durch den Seed wieder `true` |
| Bilder-Insert filtert `is_active = true` | inaktive Medienzuordnungen fehlen (nur 3 von 4 Bildern) |
| `alt_pl` / `alt_text_pl` fehlen im Insert | polnische Alt-Texte fehlen |
| `cms_asset_translations` fehlt | vertikale Alt-Text-Zeilen fehlen |
| `cms_translation_unit_state` (`asset_alt`) fehlt | Prüfzustände der kopierten Bilder fehlen |
| kein Autopilot-Schutz | 7 Autopilot-Aufrufe je Kopie |
| Schlüsselprüfung `^[a-z][a-z0-9_]*$` | bestehende Schlüssel wie `cards.first` sind nicht kopierbar |
| `DROP TABLE IF EXISTS _paste_key_map` unqualifiziert | eine gleichnamige **dauerhafte** Tabelle `public._paste_key_map` würde gelöscht |

Der Quellbestand selbst bleibt bei seitenübergreifendem Einfügen unverändert —
dieser Befund war korrekt und bleibt so.

## 2. Was der Entwurf ändert

- **Signatur unverändert**:
  `rpc_admin_paste_section(p_source_page_key text, p_source_section_key text,
  p_target_page_key text, p_target_parent_section_key text,
  p_target_position integer, p_new_section_key text)` → `jsonb`.
- **Alle bisherigen Fehlerkennungen bleiben**: `source_not_found`,
  `target_page_not_found`, `new_section_key_invalid`,
  `target_section_key_exists` (mit `attempted_section_key`),
  `parent_not_found`, `paste_unique_conflict`. Der Automatikweg in
  `MasterDetailWorkbench.handlePasteFromClipboard` (Originalname, danach bis zu
  20 `_kopie`-Suffixe) funktioniert dadurch unverändert.
- **Alle bisherigen Antwortfelder bleiben**, einschließlich
  `assets_skipped` — bei Erfolg immer `0`, weil ein Medienkonflikt jetzt die
  ganze Kopie abbricht statt still zu überspringen. Neue Felder sind rein
  additiv: `asset_translations_copied`, `unit_states_copied`, `key_map`,
  `autopilot_suppressed_in_this_transaction`, `source_snapshot_at`.
- **Vollständiger rekursiver Unterbaum**: Wurzel behält den Aktivzustand der
  Quelle, Kinder behalten Typ, Sichtbarkeit, relative Reihenfolge,
  `section_no` und ihre Verschachtelung (innerhalb der Kopie neu verknüpft).
- **Alle Felder aller Sprachen** inkl. bewusst leerer/`NULL`-Werte,
  `value_json`, `review_status`, `source_hash`.
- **Whitelist exakt** wie in der Quelle, auch `is_enabled = false`.
- **Alle Medienzuordnungen** inkl. inaktiver, `viewport`, `sort_order`,
  Fokuspunkt, allen Sprachspalten (`alt_de/en/pl`, `alt_text_de/en/pl`);
  zusätzlich `cms_asset_translations` und die `asset_alt`-Prüfzustände auf die
  neuen Bild-IDs.
- **Kein Seitentitel, keine Navigation**: ein Teilblock ist keine Seite.
  `cms_page_translations`, `cms_navigation_nodes` und `page_title`-Zustände
  werden nicht angefasst.
- **Keine Mediendateien** werden kopiert oder geladen; `storage_path` /
  `public_url` bleiben Referenzen auf dieselben Dateien.
- **Kein Übersetzungslauf**: die in Etappe 3A installierte Kennung
  `cms.suppress_page_copy_autopilot` wird wiederverwendet und nach Erfolg
  **und** nach Fehler exakt auf den vorherigen Wert zurückgesetzt. Außerhalb
  der Kopie ist das Verhalten unverändert; kein Trigger wird deaktiviert,
  nichts global pausiert.
- **Keine Whitelist-Seeds während der Kopie** (dieselbe Kennung), damit keine
  zusätzlichen Freigaben entstehen und keine Doppelanlage (23505) auftritt.

## 3. Bewusst gewählte, nicht stillschweigende Regeln

- **Wurzel-ID aus dem Snapshot**: die Vorabprüfung stellt nur die Existenz
  fest. Die für Namensvergabe und Einfügen verbindliche Wurzel-ID stammt aus
  dem gemeinsamen Snapshot — wird die Quellzeile zwischen beiden Leseschritten
  ersetzt (gleicher `section_key`, neue Kennung), kann keine veraltete ID
  weiterverwendet werden. Die Einfügeschleife hat zusätzlich einen
  Fortschrittswächter: ohne neue Zeile trotz offener Bausteine bricht sie mit
  klarem Fehler ab (vollständiger Rücklauf) statt endlos zu laufen — ohne
  künstliche Tiefengrenze.
- **Ein Lese-Snapshot**: Unterbaum, Felder, Whitelist, Medien,
  Alt-Übersetzungen und Prüfzustände kommen aus **einer** `SELECT`-Anweisung
  (JSONB-Teilabfragen). Der Snapshot wird **vor** jeder Zieleinfügung erstellt
  — auch wenn Quelle und Ziel dieselbe Seite sind. Damit kann eine Kopie
  niemals ihre eigenen neuen Zeilen mitlesen.
- **Schlüsselgrammatik konservativ erweitert**: bisher `^[a-z][a-z0-9_]*$`,
  neu `^[a-z][a-z0-9_]*([.-][a-z0-9_]+)*$`. Punkt und Bindestrich sind nur als
  **Trenner zwischen** Namensteilen erlaubt, nicht am Anfang/Ende und nicht
  doppelt. Damit bleiben Bestandsschlüssel wie `cards.first` oder
  `hero-top` kopierbar. Es gibt in der Datenbank **keinen** Check-Constraint
  auf `cms_sections.section_key` (nur `UNIQUE (page_key, section_key)`), die
  Grammatik ist also reine Funktionsprüfung. Es wird **kein** Nutzertext in
  SQL interpoliert — alle Werte werden als Parameter/Variablen verwendet.
- **Kollisionen**: die **Wurzel** wird bei Namenskonflikt wie heute klar
  abgelehnt (`target_section_key_exists` + `attempted_section_key`), damit der
  bestehende Suffix-Automatismus der Oberfläche greift. **Kinder** erhalten
  deterministische Suffixe (`_kopie`, `_kopie_2`, …) gegen Zielbestand **und**
  gegen bereits vergebene Namen derselben Kopie. Kein Kind geht verloren.
  Die vollständige Zuordnung steht additiv in `key_map`.
- **Medienkonflikt bricht ab**: existiert im Ziel bereits eine aktive
  Medien-Zuordnung für dieselbe Kombination (Baustein, Feld, Viewport), wird
  die gesamte Kopie mit `paste_asset_slot_conflict` abgebrochen — nichts wird
  still übersprungen, nichts überschrieben.
- **Zielbestand wird nie überschrieben**: Felder und Whitelist werden ohne
  `ON CONFLICT` eingefügt; ein Konflikt führt zum vollständigen Rücklauf.
- **Endliche Graphprüfungen ohne Tiefengrenze**: der Unterbaum wird mit
  `UNION` gesammelt (ein Zyklus wiederholt dieselbe Zeile und terminiert).
  Die Erreichbarkeitsprüfung allein beweist **keine** Zyklenfreiheit, weil sie
  die Wurzel als Startpunkt vorgibt. Deshalb wird zusätzlich geprüft, ob der
  **Elternverweis der Wurzel in den eigenen Unterbaum** zeigt
  (`section_parent_cycle`) — das deckt Selbstbezug, Wurzel-Kind-Zyklus und
  lange Zyklen ab. Ein Elternknoten **außerhalb** des Unterbaums auf derselben
  Quellseite bleibt zulässig (normale Kopie eines Kindbausteins); gehört er
  einer anderen Seite (oder existiert er nicht), wird
  `section_parent_foreign` gemeldet — bewertet aus **demselben** Snapshot
  (`root_parent`), ohne stille Reparatur.
  Zusätzlich wird die **Zielseite** vor jedem Schreiben geprüft: fremde
  Eltern-Verweise (`target_page_parent_foreign`) oder ein bestehender Zyklus
  (`target_page_section_cycle`) werden klar gemeldet und die Kopie abgebrochen
  — sonst würde die reale Ordnungshilfe `cms_resequence_sections_dfs` beim
  Neusortieren Zeilen übergehen.
- **Zielparent** muss zur Zielseite gehören (`parent_not_found`).
- **Reihenfolge**: die neuen Ordnungszahlen entstehen wie bisher über die
  bestehende Zielseiten-Ordnungsregel (Einfügeposition unter den Geschwistern,
  danach `cms_resequence_sections_dfs`). Fremde Inhalte werden dabei **nur**
  in ihrer Ordnungszahl (`sort_order`, `section_no`) verändert — das ist die
  bereits heute bestehende, beabsichtigte Wirkung des Einfügens.
- **Nebenläufigkeit**: eine transaktionslokale Advisory-Sperre auf die
  **Zielseite** (`pg_advisory_xact_lock`) serialisiert konkurrierende
  Einfügevorgänge derselben Zielseite. Kein Tabellenlock, keine globale
  Sperre, keine Änderung der Isolationsstufe.
- **Laufzeitgrenzen** als Funktions-`SET` (`lock_timeout = 3s`,
  `statement_timeout = 60s`); die Einstellungen des Aufrufers werden nicht
  überschrieben.
- **Alle Arbeitstabellen** sind ausdrücklich `pg_temp`-qualifiziert, auch beim
  `DROP`. Eine gleichnamige dauerhafte Tabelle im Schema `public` kann nicht
  getroffen werden.

## 4. Bekannte Grenzen (offen, nicht behoben)

- **Andere Schreibwege nutzen die Sperre nicht**: `rpc_admin_reorder_section`,
  `rpc_admin_set_section_position`, `rpc_admin_set_section_parent`,
  `rpc_admin_delete_section` und die Feld-Schreibwege nehmen die
  Advisory-Sperre **nicht**. Zwei gleichzeitige Einfügevorgänge derselben
  Zielseite sind serialisiert; ein gleichzeitiges Umsortieren oder Löschen ist
  es **nicht**. Diese Grenze bleibt bewusst offen (kein Umbau anderer
  Mutationen in dieser Etappe).
- **Gleichzeitige Marketing-Änderung an der Quelle**: Änderungen, die vor dem
  Snapshot committet wurden, sind enthalten; danach committete nicht. Die
  Quelle wird bewusst nicht gesperrt.
- **Kein Rechteschutz**: `rpc_admin_paste_section` ist weiterhin für `PUBLIC`,
  `anon` und `authenticated` ausführbar (Ist-Stand). Dieser Entwurf ändert
  daran **nichts** und ist **keine** Absicherung. Der offene CMS-Schreibweg
  und `/admin` ohne Rollenprüfung bleiben ein separates, unerledigtes Risiko.
- **Testgrenzen**: geprüft ist ausschließlich isoliertes PostgreSQL (PGlite)
  mit künstlichen Daten und live abgeleiteten Tabellen, Constraints, Indizes,
  Triggern und den **realen** Ordnungshilfen `cms_resequence_sections_dfs` /
  `cms_renumber_sections`. Der Autopilot ist durch eine beobachtbare
  Testfunktion ersetzt. **Nicht** geprüft: echte Nebenläufigkeit zweier
  Sitzungen, Last, Wiederherstellung, Verhalten auf dem laufenden
  Datenbestand, Sichtprüfung in der Vorschau.
- Der Umbenennungs-Regex in `NavigationTreeEditor` (Klemmbrett/Duplikat) ist
  ein **anderer** Vorgang und wird nicht angefasst. Die Oberfläche wird nicht
  umgestaltet.

## 5. Rücknahme

Die Vorfassung von `rpc_admin_paste_section` ist in `supabase/migrations/`
historisch vorhanden. Rücknahme bedeutet: die vorherige
`CREATE OR REPLACE FUNCTION`-Fassung erneut anwenden. `CREATE OR REPLACE`
erhält bestehende Rechte — es dürfen **keine** `GRANT`s gesetzt werden.
Bereits eingefügte Bausteine bleiben bestehen; sie werden über den bestehenden
Weg (`rpc_admin_delete_section`) entfernt.

## 6. SQL

```sql
-- =====================================================================
-- Etappe 3B: Einzelbaustein-/Unterbaum-Kopie.
-- Additiv: ersetzt GENAU EINEN vorhandenen Funktionskoerper
-- (rpc_admin_paste_section). Keine neue Funktion, kein Trigger, kein
-- neues Ausfuehrungsrecht, keine Tabellen-, Policy-, Scheduler- oder
-- Datenaenderung. Die transaktionslokale Kennung
-- cms.suppress_page_copy_autopilot stammt aus Etappe 3A und wird
-- lediglich wiederverwendet.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_paste_section(
  p_source_page_key text,
  p_source_section_key text,
  p_target_page_key text,
  p_target_parent_section_key text,
  p_target_position integer,
  p_new_section_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET lock_timeout TO '3s'
SET statement_timeout TO '60s'
AS $function$
DECLARE
  _src_id uuid;
  _snap jsonb;
  _snapshot_at timestamptz;
  _root_new_key text;
  _normalized_parent text;
  _parent_id uuid := NULL;
  _max int;
  _final int;
  _idx int := 0;
  _row record;
  _node record;
  _a record;
  _new_id uuid;
  _new_asset_id uuid;
  _suffix int;
  _candidate text;
  _prev_flag text;
  _bad int;
  _total int;
  _progress int;

  _reachable int;
  _conflicts int;
  _sections_copied int := 0;
  _fields_copied int := 0;
  _whitelist_copied int := 0;
  _assets_copied int := 0;
  _asset_translations_copied int := 0;
  _unit_states_copied int := 0;
  _key_map jsonb;
BEGIN
  -- Kennung SOFORT erfassen, damit der Fehlerbehandler nicht von einer erst
  -- spaeter gesetzten Variablen abhaengt. Kein neuer Zustand.
  _prev_flag := current_setting('cms.suppress_page_copy_autopilot', true);

  -- -----------------------------------------------------------------
  -- 1) Eingaben und Zielbedingungen pruefen (noch kein Schreiben).
  --    Diese Vorabpruefung stellt nur die Existenz fest; die fuer die
  --    Kopie verbindliche Wurzel-ID kommt spaeter AUS DEM SNAPSHOT.
  -- -----------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.cms_sections
                  WHERE page_key = p_source_page_key
                    AND section_key = p_source_section_key) THEN
    RETURN jsonb_build_object('success', false, 'error', 'source_not_found');
  END IF;


  IF NOT EXISTS (SELECT 1 FROM public.cms_pages WHERE page_key = p_target_page_key) THEN
    RETURN jsonb_build_object('success', false, 'error', 'target_page_not_found');
  END IF;

  _root_new_key := nullif(btrim(coalesce(p_new_section_key, '')), '');
  IF _root_new_key IS NULL THEN
    _root_new_key := p_source_section_key;
  END IF;

  -- Konservativ erweiterte Grammatik: Punkt und Bindestrich nur als
  -- Trenner zwischen Namensteilen, damit Bestandsschluessel wie
  -- 'cards.first' kopierbar bleiben. Keine SQL-Interpolation.
  IF _root_new_key !~ '^[a-z][a-z0-9_]*([.-][a-z0-9_]+)*$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'new_section_key_invalid',
      'new_section_key', _root_new_key);
  END IF;

  -- Konkurrierende Einfuegevorgaenge DERSELBEN Zielseite serialisieren.
  -- Transaktionslokal, kein Tabellenlock, keine globale Sperre.
  PERFORM pg_advisory_xact_lock(hashtext('rpc_admin_paste_section:page:' || p_target_page_key));

  IF EXISTS (SELECT 1 FROM public.cms_sections
              WHERE page_key = p_target_page_key AND section_key = _root_new_key) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'target_section_key_exists',
      'attempted_section_key', _root_new_key
    );
  END IF;

  _normalized_parent := nullif(btrim(coalesce(p_target_parent_section_key, '')), '');
  IF _normalized_parent IS NOT NULL THEN
    SELECT id INTO _parent_id FROM public.cms_sections
     WHERE page_key = p_target_page_key AND section_key = _normalized_parent;
    IF _parent_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'parent_not_found');
    END IF;
  END IF;

  -- Zielseite muss vor dem Umsortieren sauber sein: fremde Eltern-Verweise
  -- oder ein bestehender Zyklus wuerden die reale Ordnungshilfe
  -- cms_resequence_sections_dfs Zeilen uebergehen lassen. Klar abbrechen,
  -- ohne irgendetwas zu schreiben.
  SELECT count(*) INTO _bad
    FROM public.cms_sections s
   WHERE s.page_key = p_target_page_key
     AND s.parent_section_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.cms_sections p
                      WHERE p.id = s.parent_section_id
                        AND p.page_key = p_target_page_key);
  IF _bad > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'target_page_parent_foreign',
      'target_page_key', p_target_page_key, 'affected', _bad);
  END IF;

  SELECT count(*) INTO _total FROM public.cms_sections WHERE page_key = p_target_page_key;
  WITH RECURSIVE reachable(id) AS (
    SELECT s.id FROM public.cms_sections s
     WHERE s.page_key = p_target_page_key AND s.parent_section_id IS NULL
    UNION
    SELECT s.id FROM public.cms_sections s
      JOIN reachable r ON s.parent_section_id = r.id
     WHERE s.page_key = p_target_page_key
  )
  SELECT count(*) INTO _reachable FROM reachable;
  IF _reachable <> _total THEN
    RETURN jsonb_build_object('success', false, 'error', 'target_page_section_cycle',
      'target_page_key', p_target_page_key, 'affected', _total - _reachable);
  END IF;

  -- -----------------------------------------------------------------
  -- 2) EIN Lese-Snapshot des Unterbaums und aller zugehoerigen Daten,
  --    ausdruecklich VOR jeder Zieleinfuegung (auch wenn Quelle und Ziel
  --    dieselbe Seite sind). Der rekursive Teil nutzt UNION: ein Zyklus
  --    wiederholt dieselbe Zeile und terminiert, es gibt keine
  --    Tiefengrenze.
  -- -----------------------------------------------------------------
  _snapshot_at := clock_timestamp();

  WITH RECURSIVE tree AS (
    SELECT s.* FROM public.cms_sections s
     WHERE s.page_key = p_source_page_key AND s.section_key = p_source_section_key
    UNION
    SELECT c.* FROM public.cms_sections c
      JOIN tree t ON c.parent_section_id = t.id
     WHERE c.page_key = p_source_page_key
  )
  SELECT jsonb_build_object(
    'sections', coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM tree t), '[]'::jsonb),
    'fields', coalesce((SELECT jsonb_agg(to_jsonb(f))
                          FROM public.cms_section_fields f
                         WHERE f.page_key = p_source_page_key
                           AND f.section_key IN (SELECT t.section_key FROM tree t)), '[]'::jsonb),
    'whitelist', coalesce((SELECT jsonb_agg(to_jsonb(w))
                             FROM public.cms_admin_editable_fields w
                            WHERE w.page_key = p_source_page_key
                              AND w.section_key IN (SELECT t.section_key FROM tree t)), '[]'::jsonb),
    'assets', coalesce((SELECT jsonb_agg(to_jsonb(a))
                          FROM public.cms_assets a
                         WHERE a.page_key = p_source_page_key
                           AND a.section_key IN (SELECT t.section_key FROM tree t)), '[]'::jsonb),
    'asset_tr', coalesce((SELECT jsonb_agg(to_jsonb(tr))
                            FROM public.cms_asset_translations tr
                           WHERE tr.asset_id IN (SELECT a.id FROM public.cms_assets a
                                                  WHERE a.page_key = p_source_page_key
                                                    AND a.section_key IN (SELECT t.section_key FROM tree t))), '[]'::jsonb),
    'states', coalesce((SELECT jsonb_agg(to_jsonb(st))
                          FROM public.cms_translation_unit_state st
                         WHERE st.area = 'asset_alt'
                           AND st.ref_key IN (SELECT a.id::text FROM public.cms_assets a
                                               WHERE a.page_key = p_source_page_key
                                                 AND a.section_key IN (SELECT t.section_key FROM tree t))), '[]'::jsonb),
    -- Elternzeile der Quellwurzel AUS DEMSELBEN Snapshot: nur so kann ein
    -- fremdseitiger Wurzel-Elternverweis ohne zweite Leserunde erkannt
    -- werden. NULL, wenn die Wurzel keinen (oder keinen existierenden)
    -- Elternverweis hat.
    'root_parent', (SELECT to_jsonb(p) FROM public.cms_sections p
                     WHERE p.id = (SELECT t.parent_section_id FROM tree t
                                    WHERE t.section_key = p_source_section_key))
  )

  INTO _snap;

  IF _snap IS NULL OR jsonb_array_length(_snap->'sections') = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'source_not_found');
  END IF;

  -- -----------------------------------------------------------------
  -- 3) Arbeitstabellen: ausschliesslich aus dem Snapshot, ausdruecklich
  --    pg_temp-qualifiziert (auch beim DROP).
  -- -----------------------------------------------------------------
  DROP TABLE IF EXISTS pg_temp._paste_key_map;
  DROP TABLE IF EXISTS pg_temp._paste_fields;
  DROP TABLE IF EXISTS pg_temp._paste_whitelist;
  DROP TABLE IF EXISTS pg_temp._paste_assets;
  DROP TABLE IF EXISTS pg_temp._paste_asset_tr;
  DROP TABLE IF EXISTS pg_temp._paste_states;
  DROP TABLE IF EXISTS pg_temp._paste_asset_map;

  CREATE TEMP TABLE pg_temp._paste_key_map (
    src_id uuid PRIMARY KEY,
    src_section_key text NOT NULL,
    src_parent_id uuid,
    src_sort int NOT NULL DEFAULT 0,
    src_section_no int,
    src_section_type text,
    src_is_active boolean NOT NULL DEFAULT true,
    new_section_key text,
    new_id uuid
  ) ON COMMIT DROP;

  INSERT INTO pg_temp._paste_key_map
    (src_id, src_section_key, src_parent_id, src_sort, src_section_no,
     src_section_type, src_is_active)
  SELECT s.id, s.section_key, s.parent_section_id, s.sort_order, s.section_no,
         s.section_type, s.is_active
    FROM jsonb_populate_recordset(NULL::public.cms_sections, _snap->'sections') s;

  CREATE TEMP TABLE pg_temp._paste_fields ON COMMIT DROP AS
    SELECT * FROM jsonb_populate_recordset(NULL::public.cms_section_fields, _snap->'fields');
  CREATE TEMP TABLE pg_temp._paste_whitelist ON COMMIT DROP AS
    SELECT * FROM jsonb_populate_recordset(NULL::public.cms_admin_editable_fields, _snap->'whitelist');
  CREATE TEMP TABLE pg_temp._paste_assets ON COMMIT DROP AS
    SELECT * FROM jsonb_populate_recordset(NULL::public.cms_assets, _snap->'assets');
  CREATE TEMP TABLE pg_temp._paste_asset_tr ON COMMIT DROP AS
    SELECT * FROM jsonb_populate_recordset(NULL::public.cms_asset_translations, _snap->'asset_tr');
  CREATE TEMP TABLE pg_temp._paste_states ON COMMIT DROP AS
    SELECT * FROM jsonb_populate_recordset(NULL::public.cms_translation_unit_state, _snap->'states');
  CREATE TEMP TABLE pg_temp._paste_asset_map (old_id uuid, new_id uuid) ON COMMIT DROP;

  -- Verbindliche Wurzel-ID AUS DEM SNAPSHOT bestimmen. Wird die Quellzeile
  -- zwischen Vorabpruefung und Snapshot ersetzt (gleicher section_key, neue
  -- UUID), waere eine vorab gelesene ID falsch: Namensvergabe und
  -- Wurzel-Insert wuerden 0 Zeilen treffen. Alle weiteren
  -- Kopierentscheidungen stammen damit aus demselben Snapshot.
  SELECT m.src_id INTO _src_id
    FROM pg_temp._paste_key_map m
   WHERE m.src_section_key = p_source_section_key;
  IF _src_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'source_not_found');
  END IF;

  -- Wurzel-Elternverweis IN den eigenen Unterbaum ist ein Zyklus. Die
  -- Erreichbarkeitspruefung unten kann das nicht zeigen, weil sie die Wurzel
  -- als Startpunkt vorgibt und die Zyklusmitglieder dadurch alle findet.
  IF EXISTS (
    SELECT 1 FROM pg_temp._paste_key_map r
      JOIN pg_temp._paste_key_map p ON p.src_id = r.src_parent_id
     WHERE r.src_id = _src_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'section_parent_cycle',
      'source_page_key', p_source_page_key, 'affected', 1);
  END IF;

  -- Fremdseitiger Elternverweis der Wurzel: Bewertung ausdruecklich anhand
  -- desselben Snapshots, keine stille Reparatur. Ein Elternknoten AUSSERHALB
  -- des Unterbaums auf DERSELBEN Quellseite bleibt zulaessig (normale Kopie
  -- eines Kindbausteins).
  IF (SELECT r.src_parent_id FROM pg_temp._paste_key_map r WHERE r.src_id = _src_id) IS NOT NULL
     AND coalesce(_snap->'root_parent'->>'page_key', '') IS DISTINCT FROM p_source_page_key THEN
    RETURN jsonb_build_object('success', false, 'error', 'section_parent_foreign',
      'source_page_key', p_source_page_key, 'affected', 1);
  END IF;

  -- Innerhalb des Unterbaums muss jeder Eltern-Verweis ausser dem der
  -- Wurzel in die Kopie zeigen; sonst wuerden Kinder verwaisen.
  SELECT count(*) INTO _bad
    FROM pg_temp._paste_key_map m
   WHERE m.src_id <> _src_id
     AND (m.src_parent_id IS NULL
          OR NOT EXISTS (SELECT 1 FROM pg_temp._paste_key_map p WHERE p.src_id = m.src_parent_id));
  IF _bad > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'section_parent_foreign',
      'source_page_key', p_source_page_key, 'affected', _bad);
  END IF;


  -- Zyklus im Unterbaum: von der Wurzel muss jede Zeile erreichbar sein.
  -- UNION dedupliziert, keine Tiefengrenze.
  SELECT count(*) INTO _total FROM pg_temp._paste_key_map;
  WITH RECURSIVE reachable(id) AS (
    SELECT m.src_id FROM pg_temp._paste_key_map m WHERE m.src_id = _src_id
    UNION
    SELECT m.src_id FROM pg_temp._paste_key_map m
      JOIN reachable r ON m.src_parent_id = r.id
  )
  SELECT count(*) INTO _reachable FROM reachable;
  IF _reachable <> _total THEN
    RETURN jsonb_build_object('success', false, 'error', 'section_parent_cycle',
      'source_page_key', p_source_page_key, 'affected', _total - _reachable);
  END IF;

  -- -----------------------------------------------------------------
  -- 4) Namenszuordnung: Wurzel wie angefordert, Kinder deterministisch.
  -- -----------------------------------------------------------------
  UPDATE pg_temp._paste_key_map SET new_section_key = _root_new_key WHERE src_id = _src_id;

  FOR _node IN SELECT * FROM pg_temp._paste_key_map
                WHERE src_id <> _src_id
                ORDER BY src_sort, src_section_key LOOP
    _candidate := _node.src_section_key;
    _suffix := 0;
    WHILE EXISTS (SELECT 1 FROM public.cms_sections
                   WHERE page_key = p_target_page_key AND section_key = _candidate)
       OR EXISTS (SELECT 1 FROM pg_temp._paste_key_map
                   WHERE new_section_key = _candidate) LOOP
      _suffix := _suffix + 1;
      IF _suffix = 1 THEN
        _candidate := _node.src_section_key || '_kopie';
      ELSE
        _candidate := _node.src_section_key || '_kopie_' || _suffix;
      END IF;
    END LOOP;
    UPDATE pg_temp._paste_key_map SET new_section_key = _candidate WHERE src_id = _node.src_id;
  END LOOP;

  -- Medienkonflikt VOR dem Schreiben feststellen: eine aktive Zuordnung
  -- fuer dieselbe Kombination (Baustein, Feld, Viewport) darf im Ziel
  -- nicht schon existieren. Kein stilles Ueberspringen.
  SELECT count(*) INTO _conflicts
    FROM pg_temp._paste_assets a
    JOIN pg_temp._paste_key_map m ON m.src_section_key = a.section_key
   WHERE coalesce(a.is_active, true) = true
     AND EXISTS (
       SELECT 1 FROM public.cms_assets t
        WHERE t.page_key = p_target_page_key
          AND t.section_key = m.new_section_key
          AND t.field_key IS NOT DISTINCT FROM a.field_key
          AND t.viewport = a.viewport
          AND t.is_active = true
     );
  IF _conflicts > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'paste_asset_slot_conflict',
      'target_page_key', p_target_page_key, 'affected', _conflicts);
  END IF;

  -- -----------------------------------------------------------------
  -- 5) Ab hier Schreiben. Autopilot- und Karten-Seed-Trigger sind nur
  --    fuer diese Transaktion stillgestellt (Kennung aus Etappe 3A);
  --    danach wieder Normalverhalten.
  -- -----------------------------------------------------------------
  -- _prev_flag wurde bereits zu Funktionsbeginn erfasst.
  PERFORM set_config('cms.suppress_page_copy_autopilot', 'on', true);

  SELECT COALESCE(MAX(sort_order), 0) + 1 INTO _max
    FROM public.cms_sections WHERE page_key = p_target_page_key;

  _new_id := NULL;
  INSERT INTO public.cms_sections
    (page_key, section_key, section_type, sort_order, is_active, section_no, parent_section_id)
  SELECT p_target_page_key, m.new_section_key, m.src_section_type, _max,
         m.src_is_active, m.src_section_no, _parent_id
    FROM pg_temp._paste_key_map m WHERE m.src_id = _src_id
  RETURNING id INTO _new_id;
  IF _new_id IS NULL THEN
    RAISE EXCEPTION 'paste_root_insert_no_row: Wurzelzeile konnte nicht eingefuegt werden';
  END IF;
  UPDATE pg_temp._paste_key_map SET new_id = _new_id WHERE src_id = _src_id;
  _sections_copied := 1;

  LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM pg_temp._paste_key_map WHERE new_id IS NULL);
    -- Fortschrittswaechter: erhaelt eine Iteration keine neue ID, obwohl noch
    -- Zeilen fehlen, wird klar abgebrochen (vollstaendiger Ruecklauf) statt
    -- endlos zu laufen. Keine kuenstliche Tiefengrenze.
    _progress := 0;
    FOR _node IN
      SELECT m.* FROM pg_temp._paste_key_map m
        JOIN pg_temp._paste_key_map p ON p.src_id = m.src_parent_id
       WHERE m.new_id IS NULL AND p.new_id IS NOT NULL
       ORDER BY m.src_sort, m.src_section_key
    LOOP
      INSERT INTO public.cms_sections
        (page_key, section_key, section_type, sort_order, is_active, section_no, parent_section_id)
      VALUES (p_target_page_key, _node.new_section_key, _node.src_section_type,
              _node.src_sort, _node.src_is_active, _node.src_section_no,
              (SELECT new_id FROM pg_temp._paste_key_map WHERE src_id = _node.src_parent_id))
      RETURNING id INTO _new_id;
      -- Wie beim Root: liefert RETURNING keine Zeile (z. B. BEFORE-Trigger mit
      -- RETURN NULL), sofort klarer Abbruch mit vollstaendiger Ruecknahme.
      -- Erst danach Mapping, Zaehler und Fortschritt.
      IF _new_id IS NULL THEN
        RAISE EXCEPTION 'paste_child_insert_no_row: Baustein % konnte nicht eingefuegt werden',
          _node.new_section_key;
      END IF;
      UPDATE pg_temp._paste_key_map SET new_id = _new_id WHERE src_id = _node.src_id;
      _sections_copied := _sections_copied + 1;
      _progress := _progress + 1;
    END LOOP;
    IF _progress = 0 THEN
      RAISE EXCEPTION 'paste_no_progress: % Bausteine ohne erreichbaren Elternknoten',
        (SELECT count(*) FROM pg_temp._paste_key_map WHERE new_id IS NULL);
    END IF;
  END LOOP;


  -- Felder: alle Sprachen, auch leer/NULL, mit JSON, Pruefstatus und
  -- Fingerabdruck. Kein ON CONFLICT: Zielbestand wird nie ueberschrieben.
  INSERT INTO public.cms_section_fields
    (page_key, section_key, field_key, locale, value, value_json, review_status, source_hash)
  SELECT p_target_page_key, m.new_section_key, f.field_key, f.locale, f.value, f.value_json,
         f.review_status, f.source_hash
    FROM pg_temp._paste_fields f
    JOIN pg_temp._paste_key_map m ON m.src_section_key = f.section_key;
  GET DIAGNOSTICS _fields_copied = ROW_COUNT;

  -- Whitelist exakt wie in der Quelle, auch is_enabled = false.
  INSERT INTO public.cms_admin_editable_fields
    (page_key, section_key, field_key, locale, is_enabled)
  SELECT p_target_page_key, m.new_section_key, w.field_key, w.locale, w.is_enabled
    FROM pg_temp._paste_whitelist w
    JOIN pg_temp._paste_key_map m ON m.src_section_key = w.section_key;
  GET DIAGNOSTICS _whitelist_copied = ROW_COUNT;

  -- Medien: alle Zuordnungen inkl. inaktiver, mit viewport, Sortierung,
  -- Fokuspunkt und allen Sprachspalten. Keine Dateien werden kopiert.
  FOR _a IN SELECT a.*, m.new_section_key
              FROM pg_temp._paste_assets a
              JOIN pg_temp._paste_key_map m ON m.src_section_key = a.section_key
             ORDER BY a.sort_order, a.asset_no LOOP
    INSERT INTO public.cms_assets (
      page_key, section_key, asset_role, locale,
      storage_path, public_url, alt_text_de, alt_text_en, alt_text_pl,
      focal_x, focal_y, sort_order, is_active,
      field_key, file_name, mime_type, alt_de, alt_en, alt_pl, viewport
    ) VALUES (
      p_target_page_key, _a.new_section_key, _a.asset_role, _a.locale,
      _a.storage_path, _a.public_url, _a.alt_text_de, _a.alt_text_en, _a.alt_text_pl,
      _a.focal_x, _a.focal_y, _a.sort_order, _a.is_active,
      _a.field_key, _a.file_name, _a.mime_type, _a.alt_de, _a.alt_en, _a.alt_pl, _a.viewport
    )
    RETURNING id INTO _new_asset_id;
    INSERT INTO pg_temp._paste_asset_map(old_id, new_id) VALUES (_a.id, _new_asset_id);
    _assets_copied := _assets_copied + 1;
  END LOOP;

  INSERT INTO public.cms_asset_translations (asset_id, locale, alt_text)
  SELECT m.new_id, t.locale, t.alt_text
    FROM pg_temp._paste_asset_tr t
    JOIN pg_temp._paste_asset_map m ON m.old_id = t.asset_id;
  GET DIAGNOSTICS _asset_translations_copied = ROW_COUNT;

  -- Pruefzustaende der kopierten Bilder auf die neuen Bild-IDs.
  -- Keine erfundene Freigabe: die Zustaende werden 1:1 uebernommen.
  INSERT INTO public.cms_translation_unit_state
    (area, ref_key, unit_key, locale, review_status, source_hash)
  SELECT 'asset_alt', m.new_id::text, s.unit_key, s.locale, s.review_status, s.source_hash
    FROM pg_temp._paste_states s
    JOIN pg_temp._paste_asset_map m ON m.old_id::text = s.ref_key
   WHERE s.area = 'asset_alt';
  GET DIAGNOSTICS _unit_states_copied = ROW_COUNT;

  -- -----------------------------------------------------------------
  -- 6) Einfuegeposition und bestehende Zielseiten-Ordnungsregel.
  -- -----------------------------------------------------------------
  IF p_target_position IS NOT NULL THEN
    _final := GREATEST(0, p_target_position);
    UPDATE public.cms_sections SET sort_order = 1000000 + sort_order
     WHERE page_key = p_target_page_key AND section_key = _root_new_key;
    FOR _row IN
      SELECT id FROM public.cms_sections
       WHERE page_key = p_target_page_key
         AND parent_section_id IS NOT DISTINCT FROM _parent_id
         AND section_key <> _root_new_key
       ORDER BY sort_order, section_key
    LOOP
      IF _idx = _final THEN _idx := _idx + 1; END IF;
      UPDATE public.cms_sections SET sort_order = _idx, updated_at = now() WHERE id = _row.id;
      _idx := _idx + 1;
    END LOOP;
    IF _final > _idx THEN _final := _idx; END IF;
    UPDATE public.cms_sections SET sort_order = _final, updated_at = now()
     WHERE page_key = p_target_page_key AND section_key = _root_new_key;
  END IF;

  PERFORM public.cms_resequence_sections_dfs(p_target_page_key);

  SELECT jsonb_object_agg(m.src_section_key, m.new_section_key)
    INTO _key_map FROM pg_temp._paste_key_map m;

  -- Kennung exakt auf den vorherigen Wert zuruecksetzen.
  PERFORM set_config('cms.suppress_page_copy_autopilot', coalesce(_prev_flag, ''), true);

  RETURN jsonb_build_object(
    'success', true,
    'source_page_key', p_source_page_key,
    'source_section_key', p_source_section_key,
    'target_page_key', p_target_page_key,
    'new_section_key', _root_new_key,
    'parent_section_key', _normalized_parent,
    'position', p_target_position,
    'sections_copied', _sections_copied,
    'fields_copied', _fields_copied,
    'whitelist_copied', _whitelist_copied,
    'assets_copied', _assets_copied,
    'assets_skipped', 0,
    'asset_translations_copied', _asset_translations_copied,
    'unit_states_copied', _unit_states_copied,
    'key_map', coalesce(_key_map, '{}'::jsonb),
    'autopilot_suppressed_in_this_transaction', true,
    'source_snapshot_at', _snapshot_at
  );
EXCEPTION
  -- Bei jedem Fehler laeuft der gesamte Block zurueck (auch die
  -- Ordnungsaenderungen). Die Kennung wird trotzdem exakt auf den
  -- vorherigen Wert zurueckgesetzt.
  WHEN unique_violation THEN
    PERFORM set_config('cms.suppress_page_copy_autopilot', coalesce(_prev_flag, ''), true);
    RETURN jsonb_build_object(
      'success', false,
      'error', 'paste_unique_conflict',
      'detail', SQLERRM
    );
  WHEN OTHERS THEN
    PERFORM set_config('cms.suppress_page_copy_autopilot', coalesce(_prev_flag, ''), true);
    RAISE;
END;
$function$;
```

## 7. Nachweis

Tatsächlich ausgeführte, isolierte Prüfung:
`src/test/sectionPasteSql.pglite.test.ts` (PGlite, echtes PostgreSQL im
Prozess). Der SQL-Block wird direkt aus **dieser** Datei gelesen; zusätzlich
wird der Etappe-3A-Block eingespielt, damit die Trigger der Kopie-Kennung real
vorhanden sind. Die Ordnungshilfen `cms_resequence_sections_dfs` und
`cms_renumber_sections` sind die **realen** Live-Fassungen.
