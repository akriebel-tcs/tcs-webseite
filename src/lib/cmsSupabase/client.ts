/**
 * CMS-Light Supabase-Wrapper (read-only).
 *
 * Hintergrund:
 * `src/integrations/supabase/client.ts` ruft beim Modul-Import direkt
 * `createClient(import.meta.env.VITE_SUPABASE_URL, …)` auf. In der
 * **veröffentlichten** Preview (`*.lovable.app`) sind `VITE_*`-Env-Variablen
 * nicht zwangsläufig im Build enthalten — dann wirft `createClient` synchron
 * `supabaseUrl is required.` und reißt jede Seite mit, die das Modul (auch
 * lazy) importiert. Symptom im Admin: White-Screen oder
 * "supabaseUrl is required.".
 *
 * Dieser Wrapper:
 * - Importiert NICHT `@/integrations/supabase/client`.
 * - Liest primär `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`.
 * - Fällt auf den hartkodierten **CMS-Light**-Projekt-Endpoint
 *   `uvkubrrljyzfvbvejepl` zurück (publishable/anon Key — sicher im Frontend).
 * - Crasht NIE beim Modul-Import. Der Client wird lazy beim ersten Zugriff
 *   instanziiert.
 * - Wirft bei wirklich fehlender Konfiguration einen kontrollierten Fehler,
 *   den die Aufrufer per try/catch abfangen.
 *
 * Strikt read-only: ausschließlich `select(...)` und Lese-RPCs (z. B.
 * `rpc_admin_read_*`). Kein `insert/update/delete/upsert`, kein
 * `service_role`, keine Vermischung mit der externen Produktdatenbank
 * (`src/lib/supabase/client.ts` → `ncvxzkwazdemivdolpzc`).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Hartkodierter Fallback auf das CMS-Light-Projekt dieser App.
 * Beide Werte sind publishable/anon und dürfen im Frontend stehen.
 *
 * Quelle: Lovable-Cloud-Konfiguration dieses Projekts.
 */
const CMS_FALLBACK_URL = "https://uvkubrrljyzfvbvejepl.supabase.co";
const CMS_FALLBACK_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2a3VicnJsanl6ZnZidmVqZXBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMDgyMjcsImV4cCI6MjA5Mzg4NDIyN30.UL-toX5FHrIArab9wHCixmjlufkm7X6507Hf0ZYvb3s";

type Resolved = {
  url: string;
  key: string;
  source: "env" | "fallback" | "mixed";
};

function resolveConfig(): Resolved | null {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  const envKey = (
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined
  )?.trim();

  const url = envUrl || CMS_FALLBACK_URL;
  const key = envKey || CMS_FALLBACK_PUBLISHABLE_KEY;

  if (!url || !key) return null;

  let source: Resolved["source"];
  if (envUrl && envKey) source = "env";
  else if (!envUrl && !envKey) source = "fallback";
  else source = "mixed";

  return { url, key, source };
}

let _cached: SupabaseClient | null = null;
let _cachedSource: Resolved["source"] | null = null;

/** True, wenn Env-Variablen ODER Fallback verfügbar sind. */
export function isCmsSupabaseConfigured(): boolean {
  return resolveConfig() !== null;
}

/** True, wenn (mindestens teilweise) der hartkodierte CMS-Light-Fallback genutzt wird. */
export function isUsingCmsFallback(): boolean {
  const r = resolveConfig();
  return r !== null && r.source !== "env";
}

/** Liefert die effektive CMS-Light-URL (für Diagnose / UI-Hinweise). */
export function getCmsSupabaseUrl(): string | null {
  return resolveConfig()?.url ?? null;
}

/**
 * Liefert den lazy initialisierten CMS-Light-Client.
 * Wirft kontrolliert, wenn keinerlei Konfiguration vorhanden ist.
 */
export function getCmsSupabaseClient(): SupabaseClient {
  if (_cached) return _cached;
  const cfg = resolveConfig();
  if (!cfg) {
    throw new Error(
      "[cmsSupabase] Keine CMS-Light-Konfiguration verfügbar (weder VITE_SUPABASE_URL/VITE_SUPABASE_PUBLISHABLE_KEY noch Fallback).",
    );
  }
  _cached = createClient(cfg.url, cfg.key, {
    auth: {
      // Kein Auth in dieser App; keinen Auth-State im Frontend persistieren.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "x-client-info": "tcs-web/cms-light/read-only",
      },
    },
  });
  _cachedSource = cfg.source;
  return _cached;
}

/** Diagnose: 'env' | 'fallback' | 'mixed' | null. */
export function getCmsSupabaseSource(): Resolved["source"] | null {
  if (_cachedSource) return _cachedSource;
  return resolveConfig()?.source ?? null;
}
