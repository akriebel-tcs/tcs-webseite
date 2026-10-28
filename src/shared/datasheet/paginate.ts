/**
 * Pagination of the datasheet into explicit A4 pages (module 1.4.1).
 *
 * The HTML/CSS layout in `DatasheetSheet.tsx` stays the only content template.
 * Real fragmentation of text, tables and lists is done by Paged.js
 * (`pagedjs`, lazily imported so SSR and the initial bundle stay untouched) —
 * never by summing element heights.
 *
 * Concurrency contract (1.4.1):
 * - every run owns its engine, its generated stylesheet and its own offscreen
 *   staging container, so parallel frames and slow runs cannot disturb one
 *   another;
 * - `previewer.preview()` cannot be aborted, therefore the result of a stale
 *   run is discarded and its resources are disposed of instead of being
 *   published;
 * - the finished pages are moved into the target in one atomic swap, and only
 *   the run that still owns the target may do so.
 *
 * After pagination the brand footer is placed once, into the reserved bottom
 * band of the last real page. No repeating `tfoot`, no artificial trailing
 * block that could create a footer-only page.
 */

import {
  FOOTER_BOTTOM_MM,
  MARGIN_SIDE_MM,
  PAGE_WIDTH_MM,
  pageCss,
} from "./page";

export interface PaginateOptions {
  /** Live element holding the unpaginated sheet (stays hidden). */
  source: HTMLElement;
  /** Container that receives the generated pages. */
  target: HTMLElement;
  /** Aborts a stale run when the product or locale changes. */
  signal?: AbortSignal;
  /** Upper bound for fonts/images, default 10 s. */
  assetTimeoutMs?: number;
}

export interface PaginateResult {
  pages: number;
}

class AbortedError extends Error {
  constructor() {
    super("datasheet pagination aborted");
    this.name = "AbortError";
  }
}

/** Raised when images required by the sheet (product shot, logo) failed. */
export class DatasheetAssetError extends Error {
  readonly sources: string[];
  constructor(sources: string[]) {
    super(`datasheet assets unavailable: ${sources.join(", ")}`);
    this.name = "DatasheetAssetError";
    this.sources = sources;
  }
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new AbortedError();
}

export interface AssetWaitOptions {
  signal?: AbortSignal | undefined;
  timeoutMs?: number | undefined;
}

/**
 * Resolves once webfonts and every image inside `root` are settled.
 * Returns the sources of images that did not become usable — the caller must
 * not silently print without them.
 */
export async function waitForAssets(
  root: HTMLElement,
  { signal, timeoutMs = 10000 }: AssetWaitOptions = {},
): Promise<string[]> {
  const deadline = new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });

  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (fonts?.ready) {
    try {
      await Promise.race([fonts.ready, deadline]);
    } catch {
      /* fonts must not block printing */
    }
  }
  throwIfAborted(signal);

  const images = Array.from(root.querySelectorAll("img"));
  await Promise.race([
    Promise.all(
      images.map((image) =>
        image.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              const done = () => resolve();
              image.addEventListener("load", done, { once: true });
              image.addEventListener("error", done, { once: true });
            }),
      ),
    ),
    deadline,
  ]);
  throwIfAborted(signal);

  return images
    .filter((image) => Boolean(image.getAttribute("src")))
    .filter((image) => !(image.complete && image.naturalWidth > 0))
    .map((image) => image.currentSrc || image.src);
}

/**
 * Moves the brand footer into the reserved bottom band of the last page.
 * Returns false when the sheet carries no footer.
 */
export function placeFooter(target: HTMLElement, footer: HTMLElement | null): boolean {
  target
    .querySelectorAll(".ds-footer-slot")
    .forEach((node) => node.remove());
  if (!footer) return false;
  const pages = target.querySelectorAll(".pagedjs_page");
  const lastPage = pages[pages.length - 1] as HTMLElement | undefined;
  if (!lastPage) return false;
  const box = (lastPage.querySelector(".pagedjs_pagebox") ??
    lastPage) as HTMLElement;
  const slot = document.createElement("div");
  slot.className = "ds-footer-slot";
  slot.style.position = "absolute";
  slot.style.left = `${MARGIN_SIDE_MM}mm`;
  slot.style.right = `${MARGIN_SIDE_MM}mm`;
  slot.style.bottom = `${FOOTER_BOTTOM_MM}mm`;
  // Brand colours live in CSS variables on the sheet root.
  const rootStyle = footer.closest<HTMLElement>(".ds-root")?.getAttribute("style");
  if (rootStyle) slot.setAttribute("style", `${slot.getAttribute("style")};${rootStyle}`);
  const clone = footer.cloneNode(true) as HTMLElement;
  clone.removeAttribute("data-ds-footer");
  slot.appendChild(clone);
  box.style.position = "relative";
  box.appendChild(slot);
  return true;
}

