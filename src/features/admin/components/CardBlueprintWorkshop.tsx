/**
 * CardBlueprintWorkshop — rein lokaler Vorlagen-/Blueprint-Bereich.
 *
 * Bildet fachlich den späteren Arbeitsbereich für das Standardmodell
 * „Scroller mit Bildkarten" nach. Komplett lokal: keine Supabase-Reads/
 * Writes, keine RPC, keine Migration, keine Auswirkung auf Public-Renderer
 * (CmsBodyRenderer, CardsSectionV1, ProductScrollerV1) und keine
 * Änderungen an cms_sections / cms_section_fields / cms_assets /
 * cms_admin_editable_fields.
 */
import { useMemo, useRef, useState, type ComponentType } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { resolveIcon } from "@/features/cms/components/iconResolver";
import { IconPickerDialog } from "@/features/admin/components/IconPickerDialog";

type LinkKind = "extern" | "intern" | "shortid";

interface BlueprintLink {
  label: string;
  href: string;
  kind: LinkKind;
  enabled: boolean;
}

interface BlueprintFeature {
  text: string;
  enabled: boolean;
}

interface BlueprintCard {
  // Assets / Bildslots
  image: string;
  showImage: boolean;
  thumbnail: string;
  showThumbnail: boolean;
  iconImage: string;
  showIconImage: boolean;
  icon: string;
  showIcon: boolean;
  // Inhalte
  eyebrow: string;
  showEyebrow: boolean;
  title: string;
  description: string;
  // Features (features.0..4)
  features: [BlueprintFeature, BlueprintFeature, BlueprintFeature, BlueprintFeature, BlueprintFeature];
  // Links (max. 3, flach: link_1..3_*)
  links: [BlueprintLink, BlueprintLink, BlueprintLink];
}

interface BlueprintBlock {
  eyebrow: string;
  title: string;
  description: string;
  cardCount: number; // 1..6
  autoArrows: boolean; // arrows ab 5 Karten
  cards: BlueprintCard[]; // immer 6, sichtbar = cardCount
}

const SAMPLE_IMAGES = [
  "https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80",
];

const DEFAULT_ICONS = [
  "shield-check",
  "key-round",
  "smartphone",
  "door-open",
  "bell-ring",
  "video",
];

const DEFAULT_TITLES = [
  "Standard-Bildkarte",
  "Mobile Türkommunikation",
  "Schlüsselverwaltung",
  "Videosprechen",
  "Zutritt smart",
  "Service & Wartung",
];

const DEFAULT_FEATURES = [
  "Bestehende Geräte nutzbar",
  "Kein Umbau nötig",
  "DSGVO-konform",
  "Schnelle Inbetriebnahme",
  "Skalierbar",
];

const buildCard = (i: number): BlueprintCard => ({
  image: SAMPLE_IMAGES[i % SAMPLE_IMAGES.length],
  showImage: true,
  thumbnail: "",
  showThumbnail: false,
  iconImage: "",
  showIconImage: false,
  icon: DEFAULT_ICONS[i % DEFAULT_ICONS.length],
  showIcon: true,
  eyebrow: "Bildkarte",
  showEyebrow: true,
  title: DEFAULT_TITLES[i % DEFAULT_TITLES.length],
  description:
    "Kurze Beschreibung der Karte. Inhalt rein lokal, nur als Designreferenz.",
  features: DEFAULT_FEATURES.map((t, fi) => ({
    text: t,
    enabled: fi < 2,
  })) as BlueprintCard["features"],
  links: [
    { label: "Mehr erfahren", href: "/gebaeudekommunikation/mobile-tuerkommunikation", kind: "intern", enabled: true },
    { label: "Zum Planer", href: "/planer", kind: "intern", enabled: false },
    { label: "Zum Konfigurator", href: "P-203", kind: "shortid", enabled: false },
  ],
});

const INITIAL_BLOCK: BlueprintBlock = {
  eyebrow: "Lösungen",
  title: "Scroller mit Bildkarten",
  description:
    "Lokale Vorschau der zukünftigen Standard-Komponente. Inhalte hier dienen nur als Blueprint.",
  cardCount: 4,
  autoArrows: true,
  cards: Array.from({ length: 6 }, (_, i) => buildCard(i)),
};

// ─── kleine UI-Bausteine ────────────────────────────────────────────────────

