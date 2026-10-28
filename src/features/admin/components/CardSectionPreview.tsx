/**
 * CardSectionPreview — isolierte Admin-Vorschau für eine einzelne
 * `card_v1`-Section (Standardkarte als Kind von `cards_v1` oder
 * `product_scroller_v1`).
 *
 * Lädt Felder (DE) aus `cms_section_fields` und Bilder aus `cms_assets`
 * (Slots `image` vollflächig oder `thumbnail` klein, Viewport `desktop`)
 * read-only und rendert eine Layout-/Stil-treue Kopie. Pro Karte ist
 * konventionsgemäß nur EIN Bildslot aktiv.
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
  /** Layout-Hinweis vom Eltern-Container (visuell unterschiedlich). */
  parentType?: "cards_v1" | "product_scroller_v1" | string;
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
  imageSlot: "image" | "thumbnail" | null;
  alt: string;
}

const FIELD_KEYS = [
  "label",
  "title",
  "description",
  "icon",
  "cta_label",
  "cta_href",
] as const;

async function loadCard(
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
  const rows: FieldRow[] = (fieldsRes.data ?? []) as FieldRow[];
  for (const k of FIELD_KEYS) {
    const exact = rows.find((r) => r.field_key === k && r.locale === locale && r.value);
    const any = rows.find((r) => r.field_key === k && r.value);
    fields[k] = (exact?.value ?? any?.value ?? "").trim();
  }

  const assets: AssetRow[] = (assetsRes.data ?? []) as AssetRow[];
  const pick = (slot: "image" | "thumbnail") => {
    const list = assets.filter(
      (a) => (a.field_key === slot || a.asset_role === slot) && a.public_url,
    );
    return list.find((a) => a.viewport === "desktop") ?? list[0] ?? null;
  };
  const imageAsset = pick("image");
  const thumbAsset = pick("thumbnail");
  const used = imageAsset ?? thumbAsset;
  const imageSlot: "image" | "thumbnail" | null = imageAsset ? "image" : thumbAsset ? "thumbnail" : null;
  const imageUrl = used?.public_url ?? null;
  const alt =
    (locale === "en"
      ? used?.alt_text_en ?? used?.alt_en
      : used?.alt_text_de ?? used?.alt_de) ?? "";

  return { fields, imageUrl, imageSlot, alt };
}

const CardSectionPreview: React.FC<Props> = ({
  pageKey,
  sectionKey,
  locale = "de",
  parentType,
}) => {
  const [data, setData] = useState<LoadedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    loadCard(pageKey, sectionKey, locale)
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
        Lade Karten-Vorschau …
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

  const { fields, imageUrl, imageSlot, alt } = data;
  const { label, title, description, icon, cta_label, cta_href } = fields;
  const hasCta = cta_label.length > 0 && cta_href.length > 0;
  const isScroller = parentType === "product_scroller_v1";

  const empty = !title && !description && !imageUrl;
  if (empty) {
    return (
      <div className="rounded border bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
        Diese Karte hat in „{locale}" weder Titel, Beschreibung noch Bild —
        nichts zu zeigen.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded border bg-background">
      <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-2 py-1 text-[10px] text-muted-foreground">
        <span>
          Vorschau · <code>{sectionKey}</code> · Sprache {locale.toUpperCase()}
        </span>
        <span className="flex items-center gap-2">
          <span>Bildslot: {imageSlot ?? "—"}</span>
          <span>Eltern: {parentType ?? "—"}</span>
        </span>
      </div>

      <div className="mx-auto max-w-sm p-4">
        <article
          className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md"
          data-cms-section={sectionKey}
        >
          {imageUrl && (
            <div
              className={
                isScroller
                  ? "aspect-square w-full overflow-hidden bg-muted"
                  : "aspect-[16/9] w-full overflow-hidden bg-muted"
              }
            >
              <img
                src={imageUrl}
                alt={alt || title || sectionKey}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            </div>
          )}
          {!imageUrl && (
            <div className="flex aspect-[16/9] w-full items-center justify-center bg-muted text-muted-foreground">
              <ImageOff className="h-6 w-6" />
            </div>
          )}

          <div className="flex flex-1 flex-col gap-2 p-4">
            {label && (
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {label}
              </span>
            )}
            {icon && (
              <span className="text-[10px] text-muted-foreground">
                Icon: <code className="rounded bg-muted px-1">{icon}</code>
              </span>
            )}
            {title && (
              <h4 className="font-heading text-base font-medium text-foreground">
                {title}
              </h4>
            )}
            {description && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            )}
            {hasCta ? (
              <span
                className="mt-auto inline-flex items-center gap-2 pt-2 text-sm text-foreground"
                title={`CTA-Ziel: ${cta_href}`}
              >
                {cta_label}
                <ArrowRight className="h-4 w-4" />
                <code className="ml-1 rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                  {cta_href}
                </code>
              </span>
            ) : (
              <span className="mt-auto pt-2 text-[11px] italic text-muted-foreground">
                Kein CTA (Karte ohne Link).
              </span>
            )}
          </div>
        </article>

        {alt && (
          <p className="mt-1 truncate text-[10px] text-muted-foreground">
            Alt: {alt}
          </p>
        )}
      </div>
    </div>
  );
};

export default CardSectionPreview;
