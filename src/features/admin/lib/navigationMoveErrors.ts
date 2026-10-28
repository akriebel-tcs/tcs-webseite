/**
 * Übersetzt die Fehlercodes von `rpc_admin_move_navigation_node`
 * in verständliche, kontextreiche Meldungen (Knotenname + Zielpfad).
 *
 * Quelle der Codes: supabase/migrations/.._cms-light-nav-move-1.sql
 *   - node_id_required
 *   - node_not_found
 *   - parent_not_found
 *   - parent_in_other_nav_area
 *   - parent_is_self
 *   - cycle_detected
 */

export interface MoveErrorContext {
  nodeLabel: string;
  nodeKey: string;
  navArea: string;
  targetPath: string; // z. B. "main / produkte / details" oder "main / (Wurzel)"
  targetIndex: number;
}

export function formatMoveError(code: string | undefined, ctx: MoveErrorContext): string {
  const head = `„${ctx.nodeLabel}“ (${ctx.nodeKey})`;
  const target = `Ziel: ${ctx.targetPath} · Position ${ctx.targetIndex + 1}`;
  switch (code) {
    case "cycle_detected":
      return `Verschieben abgelehnt: ${head} kann nicht unter einen eigenen Nachfahren gehängt werden (Zyklus). ${target}.`;
    case "parent_is_self":
      return `Verschieben abgelehnt: ${head} kann nicht zu sich selbst gemacht werden. ${target}.`;
    case "parent_in_other_nav_area":
      return `Verschieben abgelehnt: Zielordner liegt in einem anderen Navigationsbereich als „${ctx.navArea}“. ${target}.`;
    case "parent_not_found":
      return `Verschieben abgelehnt: Ziel-Eltern­knoten existiert nicht (mehr). ${target}.`;
    case "node_not_found":
      return `Verschieben abgelehnt: ${head} wurde in der Datenbank nicht gefunden.`;
    case "node_id_required":
      return `Verschieben abgelehnt: keine Knoten-ID angegeben.`;
    default:
      return `Verschieben fehlgeschlagen${code ? ` (${code})` : ""}: ${head}. ${target}.`;
  }
}