const Toggle = ({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) => (
  <label className="flex cursor-pointer items-center justify-between gap-2 rounded border border-border bg-background px-3 py-1.5 text-sm">
    <span className="text-foreground">{label}</span>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 cursor-pointer accent-primary"
    />
  </label>
);

const Field = ({
  label,
  value,
  onChange,
  placeholder,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}) => (
  <label className="block">
    <span className="mb-1 block text-[11px] uppercase tracking-wide text-muted-foreground">
      {label}
    </span>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={
        "w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring " +
        (mono ? "font-mono text-xs" : "")
      }
    />
  </label>
);

const TextArea = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <label className="block">
    <span className="mb-1 block text-[11px] uppercase tracking-wide text-muted-foreground">
      {label}
    </span>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    />
  </label>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground">
    {children}
  </h3>
);

// ─── Live-Preview ───────────────────────────────────────────────────────────

const CardView = ({
  card,
  selected,
}: {
  card: BlueprintCard;
  selected: boolean;
}) => {
  const Icon = resolveIcon(card.icon) as ComponentType<{ className?: string }>;
  const activeFeatures = card.features.filter((f) => f.enabled && f.text.trim() !== "");
  // Bildquelle: Wenn Thumbnail-Kontext aktiv und vorhanden, zeigt die Karte ihn –
  // sonst das Hauptbild. Lokal sind beide nebenher sichtbar konfigurierbar.
  const primarySrc = card.showThumbnail && card.thumbnail
    ? card.thumbnail
    : card.showImage
      ? card.image
      : "";
  return (
    <article
      className={
        "flex w-[16rem] shrink-0 snap-start flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition-all " +
        (selected
          ? "border-primary ring-2 ring-primary/40"
          : "border-border")
      }
    >
      {(card.showImage || (card.showThumbnail && card.thumbnail)) && (
        <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
          {primarySrc ? (
            <img
              src={primarySrc}
              alt=""
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.opacity = "0.3";
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageIcon className="h-6 w-6" />
            </div>
          )}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2">
          {card.showIconImage && card.iconImage && (
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded border border-border bg-background">
              <img
                src={card.iconImage}
                alt=""
                className="h-7 w-7 object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.opacity = "0.3";
                }}
              />
            </span>
          )}
          {card.showIcon && (
            <span className="flex h-9 w-9 items-center justify-center rounded border border-border bg-background text-primary">
              <Icon className="h-4 w-4" />
            </span>
          )}
        </div>
        {card.showEyebrow && card.eyebrow && (
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {card.eyebrow}
          </div>
        )}
        {card.title && (
          <h4 className="text-base font-semibold leading-snug text-foreground">
            {card.title}
          </h4>
        )}
        {card.description && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {card.description}
          </p>
        )}
        {activeFeatures.length > 0 && (
          <ul className="mt-1 flex flex-wrap gap-1">
            {activeFeatures.map((f, i) => (
              <li
                key={i}
                className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {f.text}
              </li>
            ))}
          </ul>
        )}
        {card.links.some((l) => l.enabled) && (
          <ul className="mt-auto flex flex-col gap-1 border-t border-border pt-2">
            {card.links
              .filter((l) => l.enabled)
              .map((l, i) => (
                <li key={i}>
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    title={`${l.kind}: ${l.href || "(leer)"}`}
                    className="group/link flex items-center justify-between gap-2 text-xs text-primary hover:underline"
                  >
                    <span>{l.label || "(ohne Label)"}</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/link:translate-x-0.5" />
                  </a>
                </li>
              ))}
          </ul>
        )}
      </div>
    </article>
  );
};

