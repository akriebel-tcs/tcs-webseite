/**
 * Portable colour helpers for the shared datasheet.
 *
 * No brand colour is hardcoded as a default: when the profile provides no
 * (valid) colour, a neutral grey is used instead of another company's brand.
 */

/** Neutral fallbacks — deliberately not a brand colour. */
export const NEUTRAL_ACCENT = "#333333";
export const NEUTRAL_FOOTER_BG = "#333333";

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Returns the colour when it is a valid hex value, otherwise null. */
export function validHexColor(value: string | null | undefined): string | null {
  const candidate = (value ?? "").trim();
  return HEX.test(candidate) ? candidate : null;
}

function channels(hex: string): [number, number, number] {
  const raw = hex.slice(1);
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((char) => char + char)
          .join("")
      : raw;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** Relative luminance (WCAG) of a valid hex colour, 0..1. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex).map((value) => {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la >= lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Picks black or white text for a background, whichever has the better
 * contrast ratio. Invalid colours fall back to white on the neutral grey.
 */
export function readableForeground(background: string | null | undefined): string {
  const hex = validHexColor(background) ?? NEUTRAL_ACCENT;
  return contrastRatio(hex, "#000000") >= contrastRatio(hex, "#ffffff")
    ? "#000000"
    : "#ffffff";
}

export interface BrandColorSource {
  accent_color?: string | null;
  secondary_accent_color?: string | null;
  accent_text_color?: string | null;
  footer_background?: string | null;
  footer_text_color?: string | null;
}

export interface ResolvedBrandColors {
  accent: string;
  secondaryAccent: string;
  accentForeground: string;
  footerBackground: string;
  footerForeground: string;
}

/**
 * Resolves the CSS colour values of the sheet from a brand profile.
 * Invalid or missing values fall back: secondary -> primary accent,
 * accent/footer -> neutral grey, foregrounds -> computed readable colour.
 */
export function resolveBrandColors(brand: BrandColorSource): ResolvedBrandColors {
  const accent = validHexColor(brand.accent_color) ?? NEUTRAL_ACCENT;
  const secondaryAccent = validHexColor(brand.secondary_accent_color) ?? accent;
  const footerBackground = validHexColor(brand.footer_background) ?? NEUTRAL_FOOTER_BG;
  return {
    accent,
    secondaryAccent,
    accentForeground:
      validHexColor(brand.accent_text_color) ?? readableForeground(accent),
    footerBackground,
    footerForeground:
      validHexColor(brand.footer_text_color) ?? readableForeground(footerBackground),
  };
}
