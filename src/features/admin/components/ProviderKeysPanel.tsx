/**
 * „Schlüssel & Anbieter" — geschützter Teil des Übersetzungsbereichs.
 *
 * Ohne Freigabe steht hier nur die Erklärung plus das Feld „Adminpasswort".
 * Es gibt kein Benutzerkonto und kein E-Mail-Feld.
 *
 * Schlüssel liegen verschlüsselt auf dem Server. Der Browser erhält nur
 * „eingerichtet ja/nein", die letzten vier Zeichen, Zeitpunkt und
 * Prüfergebnis — nie den Wert.
 */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  lockAdmin,
  onAdminUnlockChange,
  readAdminSession,
  readAdminToken,
  unlockAdmin,
  type AdminSession,
} from "@/features/admin/api/adminAuth";
import {
  deleteProviderKey,
  hasNoModelChoice,
  PROVIDER_KEYS_ANCHOR_ID,
  readProviderKeys,
  refreshProviderModels,
  saveProviderKey,
  testProviderKey,
  type ProviderModelRow,
  type ProviderStatusRow,
} from "@/features/admin/api/cmsProviderKeys";



interface Props {
  /** Wird nach einer Änderung aufgerufen, damit die Anzeige nachzieht. */
  onChanged?: () => void;
  /** Anbieter, der aus Schritt 2 heraus hervorgehoben werden soll. */
  highlightProvider?: string | null;
}

const MANAGED = [
  { provider: "google_gemini", label: "Google Gemini" },
  { provider: "anthropic", label: "Anthropic Claude" },
  { provider: "deepl", label: "DeepL API" },
];

const fmt = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString("de-DE") : "—";

