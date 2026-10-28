/**
 * Template contract of the portable datasheet module.
 *
 * The renderer implements exactly one layout. A brand profile that asks for
 * another template (or another version of it) must NOT be rendered with this
 * layout — the calling app has to show an error instead.
 */

import type { DatasheetBrandProfile } from "./types";

/** Layout implemented by `DatasheetSheet`. */
export const SUPPORTED_TEMPLATE_KEY = "standard-product-sheet";
export const SUPPORTED_TEMPLATE_VERSION = 1;

/** Version of this shared module (keep in sync with VERSION.md). */
export const DATASHEET_MODULE_VERSION = "1.4.1";

export interface TemplateCandidate {
  template_key?: string | null;
  template_version?: number | string | null;
}

/** True when the profile explicitly requests the implemented layout. */
export function isSupportedTemplate(
  profile: TemplateCandidate | DatasheetBrandProfile | null | undefined,
): boolean {
  if (!profile) return false;
  const key = typeof profile.template_key === "string" ? profile.template_key.trim() : "";
  if (key.toLowerCase() !== SUPPORTED_TEMPLATE_KEY) return false;
  const version =
    typeof profile.template_version === "number"
      ? profile.template_version
      : typeof profile.template_version === "string" &&
          profile.template_version.trim() !== ""
        ? Number(profile.template_version)
        : Number.NaN;
  return Number.isInteger(version) && version === SUPPORTED_TEMPLATE_VERSION;
}
