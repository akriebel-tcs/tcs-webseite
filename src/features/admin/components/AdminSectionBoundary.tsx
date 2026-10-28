import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Absturzschutz für einen Teilbereich des Admin.
 *
 * Zweck: Ein Fehler in einem Unterbereich (z. B. Fortschrittsanzeige oder
 * Zahlenblöcke) darf niemals dazu führen, dass ganze Bedienbereiche wie die
 * Sprachliste aus der Seite verschwinden. Der Fehler bleibt lokal, wird
 * verständlich gemeldet und lässt sich erneut versuchen.
 */
type Props = {
  /** Verständlicher Name des Bereichs, z. B. „Ablauf Übersetzungen". */
  label: string;
  children: ReactNode;
};

type State = { failed: boolean; message: string; attempt: number };

class AdminSectionBoundary extends Component<Props, State> {
  state: State = { failed: false, message: "", attempt: 0 };

  static getDerivedStateFromError(err: unknown): Partial<State> {
    return { failed: true, message: err instanceof Error ? err.message : String(err) };
  }

  componentDidCatch(err: Error, info: ErrorInfo): void {
    // Bewusst nur in die Entwicklerkonsole, nicht an den Nutzer.
    console.error(`[admin] Bereich „${this.props.label}" konnte nicht angezeigt werden`, err, info);
  }

  private retry = () => {
    this.setState((s) => ({ failed: false, message: "", attempt: s.attempt + 1 }));
  };

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <div
          role="alert"
          className="rounded border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
        >
          Der Bereich „{this.props.label}" konnte gerade nicht angezeigt werden. Alle übrigen
          Bereiche bleiben bedienbar.
          <button
            type="button"
            className="ml-2 rounded border px-2 py-1 text-xs hover:bg-muted"
            onClick={this.retry}
          >
            Erneut laden
          </button>
        </div>
      );
    }
    return <div key={this.state.attempt}>{this.props.children}</div>;
  }
}

export default AdminSectionBoundary;
