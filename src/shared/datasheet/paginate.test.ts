/**
 * @vitest-environment happy-dom
 */
/**

 * Pagination helpers of the shared datasheet module (1.4.1).
 * The engine itself needs a real layout engine; these tests cover the
 * geometry contract and the footer placement on the last page.
 */

import { describe, expect, it } from "vitest";
import { placeFooter, waitForAssets } from "./paginate";
import {
  CONTENT_WIDTH_MM,
  FOOTER_BOTTOM_MM,
  MARGIN_BOTTOM_MM,
  MARGIN_SIDE_MM,
  MARGIN_TOP_MM,
  PAGE_HEIGHT_MM,
  PAGE_WIDTH_MM,
  pageCss,
} from "./page";

function pagedTarget(pageCount: number): HTMLElement {
  const target = document.createElement("div");
  for (let index = 0; index < pageCount; index += 1) {
    const page = document.createElement("div");
    page.className = "pagedjs_page";
    const box = document.createElement("div");
    box.className = "pagedjs_pagebox";
    page.appendChild(box);
    target.appendChild(page);
  }
  return target;
}

function footerNode(): HTMLElement {
  const footer = document.createElement("footer");
  footer.className = "ds-footer";
  footer.setAttribute("data-ds-footer", "true");
  footer.textContent = "Scantron A/S";
  return footer;
}

describe("page geometry", () => {
  it("keeps the A4 contract with repeated margins", () => {
    expect(PAGE_WIDTH_MM).toBe(210);
    expect(PAGE_HEIGHT_MM).toBe(297);
    expect(MARGIN_TOP_MM).toBe(15);
    expect(MARGIN_SIDE_MM).toBe(14);
    expect(CONTENT_WIDTH_MM).toBe(PAGE_WIDTH_MM - 2 * MARGIN_SIDE_MM);
    // The footer band sits inside the reserved bottom margin.
    expect(FOOTER_BOTTOM_MM).toBeLessThan(MARGIN_BOTTOM_MM);
    expect(FOOTER_BOTTOM_MM).toBeGreaterThanOrEqual(12);
  });

  it("emits an @page rule with those margins", () => {
    const css = pageCss();
    expect(css).toContain("size: 210mm 297mm");
    expect(css).toContain("margin: 15mm 14mm 26mm");
  });
});

describe("placeFooter", () => {
  it("places exactly one footer, on the last page", () => {
    const target = pagedTarget(3);
    expect(placeFooter(target, footerNode())).toBe(true);
    const slots = target.querySelectorAll(".ds-footer-slot");
    expect(slots).toHaveLength(1);
    const pages = target.querySelectorAll(".pagedjs_page");
    expect(pages[2]?.querySelector(".ds-footer-slot")).not.toBeNull();
    expect(pages[0]?.querySelector(".ds-footer-slot")).toBeNull();
  });

  it("also places it on a single short page", () => {
    const target = pagedTarget(1);
    expect(placeFooter(target, footerNode())).toBe(true);
    expect(target.querySelectorAll(".ds-footer-slot")).toHaveLength(1);
    const slot = target.querySelector<HTMLElement>(".ds-footer-slot");
    expect(slot?.style.bottom).toBe(`${FOOTER_BOTTOM_MM}mm`);
    expect(slot?.style.position).toBe("absolute");
  });

  it("replaces the previous footer instead of stacking copies", () => {
    const target = pagedTarget(2);
    placeFooter(target, footerNode());
    placeFooter(target, footerNode());
    expect(target.querySelectorAll(".ds-footer-slot")).toHaveLength(1);
  });

  it("does nothing without pages or without a footer", () => {
    expect(placeFooter(pagedTarget(0), footerNode())).toBe(false);
    expect(placeFooter(pagedTarget(2), null)).toBe(false);
  });
});

describe("waitForAssets", () => {
  it("reports no failures when all images already settled", async () => {
    const root = document.createElement("div");
    const image = document.createElement("img");
    Object.defineProperty(image, "complete", { value: true });
    Object.defineProperty(image, "naturalWidth", { value: 120 });
    image.setAttribute("src", "logo.png");
    root.appendChild(image);
    await expect(waitForAssets(root)).resolves.toEqual([]);
  });

  it("reports images that never became usable instead of losing them", async () => {
    const root = document.createElement("div");
    const image = document.createElement("img");
    Object.defineProperty(image, "complete", { value: true });
    Object.defineProperty(image, "naturalWidth", { value: 0 });
    image.setAttribute("src", "https://cdn.example/logo.png");
    root.appendChild(image);
    await expect(waitForAssets(root)).resolves.toEqual([
      "https://cdn.example/logo.png",
    ]);
  });

  it("gives up waiting after the timeout instead of blocking the print", async () => {
    const root = document.createElement("div");
    const image = document.createElement("img");
    Object.defineProperty(image, "complete", { value: false });
    Object.defineProperty(image, "naturalWidth", { value: 0 });
    image.setAttribute("src", "https://cdn.example/slow.png");
    root.appendChild(image);
    const started = Date.now();
    const failed = await waitForAssets(root, { timeoutMs: 30 });
    expect(Date.now() - started).toBeLessThan(2000);
    expect(failed).toHaveLength(1);
  });
});
