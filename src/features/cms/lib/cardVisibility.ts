/**
 * cardVisibility — Eine Wahrheit für Standardkarten (`card_v1`).
 *
 * Liefert pro Karte die effektive Sichtbarkeit von Bild, Icon, Features
 * und Links sowie die wirksame Container-Art. Wird vom Admin-Workspace
 * UND von den Public-Renderern (`CardsSectionV1`, `FeatureGridV1`,
 * `CmsProductSolutionShell`) gemeinsam benutzt — damit Admin und
 * Website nie auseinanderlaufen.
 *
 * Etappe: `cms-light-hygieneabschluss-standardkarte-eine-wahrheit-1`.
 *
 * UI-only. Keine DB-/Migration-/RPC-/Whitelist-Änderung.
 *
 * Konventionen für `*_enabled`-Felder:
 *   - `"1"`  → an
 *   - `"0"`  → aus
 *   - `""` / null → an, **wenn** der dazugehörige Inhalt vorhanden ist
 *     (Back-Compat: viele Felder haben keinen `enabled`-Eintrag).
 *
 * Konvention für `icon` (Lucide-Name als Textfeld) + `icon_enabled`:
 *   - `icon` leer → Icon aus
 *   - `icon` gesetzt + `icon_enabled` "1" oder leer → Icon an
 *   - `icon` gesetzt + `icon_enabled` "0" → Icon aus (Name bleibt erhalten)
 *   - card_v1 ist Masterkarte: Icon kann in jedem Container neben einem
 *     Bild/Bildicon koexistieren. Layout ordnet an, reduziert keine Module.
 *
 * Konvention für `image_enabled`:
 *   - "1"/"" + Asset vorhanden → Bild an
 *   - "0" → Bild aus (auch wenn Asset vorhanden)
 *   - kein Asset → Bild aus, egal welcher Schalter-Wert
 */

export type EffectiveContainerKind =
  | "cards_v1.grid" // Kartenraster (Default für `cards_v1`)
  | "cards_v1.scroller" // Kartenscroller (`cards_v1` + section_key=products)
  | "product_scroller_v1"
  | "product_showcase_list_v1" // gestapelte 2-Spalten-Produktliste
  | "card_grid_v1"
  | "catalog_filter_grid_v1"
  | "feature_grid_v1"
  | "download_list_v1"
  | "unknown";

export interface CardVisibilityInput {
  /** Reader für ein Karten-Feld in einer Locale. */
  valueFor: (fieldKey: string, locale: AppLocale) => string | null;
  hasImage: boolean;
  hasThumbnail: boolean;
  hasIconImage: boolean;
  /** `section_type` des Eltern-Containers. */
  parentSectionType: string | null | undefined;
  /** `section_key` des Eltern-Containers (für Sonderfall `products`). */
  parentSectionKey: string | null | undefined;
}

export interface CardVisibility {
  imageVisible: boolean;
  iconVisible: boolean;
  iconName: string;
  /**
   * Sichtbarkeit pro Bullet-Index 0..4 (auch bei fehlenden Texten false).
   * Canonical-first: liest zuerst `bullets.N` / `bullets_N_enabled`, danach
   * Legacy `features.N` / `features_N_enabled` als Fallback.
   */
  featuresVisible: boolean[];
  /** Alias zu `featuresVisible` — semantisch korrekter Name für Bulletpoints. */
  bulletsVisible: boolean[];
  /** Sichtbarkeit pro Chip-Index 0..4 (graue Pillen, separates Modul). */
  chipsVisible: boolean[];
  /** Sichtbarkeit pro Link-Index 1..3. */
  linksVisible: boolean[];
  effectiveContainerKind: EffectiveContainerKind;
  /** Erwarteter Bild-/Icon-Slot des Containers. */
  expectedSlot: "image" | "thumbnail" | "icon_image" | "none";
  /** Ist der erwartete Slot Pflicht (für UI-Warnung)? */
  expectedSlotRequired: boolean;
  /** Eyebrow nach `eyebrow_enabled`. */
  eyebrowVisible: boolean;
}

function readBoth(
  v: CardVisibilityInput["valueFor"],
  key: string,
): string {
  const a = (v(key, "de") ?? "").trim();
  if (a.length > 0) return a;
  return (v(key, "en") ?? "").trim();
}

