/**
 * TeaserSectionPreview — isolierte Admin-Vorschau für eine einzelne
 * `teaser_2col_v1`-Section.
 *
 * Lädt Felder (DE) aus `cms_section_fields` und das Bild aus `cms_assets`
 * (Slot `image`, Viewport `desktop`) read-only und rendert eine
 * Layout-/Stil-treue Kopie des öffentlichen `Teaser2ColV1`.
 *
 * Bewusst eine kleine Kopie statt direkter Wiederverwendung des
 * Public-Renderers: `Teaser2ColV1` braucht den `CmsSectionContext`
 * (CmsPageProvider, i18n, Router) der öffentlichen Seite. Für eine reine
 * Admin-Vorschau eines einzelnen Blocks ist diese isolierte Variante
 * robuster und überträgt 1:1 die Konventionen: 2-Spalten ab `lg`,
 * 16:9-Bild, Hover-Zoom, image_position links/rechts, background_variant
 * default/muted, CTA nur wenn Label+Link gefüllt.
 *
 * Read-only · keine Mutation · keine Public-Wirkung.
 */
import { useEffect, useState } from "react";
import { ArrowRight, ImageOff, Loader2 } from "lucide-react";

interface Props {
  pageKey: string;
  sectionKey: string;
  /** Bevorzugte Sprache der Felder (Default: "de"). */
  locale?: string;
}

interface FieldRow {
  field_key: string;
  locale: string;
  value: string | null;
}

interface AssetRow {
  field_key: string | null;
  asset_role: string | null;
  viewport: string;
  public_url: string | null;
  alt_text_de: string | null;
  alt_text_en: string | null;
  alt_de: string | null;
  alt_en: string | null;
}

interface LoadedData {
  fields: Record<string, string>;
  imageUrl: string | null;
  alt: string;
}

const FIELD_KEYS = [
  "label",
  "title",
  "text",
  "cta_label",
  "cta_link",
  "image_position",
  "background_variant",
] as const;

async function loadTeaser(
  pageKey: string,
  sectionKey: string,
  locale: string,
): Promise<LoadedData> {
  const { getCmsSupabaseClient } = await import("@/lib/cmsSupabase/client");
  const supabase = getCmsSupabaseClient();

  const [fieldsRes, assetsRes] = await Promise.all([
    supabase
      .from("cms_section_fields")
      .select("field_key, locale, value")
      .eq("page_key", pageKey)
      .eq("section_key", sectionKey)
      .in("field_key", FIELD_KEYS as unknown as string[]),
    supabase
      .from("cms_assets")
      .select(
        "field_key, asset_role, viewport, public_url, alt_text_de, alt_text_en, alt_de, alt_en, is_active",
      )
      .eq("page_key", pageKey)
      .eq("section_key", sectionKey)
      .eq("is_active", true),
  ]);

  const fields: Record<string, string> = {};
  const fieldRows: FieldRow[] = (fieldsRes.data ?? []) as FieldRow[];
  // Erst Wunschlocale, dann beliebige andere als Fallback.
  for (const k of FIELD_KEYS) {
    const exact = fieldRows.find((r) => r.field_key === k && r.locale === locale && r.value);
    const any = fieldRows.find((r) => r.field_key === k && r.value);
    fields[k] = (exact?.value ?? any?.value ?? "").trim();
  }

  const assetRows: AssetRow[] = (assetsRes.data ?? []) as AssetRow[];
  const imageAssets = assetRows.filter(
    (a) => (a.field_key === "image" || a.asset_role === "image") && a.public_url,
  );
  const desktop = imageAssets.find((a) => a.viewport === "desktop") ?? imageAssets[0] ?? null;
  const imageUrl = desktop?.public_url ?? null;
  const alt =
    (locale === "en"
      ? desktop?.alt_text_en ?? desktop?.alt_en
      : desktop?.alt_text_de ?? desktop?.alt_de) ?? "";

  return { fields, imageUrl, alt };
}

