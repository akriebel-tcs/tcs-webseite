/**
 * Letzte Auffangstelle für Anzeigefehler.
 *
 * Ohne diese Stelle führt ein Fehler beim Aufbau der Oberfläche zu einer
 * vollständig leeren, weißen Seite. Mit ihr sieht man eine verständliche
 * Meldung und kann neu laden.
 */

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Rohen Fehler mit Aufrufkette ausgeben — nicht nur die Meldung.
    console.error(error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 p-6">
        <h1 className="text-xl font-semibold text-foreground">
          Diese Seite konnte nicht angezeigt werden
        </h1>
        <p className="text-sm text-muted-foreground">
          Bitte lade die Seite neu. Bleibt die Meldung, hilft die technische
          Beschreibung weiter: {error.message}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
            onClick={() => window.location.reload()}
          >
            Neu laden
          </button>
          <button
            type="button"
            className="rounded-md border border-border px-4 py-2 text-sm"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            Zur Startseite
          </button>
        </div>
      </div>
    );
  }
}

export default RootErrorBoundary;
