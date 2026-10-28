# RLS, RPC und Whitelist

Stand: 2026-05-16. Übersicht, wie Schreibzugriffe auf die CMS-Tabellen
funktionieren — und warum kein Frontend-Code direkt `INSERT/UPDATE/DELETE` macht.

## Drei Schichten

1. **RLS** auf `cms_*`: Lese-Policies offen (Public-Website braucht das),
   Schreib-Policies eng auf die Service-Rolle der RPCs.
2. **`rpc_admin_*`** als einziger Schreibweg. `SECURITY DEFINER`, prüfen
   Argumente, schreiben kontrolliert, geben definierte Antworten.
3. **Whitelist** im Admin-Code: nur die hier gelisteten Funktionen dürfen
   aufgerufen werden. Direkte Tabellen-Mutationen (`.insert/.update/
   .upsert/.delete`) sind im Admin-Code verboten und werden im Code-Review
   abgelehnt.

## Aktuelle 34 RPCs

### Pages
- `rpc_admin_upsert_page`
- `rpc_admin_archive_page`
- `rpc_admin_restore_page`
- `rpc_admin_duplicate_page`
- `rpc_admin_delete_page`
- `rpc_admin_resolve_page_no`

### Sections
- `rpc_admin_reorder_section`
- `rpc_admin_set_section_position`
- `rpc_admin_set_section_parent`
- `rpc_admin_set_section_active`
- `rpc_admin_duplicate_section`
- `rpc_admin_paste_section`
- `rpc_admin_delete_section`
- `rpc_admin_resolve_section_uid`

### Felder
- `rpc_admin_update_section_field`
- `rpc_admin_set_editable_field_enabled`

### Assets
- `rpc_admin_upsert_asset`
- `rpc_admin_update_asset_alt`
- `rpc_admin_delete_asset`
- `rpc_admin_read_assets`
- `rpc_admin_resolve_asset_no`

### Navigation
- `rpc_admin_create_navigation_node`
- `rpc_admin_move_navigation_node`
- `rpc_admin_update_navigation_label`
- `rpc_admin_set_navigation_node_active`
- `rpc_admin_archive_navigation_node`
- `rpc_admin_delete_navigation_node`
- `rpc_admin_read_navigation_nodes`
- `rpc_admin_resolve_node_no`

### Lesen für Admin-UI
- `rpc_admin_read_pages_with_nav`
- `rpc_admin_read_page_sections`
- `rpc_admin_read_pilot_pflege`
- `rpc_admin_search_short_ids`

## Bekannte Linter-Warnungen (akzeptiert)

- **`SECURITY DEFINER`** auf allen `rpc_admin_*` — gewollt, sonst greifen die
  RLS-Policies nicht so, wie wir wollen.
- **Öffentlicher Storage-Bucket** — gewollt, die Public-Website lädt Bilder
  direkt.
- Diese Punkte werden bei der Public-Live-Vorbereitung erneut bewertet.

## Was das praktisch heißt

- Admin-Frontend importiert `supabase` und ruft nur `.rpc("rpc_admin_…", {...})`
  auf.
- Wer eine neue Schreib-Operation braucht, baut zuerst einen neuen
  `rpc_admin_*` per Migration und ergänzt die Whitelist im Admin-Code.
- Migrationen am `auth`/`storage`/`realtime`/`supabase_functions`/`vault`-
  Schema sind tabu.