function readBool(
  v: CardVisibilityInput["valueFor"],
  key: string,
  defaultIfBlank: boolean,
): boolean {
  const raw = readBoth(v, key);
  if (raw === "") return defaultIfBlank;
  return raw === "1";
}

export function effectiveContainerKindOf(
  parentSectionType: string | null | undefined,
  parentSectionKey: string | null | undefined,
): EffectiveContainerKind {
  const t = (parentSectionType ?? "").trim();
  const k = (parentSectionKey ?? "").trim();
  switch (t) {
    case "cards_v1":
      // Sonderfall: `cards_v1` mit `section_key=products` wird redaktionell
      // als Kartenscroller geführt (Render-Variante auf einigen Seiten).
      return k === "products" ? "cards_v1.scroller" : "cards_v1.grid";
    case "product_scroller_v1":
      return "product_scroller_v1";
    case "product_showcase_list_v1":
      return "product_showcase_list_v1";
    case "card_grid_v1":
      return "card_grid_v1";
    case "catalog_filter_grid_v1":
      return "catalog_filter_grid_v1";
    case "feature_grid_v1":
      return "feature_grid_v1";
    case "download_list_v1":
      return "download_list_v1";
    default:
      return "unknown";
  }
}

export function expectedSlotOf(
  kind: EffectiveContainerKind,
): { slot: "image" | "thumbnail" | "icon_image" | "none"; required: boolean } {
  switch (kind) {
    case "cards_v1.grid":
      return { slot: "image", required: false };
    case "cards_v1.scroller":
    case "product_scroller_v1":
      return { slot: "image", required: true };
    case "product_showcase_list_v1":
      // Gestapelte 2-Spalten-Produktliste: Bild gewünscht, aber nicht
      // Pflicht — Icon/Icon-Image sind als Fallback erlaubt (siehe
      // ProductShowcaseListV1-Renderer).
      return { slot: "image", required: false };
    case "card_grid_v1":
    case "catalog_filter_grid_v1":
      return { slot: "thumbnail", required: true };
    case "feature_grid_v1":
      return { slot: "icon_image", required: true };
    case "download_list_v1":
    case "unknown":
      return { slot: "none", required: false };
  }
}

/** Hauptresolver. Reine Funktion ohne Seiteneffekte. */
export function resolveCardVisibility(input: CardVisibilityInput): CardVisibility {
  const { valueFor: v, hasImage } = input;
  const kind = effectiveContainerKindOf(input.parentSectionType, input.parentSectionKey);
  const exp = expectedSlotOf(kind);

  // Bild
  const imageEnabledOk = readBool(v, "image_enabled", true);
  const imageVisible = hasImage && imageEnabledOk;

  // Icon (Lucide). Sichtbarkeit = Name vorhanden UND `icon_enabled` nicht "0".
  // card_v1 ist Masterkarte: Icon kann in jedem Karten-Container neben Bild
  // koexistieren. Es gibt keine container-spezifische Reduktion mehr — Layout
  // ordnet nur an, schaltet keine Karten-Module ab.
  const iconName = readBoth(v, "icon");
  const iconEnabledOk = readBool(v, "icon_enabled", true);
  const iconVisible = iconName.length > 0 && iconEnabledOk;

  // Bulletpoints 0..4 — canonical `bullets.N` mit Fallback auf Legacy `features.N`.
  // Sichtbar, wenn (Text vorhanden) UND (enabled !== "0"). Toggle ebenfalls
  // canonical-first: `bullets_N_enabled` schlägt `features_N_enabled` aus.
  const bulletsVisible: boolean[] = [];
  for (let i = 0; i < 5; i++) {
    const textBullet = readBoth(v, `bullets.${i}`);
    const textLegacy = readBoth(v, `features.${i}`);
    const text = textBullet.length > 0 ? textBullet : textLegacy;
    const rawBulletEnabled = readBoth(v, `bullets_${i}_enabled`);
    const enabled = rawBulletEnabled === ""
      ? readBool(v, `features_${i}_enabled`, true)
      : rawBulletEnabled === "1";
    bulletsVisible.push(text.length > 0 && enabled);
  }
  // Back-Compat: gleiche Wahrheit unter altem Namen.
  const featuresVisible = bulletsVisible;

  // Chips 0..4 — separates Modul (graue Pillen). Sichtbar, wenn Text vorhanden
  // UND `chips_N_enabled` nicht explizit "0". Default: an bei vorhandenem Text.
  const chipsVisible: boolean[] = [];
  for (let i = 0; i < 5; i++) {
    const text = readBoth(v, `chips.${i}`);
    const enabled = readBool(v, `chips_${i}_enabled`, true);
    chipsVisible.push(text.length > 0 && enabled);
  }

  // Links 1..3 — sichtbar, wenn href vorhanden UND enabled.
  // Prototyp-Default (Sprint „nur Mehr erfahren"): nur link_1 ist standardmäßig
  // an. link_2 (z. B. Konfigurator) und link_3 (z. B. Planer) sind global
  // ausgeblendet und müssen pro Karte explizit über `link_N_enabled=1`
  // freigeschaltet werden. Karten, die heute schon explizit "1" stehen
  // haben, bleiben sichtbar.
  const linksVisible: boolean[] = [];
  for (let n = 1; n <= 3; n++) {
    const href = readBoth(v, `link_${n}_href`);
    const defaultEnabled = n === 1;
    const enabled = readBool(v, `link_${n}_enabled`, defaultEnabled);
    linksVisible.push(href.length > 0 && enabled);
  }

  // Eyebrow
  const eyebrowText = readBoth(v, "eyebrow");
  const eyebrowEnabledOk = readBool(v, "eyebrow_enabled", true);
  const eyebrowVisible = eyebrowText.length > 0 && eyebrowEnabledOk;

  return {
    imageVisible,
    iconVisible,
    iconName,
    featuresVisible,
    bulletsVisible,
    chipsVisible,
    linksVisible,
    effectiveContainerKind: kind,
    expectedSlot: exp.slot,
    expectedSlotRequired: exp.required,
    eyebrowVisible,
  };
}

