/**
 * Storyblok Content Delivery API (v2) — schlanker Lese-Client ohne SDK.
 *
 * - Public-Token (VITE_STORYBLOK_TOKEN) liefert nur veroeffentlichte Inhalte.
 * - Im Vorschau-Modus (URL-Parameter `_storyblok`, gesetzt vom Visual Editor,
 *   oder `?preview=1`) wird mit dem Preview-Token (VITE_STORYBLOK_PREVIEW_TOKEN)
 *   die Entwurfsversion (`version=draft`) geladen.
 * - Antworten werden pro Session im Speicher gecacht; der Cache-Schluessel
 *   enthaelt die Storyblok-Cache-Version (`cv`), damit nach einer
 *   Veroeffentlichung frische Daten kommen.
 * - Es wird nie ein `language`-Parameter gesetzt: die Stories kommen mit allen
 *   `feld__i18n__<locale>`-Werten, die Sprachlogik (Rueckfallkette) bleibt im
 *   Frontend (siehe useCmsPageContent).
 */

export interface StoryblokStory<C = Record<string, unknown>> {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  full_slug: string;
  is_startpage: boolean;
  parent_id: number | null;
  published_at: string | null;
  content: C;
}

interface StoriesResponse<C> {
  stories: StoryblokStory<C>[];
  cv: number;
}

interface StoryResponse<C> {
  story: StoryblokStory<C>;
  cv: number;
}

export interface DatasourceEntry {
  id: number;
  name: string;
  value: string;
  dimension_value: string | null;
}

const REGION_HOSTS: Record<string, string> = {
  eu: "https://api.storyblok.com",
  us: "https://api-us.storyblok.com",
  ca: "https://api-ca.storyblok.com",
  ap: "https://api-ap.storyblok.com",
  cn: "https://app.storyblokchina.cn",
};

let previewOverride: boolean | null = null;

/** Vorschau-Modus: Visual Editor (`_storyblok`) oder explizit `?preview=1`. */
export function isPreviewMode(): boolean {
  if (previewOverride !== null) return previewOverride;
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has("_storyblok") || params.get("preview") === "1") {
      sessionStorage.setItem("sb-preview", "1");
      return true;
    }
    return sessionStorage.getItem("sb-preview") === "1";
  } catch {
    return false;
  }
}

/** Nur fuer Tests. */
export function __setPreviewModeForTests(value: boolean | null): void {
  previewOverride = value;
}

export function storyblokToken(): string {
  const pub = (import.meta.env.VITE_STORYBLOK_TOKEN as string | undefined)?.trim() ?? "";
  const preview = (import.meta.env.VITE_STORYBLOK_PREVIEW_TOKEN as string | undefined)?.trim() ?? "";
  if (isPreviewMode() && preview) return preview;
  return pub || preview;
}

export function isStoryblokConfigured(): boolean {
  return storyblokToken() !== "";
}

export function storyblokVersion(): "draft" | "published" {
  const preview = (import.meta.env.VITE_STORYBLOK_PREVIEW_TOKEN as string | undefined)?.trim() ?? "";
  return isPreviewMode() && preview ? "draft" : "published";
}

function baseUrl(): string {
  // Testbetrieb: komplette API-Basis ueberschreiben (z. B. lokaler Mock-Server)
  const override = (import.meta.env.VITE_STORYBLOK_API_BASE as string | undefined)?.trim();
  if (override) return override.replace(/\/+$/, "");
  const region = (import.meta.env.VITE_STORYBLOK_REGION as string | undefined)?.trim().toLowerCase() || "eu";
  return `${REGION_HOSTS[region] ?? REGION_HOSTS.eu}/v2/cdn`;
}

/**
 * Cache-Version (`cv`) aus Storyblok.
 *
 * Das Storyblok-CDN liefert veroeffentlichte Inhalte ohne `cv` aus einem
 * Zwischenspeicher, der nach einer Veroeffentlichung veraltet sein kann. Deshalb
 * wird die aktuelle Version einmal je Sitzung ueber `cdn/spaces/me` geholt und
 * an jede Anfrage gehaengt; jede Antwort kann sie weiter aktualisieren.
 */
let cacheVersion: number | null = null;
let cacheVersionPromise: Promise<void> | null = null;
const responseCache = new Map<string, Promise<unknown>>();

export function resetStoryblokCache(): void {
  cacheVersion = null;
  cacheVersionPromise = null;
  responseCache.clear();
}