const ProviderKeysPanel = ({ onChanged, highlightProvider }: Props) => {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [providers, setProviders] = useState<ProviderStatusRow[]>([]);
  const [models, setModels] = useState<Record<string, ProviderModelRow[]>>({});
  const [modelNote, setModelNote] = useState<Record<string, string>>({});
  const [secretDraft, setSecretDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlockBusy, setUnlockBusy] = useState(false);

  const refreshSession = async () => {
    try {
      setSession(await readAdminSession());
    } catch {
      setSession({ isUnlocked: false, expiresAt: null, passwordConfigured: true });
    }
  };

  const loadSession = () => {
    void refreshSession();
  };

  const submitUnlock = async (event: React.FormEvent) => {
    event.preventDefault();
    setUnlockBusy(true);
    setUnlockError(null);
    try {
      setSession(await unlockAdmin(unlockPassword));
      setUnlockPassword("");
    } catch (err) {
      setUnlockError((err as Error).message);
    } finally {
      setUnlockBusy(false);
    }
  };

  useEffect(() => {
    const off = onAdminUnlockChange(loadSession);
    // Nur prüfen, wenn in diesem Fenster überhaupt eine Freigabe vorliegt.
    if (readAdminToken()) loadSession();
    return off;
  }, []);

  /** Modelle eines Anbieters serverseitig laden und in der Anzeige merken. */
  const loadModels = async (provider: string, label: string) => {
    if (hasNoModelChoice(provider)) return;
    const res = await refreshProviderModels(provider);
    setModels((prev) => ({ ...prev, [provider]: res.models ?? [] }));
    setModelNote((prev) => ({
      ...prev,
      [provider]:
        res.source === "api"
          ? `${res.models.length} Modelle von ${label} geladen.`
          : (res.message ?? "Geprüfte Auswahl."),
    }));
    return res.models ?? [];
  };

  useEffect(() => {
    if (!session?.isUnlocked) return;

    readProviderKeys()
      .then((res) => {
        const list = res.providers ?? [];
        setProviders(list);
        // Für eingerichtete Anbieter direkt die echten Modelle nachladen,
        // damit die Auswahlfelder nicht leer bleiben.
        for (const p of list) {
          if (!p.configured || hasNoModelChoice(p.provider)) continue;
          void loadModels(p.provider, p.label).catch(() => undefined);
        }
      })
      .catch((err) => setError((err as Error).message));
  }, [session?.isUnlocked]);

  const run = async (key: string, fn: () => Promise<string>) => {
    setBusy(key);
    setError(null);
    setNote(null);
    try {
      setNote(await fn());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  // -------------------------------------- gesperrte Ansicht (Entsperren)
  if (!session?.isUnlocked) {
    return (
      <section
        id={PROVIDER_KEYS_ANCHOR_ID}
        className={`scroll-mt-24 rounded-lg border p-4 ${
          highlightProvider ? "border-primary ring-2 ring-primary/40" : "border-border"
        }`}
      >
        <h3 className="text-base font-semibold text-foreground">Schlüssel &amp; Anbieter</h3>
        {highlightProvider && (
          <p className="mt-2 rounded-md border border-primary/40 bg-primary/5 p-3 text-sm text-foreground">
            Hier geht es weiter für{" "}
            <strong>{MANAGED.find((m) => m.provider === highlightProvider)?.label ?? highlightProvider}</strong>:
            zuerst unten mit dem Adminpasswort entsperren, danach den eigenen Schlüssel speichern.
            Anschließend werden die Modelle geladen.
          </p>
        )}
        <p className="mt-2 text-sm text-muted-foreground">
          Dieser Abschnitt ist gesperrt. Eigene Zugangsschlüssel für Google Gemini, Anthropic
          Claude und DeepL werden erst nach Eingabe des Adminpassworts verwaltet — oder vorab
          als Projekt-Geheimnis auf dem Server. Ein Benutzerkonto oder eine E-Mail-Adresse ist
          dafür nicht nötig.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Lovable AI (Standard) ist ohne eigenen Schlüssel nutzbar und bleibt unverändert
          verfügbar. Die normale Redaktionsarbeit im CMS bleibt ohne Freigabe möglich.
        </p>

        {session?.passwordConfigured === false && (
          <p className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            Einrichtung noch offen: Auf dem Server ist noch kein Adminpasswort hinterlegt. Bis
            dahin bleibt die Schlüsselverwaltung geschlossen.
          </p>
        )}

        <form onSubmit={submitUnlock} className="mt-4 max-w-sm space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cms-admin-unlock">Adminpasswort</Label>
            <Input
              id="cms-admin-unlock"
              type="password"
              autoComplete="current-password"
              value={unlockPassword}
              onChange={(e) => setUnlockPassword(e.target.value)}
            />
          </div>
          {unlockError && <p className="text-sm text-destructive">{unlockError}</p>}
          <Button type="submit" size="sm" disabled={unlockBusy || !unlockPassword.trim()}>
            {unlockBusy ? "Prüfen …" : "Schlüsselverwaltung entsperren"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Das Passwort wird nur auf dem Server geprüft, nie im Browser gespeichert und nie
            zurückgegeben. Die Freigabe gilt 30 Minuten in diesem Fenster.
          </p>
        </form>
      </section>
    );
  }


  // ------------------------------------------------- geschützte Ansicht
  return (
    <section
      id={PROVIDER_KEYS_ANCHOR_ID}
      className="scroll-mt-24 space-y-6 rounded-lg border border-border p-4"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-foreground">Schlüssel &amp; Anbieter</h3>
          <p className="text-xs text-muted-foreground">
            Freigegeben
            {session.expiresAt
              ? ` bis ${new Date(session.expiresAt).toLocaleTimeString("de-DE")}`
              : " für 30 Minuten"}
            . Schlüsselwerte werden nie angezeigt.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void lockAdmin().then(loadSession)}>
          Sperren
        </Button>
      </header>


      {note && <p className="text-sm text-foreground">{note}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Anbieter mit eigenem Schlüssel */}
      <div className="space-y-4">
        {MANAGED.map((m) => {
          const status = providers.find((p) => p.provider === m.provider);
          const list = models[m.provider] ?? [];
          return (
            <div
              key={m.provider}
              data-provider-card={m.provider}
              className={`rounded-md border p-3 ${
                highlightProvider === m.provider
                  ? "border-primary bg-primary/5 ring-2 ring-primary/40"
                  : "border-border"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{m.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {status?.configured
                      ? `eingerichtet${status.last4 ? ` (endet auf …${status.last4})` : ""} · ${
                          status.source === "vault" ? "verschlüsselt gespeichert" : "Projekt-Geheimnis"
                        } · geändert ${fmt(status.key_updated_at)}`
                      : "nicht eingerichtet"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Letzte Prüfung: {fmt(status?.last_test_at)}
                    {status?.last_test_ok === true && " · erfolgreich"}
                    {status?.last_test_ok === false &&
                      ` · fehlgeschlagen${status.last_test_error ? `: ${status.last_test_error}` : ""}`}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-end gap-2">
                <div className="min-w-[240px] flex-1 space-y-1.5">
                  <Label htmlFor={`key-${m.provider}`}>Schlüssel eingeben oder ersetzen</Label>
                  <Input
                    id={`key-${m.provider}`}
                    type="password"
                    autoComplete="off"
                    placeholder="Wird verschlüsselt gespeichert"
                    value={secretDraft[m.provider] ?? ""}
                    onChange={(e) =>
                      setSecretDraft((prev) => ({ ...prev, [m.provider]: e.target.value }))
                    }
                  />
                </div>
                <Button
                  size="sm"
                  disabled={busy !== null || !(secretDraft[m.provider] ?? "").trim()}
                  onClick={() =>
                    run(`save-${m.provider}`, async () => {
                      // Ein Ablauf: speichern → serverseitig testen → echte
                      // Modellliste laden → Schritt 2 aktualisieren.
                      const res = await saveProviderKey(m.provider, secretDraft[m.provider] ?? "");
                      setProviders(res.providers ?? []);
                      setSecretDraft((prev) => ({ ...prev, [m.provider]: "" }));
                      const tested = await testProviderKey(m.provider);
                      setProviders(tested.providers ?? []);
                      if (!tested.success) {
                        onChanged?.();
                        return `${m.label}: Schlüssel gespeichert, aber der Test war nicht erfolgreich — ${tested.message}`;
                      }
                      if (hasNoModelChoice(m.provider)) {
                        onChanged?.();
                        return `${m.label}: Schlüssel gespeichert und geprüft. DeepL hat keine Modellauswahl.`;
                      }
                      const loaded = await loadModels(m.provider, m.label);
                      onChanged?.();
                      return `${m.label}: Schlüssel gespeichert, geprüft und ${
                        loaded?.length ?? 0
                      } Modelle geladen.`;
                    })
                  }
                >
                  Speichern
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy !== null || !status?.configured}
                  onClick={() =>
                    run(`test-${m.provider}`, async () => {
                      const res = await testProviderKey(m.provider);
                      setProviders(res.providers ?? []);
                      return `${m.label}: ${res.message}`;
                    })
                  }
                >
                  Testen
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy !== null || hasNoModelChoice(m.provider) || !status?.configured}
                  onClick={() =>
                    run(`models-${m.provider}`, async () => {
                      const loaded = await loadModels(m.provider, m.label);
                      onChanged?.();
                      return `${m.label}: Modellliste aktualisiert (${loaded?.length ?? 0}).`;
                    })
                  }
                >
                  Modelle neu laden
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy !== null || status?.source !== "vault"}
                  onClick={() =>
                    run(`del-${m.provider}`, async () => {
                      const res = await deleteProviderKey(m.provider);
                      setProviders(res.providers ?? []);
                      return `${m.label}: Schlüssel gelöscht.`;
                    })
                  }
                >
                  Löschen
                </Button>
              </div>

              {(list.length > 0 || modelNote[m.provider]) && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {modelNote[m.provider]}{" "}
                  {list.length > 0 && `Verfügbar: ${list.slice(0, 8).map((x) => x.model).join(", ")}${list.length > 8 ? " …" : ""}`}
                </p>
              )}
            </div>
          );
        })}
      </div>

    </section>
  );
};

export default ProviderKeysPanel;