// ────────────────────────────────────────────────────────────────────
// Runtime-Parität (Sprint „card_v1 Runtime-Parität").
// Liefert pro Karten-Feld einen sprechenden Status:
//   - empty       : nichts gepflegt
//   - unsupported : Container rendert das Feld laut Matrix nicht
//   - disabled    : Wert vorhanden, aber Toggle = "0"
//   - incomplete  : Teilwerte vorhanden (z. B. Link-Label ohne href)
//   - active      : öffentlich wirksam
// ────────────────────────────────────────────────────────────────────

export type FieldStatus = "empty" | "unsupported" | "disabled" | "incomplete" | "active";

export interface FieldRuntime {
  status: FieldStatus;
  /** Kurze, redaktionell verständliche Begründung (null bei active/empty). */
  reason: string | null;
}

export interface LinkRuntime extends FieldRuntime {
  hasLabel: boolean;
  hasHref: boolean;
}

export interface CardRuntime extends CardVisibility {
  eyebrow: FieldRuntime;
  title: FieldRuntime;
  description: FieldRuntime;
  image: FieldRuntime;
  thumbnail: FieldRuntime;
  icon: FieldRuntime;
  iconImage: FieldRuntime;
  bullets: FieldRuntime[];
  chips: FieldRuntime[];
  links: LinkRuntime[];
  /** Zählungen für Admin-Badges. */
  counts: {
    bulletsActive: number;
    chipsActive: number;
    linksActive: number;
    linksIncomplete: number;
    linksFilled: number;
  };
}

import type { CardFieldGroup } from "./cardRuntimeMatrix";
import { containerSupportFor } from "./cardRuntimeMatrix";
import type { AppLocale } from "@/i18n/locale";

