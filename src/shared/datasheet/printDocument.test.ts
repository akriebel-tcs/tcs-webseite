/**
 * @vitest-environment happy-dom
 */
/**
 * Print entry point (module 1.4.1): the target and its content generation are
 * captured before awaiting, so a product or locale change while waiting never
 * prints stale pages under the new file name.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DatasheetPrintError,
  printDatasheet,
  registerPrintTarget,
  resetPrintTarget,
  type DatasheetPrintStatus,
} from "./printDocument";

function frame(initial: DatasheetPrintStatus = "ready") {
  let status = initial;
  let generation = 1;
  let resolve = () => {};
  let promise = Promise.resolve();
  const state = {
    ready: () => promise,
    status: () => status,
    generation: () => generation,
    setStatus: (next: DatasheetPrintStatus) => {
      status = next;
    },
    /** Starts a new pagination run, like a product or locale change. */
    startRun: () => {
      generation += 1;
      status = "working";
      promise = new Promise<void>((r) => {
        resolve = r;
      });
    },
    finishRun: (next: DatasheetPrintStatus = "ready") => {
      status = next;
      resolve();
    },
  };
  return state;
}

function stubPrint() {
  // happy-dom has no window.print implementation.
  const spy = vi.fn();
  Object.defineProperty(window, "print", {
    value: spy,
    configurable: true,
    writable: true,
  });
  return spy;
}

afterEach(() => {
  resetPrintTarget();
  vi.restoreAllMocks();
});

describe("printDatasheet", () => {
  it("prints the ready frame and restores the title", async () => {
    const print = stubPrint();
    document.title = "app";
    registerPrintTarget(frame());
    await printDatasheet("Datenblatt-ISW6010.pdf");
    expect(print).toHaveBeenCalledTimes(1);
    expect(document.title).toBe("app");
  });

  it("refuses to print when the content changed while waiting", async () => {
    const print = stubPrint();
    const target = frame();
    registerPrintTarget(target);
    target.startRun();
    const pending = printDatasheet("Datenblatt-A.pdf");
    // Product switch: a newer run starts and finishes.
    target.finishRun();
    target.startRun();
    target.finishRun();
    await expect(pending).rejects.toBeInstanceOf(DatasheetPrintError);
    expect(print).not.toHaveBeenCalled();
  });

  it("refuses to print through a different frame mounted meanwhile", async () => {
    const print = stubPrint();
    const first = frame();
    registerPrintTarget(first);
    first.startRun();
    const pending = printDatasheet("Datenblatt-A.pdf");
    registerPrintTarget(frame());
    first.finishRun();
    await expect(pending).rejects.toBeInstanceOf(DatasheetPrintError);
    expect(print).not.toHaveBeenCalled();
  });

  it("uses the most recently mounted frame", async () => {
    const print = stubPrint();
    registerPrintTarget(frame());
    const newest = frame();
    const unregister = registerPrintTarget(newest);
    const spy = vi.spyOn(newest, "status");
    await printDatasheet();
    expect(spy).toHaveBeenCalled();
    expect(print).toHaveBeenCalledTimes(1);
    unregister();
  });

  it("reports an error instead of printing a failed pagination", async () => {
    const print = stubPrint();
    registerPrintTarget(frame("error"));
    await expect(printDatasheet()).rejects.toBeInstanceOf(DatasheetPrintError);
    expect(print).not.toHaveBeenCalled();
  });

  it("throws when no frame is mounted", async () => {
    await expect(printDatasheet()).rejects.toBeInstanceOf(DatasheetPrintError);
  });
});
