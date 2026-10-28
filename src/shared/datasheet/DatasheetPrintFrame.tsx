/**
 * Hosts the paginated datasheet: a hidden source flow plus the explicit A4
 * pages produced by the pagination engine. Screen preview and print use the
 * very same pages — the screen only scales them down, it never reflows.
 *
 * 1.4.1: status and content generation are tracked synchronously, so a print
 * request can never observe a stale "ready" between the end of a run and the
 * next React render.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DatasheetAssetError,
  disposePagination,
  paginateDatasheet,
} from "./paginate";
import { registerPrintTarget, type DatasheetPrintStatus } from "./printDocument";
import { PAGE_WIDTH_MM } from "./page";

export interface DatasheetPrintFrameProps {
  /**
   * Stable signature of everything that is rendered (content, brand values,
   * translated labels, resolved components). A change re-paginates.
   */
  contentKey: string;
  /** Localized message shown while the pages are being built. */
  busyLabel?: string;
  /** Localized message shown when pagination failed. */
  errorLabel?: string;
  /** Localized label of the retry button. */
  retryLabel?: string;
  children: ReactNode;
}

export function DatasheetPrintFrame({
  contentKey,
  busyLabel = "…",
  errorLabel = "Print preparation failed.",
  retryLabel = "Retry",
  children,
}: DatasheetPrintFrameProps) {
  const sourceRef = useRef<HTMLDivElement | null>(null);
  const pagesRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const scalerRef = useRef<HTMLDivElement | null>(null);

  const [status, setStatus] = useState<DatasheetPrintStatus>("working");
  const [attempt, setAttempt] = useState(0);
  const readyRef = useRef<{ promise: Promise<void>; resolve: () => void } | null>(
    null,
  );
  const statusRef = useRef<DatasheetPrintStatus>("working");
  const generationRef = useRef(0);

  /** Keeps the synchronous status in lockstep with the rendered one. */
  const commitStatus = useCallback((next: DatasheetPrintStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  if (!readyRef.current) {
    let resolve = () => {};
    const promise = new Promise<void>((r) => {
      resolve = r;
    });
    readyRef.current = { promise, resolve };
  }

  // Pagination per content key; a stale run is aborted, never rendered.
  useEffect(() => {
    const source = sourceRef.current;
    const target = pagesRef.current;
    if (!source || !target) return;
    const controller = new AbortController();
    let resolve = () => {};
    const promise = new Promise<void>((r) => {
      resolve = r;
    });
    // Synchronous bookkeeping: a print started right now must see "working"
    // and the new generation, not the finished state of the previous run.
    readyRef.current = { promise, resolve };
    generationRef.current += 1;
    commitStatus("working");

    paginateDatasheet({ source, target, signal: controller.signal })
      .then(() => {
        if (controller.signal.aborted) return;
        commitStatus("ready");
        resolve();
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof DatasheetAssetError) {
          console.error("datasheet assets unavailable", error.sources);
        } else {
          console.error("datasheet pagination failed", error);
        }
        commitStatus("error");
        resolve();
      });

    return () => {
      controller.abort();
      resolve();
    };
  }, [contentKey, attempt, commitStatus]);

  // Release the generated stylesheet and pages of this frame on unmount.
  useEffect(() => {
    const target = pagesRef.current;
    return () => {
      if (target) disposePagination(target);
    };
  }, []);

  // Register the print entry point for the app-level print handler.
  useEffect(
    () =>
      registerPrintTarget({
        ready: () => readyRef.current?.promise ?? Promise.resolve(),
        status: () => statusRef.current,
        generation: () => generationRef.current,
      }),
    [],
  );

  // Narrow containers only scale the sheets down; no new content breaks.
  useEffect(() => {
    const scaler = scalerRef.current;
    const pages = pagesRef.current;
    if (!scaler || !pages) return;
    const apply = () => {
      // While paginating, the engine measures the live DOM: any transform on
      // an ancestor would distort those measurements, so the scale stays 1.
      if (statusRef.current !== "ready") {
        pages.style.setProperty("--ds-page-scale", "1");
        const wrap = wrapRef.current;
        if (wrap) wrap.style.height = "";
        return;
      }
      const available = scaler.clientWidth;
      const pageWidth = (PAGE_WIDTH_MM / 25.4) * 96;
      const scale = available > 0 ? Math.min(1, available / pageWidth) : 1;
      pages.style.setProperty("--ds-page-scale", String(scale));
      const wrap = wrapRef.current;
      if (wrap) wrap.style.height = `${pages.scrollHeight * scale}px`;
    };

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(scaler);
    return () => observer.disconnect();
  }, [status, contentKey]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return (
    <div className="ds-print-frame" ref={scalerRef}>
      <div className="ds-print-source" aria-hidden="true" ref={sourceRef}>
        {children}
      </div>
      {status === "working" && <p className="ds-print-status">{busyLabel}</p>}
      {status === "error" && (
        <div className="ds-print-error">
          <p>{errorLabel}</p>
          <button type="button" onClick={retry} className="ds-print-retry">
            {retryLabel}
          </button>
        </div>
      )}
      <div className="ds-print-pages-wrap" ref={wrapRef}>
        <div id="print-area" className="ds-print-pages" ref={pagesRef} />
      </div>
    </div>
  );
}
