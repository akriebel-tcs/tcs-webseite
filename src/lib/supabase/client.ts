/**
 * Produktdatenbank-Client (read-only Nutzung).
 *
 * Dieser Client verbindet die TCS-Webseite mit der **externen** Produktdatenbank
 * (Projekt-ID `ncvxzkwazdemivdolpzc`), die als zentrale Wahrheit für
 * strukturierte Produkt- und Dokumentdaten dient (Produktkatalog, PDP,
 * Produktbilder, Produktdokumente, Downloads). Webseitencontent (Texte,
 * Hero-Bilder, Landingpage-Inhalte) bleibt weiterhin codebasiert (i18n +
 * lokale Assets).
 *
 * **WICHTIG – strikte Trennung Produkt vs. CMS-Light:**
 * Seit der Aktivierung von Lovable Cloud zeigen die generischen Env-Variablen
 * `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` auf die **interne
 * CMS-Light-Datenbank** des Webseitenprojekts (Lovable Cloud) und dürfen
 * **nicht mehr** für den Produktdatenbank-Client verwendet werden.
 *
 * Der Produktdatenbank-Client liest stattdessen aus
 * `VITE_PRODUCT_SUPABASE_URL` / `VITE_PRODUCT_SUPABASE_PUBLISHABLE_KEY` und
 * fällt auf die hartkodierten, publishable Defaults der externen Produkt-DB
 * (`ncvxzkwazdemivdolpzc`) zurück.
 *
 * Wichtige Regeln (siehe Etappen `feat-supabase-base-1` und
 * `product-supabase-client-env-separation-1`):
 * - Ausschließlich lesende Verwendung (`select`).
 * - Keine `insert` / `update` / `delete` / `upsert` / `rpc(write)`-Aufrufe.
 * - Niemals `service_role`-Key im Frontend.
 * - Keine Vermischung mit dem CMS-Light-Client (`@/integrations/supabase/client`).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Read-only Verbindungsdaten der externen TCS-Produktdatenbank
 * (Online-Produktkatalog, PDP, Produktbilder, Produktdokumente).
 *
 * Es gibt **keinen** hartkodierten Projekt-Fallback. Maßgeblich sind
 * ausschließlich `VITE_PRODUCT_SUPABASE_URL` /
 * `VITE_PRODUCT_SUPABASE_PUBLISHABLE_KEY`; diese zeigen auf die
 * Produktdatenbank des Katalogs (`ncvxzkwazdemivdolpzc`).
 *
 * Wichtig: Das Download-Center benutzt diese Variablen **nicht**. Es hat
 * eigene Variablen (`VITE_DOWNLOAD_SUPABASE_*`) bzw. läuft über die Edge
 * Function `download-center` gegen die Download-Contract-Datenbank.
 */
const PRODUCT_SUPABASE_URL_DEFAULT = "https://ncvxzkwazdemivdolpzc.supabase.co";
const PRODUCT_SUPABASE_PUBLISHABLE_KEY_DEFAULT =
  "sb_publishable_cM9G9uH6WnKLqgC4qAEmfg_VTagqL_G";

const supabaseUrl =
  (import.meta.env.VITE_PRODUCT_SUPABASE_URL as string | undefined) ||
  PRODUCT_SUPABASE_URL_DEFAULT;
const supabasePublishableKey =
  (import.meta.env.VITE_PRODUCT_SUPABASE_PUBLISHABLE_KEY as
    | string
    | undefined) ||
  (import.meta.env.VITE_PRODUCT_SUPABASE_ANON_KEY as string | undefined) ||
  PRODUCT_SUPABASE_PUBLISHABLE_KEY_DEFAULT;


/**
 * Effektive Produktdatenbank-URL (nach Env-Auflösung). Wird von der
 * Diagnose-Schicht und der Asset-Auflösung verwendet, damit beide niemals
 * versehentlich gegen die CMS-Light-/Lovable-Cloud-URL prüfen.
 */
export const PRODUCT_SUPABASE_URL: string = supabaseUrl;

/** Liefert die effektive Produktdatenbank-URL. */
export function getEffectiveProductSupabaseUrl(): string {
  return PRODUCT_SUPABASE_URL;
}

const isConfigured = Boolean(supabaseUrl && supabasePublishableKey);

if (!isConfigured) {
  // Sollte mit den hartkodierten Defaults nicht eintreten; bleibt als
  // Sicherheitsnetz erhalten, falls beide Defaults bewusst geleert werden.
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] Keine Verbindungsdaten verfügbar. Read-only Produkt-/Dokumentabfragen werden fehlschlagen.",
  );
}

/**
 * Zentraler Supabase-Client für die gesamte Anwendung.
 *
 * Verwendung: ausschließlich lesende Abfragen (`select(...)`) gegen die
 * dokumentierten Views/Tabellen aus der externen Produkt-DB.
 *
 * Wichtig: Wenn die Env-Variablen fehlen, wird **kein** echter Client
 * instanziiert (neuere `@supabase/supabase-js`-Versionen werfen sonst
 * synchron `supabaseUrl is required.` und brechen das gesamte Modul-Loading
 * ab → weiße Seite). Stattdessen wird ein Stub gehalten; die API-Schicht
 * fängt das über `isSupabaseConfigured()` ab und greift gar nicht erst zu.
 */
export const supabase: SupabaseClient = isConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        // Diese Webseite nutzt Supabase **nicht** für Auth.
        // Persistente Sessions, Auto-Refresh und URL-Session-Detection
        // werden bewusst deaktiviert, um keinen Auth-State im Frontend zu erzeugen.
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          "x-client-info": "tcs-web/read-only",
        },
      },
    })
  : (new Proxy({} as SupabaseClient, {
      get() {
        throw new Error(
          "[supabase] Client ist nicht konfiguriert. Bitte VITE_SUPABASE_URL und " +
            "VITE_SUPABASE_PUBLISHABLE_KEY setzen. API-Schicht muss vorher " +
            "isSupabaseConfigured() prüfen.",
        );
      },
    }) as SupabaseClient);

/**
 * Kleiner Helper, um in der API-Schicht zentral zu prüfen,
 * ob die Supabase-Konfiguration vorhanden ist. Verhindert irreführende
 * Netzwerkfehler, wenn die Env-Variablen fehlen.
 */
export function isSupabaseConfigured(): boolean {
  return isConfigured;
}