const TeaserSectionPreview: React.FC<Props> = ({ pageKey, sectionKey, locale = "de" }) => {
  const [data, setData] = useState<LoadedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    loadTeaser(pageKey, sectionKey, locale)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pageKey, sectionKey, locale]);

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center gap-2 rounded border bg-muted/30 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Lade Vorschau …
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded border border-destructive/40 bg-destructive/5 px-2 py-1 text-xs text-destructive">
        Vorschau-Fehler: {error}
      </div>
    );
  }

  if (!data) return null;

  const { fields, imageUrl, alt } = data;
  const title = fields.title;
  const text = fields.text;
  const label = fields.label;
  const ctaLabel = fields.cta_label;
  const ctaLink = fields.cta_link;
  const imagePosition: "left" | "right" =
    fields.image_position?.toLowerCase() === "left" ? "left" : "right";
  const rawBg = (fields.background_variant ?? "").toLowerCase();
  const sectionBg = (() => {
    switch (rawBg) {
      case "black-5":  return "bg-black/5";
      case "black-7":  return "bg-black/[0.07]";
      case "black-10": return "bg-black/10";
      case "black-13": return "bg-black/[0.13]";
      case "muted":    return "bg-black/10";
      case "white":
      case "default":
      case "":
      default:         return "bg-white";
    }
  })();
  const backgroundVariant: string = rawBg || "white";
  const textOrder = imagePosition === "left" ? "lg:order-2" : "";
  const imageOrder = imagePosition === "left" ? "lg:order-1" : "";
  const hasCta = ctaLabel.length > 0 && ctaLink.length > 0;

  const empty = !title && !text && !imageUrl;
  if (empty) {
    return (
      <div className="rounded border bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
        Diese Section hat in „{locale}" weder Titel, Text noch Bild —
        nichts zu zeigen.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded border bg-background">
      {/* Mini-Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-2 py-1 text-[10px] text-muted-foreground">
        <span>
          Vorschau · <code>{sectionKey}</code> · Sprache {locale.toUpperCase()}
        </span>
        <span className="flex items-center gap-2">
          <span title="image_position">
            Bild: {imagePosition === "left" ? "links" : "rechts"}
          </span>
          <span title="background_variant">
            Hintergrund: {backgroundVariant}
          </span>
        </span>
      </div>

      <section className={`py-4 lg:py-6 ${sectionBg}`} data-cms-section={sectionKey}>
        <div className="container mx-auto px-4">
          <div className="grid items-center gap-6 lg:grid-cols-2 lg:gap-10">
            <div className={textOrder}>
              {label && (
                <span className="mb-2 block text-xs tracking-wide text-muted-foreground">
                  {label}
                </span>
              )}
              {title && (
                <h3 className="mb-3 font-heading text-xl font-normal text-foreground md:text-2xl">
                  {title}
                </h3>
              )}
              {text && (
                <p className="mb-5 max-w-2xl leading-relaxed text-muted-foreground">
                  {text}
                </p>
              )}
              {hasCta ? (
                // Im Admin nur Optik nachstellen — kein echter Navigationssprung.
                <span
                  className="group/link inline-flex items-center gap-2 text-sm text-foreground"
                  title={`CTA-Ziel: ${ctaLink}`}
                >
                  {ctaLabel}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover/link:translate-x-1" />
                  <code className="ml-2 rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                    {ctaLink}
                  </code>
                </span>
              ) : (
                <span className="text-[11px] italic text-muted-foreground">
                  Kein CTA gesetzt (Teaser wird ohne Link gerendert).
                </span>
              )}
            </div>

            <div className={`group overflow-hidden ${imageOrder}`}>
              <div className="aspect-[16/9] w-full overflow-hidden rounded">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={alt || title || sectionKey}
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-muted text-muted-foreground">
                    <ImageOff className="h-6 w-6" />
                    <span className="text-[11px]">Kein Bild hinterlegt</span>
                  </div>
                )}
              </div>
              {alt && (
                <p className="mt-1 truncate text-[10px] text-muted-foreground">
                  Alt: {alt}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TeaserSectionPreview;