type Disposable = { destroy?: () => void };

function dispose(resource: Disposable | undefined) {
  try {
    resource?.destroy?.();
  } catch {
    /* cleanup is best effort */
  }
}

/**
 * Owner of the currently published run per target: the generated stylesheet
 * must stay alive exactly as long as its pages are on screen.
 */
const publishedStyles = new WeakMap<HTMLElement, Disposable>();
/** Token of the run that currently owns a target. */
const runOwner = new WeakMap<HTMLElement, symbol>();

/** Drops the pages and the generated stylesheet of a target (unmount). */
export function disposePagination(target: HTMLElement): void {
  runOwner.delete(target);
  dispose(publishedStyles.get(target));
  publishedStyles.delete(target);
  target.replaceChildren();
}

/** Test seam: the stylesheet currently published for a target. */
export function publishedStylesheetOf(target: HTMLElement): Disposable | undefined {
  return publishedStyles.get(target);
}

function createStaging(): HTMLElement {
  const staging = document.createElement("div");
  staging.className = "ds-print-staging";
  staging.setAttribute("aria-hidden", "true");
  // Offscreen but laid out, so the engine measures real geometry.
  staging.style.position = "fixed";
  staging.style.left = "-20000px";
  staging.style.top = "0";
  staging.style.width = `${PAGE_WIDTH_MM}mm`;
  staging.style.pointerEvents = "none";
  return staging;
}

/**
 * Renders `source` into explicit A4 pages inside `target`.
 * Only the newest run for a target publishes its result.
 */
export async function paginateDatasheet({
  source,
  target,
  signal,
  assetTimeoutMs,
}: PaginateOptions): Promise<PaginateResult> {
  const token = Symbol("datasheet-pagination");
  runOwner.set(target, token);
  const isCurrent = () => runOwner.get(target) === token && !signal?.aborted;

  throwIfAborted(signal);
  const failedAssets = await waitForAssets(source, {
    signal,
    ...(assetTimeoutMs === undefined ? {} : { timeoutMs: assetTimeoutMs }),
  });
  if (failedAssets.length > 0) throw new DatasheetAssetError(failedAssets);
  throwIfAborted(signal);

  const { Previewer } = await import("pagedjs");
  if (!isCurrent()) throw new AbortedError();

  const content = source.firstElementChild?.cloneNode(true) as HTMLElement | null;
  if (!content) return { pages: 0 };
  // The footer is not part of the flow; it is placed after pagination.
  content.querySelectorAll("[data-ds-footer]").forEach((node) => node.remove());
  const fragment = document.createDocumentFragment();
  fragment.appendChild(content);

  const staging = createStaging();
  document.body.appendChild(staging);
  const previewer = new Previewer();
  let polisher: Disposable | undefined;
  let published = false;

  try {
    const flow = (await previewer.preview(
      fragment,
      [{ "datasheet-page": pageCss() }],
      staging,
    )) as { total?: number };
    polisher = (previewer as unknown as { polisher?: Disposable }).polisher;

    // `preview()` cannot be aborted: a stale result is discarded here.
    if (!isCurrent()) throw new AbortedError();

    placeFooter(staging, source.querySelector<HTMLElement>("[data-ds-footer]"));

    // Atomic swap — the target never shows a half-built document.
    const previousStyles = publishedStyles.get(target);
    target.replaceChildren(...Array.from(staging.childNodes));
    publishedStyles.set(target, polisher ?? {});
    published = true;
    if (previousStyles && previousStyles !== polisher) dispose(previousStyles);

    const pages = target.querySelectorAll(".pagedjs_page").length;
    return { pages: flow?.total ?? pages };
  } finally {
    staging.remove();
    // A discarded run cleans up only its own resources.
    if (!published) dispose(polisher);
  }
}