const ScrollerPreview = ({
  block,
  selectedIndex,
}: {
  block: BlueprintBlock;
  selectedIndex: number;
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const visibleCards = block.cards.slice(0, block.cardCount);
  const showArrows = block.autoArrows && block.cardCount >= 5;

  const scroll = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 280, behavior: "smooth" });
  };

  return (
    <section className="flex h-full min-h-0 w-full flex-col rounded-md border border-border bg-background/40 p-4">
      <header className="mb-3">
        {block.eyebrow && (
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {block.eyebrow}
          </div>
        )}
        {block.title && (
          <h2 className="text-lg font-semibold text-foreground">{block.title}</h2>
        )}
        {block.description && (
          <p className="mt-1 text-sm text-muted-foreground">{block.description}</p>
        )}
      </header>

      <div className="relative min-h-0 flex-1 overflow-y-auto">
        <div
          ref={scrollerRef}
          className="flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto pb-2"
        >
          {visibleCards.map((c, i) => (
            <CardView key={i} card={c} selected={i === selectedIndex} />
          ))}
        </div>
        {showArrows && (
          <>
            <button
              type="button"
              onClick={() => scroll(-1)}
              aria-label="Zurück"
              className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 rounded-full border border-border bg-background p-1.5 text-foreground shadow hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              aria-label="Weiter"
              className="absolute right-0 top-1/2 translate-x-1 -translate-y-1/2 rounded-full border border-border bg-background p-1.5 text-foreground shadow hover:bg-muted"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </section>
  );
};

// ─── Workshop ───────────────────────────────────────────────────────────────

const CardBlueprintWorkshop = () => {
  const [block, setBlock] = useState<BlueprintBlock>(INITIAL_BLOCK);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  const updateBlock = (patch: Partial<BlueprintBlock>) =>
    setBlock((b) => ({ ...b, ...patch }));

  const updateCard = (idx: number, patch: Partial<BlueprintCard>) =>
    setBlock((b) => ({
      ...b,
      cards: b.cards.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    }));

  const updateLink = (cardIdx: number, linkIdx: number, patch: Partial<BlueprintLink>) =>
    setBlock((b) => ({
      ...b,
      cards: b.cards.map((c, i) =>
        i === cardIdx
          ? {
              ...c,
              links: c.links.map((l, li) => (li === linkIdx ? { ...l, ...patch } : l)) as [
                BlueprintLink,
                BlueprintLink,
                BlueprintLink,
              ],
            }
          : c,
      ),
    }));

  const updateFeature = (
    cardIdx: number,
    featureIdx: number,
    patch: Partial<BlueprintFeature>,
  ) =>
    setBlock((b) => ({
      ...b,
      cards: b.cards.map((c, i) =>
        i === cardIdx
          ? {
              ...c,
              features: c.features.map((f, fi) =>
                fi === featureIdx ? { ...f, ...patch } : f,
              ) as BlueprintCard["features"],
            }
          : c,
      ),
    }));

  const safeSelectedIndex = useMemo(
    () => Math.min(selectedIndex, block.cardCount - 1),
    [selectedIndex, block.cardCount],
  );

  const selected = block.cards[safeSelectedIndex];
  const SelectedIcon = resolveIcon(selected.icon) as ComponentType<{ className?: string }>;

  const cardStatus = (c: BlueprintCard) => {
    const slots: string[] = [];
    if (c.showImage) slots.push("Bild");
    if (c.showThumbnail && c.thumbnail) slots.push("Thumb");
    if (c.showIconImage && c.iconImage) slots.push("BildIcon");
    if (c.showIcon) slots.push("Icon");
    return `${slots.join("·") || "–"} · ${c.features.filter((f) => f.enabled).length}/5 F · ${c.links.filter((l) => l.enabled).length}/3 L`;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="shrink-0 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <strong className="text-foreground">Vorlagen-Werkstatt (lokal)</strong> ·
        Blueprint für den späteren <em>Scroller mit Bildkarten</em>. Änderungen
        wirken nur in dieser Vorschau und werden weder gespeichert noch auf der
        Website sichtbar. Schalter wie „Bild anzeigen" sind reine Blueprint-
        Schalter, keine DB-Felder.
      </div>

      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[1fr_24rem]">
        {/* Links: Scroller-Preview */}
        <div className="flex min-h-0 flex-col overflow-hidden">
          <div className="mb-2 shrink-0 text-[11px] uppercase tracking-wider text-muted-foreground">
            Live-Vorschau
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <ScrollerPreview block={block} selectedIndex={safeSelectedIndex} />
          </div>
        </div>

        {/* Rechts: Arbeitsbereich */}
        <aside className="flex min-h-0 flex-col gap-5 overflow-auto rounded-md border border-border bg-card p-4">
          {/* A. Container / Scroller */}
          <section>
            <SectionTitle>A · Container / Scroller</SectionTitle>
            <div className="flex flex-col gap-2">
              <Field
                label="Block-Eyebrow (Kicker über dem Titel)"
                value={block.eyebrow}
                onChange={(v) => updateBlock({ eyebrow: v })}
              />
              <Field
                label="Block-Titel"
                value={block.title}
                onChange={(v) => updateBlock({ title: v })}
              />
              <TextArea
                label="Block-Beschreibung"
                value={block.description}
                onChange={(v) => updateBlock({ description: v })}
              />
              <label className="block">
                <span className="mb-1 block text-[11px] uppercase tracking-wide text-muted-foreground">
                  Anzahl Karten: {block.cardCount}
                </span>
                <input
                  type="range"
                  min={1}
                  max={6}
                  value={block.cardCount}
                  onChange={(e) =>
                    updateBlock({ cardCount: Number(e.target.value) })
                  }
                  className="w-full accent-primary"
                />
              </label>
              <Toggle
                label="Pfeile automatisch ab 5 Karten"
                checked={block.autoArrows}
                onChange={(v) => updateBlock({ autoArrows: v })}
              />
            </div>
          </section>

          {/* B. Kartenliste */}
          <section>
            <SectionTitle>B · Kartenliste</SectionTitle>
            <ul className="flex flex-col gap-1">
              {block.cards.slice(0, block.cardCount).map((c, i) => {
                const isSel = i === safeSelectedIndex;
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => setSelectedIndex(i)}
                      className={
                        "flex w-full items-center justify-between gap-2 rounded border px-2 py-1.5 text-left text-xs transition " +
                        (isSel
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-muted")
                      }
                    >
                      <span className="truncate">
                        <span className="mr-1 font-mono text-[10px] text-muted-foreground">
                          #{i + 1}
                        </span>
                        {c.title || "(ohne Titel)"}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {cardStatus(c)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* C. Ausgewählte Bildkarte – Inhalte */}
          <section>
            <SectionTitle>
              C · Ausgewählte Bildkarte (#{safeSelectedIndex + 1}) — Inhalte
            </SectionTitle>
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-1 gap-1.5">
                <Toggle
                  label="Eyebrow / Subtitle anzeigen"
                  checked={selected.showEyebrow}
                  onChange={(v) => updateCard(safeSelectedIndex, { showEyebrow: v })}
                />
              </div>
              <Field
                label="Eyebrow / Subtitle (kurzer Kicker über dem Titel)"
                value={selected.eyebrow}
                onChange={(v) => updateCard(safeSelectedIndex, { eyebrow: v })}
              />
              <Field
                label="Titel (Pflicht)"
                value={selected.title}
                onChange={(v) => updateCard(safeSelectedIndex, { title: v })}
              />
              <TextArea
                label="Beschreibung"
                value={selected.description}
                onChange={(v) => updateCard(safeSelectedIndex, { description: v })}
              />
            </div>
          </section>

          {/* D. Assets / Bildslots */}
          <section>
            <SectionTitle>D · Assets / Bildslots</SectionTitle>
            <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">
              Reale Slots aus <code>cms_assets</code> bzw.{" "}
              <code>cms_section_fields</code>: <code>image</code>,{" "}
              <code>thumbnail</code>, <code>icon_image</code> (TCS-Bildicon)
              und <code>icon</code> (Lucide). Die Preview zeigt sie lokal
              gleichzeitig — die echten Public-Renderer (CardsSectionV1,
              ProductScrollerV1, FeatureGridV1) lesen je nach Container nur
              eine Auswahl davon.
            </p>
            <div className="flex flex-col gap-3">
              {/* image */}
              <div className="rounded border border-border bg-background/50 p-2">
                <Toggle
                  label="Hauptbild anzeigen (image)"
                  checked={selected.showImage}
                  onChange={(v) => updateCard(safeSelectedIndex, { showImage: v })}
                />
                <div className="mt-2">
                  <Field
                    label="image — URL (lokal)"
                    value={selected.image}
                    onChange={(v) => updateCard(safeSelectedIndex, { image: v })}
                    placeholder="https://…"
                    mono
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {SAMPLE_IMAGES.map((url, i) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => updateCard(safeSelectedIndex, { image: url })}
                        className="rounded border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        Beispiel {i + 1}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                    Hinweis: real hat <code>image</code> drei Viewports
                    (desktop · tablet · mobile). Hier eine URL als Demo.
                  </p>
                </div>
              </div>

              {/* thumbnail */}
              <div className="rounded border border-border bg-background/50 p-2">
                <Toggle
                  label="Thumbnail verwenden (Hub-/Filter-Kontext)"
                  checked={selected.showThumbnail}
                  onChange={(v) => updateCard(safeSelectedIndex, { showThumbnail: v })}
                />
                <div className="mt-2">
                  <Field
                    label="thumbnail — URL (lokal)"
                    value={selected.thumbnail}
                    onChange={(v) => updateCard(safeSelectedIndex, { thumbnail: v })}
                    placeholder="https://…"
                    mono
                  />
                  <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                    Wird real nur von <code>card_grid_v1</code> /{" "}
                    <code>catalog_filter_grid_v1</code> gelesen. Lokal: wenn
                    aktiv und gefüllt, ersetzt es das Hauptbild in der
                    Vorschau.
                  </p>
                </div>
              </div>

              {/* icon_image */}
              <div className="rounded border border-border bg-background/50 p-2">
                <Toggle
                  label="Bildicon anzeigen (icon_image)"
                  checked={selected.showIconImage}
                  onChange={(v) =>
                    updateCard(safeSelectedIndex, { showIconImage: v })
                  }
                />
                <div className="mt-2">
                  <Field
                    label="icon_image — URL (lokal, TCS-Bildicon)"
                    value={selected.iconImage}
                    onChange={(v) => updateCard(safeSelectedIndex, { iconImage: v })}
                    placeholder="https://…"
                    mono
                  />
                  <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                    In echten Renderern (z. B. <code>cards_v1</code>,{" "}
                    <code>feature_grid_v1</code>) hat <code>icon_image</code>{" "}
                    Vorrang vor dem Lucide-<code>icon</code>.
                  </p>
                </div>
              </div>

              {/* icon (Lucide) */}
              <div className="rounded border border-border bg-background/50 p-2">
                <Toggle
                  label="Lucide-Icon anzeigen (icon)"
                  checked={selected.showIcon}
                  onChange={(v) => updateCard(safeSelectedIndex, { showIcon: v })}
                />
                <div className="mt-2 flex items-end gap-2">
                  <div className="flex-1">
                    <Field
                      label="icon — Lucide-Name (kebab-case)"
                      value={selected.icon}
                      onChange={(v) => updateCard(safeSelectedIndex, { icon: v })}
                      placeholder="shield-check"
                      mono
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIconPickerOpen(true)}
                    className="rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground hover:bg-muted"
                    title="Icon-Picker öffnen"
                  >
                    Wählen
                  </button>
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex h-7 w-7 items-center justify-center rounded border border-border bg-background text-primary">
                    <SelectedIcon className="h-4 w-4" />
                  </span>
                  <span>Vorschau · z. B. shield-check, key-round, smartphone</span>
                </div>
              </div>
            </div>
          </section>

          {/* E. Features */}
          <section>
            <SectionTitle>E · Features (features.0–4)</SectionTitle>
            <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">
              Real flach in <code>cms_section_fields</code> als{" "}
              <code>features.0</code> bis <code>features.n</code>. Lokal
              maximal 5, einzeln aktivierbar. Anzeige als dezente Tags.
            </p>
            <div className="flex flex-col gap-1.5">
              {selected.features.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded border border-border bg-background/50 px-2 py-1.5"
                >
                  <input
                    type="checkbox"
                    checked={f.enabled}
                    onChange={(e) =>
                      updateFeature(safeSelectedIndex, i, {
                        enabled: e.target.checked,
                      })
                    }
                    className="h-3.5 w-3.5 cursor-pointer accent-primary"
                    title={`Feature ${i + 1} aktivieren`}
                  />
                  <span className="w-20 shrink-0 font-mono text-[10px] text-muted-foreground">
                    features.{i}
                  </span>
                  <input
                    type="text"
                    value={f.text}
                    onChange={(e) =>
                      updateFeature(safeSelectedIndex, i, { text: e.target.value })
                    }
                    placeholder={`Feature ${i + 1}`}
                    className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* F. Links */}
          <section>
            <SectionTitle>F · Links (max. 3)</SectionTitle>
            <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">
              Zielmodell flach pro Linkzeile: <code>link_1_label</code>,{" "}
              <code>link_1_href</code>, <code>link_1_kind</code> usw.
              Art bestimmt, wie der Link später aufgelöst wird —{" "}
              <strong>noch nicht</strong> echt resolviert.
            </p>
            <div className="flex flex-col gap-3">
              {selected.links.map((link, i) => (
                <div
                  key={i}
                  className="rounded border border-border bg-background/50 p-2"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                      link_{i + 1}_*
                    </span>
                    <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={link.enabled}
                        onChange={(e) =>
                          updateLink(safeSelectedIndex, i, {
                            enabled: e.target.checked,
                          })
                        }
                        className="h-3.5 w-3.5 cursor-pointer accent-primary"
                      />
                      sichtbar
                    </label>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <label className="block">
                      <span className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
                        link_{i + 1}_label
                      </span>
                      <input
                        type="text"
                        value={link.label}
                        onChange={(e) =>
                          updateLink(safeSelectedIndex, i, { label: e.target.value })
                        }
                        placeholder="z. B. Mehr erfahren"
                        className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
                        link_{i + 1}_kind
                      </span>
                      <select
                        value={link.kind}
                        onChange={(e) =>
                          updateLink(safeSelectedIndex, i, {
                            kind: e.target.value as LinkKind,
                          })
                        }
                        className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="extern">extern — vollständige URL</option>
                        <option value="intern">intern — Pfad auf dieser Website</option>
                        <option value="shortid">kurz-id — Konzept, noch ohne Auflösung</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
                        link_{i + 1}_href
                      </span>
                      <input
                        type="text"
                        value={link.href}
                        onChange={(e) =>
                          updateLink(safeSelectedIndex, i, { href: e.target.value })
                        }
                        placeholder={
                          link.kind === "extern"
                            ? "https://www.beispiel.de/seite"
                            : link.kind === "intern"
                              ? "/gebaeudekommunikation/mobile-tuerkommunikation"
                              : "P-203 oder B-538"
                        }
                        className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </label>
                    {link.kind === "shortid" && (
                      <p className="text-[10px] leading-relaxed text-muted-foreground">
                        Kurz-ID (z. B. <code>P-203</code> für eine Produktseite,{" "}
                        <code>B-538</code> für einen Block) wird hier{" "}
                        <strong>noch nicht</strong> aufgelöst — nur lokales
                        Konzeptfeld.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* G. Schema-Referenz */}
          <section className="rounded border border-dashed border-border bg-muted/20 p-2 text-[11px] leading-relaxed text-muted-foreground">
            <div className="mb-1 font-semibold text-foreground">
              G · Schema-Referenz (gem. Audit, lokal nicht gespeichert)
            </div>
            <pre className="overflow-x-auto whitespace-pre font-mono text-[10px] leading-snug">
{`Container / Scroller
  section_type: cards_v1 | product_scroller_v1
                | feature_grid_v1 | card_grid_v1
  children:     card_v1[]

Bildkarte (card_v1) — cms_section_fields
  subtitle           (Eyebrow / Kicker)
  title              (Pflicht)
  description
  features.0
  features.1
  features.2
  features.3
  features.4
  icon               (Lucide kebab-case, z. B. shield-check)
  link_1_label · link_1_href · link_1_kind
  link_2_label · link_2_href · link_2_kind
  link_3_label · link_3_href · link_3_kind

Bildkarte — cms_assets
  image              (Hauptbild, Viewports desktop/tablet/mobile)
  thumbnail          (Hub-/Filter-Kontext)
  icon_image         (TCS-Bildicon, Vorrang vor Lucide-icon)

Übergangs-Aliase (während Migration weiterhin lesbar)
  cta_label   → später link_1_label
  cta_href    → später link_1_href
  href        → später link_1_href  (Kartenkontext)
  cta_link    bleibt Sonderfall in teaser_2col_v1

Hinweis
  Die echten Public-Renderer lesen je Container nur eine
  Teilmenge dieser Slots. show*-Schalter hier sind reine
  Blueprint-Schalter, keine DB-Felder.

Layout-Regel (Scroller mit Bildkarten)
  - Alle Karten in einem Scroller richten sich nach der
    höchsten sichtbaren Karte (gleiche Karten-Höhe).
  - Bildbereich bleibt im festen Verhältnis 4:3.
  - Linkzeilen sitzen am unteren Kartenende (mt-auto),
    damit sie bei unterschiedlich langen Texten sauber
    auf einer Linie stehen.
  - Pfeile (Prev/Next) erscheinen ab 5 sichtbaren Karten,
    bei 1–4 Karten ohne Pfeile.
  - Mobil darf horizontal gescrollt werden.`}
            </pre>
          </section>
        </aside>
      </div>

      <IconPickerDialog
        open={iconPickerOpen}
        onOpenChange={setIconPickerOpen}
        currentValue={selected.icon}
        onSelect={(name) => {
          updateCard(safeSelectedIndex, { icon: name });
          setIconPickerOpen(false);
        }}
      />
    </div>
  );
};

export default CardBlueprintWorkshop;