export function resolveCardRuntime(
  input: CardVisibilityInput,
): CardRuntime {
  const support = containerSupportFor(input.parentSectionType, input.parentSectionKey);
  const base = resolveCardVisibility(input);
  const { valueFor: v } = input;

  function textStatus(key: string, group: CardFieldGroup, visibleByBase: boolean): FieldRuntime {
    const text = readBoth(v, key);
    if (!support.supports[group]) {
      return text.length > 0
        ? { status: "unsupported", reason: "In diesem Layout nicht sichtbar." }
        : { status: "empty", reason: null };
    }
    if (text.length === 0) return { status: "empty", reason: null };
    if (!visibleByBase) return { status: "disabled", reason: "Ausgeschaltet." };
    return { status: "active", reason: null };
  }

  function assetStatus(
    group: "image" | "thumbnail" | "icon_image",
    has: boolean,
    baseVisible: boolean,
  ): FieldRuntime {
    if (!support.supports[group]) {
      return has
        ? { status: "unsupported", reason: "In diesem Layout nicht sichtbar." }
        : { status: "empty", reason: null };
    }
    if (!has) return { status: "empty", reason: null };
    if (!baseVisible) return { status: "disabled", reason: "Ausgeschaltet." };
    return { status: "active", reason: null };
  }

  const eyebrow = textStatus("eyebrow", "eyebrow", base.eyebrowVisible);
  const title = textStatus("title", "title", readBoth(v, "title").length > 0);
  const description = textStatus("description", "description", readBoth(v, "description").length > 0);

  const image = assetStatus("image", input.hasImage, base.imageVisible);
  const thumbnail = assetStatus("thumbnail", input.hasThumbnail, input.hasThumbnail);
  const iconImage = assetStatus("icon_image", input.hasIconImage, input.hasIconImage);

  // Icon (Lucide). Container muss Icon unterstützen; Bild/Bildicon nehmen ggf. Vorrang.
  const iconName = base.iconName;
  let icon: FieldRuntime;
  if (!support.supports.icon) {
    icon = iconName.length > 0
      ? { status: "unsupported", reason: "In diesem Layout nicht sichtbar." }
      : { status: "empty", reason: null };
  } else if (iconName.length === 0) {
    icon = { status: "empty", reason: null };
  } else if (!base.iconVisible) {
    icon = { status: "disabled", reason: "Bild/Bildicon hat Vorrang." };
  } else {
    icon = { status: "active", reason: null };
  }

  const bullets: FieldRuntime[] = [];
  for (let i = 0; i < 5; i++) {
    const textBullet = readBoth(v, `bullets.${i}`);
    const textLegacy = readBoth(v, `features.${i}`);
    const text = textBullet.length > 0 ? textBullet : textLegacy;
    if (!support.supports.bullets) {
      bullets.push(
        text.length > 0
          ? { status: "unsupported", reason: "In diesem Layout nicht sichtbar." }
          : { status: "empty", reason: null },
      );
      continue;
    }
    if (text.length === 0) {
      bullets.push({ status: "empty", reason: null });
      continue;
    }
    if (!base.bulletsVisible[i]) {
      bullets.push({ status: "disabled", reason: "Ausgeschaltet." });
      continue;
    }
    bullets.push({ status: "active", reason: null });
  }

  const chips: FieldRuntime[] = [];
  for (let i = 0; i < 5; i++) {
    const text = readBoth(v, `chips.${i}`);
    if (!support.supports.chips) {
      chips.push(
        text.length > 0
          ? { status: "unsupported", reason: "In diesem Layout nicht sichtbar." }
          : { status: "empty", reason: null },
      );
      continue;
    }
    if (text.length === 0) {
      chips.push({ status: "empty", reason: null });
      continue;
    }
    if (!base.chipsVisible[i]) {
      chips.push({ status: "disabled", reason: "Ausgeschaltet." });
      continue;
    }
    chips.push({ status: "active", reason: null });
  }

  const links: LinkRuntime[] = [];
  for (let n = 1; n <= 3; n++) {
    const label = readBoth(v, `link_${n}_label`);
    const href = readBoth(v, `link_${n}_href`);
    const rawEnabled = readBoth(v, `link_${n}_enabled`);
    // Gleiche Default-Wahrheit wie resolveCardVisibility (Sprint
    // „Standardkarten-Vertrag"): nur link_1 ist standardmäßig sichtbar,
    // link_2/3 müssen explizit auf "1" gesetzt werden.
    const defaultEnabled = n === 1;
    const enabled = rawEnabled === "" ? defaultEnabled : rawEnabled === "1";
    const hasLabel = label.length > 0;
    const hasHref = href.length > 0;

    if (!support.supports.links) {
      links.push({
        status: hasLabel || hasHref ? "unsupported" : "empty",
        reason: hasLabel || hasHref ? "In diesem Layout nicht sichtbar." : null,
        hasLabel,
        hasHref,
      });
      continue;
    }
    if (!hasLabel && !hasHref) {
      links.push({ status: "empty", reason: null, hasLabel, hasHref });
      continue;
    }
    if (!enabled) {
      links.push({ status: "disabled", reason: "Ausgeschaltet.", hasLabel, hasHref });
      continue;
    }
    if (hasLabel && !hasHref) {
      links.push({
        status: "incomplete",
        reason: "Beschriftung vorhanden, Ziel fehlt.",
        hasLabel,
        hasHref,
      });
      continue;
    }
    if (!hasLabel && hasHref) {
      links.push({
        status: "incomplete",
        reason: "Ziel vorhanden, Beschriftung fehlt.",
        hasLabel,
        hasHref,
      });
      continue;
    }
    links.push({ status: "active", reason: null, hasLabel, hasHref });
  }

  const bulletsActive = bullets.filter((b) => b.status === "active").length;
  const chipsActive = chips.filter((c) => c.status === "active").length;
  const linksActive = links.filter((l) => l.status === "active").length;
  const linksIncomplete = links.filter((l) => l.status === "incomplete").length;
  const linksFilled = links.filter((l) => l.hasLabel || l.hasHref).length;

  return {
    ...base,
    eyebrow,
    title,
    description,
    image,
    thumbnail,
    icon,
    iconImage,
    bullets,
    chips,
    links,
    counts: { bulletsActive, chipsActive, linksActive, linksIncomplete, linksFilled },
  };
}

