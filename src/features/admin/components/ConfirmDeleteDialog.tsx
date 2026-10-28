/**
 * Etappe I.7 — Bestätigungsdialog für endgültiges Löschen.
 *
 * Sicherheitsnetz: der Redakteur muss bewusst "123" eintippen, bevor der
 * Knopf aktiv wird. Der konkrete Schlüssel wird nur noch angezeigt, nicht mehr
 * nachgetippt. Alle Lösch-Aufrufe gehen über Whitelist-RPCs.
 */
import { useEffect, useState } from "react";

interface Props {
  open: boolean;
  title: string;
  /** Beschreibung was gelöscht wird (mehrzeilig erlaubt). */
  description: React.ReactNode;
  /** Kontext-Schlüssel des Elements (nur Anzeige/Kompatibilität). */
  confirmToken: string;
  /** Beschriftung des Eingabefelds. */
  confirmTokenLabel?: string;
  /** Wartezeit in Sekunden, bevor der „Endgültig löschen"-Knopf
   *  aktiv werden kann (Schutz vor versehentlichen Klicks). Default 3. */
  lockSeconds?: number;
  /** Wird ausgeführt, wenn der Redakteur bestätigt. Liefert Fehlertext oder null. */
  onConfirm: () => Promise<string | null>;
  onClose: () => void;
}

const ConfirmDeleteDialog: React.FC<Props> = ({
  open,
  title,
  description,
  confirmToken,
  confirmTokenLabel,
  lockSeconds = 3,
  onConfirm,
  onClose,
}) => {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(lockSeconds);

  useEffect(() => {
    if (open) {
      setTyped("");
      setError(null);
      setSecondsLeft(lockSeconds);
    }
  }, [open, lockSeconds]);

  useEffect(() => {
    if (!open || secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [open, secondsLeft]);

  if (!open) return null;

  const matches = typed.trim() === "123";
  const locked = secondsLeft > 0;
  const canSubmit = matches && !locked && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    const err = await onConfirm();
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
      <div className="w-full max-w-md rounded-lg border border-destructive/40 bg-card p-5 shadow-lg">
        <h2 className="mb-1 text-lg font-semibold text-destructive">{title}</h2>
        <div className="mb-4 text-sm text-muted-foreground">{description}</div>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-medium">
            Zur Bestätigung bitte 123 eingeben.
          </span>
          <span className="mb-1 block text-[11px] text-muted-foreground">
            Betroffen: <span className="font-mono">{confirmToken}</span>
          </span>
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="w-full rounded border bg-background px-2 py-1.5 font-mono text-sm"
            placeholder="123"
            disabled={busy}
            autoFocus
          />
        </label>

        {error && (
          <div className="mb-3 rounded border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            {locked
              ? `Sicherheitssperre: noch ${secondsLeft}s …`
              : matches
                ? "Bereit zum Löschen."
                : "Bitte zur Bestätigung 123 eingeben."}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              title={
                locked
                  ? `Bitte ${secondsLeft}s warten`
                  : !matches
                    ? "Bitte 123 eingeben"
                    : "Endgültig löschen"
              }
              className="rounded border border-destructive bg-destructive px-3 py-1.5 text-sm text-destructive-foreground hover:opacity-90 disabled:opacity-40"
            >
              {busy
                ? "Lösche…"
                : locked
                  ? `Endgültig löschen (${secondsLeft}s)`
                  : "Endgültig löschen"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteDialog;