async function ensureCacheVersion(): Promise<void> {
  if (cacheVersion !== null || storyblokVersion() === "draft") return;
  if (!cacheVersionPromise) {
    cacheVersionPromise = (async () => {
      try {
        const url = new URL(`${baseUrl()}/spaces/me`);
        url.searchParams.set("token", storyblokToken());
        const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
        if (!res.ok) return;
        const body = (await res.json()) as { space?: { version?: number } };
        if (typeof body.space?.version === "number") cacheVersion = body.space.version;
      } catch {
        // ohne cv weiterarbeiten; die erste Antwort liefert dann eine Version
      }
    })();
  }
  await cacheVersionPromise;
}

type Params = Record<string, string | number | boolean | undefined>;

function buildUrl(path: string, params: Params): string {
  const url = new URL(`${baseUrl()}/${path.replace(/^\//, "")}`);
  url.searchParams.set("token", storyblokToken());
  url.searchParams.set("version", storyblokVersion());
  if (cacheVersion) url.searchParams.set("cv", String(cacheVersion));
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue;
    url.searchParams.set(k, String(v));
  }
  return url.toString();
}

async function request<T>(path: string, params: Params): Promise<{ body: T; total: number }> {
  if (!isStoryblokConfigured()) throw new Error("storyblok_unconfigured");
  await ensureCacheVersion();
  const url = buildUrl(path, params);
  const key = `${storyblokVersion()}|${url}`;
  const cached = responseCache.get(key);
  if (cached) return cached as Promise<{ body: T; total: number }>;
  const task = (async () => {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      responseCache.delete(key);
      throw new Error(`storyblok_read_failed:${res.status}:${path}`);
    }
    const body = (await res.json()) as T & { cv?: number };
    if (typeof body.cv === "number" && body.cv !== cacheVersion) cacheVersion = body.cv;
    const total = Number(res.headers.get("total") ?? "0");
    return { body, total };
  })();
  responseCache.set(key, task);
  return task;
}

/** Eine Story ueber ihren vollstaendigen Slug (z. B. `anwendungen/behoerde`, `anwendungen/`). */
export async function fetchStoryBySlug<C = Record<string, unknown>>(
  fullSlug: string,
  params: Params = {},
): Promise<StoryblokStory<C> | null> {
  try {
    const { body } = await request<StoryResponse<C>>(`stories/${fullSlug.replace(/^\//, "")}`, params);
    return body.story ?? null;
  } catch (e) {
    if (e instanceof Error && /:404:/.test(e.message)) return null;
    throw e;
  }
}

/** Alle Stories zu einer Abfrage, ueber alle Seiten der Antwort hinweg (per_page 100). */
export async function fetchStories<C = Record<string, unknown>>(params: Params): Promise<StoryblokStory<C>[]> {
  const perPage = 100;
  const out: StoryblokStory<C>[] = [];
  for (let page = 1; ; page += 1) {
    const { body, total } = await request<StoriesResponse<C>>("stories", { ...params, per_page: perPage, page });
    out.push(...(body.stories ?? []));
    if (out.length >= total || (body.stories ?? []).length < perPage) return out;
  }
}

/** Stories vom Content-Type `page` zu einer Liste von page_keys (Legacy-Schluessel). */
export async function fetchPagesByPageKeys<C = Record<string, unknown>>(
  pageKeys: string[],
): Promise<StoryblokStory<C>[]> {
  if (pageKeys.length === 0) return [];
  const out: StoryblokStory<C>[] = [];
  // filter_query[in] ist kommagetrennt; in Bloecken, damit die URL kurz bleibt.
  for (let i = 0; i < pageKeys.length; i += 40) {
    const chunk = pageKeys.slice(i, i + 40);
    out.push(
      ...(await fetchStories<C>({
        content_type: "page",
        "filter_query[page_key][in]": chunk.join(","),
      })),
    );
  }
  return out;
}

/** Eintraege einer Datasource, optional in einer Sprach-Dimension. */
export async function fetchDatasourceEntries(datasource: string, dimension?: string): Promise<DatasourceEntry[]> {
  const perPage = 1000;
  const out: DatasourceEntry[] = [];
  for (let page = 1; ; page += 1) {
    const { body, total } = await request<{ datasource_entries: DatasourceEntry[] }>("datasource_entries", {
      datasource,
      dimension,
      per_page: perPage,
      page,
    });
    const entries = body.datasource_entries ?? [];
    out.push(...entries);
    if (out.length >= total || entries.length < perPage) return out;
  }
}
