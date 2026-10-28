/**
 * Passwortfreigabe für den sensiblen Abschnitt „Schlüssel & Anbieter"
 * (/admin/anmelden).
 *
 * Kein Benutzerkonto, keine E-Mail-Adresse, keine Selbstregistrierung.
 * Der Redaktionsbereich /admin bleibt ohne Freigabe voll arbeitsfähig.
 *
 * Diese Seite baut absichtlich nichts vor dem ersten Rendern: sie startet
 * ohne Netzaufruf, damit auch bei Serverproblemen nie eine leere Seite
 * entsteht.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { unlockAdmin } from "@/features/admin/api/adminAuth";

const AdminLoginPage = () => {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const session = await unlockAdmin(password);
      setPassword("");
      setUnlocked(true);
      setExpiresAt(session.expiresAt);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Schlüsselverwaltung entsperren</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Nur die Verwaltung eigener Anbieter-Schlüssel und das Umstellen eines pausierten
          Übersetzungslaufs sind geschützt. Die normale Redaktionsarbeit unter{" "}
          <Link className="underline" to="/admin">
            /admin
          </Link>{" "}
          bleibt ohne Freigabe möglich. Es gibt hier kein Benutzerkonto und kein E-Mail-Feld.
        </p>
      </div>

      {unlocked ? (
        <div className="rounded-md border border-border bg-muted/40 p-4 text-sm">
          <p className="font-medium text-foreground">Freigabe erteilt.</p>
          <p className="mt-1 text-muted-foreground">
            Die Freigabe gilt nur in diesem Browserfenster und läuft
            {expiresAt ? ` um ${new Date(expiresAt).toLocaleTimeString("de-DE")}` : " nach 30 Minuten"} ab.
          </p>
          <div className="mt-3">
            <Button asChild size="sm">
              <Link to="/admin">Weiter zur Administration</Link>
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4 rounded-md border border-border p-4">
          <div className="space-y-1.5">
            <Label htmlFor="admin-password">Adminpasswort</Label>
            <Input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={busy || !password.trim()}>
            {busy ? "Prüfen …" : "Schlüsselverwaltung entsperren"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Das Passwort wird nur auf dem Server geprüft. Es wird nie im Browser gespeichert und
            nie zurückgegeben.
          </p>
        </form>
      )}
    </div>
  );
};

export default AdminLoginPage;
