/**
 * Undo/Redo-Stapel für den NavigationTreeEditor.
 *
 * Jede Aktion liefert Funktionen `undo()` und `redo()`, die die jeweils
 * inverse bzw. gleiche Operation per whitelisted `rpc_admin_*`-RPC ausführen.
 * Es wird KEIN direkter Tabellenschreibzugriff verwendet (siehe always-follow).
 *
 * Nicht abgedeckt:
 *   • Löschen von Knoten / Sections — es existiert keine Restore-RPC.
 *     Solche Aktionen werden bewusst NICHT auf den Stapel gelegt; die UI
 *     zeigt einen klaren Hinweis.
 */

export type UndoOpKind =
  | "node_move"
  | "node_toggle_active"
  | "section_reorder"
  | "section_toggle_active"
  | "section_duplicate";

export interface UndoEntry {
  kind: UndoOpKind;
  /** Menschlich lesbare Beschreibung — wird im Tooltip / Toast genutzt. */
  label: string;
  /** Inverse Operation; gibt Fehlermeldung zurück oder null bei Erfolg. */
  undo: () => Promise<string | null>;
  /** Erneute Anwendung; gibt Fehlermeldung zurück oder null bei Erfolg. */
  redo: () => Promise<string | null>;
}

export const UNDO_STACK_LIMIT = 20;
