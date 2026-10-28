/**
 * Freigabe des sensiblen Abschnitts „Schlüssel & Anbieter".
 *
 * Dieses Projekt verwendet ausdrücklich KEINE Benutzerkonten, keine
 * E-Mail-Anmeldung und keine Selbstregistrierung. Der Redaktionsbereich
 * /admin bleibt vollständig ohne Anmeldung arbeitsfähig.
 *
 * Nur die Verwaltung eigener Anbieter-Schlüssel und die Umstellung eines
 * pausierten Übersetzungslaufs werden mit dem Adminpasswort entsperrt. Das
 * Passwort geht ausschließlich zum Serverdienst `cms-translation-run`, wird
 * dort laufzeitkonstant gegen ein Projekt-Geheimnis geprüft und nie
 * zurückgegeben. Die Freigabe ist eine kurzlebige, signierte Sitzung
 * (30 Minuten) und wird im Browser NUR im Arbeitsspeicher gehalten —
 * kein localStorage, kein sessionStorage, kein Cookie im Clientcode.
 */

export interface AdminSession {
  /** true = Schlüsselverwaltung ist freigeschaltet. */
  isUnlocked: boolean;
  /** Ablauf der Freigabe (ISO) oder null. */
  expiresAt: string | null;
  /** false = auf dem Server ist noch kein Adminpasswort eingerichtet. */
  passwordConfigured: boolean;
  reason?: string;
}

/** Seite mit der Passwortfreigabe (kein Konto, keine E-Mail). */
export const ADMIN_LOGIN_PATH = "/admin/anmelden";

const EMPTY: AdminSession = {
  isUnlocked: false,
  expiresAt: null,
  passwordConfigured: true,
};

/** Freigabe-Token — bewusst nur im Arbeitsspeicher dieses Moduls. */
let adminToken: string | null = null;
let adminTokenExpiresAt = 0;
const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      // Anzeige darf nie am Zuhörer scheitern.
    }
  }
}

/** Aktuelles Freigabe-Token oder null (abgelaufen zählt als null). */
export function readAdminToken(): string | null {
  if (!adminToken) return null;
  if (adminTokenExpiresAt && adminTokenExpiresAt <= Date.now()) {
    adminToken = null;
    adminTokenExpiresAt = 0;
    return null;
  }
  return adminToken;
}

async function callFunction<T>(body: Record<string, unknown>): Promise<T> {
  const { getCmsSupabaseClient } = await import("@/lib/cmsSupabase/client");
  const cms = getCmsSupabaseClient();
  const { data, error } = await cms.functions.invoke("cms-translation-run", { body });
  if (error) {
    const { readFunctionError } = await import("./cmsTranslationRuns");
    throw new Error(await readFunctionError(error));
  }
  return data as T;
}

/** Entsperrt mit dem Adminpasswort. Das Passwort verlässt den Browser nur zum Server. */
export async function unlockAdmin(password: string): Promise<AdminSession> {
  const out = await callFunction<{
    unlocked?: boolean;
    admin_token?: string;
    expires_at?: string;
    error?: string;
    message?: string;
  }>({ action: "admin_unlock", password });
  if (out?.error || out?.unlocked !== true || !out?.admin_token) {
    throw new Error(out?.message || friendlyAuthError(out?.error ?? ""));
  }
  adminToken = out.admin_token;
  adminTokenExpiresAt = out.expires_at ? new Date(out.expires_at).getTime() : Date.now() + 30 * 60 * 1000;
  const session: AdminSession = {
    isUnlocked: true,
    expiresAt: out.expires_at ?? null,
    passwordConfigured: true,
  };
  notify();
  return session;
}

/** Prüft serverseitig, ob die Freigabe noch gültig ist. */
export async function readAdminSession(): Promise<AdminSession> {
  const token = readAdminToken();
  if (!token) return { ...EMPTY, reason: "locked" };
  try {
    const out = await callFunction<{
      unlocked?: boolean;
      expires_at?: string;
      reason?: string;
      password_configured?: boolean;
    }>({ action: "admin_session", admin_token: token });
    if (out?.unlocked === true) {
      adminTokenExpiresAt = out.expires_at ? new Date(out.expires_at).getTime() : adminTokenExpiresAt;
      return { isUnlocked: true, expiresAt: out.expires_at ?? null, passwordConfigured: true };
    }
    adminToken = null;
    adminTokenExpiresAt = 0;
    return {
      ...EMPTY,
      reason: out?.reason ?? "locked",
      passwordConfigured: out?.password_configured !== false,
    };
  } catch {
    return { ...EMPTY, reason: "check_failed" };
  }
}

/** Freigabe beenden (auch serverseitiges Cookie löschen). */
export async function lockAdmin(): Promise<void> {
  const token = readAdminToken();
  adminToken = null;
  adminTokenExpiresAt = 0;
  notify();
  if (!token) return;
  try {
    await callFunction({ action: "admin_lock", admin_token: token });
  } catch {
    // Ohne Serverantwort ist die Freigabe im Browser trotzdem weg.
  }
}

/** Verständliche Meldungen statt technischer Fehlerkennungen. */
export function friendlyAuthError(raw: string): string {
  const m = (raw ?? "").toLowerCase();
  if (m.includes("admin_password_not_configured")) {
    return "Das Adminpasswort ist auf dem Server noch nicht eingerichtet.";
  }
  if (m.includes("admin_password_invalid")) return "Das Adminpasswort stimmt nicht.";
  if (m.includes("admin_session_expired")) return "Die Freigabe ist abgelaufen. Bitte erneut entsperren.";
  if (m.includes("admin_session_invalid") || m.includes("admin_unlock_required")) {
    return "Die Freigabe ist ungültig. Bitte erneut entsperren.";
  }
  if (m.includes("rate")) return "Zu viele Versuche. Bitte kurz warten.";
  return raw || "Entsperren nicht möglich.";
}

/** Reagiert auf Entsperren/Sperren im laufenden Bildschirm. */
export function onAdminUnlockChange(handler: () => void): () => void {
  listeners.add(handler);
  return () => listeners.delete(handler);
}
