/**
 * @vitest-environment happy-dom
 */
/**
 * Concurrency contract of the pagination (module 1.4.1): a slow or stale run
 * must never publish its pages, must clean up only its own stylesheet, and two
 * mounted frames must not disturb each other.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

interface PendingRun {
  renderTo: HTMLElement;
  polisher: { destroy: ReturnType<typeof vi.fn> };
  finish: (pages: number) => void;
}

const runs: PendingRun[] = [];

vi.mock("pagedjs", () => {
  class Previewer {
    polisher: { destroy: ReturnType<typeof vi.fn> } | undefined;
    preview(_content: unknown, _styles: unknown, renderTo: HTMLElement) {
      const polisher = { destroy: vi.fn() };
      this.polisher = polisher;
      return new Promise((resolve) => {
        runs.push({
          renderTo,
          polisher,
          finish: (pages: number) => {
            for (let index = 0; index < pages; index += 1) {
              const page = document.createElement("div");
              page.className = "pagedjs_page";
              const box = document.createElement("div");
              box.className = "pagedjs_pagebox";
              page.appendChild(box);
              renderTo.appendChild(page);
            }
            resolve({ total: pages });
          },
        });
      });
    }
  }
  return { Previewer };
});

const { DatasheetAssetError, disposePagination, paginateDatasheet, publishedStylesheetOf } =
  await import("./paginate");

function sourceNode(label: string): HTMLElement {
  const source = document.createElement("div");
  const root = document.createElement("div");
  root.className = "ds-root";
  root.dataset["label"] = label;
  const footer = document.createElement("footer");
  footer.setAttribute("data-ds-footer", "true");
  footer.textContent = "Scantron A/S";
  root.appendChild(footer);
  source.appendChild(root);
  return source;
}

/** Waits until the engine mock has received `count` runs. */
async function settle(count?: number) {
  const target = count ?? runs.length;
  for (let i = 0; i < 200; i += 1) {
    if (runs.length >= target) break;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  await new Promise((resolve) => setTimeout(resolve, 5));
}

beforeEach(() => {
  runs.length = 0;
  document.body.innerHTML = "";
});

describe("paginateDatasheet runs", () => {
  it("discards a slow stale run and keeps the newest pages", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const stale = paginateDatasheet({ source: sourceNode("old"), target }).catch(
      (error: Error) => error.name,
    );
    await settle(1);
    const fresh = paginateDatasheet({ source: sourceNode("new"), target });
    await settle(2);
    expect(runs).toHaveLength(2);

    // The newest run finishes first, the stale one afterwards.
    runs[1]!.finish(2);
    await fresh;
    expect(target.querySelectorAll(".pagedjs_page")).toHaveLength(2);
    const publishedStyles = publishedStylesheetOf(target);

    runs[0]!.finish(5);
    await expect(stale).resolves.toBe("AbortError");

    // Stale pages never reach the target, stale styles are disposed of, the
    // published stylesheet stays alive.
    expect(target.querySelectorAll(".pagedjs_page")).toHaveLength(2);
    expect(runs[0]!.polisher.destroy).toHaveBeenCalledTimes(1);
    expect(runs[1]!.polisher.destroy).not.toHaveBeenCalled();
    expect(publishedStyles).toBe(runs[1]!.polisher);
  });

  it("renders into an offscreen staging container, not into the target", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const done = paginateDatasheet({ source: sourceNode("a"), target });
    await settle(1);
    expect(runs[0]!.renderTo).not.toBe(target);
    expect(runs[0]!.renderTo.className).toBe("ds-print-staging");
    expect(target.childNodes).toHaveLength(0);
    runs[0]!.finish(1);
    await done;
    expect(target.querySelectorAll(".pagedjs_page")).toHaveLength(1);
    // Exactly one footer, on the last page.
    expect(target.querySelectorAll(".ds-footer-slot")).toHaveLength(1);
    expect(document.querySelectorAll(".ds-print-staging")).toHaveLength(0);
  });

  it("keeps two mounted frames independent", async () => {
    const first = document.createElement("div");
    const second = document.createElement("div");
    document.body.append(first, second);
    const runA = paginateDatasheet({ source: sourceNode("a"), target: first });
    await settle(1);
    const runB = paginateDatasheet({ source: sourceNode("b"), target: second });
    await settle(2);

    runs[1]!.finish(3);
    await runB;
    runs[0]!.finish(1);
    await runA;

    expect(first.querySelectorAll(".pagedjs_page")).toHaveLength(1);
    expect(second.querySelectorAll(".pagedjs_page")).toHaveLength(3);
    expect(runs[0]!.polisher.destroy).not.toHaveBeenCalled();
    expect(runs[1]!.polisher.destroy).not.toHaveBeenCalled();
  });

  it("aborts via signal without touching already published pages", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const first = paginateDatasheet({ source: sourceNode("a"), target });
    await settle(1);
    runs[0]!.finish(2);
    await first;

    const controller = new AbortController();
    const aborted = paginateDatasheet({
      source: sourceNode("b"),
      target,
      signal: controller.signal,
    }).catch((error: Error) => error.name);
    await settle(2);
    controller.abort();
    runs[1]!.finish(4);
    await expect(aborted).resolves.toBe("AbortError");
    expect(target.querySelectorAll(".pagedjs_page")).toHaveLength(2);
    expect(runs[1]!.polisher.destroy).toHaveBeenCalledTimes(1);
  });

  it("releases pages and styles on unmount", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const run = paginateDatasheet({ source: sourceNode("a"), target });
    await settle(1);
    runs[0]!.finish(1);
    await run;
    disposePagination(target);
    expect(target.childNodes).toHaveLength(0);
    expect(runs[0]!.polisher.destroy).toHaveBeenCalledTimes(1);
    expect(publishedStylesheetOf(target)).toBeUndefined();
  });

  it("fails loudly when a required image could not be loaded", async () => {
    const target = document.createElement("div");
    const source = sourceNode("a");
    const image = document.createElement("img");
    Object.defineProperty(image, "complete", { value: true });
    Object.defineProperty(image, "naturalWidth", { value: 0 });
    image.setAttribute("src", "https://cdn.example/logo.png");
    source.firstElementChild!.appendChild(image);
    await expect(paginateDatasheet({ source, target })).rejects.toBeInstanceOf(
      DatasheetAssetError,
    );
    expect(target.childNodes).toHaveLength(0);
  });
});
