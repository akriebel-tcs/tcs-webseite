/**
 * Versioned print entry point of the shared datasheet module (1.4.1).
 *
 * Apps never call `window.print()` themselves: a print must wait for the
 * finished pagination (fonts and images included), must not start twice and
 * must leave the screen state untouched when the user cancels the dialog.
 *
 * Identity contract (1.4.1): the print target and its content generation are
 * captured *before* awaiting. If the product, locale or mounted frame changed
 * while waiting, the print is cancelled instead of printing stale pages under
 * a new file name.
 */

export type DatasheetPrintStatus = "idle" | "working" | "ready" | "error";

export interface PrintTarget {
  /** Resolves when the visible pages are fully paginated. */
  ready: () => Promise<void>;
  status: () => DatasheetPrintStatus;
  /** Increases whenever a new pagination run starts for this frame. */
  generation: () => number;
}

/** Stack of mounted frames; the most recently mounted one prints. */
let targets: PrintTarget[] = [];
let printing = false;

/** Registers the mounted print frame. Returns an unregister function. */
export function registerPrintTarget(next: PrintTarget): () => void {
  targets = [...targets.filter((entry) => entry !== next), next];
  return () => {
    targets = targets.filter((entry) => entry !== next);
  };
}

function currentTarget(): PrintTarget | null {
  return targets.length > 0 ? targets[targets.length - 1]! : null;
}

export class DatasheetPrintError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatasheetPrintError";
  }
}

/**
 * Prints the currently mounted datasheet.
 * `documentTitle` drives the suggested PDF file name and is restored after.
 */
export async function printDatasheet(documentTitle?: string): Promise<void> {
  if (printing) return;
  const target = currentTarget();
  if (!target) throw new DatasheetPrintError("no datasheet print target mounted");
  const generation = target.generation();
  printing = true;
  const previousTitle = document.title;
  let titleChanged = false;
  const restore = () => {
    if (titleChanged) document.title = previousTitle;
    titleChanged = false;
  };
  try {
    await target.ready();
    // The captured frame must still be the mounted one, and it must still show
    // the very content the caller asked to print.
    if (currentTarget() !== target || target.generation() !== generation) {
      throw new DatasheetPrintError("datasheet content changed before printing");
    }
    if (target.status() !== "ready") {
      throw new DatasheetPrintError("datasheet pagination is not ready");
    }
    if (documentTitle) {
      document.title = documentTitle;
      titleChanged = true;
    }
    window.addEventListener("afterprint", restore, { once: true });
    window.print();
  } finally {
    restore();
    window.removeEventListener("afterprint", restore);
    printing = false;
  }
}

/** Test seam: forget every registered frame. */
export function resetPrintTarget(): void {
  targets = [];
  printing = false;
}
