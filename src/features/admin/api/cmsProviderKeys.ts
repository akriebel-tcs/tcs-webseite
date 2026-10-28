/**
 * Client-Zugang zur Verwaltung eigener Anbieter-Schlüssel und der
 * Anbieter-/Modellzuordnung je Sprache.
 *
 * Regeln:
 * - Es gibt nur EINEN Serverweg: die Funktion `cms-translation-run`.
 *   Keine zweite Übersetzungsverwaltung, kein direkter Tabellenzugriff.
 * - Der Browser kennt Schlüssel nie im Klartext. Er sieht nur
 *   „eingerichtet ja/nein", die letzten vier Zeichen, Zeitpunkt und
 *   Prüfergebnis.
 * - Jede Aktion trägt das Zugangs-Token der angemeldeten Sitzung; die Rolle
 *   „admin" wird serverseitig geprüft.
 */

import { readAdminToken } from "./adminAuth";
import { readFunctionError } from "./cmsTranslationRuns";

export interface ProviderStatusRow {
  provider: string;
  label: string;
  configured: boolean;
  secret: string;
  managed: boolean;
  source: "vault" | "project_secret" | "none";
  last4: string | null;
  key_updated_at: string | null;
  last_test_at: string | null;
  last_test_ok: boolean | null;
  last_test_error: string | null;
}

export interface ProviderModelRow {
  model: string;
  label: string;
}

export interface LocaleProviderConfigRow {
  locale: string;
  provider: string;
  model: string;
  verified_at: string | null;
  updated_at: string | null;
}

async function invokeAdmin<T>(body: Record<string, unknown>): Promise<T> {
  const adminToken = readAdminToken();
  if (!adminToken) throw new Error("Bitte die Schlüsselverwaltung zuerst entsperren.");
  const { getCmsSupabaseClient } = await import("@/lib/cmsSupabase/client");
  const supabase = getCmsSupabaseClient();
  const { data, error } = await supabase.functions.invoke("cms-translation-run", {
    body: { ...body, admin_token: adminToken },
  });
  if (error) throw new Error(await readFunctionError(error));
  const res = data as { error?: string; message?: string };
  if (res?.error) throw new Error(res.message || res.error);
  return data as T;
}

/** Stand aller Anbieter (ohne Schlüsselwerte). */
export function readProviderKeys() {
  return invokeAdmin<{ providers: ProviderStatusRow[] }>({ action: "provider_keys" });
}

/** Schlüssel anlegen oder ersetzen — Wert geht nur zum Server. */
export function saveProviderKey(provider: string, secret: string) {
  return invokeAdmin<{ success: boolean; last4?: string; providers: ProviderStatusRow[] }>({
    action: "provider_key_save",
    provider,
    secret,
  });
}

export function deleteProviderKey(provider: string) {
  return invokeAdmin<{ success: boolean; providers: ProviderStatusRow[] }>({
    action: "provider_key_delete",
    provider,
  });
}

export function testProviderKey(provider: string, model?: string) {
  return invokeAdmin<{ success: boolean; message: string; providers: ProviderStatusRow[] }>({
    action: "provider_key_test",
    provider,
    model,
  });
}

/** Modellliste beim Anbieter neu abfragen und in der Datenbank spiegeln. */
export function refreshProviderModels(provider: string) {
  return invokeAdmin<{
    success: boolean;
    provider: string;
    source: "api" | "fallback" | "static";
    message?: string;
    models: ProviderModelRow[];
    rates: unknown[];
  }>({ action: "provider_models", provider });
}

/** Anbieter und Modell für eine Sprache festlegen (erst nach Server-Test). */
export function setLocaleProvider(locale: string, provider: string, model: string) {
  return invokeAdmin<{ success: boolean; locale: string; provider: string; model: string }>({
    action: "locale_provider_set",
    locale,
    provider,
    model,
  });
}

/**
 * Pausierten Lauf ausdrücklich auf einen anderen Anbieter umstellen.
 * Derselbe Lauf, derselbe Fortschritt — kein neuer Auftrag.
 */
export function switchRunProvider(args: { runId: string; provider: string; model: string }) {
  return invokeAdmin<{ success: boolean; run: unknown }>({
    action: "run_switch_provider",
    run_id: args.runId,
    provider: args.provider,
    model: args.model,
    confirm: "UMSTELLEN",
  });
}

/**
 * Anbieter, die einen eigenen (kundeneigenen) Schlüssel brauchen.
 * Lovable AI ist bewusst NICHT dabei — dort wird kein Schlüssel verwaltet.
 */
export const OWN_KEY_PROVIDERS = ["google_gemini", "anthropic", "deepl"] as const;

/** true = Anbieter braucht einen eigenen Schlüssel. */
export function isOwnKeyProvider(provider: string): boolean {
  return (OWN_KEY_PROVIDERS as readonly string[]).includes(provider);
}

/** true = Anbieter hat keine Modellauswahl (DeepL). */
export function hasNoModelChoice(provider: string): boolean {
  return provider === "deepl";
}

/** Stabile Sprungmarke des Abschnitts „Schlüssel & Anbieter". */
export const PROVIDER_KEYS_ANCHOR_ID = "cms-schluessel-und-anbieter";
