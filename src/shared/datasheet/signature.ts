/**
 * Stable content signature for the print frame (module 1.4.1).
 *
 * The frame re-paginates whenever this value changes, so it must cover
 * everything that is actually rendered: sheet content, brand values,
 * translated labels and the resolved component rows — not just identifiers.
 * The value is deterministic (stable key order) to avoid endless re-renders.
 */

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) out[key] = stable(source[key]);
    return out;
  }
  if (typeof value === "function") return undefined;
  return value;
}

/** FNV-1a — short, stable, dependency free. */
export function contentSignature(...parts: unknown[]): string {
  const json = JSON.stringify(stable(parts)) ?? "";
  let hash = 0x811c9dc5;
  for (let i = 0; i < json.length; i += 1) {
    hash ^= json.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${json.length.toString(36)}-${hash.toString(36)}`;
}