// ────────────────────────────────────────────────────────────────────
// Page-Helper (Sprint „card_v1 Abschluss"):
// Kleiner Convenience-Wrapper, der lokalen Page-Renderern erlaubt, ein
// Icon korrekt unter Berücksichtigung von `icon_enabled` ein-/auszublenden,
// ohne den vollen Resolver selbst zu verdrahten. Liefert `{ visible, name }`.
// Beispiel:
//   const ic = isCardIconVisible(cms, sectionKey, loc);
//   const Icon = ic.visible ? resolveIcon(ic.name, fallbackIcon) : null;
// ────────────────────────────────────────────────────────────────────

export interface CmsTextReader {
  /** Wie `useCmsI18n().cms.text` — liest Feldwert oder gibt Default zurück. */
  text: (sectionKey: string, fieldKey: string, locale: AppLocale, fallback?: string) => string;
}

export interface CardIconVisibility {
  visible: boolean;
  name: string;
}

export function isCardIconVisible(
  cms: CmsTextReader,
  sectionKey: string,
  locale: AppLocale,
  iconFieldKey: string = "icon",
): CardIconVisibility {
  const name = (cms.text(sectionKey, iconFieldKey, locale, "") || "").trim();
  // `icon_enabled`-Konvention: "1"/leer = an, "0" = aus.
  // Auch für nicht-kanonische Felder wie `<base>.icon` ableitbar
  // (trailing "icon" → "icon_enabled").
  const enabledKey = iconFieldKey === "icon"
    ? "icon_enabled"
    : iconFieldKey.replace(/icon$/, "icon_enabled");
  const enabledRaw = (
    cms.text(sectionKey, enabledKey, locale, "")
    || cms.text(sectionKey, enabledKey, locale === "de" ? "en" : "de", "")
    || ""
  ).trim();
  const enabled = enabledRaw === "" ? true : enabledRaw === "1";
  return { visible: name.length > 0 && enabled, name };
}

/**
 * Toggle-bewusster Wrapper um `resolveIcon` für lokale Page-Renderer.
 *
 * - Wenn in der DB ein `icon`-Name gepflegt ist: Sichtbarkeit folgt
 *   `icon_enabled` (0 → null, sonst Lucide-Komponente).
 * - Wenn kein DB-Icon gepflegt ist: Code-Fallback bleibt sichtbar
 *   (Back-Compat — Pages mit hardcodierten Fallback-Icons brechen nicht).
 *
 * Aufrufer rendert `{Icon && <Icon …/>}`.
 */
export function resolveCardIcon<TIcon>(
  cms: CmsTextReader,
  sectionKey: string,
  locale: AppLocale,
  resolveIconFn: (name: string | undefined | null, fallback: TIcon) => TIcon,
  fallback: TIcon,
  iconFieldKey: string = "icon",
): TIcon | null {
  const ic = isCardIconVisible(cms, sectionKey, locale, iconFieldKey);
  if (ic.name) {
    return ic.visible ? resolveIconFn(ic.name, fallback) : null;
  }
  return resolveIconFn(null, fallback);
}
