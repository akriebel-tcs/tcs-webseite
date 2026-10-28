/**
 * Read-only Client für das öffentliche Download-Center.
 *
 * Die fachliche Struktur des Download-Centers (Zielgruppen, Bereiche, Gruppen,
 * Kategorien, Serien, Systeme, Labels) kommt **ausschließlich** aus der
 * Contract-View `public.api_v1_download_center_public_contract` der Produktdatenbank.
 * Im Frontend werden keine Zielgruppen-, Kategorie-, Serien- oder
 * System-Mappings gepflegt.
 *
 * Regeln:
 * - nur lesende Zugriffe (`select`)
 * - Zugangsdaten kommen ausschließlich aus Umgebungsvariablen
 *   (`VITE_DOWNLOAD_SUPABASE_URL`, `VITE_DOWNLOAD_SUPABASE_PUBLISHABLE_KEY`),
 *   niemals hart im Code und niemals ein `service_role`-Key
 * - keine Vermischung mit dem CMS-Light-Client (`@/integrations/supabase/client`)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const env = import.meta.env as Record<string, string | undefined>;

/**
 * Eigene Variablen für das Download-Center. Die Produktkatalog-Variablen
 * (`VITE_PRODUCT_SUPABASE_*`) werden hier absichtlich NICHT gelesen, damit
 * Katalog und Download-Center getrennte Datenquellen behalten. Ohne diese
 * Variablen läuft das Download-Center über die Edge Function `download-center`.
 */
const downloadSupabaseUrl = env.VITE_DOWNLOAD_SUPABASE_URL ?? "";

/** Publishable (öffentlich lesbarer) Key – kein service_role. */
const downloadSupabaseKey =
  env.VITE_DOWNLOAD_SUPABASE_PUBLISHABLE_KEY ??
  env.VITE_DOWNLOAD_SUPABASE_ANON_KEY ??
  "";

const isConfigured = Boolean(downloadSupabaseUrl && downloadSupabaseKey);

/** Liefert die effektive Download-Datenbank-URL (für Diagnose/Meldungen). */
export const DOWNLOAD_SUPABASE_URL = downloadSupabaseUrl;

/** Prüft, ob der Download-Client nutzbar konfiguriert ist. */
export function isDownloadCenterConfigured(): boolean {
  return isConfigured;
}

export const downloadCenterSupabase: SupabaseClient = isConfigured
  ? createClient(downloadSupabaseUrl, downloadSupabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { "x-client-info": "tcs-web/download-center-read-only" },
      },
    })
  : (new Proxy({} as SupabaseClient, {
      get() {
        throw new Error(
          "[download-center] Client ist nicht konfiguriert. Bitte " +
            "VITE_DOWNLOAD_SUPABASE_URL und VITE_DOWNLOAD_SUPABASE_PUBLISHABLE_KEY setzen.",
        );
      },
    }) as SupabaseClient);
