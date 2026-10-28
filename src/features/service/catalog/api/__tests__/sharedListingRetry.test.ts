import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Filterbasis des Online-Produktkatalogs: identische Abfragen werden
 * gebündelt (eine Netzabfrage) und vorübergehende Fehler der Produktbasis
 * (`57014` statement timeout) werden **begrenzt** wiederholt. Fachliche
 * Fehler werden nicht wiederholt.
 */

const rpc = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
  isSupabaseConfigured: () => true,
}));

import {
  describeDbError,
  isAbortError,
  getSharedProductListing,
  resetSharedListingCache,
  withLimitedRetry,
} from "../catalog";

const PAKETE = ["pakete-audio", "pakete-video"] as const;

function paketRows(count = 3) {
  return Array.from({ length: count }, (_, i) => ({
    artikel_nr: `P${i}`,
    title: `Paket ${i}`,
    system_typ: "audio",
    montageart: i % 2 === 0 ? "AP" : "UP",
    paket_klasse: "komfort",
    wohneinheiten: i + 1,
  }));
}

function deferred<T>() {
  let resolvePromise: (value: T) => void = () => undefined;
  let rejectPromise: (error: unknown) => void = () => undefined;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return { promise, resolve: resolvePromise, reject: rejectPromise };
}

function rpcQuery<T>(result: Promise<T>, onSignal?: (signal: AbortSignal) => void) {
  return {
    abortSignal(signal: AbortSignal) {
      onSignal?.(signal);
      return result;
    },
    then: result.then.bind(result),
  };
}

function mockRpcResults(...results: Array<{ data: unknown; error: unknown }>) {
  for (const result of results) {
    rpc.mockImplementationOnce(() => rpcQuery(Promise.resolve(result)));
  }
}

beforeEach(() => {
  rpc.mockReset();
  resetSharedListingCache();
  vi.useFakeTimers();
});

async function runAllTimers<T>(promise: Promise<T>): Promise<T> {
  // Ergebnis sofort festhalten, damit eine Ablehnung nicht kurzzeitig als
  // unbehandelt gilt, während die Wartezeiten vorgespult werden.
  let failure: { error: unknown } | null = null;
  let value: T | undefined;
  const settled = promise.then(
    (v) => {
      value = v;
    },
    (error: unknown) => {
      failure = { error };
    },
  );
  await vi.runAllTimersAsync();
  await settled;
  if (failure) throw (failure as { error: unknown }).error;
  return value as T;
}

describe("Filterbasis: Bündelung und begrenztes Wiederholen", () => {
  it("führt identische Paket-Abfragen zu einer Netzabfrage zusammen", async () => {
    rpc.mockImplementation(() =>
      rpcQuery(Promise.resolve({ data: paketRows(409), error: null })),
    );

    const params = {
      locale: "de",
      limit: 1000,
      category_slugs: PAKETE,
      sort_col: "artikel_nr",
      sort_dir: "asc",
    } as const;

    const [a, b, c] = await Promise.all([
      getSharedProductListing({ ...params }),
      getSharedProductListing({ ...params }),
      getSharedProductListing({ ...params }),
    ]);

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(a).toHaveLength(409);
    expect(b).toBe(a);
    expect(c).toBe(a);
  });

  it("wiederholt eine Zeitüberschreitung begrenzt und liefert dann Pakete", async () => {
    const timeout = { code: "57014", message: "canceling statement due to statement timeout" };
    mockRpcResults(
      { data: null, error: timeout },
      { data: null, error: timeout },
    );
    rpc.mockImplementation(() =>
      rpcQuery(Promise.resolve({ data: paketRows(5), error: null })),
    );

    const products = await runAllTimers(
      getSharedProductListing({
        locale: "de",
        limit: 5,
        category_slugs: PAKETE,
      }),
    );

    expect(products).toHaveLength(5);
    // Erste Runde inkl. seitenweisem Nachladen darf mehrfach rufen; wichtig
    // ist, dass am Ende Daten ankommen und nicht endlos wiederholt wird.
    expect(rpc.mock.calls.length).toBeGreaterThan(1);
    expect(rpc.mock.calls.length).toBeLessThan(20);
  });

  it("gibt bei dauerhaftem Fehler auf und meldet den Fehler (kein stilles Leer)", async () => {
    rpc.mockImplementation(() =>
      rpcQuery(Promise.resolve({
        data: null,
        error: { code: "57014", message: "canceling statement due to statement timeout" },
      })),
    );

    await expect(
      runAllTimers(
        getSharedProductListing({
          locale: "de",
          limit: 5,
          category_slugs: PAKETE,
        }),
      ),
    ).rejects.toMatchObject({ code: "57014" });
  });

  it("wiederholt fachliche Fehler nicht", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "42883", message: "function does not exist" },
    });

    await expect(
      withLimitedRetry(async () => {
        const { error } = await rpc();
        if (error) throw error;
        return [];
      }),
    ).rejects.toMatchObject({ code: "42883" });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("lässt einen zweiten Verbraucher weiterlaufen, wenn der erste abbricht", async () => {
    const pending = deferred<{ data: ReturnType<typeof paketRows>; error: null }>();
    let networkSignal: AbortSignal | null = null;
    rpc.mockImplementation(() => rpcQuery(pending.promise, (signal) => {
      networkSignal = signal;
    }));
    const firstController = new AbortController();
    const secondController = new AbortController();
    const params = { locale: "de", limit: 1000, category_slugs: PAKETE } as const;

    const first = getSharedProductListing({ ...params, signal: firstController.signal });
    const second = getSharedProductListing({ ...params, signal: secondController.signal });
    firstController.abort();

    await expect(first).rejects.toSatisfy(isAbortError);
    expect(networkSignal?.aborted).toBe(false);
    pending.resolve({ data: paketRows(4), error: null });
    await expect(second).resolves.toHaveLength(4);
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("bricht die Netzabfrage ab, wenn beide Verbraucher weg sind", async () => {
    let networkSignal: AbortSignal | null = null;
    rpc.mockImplementation(() => {
      const result = new Promise<never>((_resolve, reject) => {
        queueMicrotask(() => {
          networkSignal?.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          }, { once: true });
        });
      });
      return rpcQuery(result, (signal) => { networkSignal = signal; });
    });
    const a = new AbortController();
    const b = new AbortController();
    const params = { locale: "de", limit: 1000, category_slugs: PAKETE } as const;
    const first = getSharedProductListing({ ...params, signal: a.signal });
    const second = getSharedProductListing({ ...params, signal: b.signal });

    a.abort();
    expect(networkSignal?.aborted).toBe(false);
    b.abort();
    expect(networkSignal?.aborted).toBe(true);
    await expect(first).rejects.toSatisfy(isAbortError);
    await expect(second).rejects.toSatisfy(isAbortError);
  });

  it("startet nach vollständigem Abbruch neu und behält den neuen Eintrag", async () => {
    const firstPending = deferred<{ data: null; error: Error }>();
    const secondPending = deferred<{ data: ReturnType<typeof paketRows>; error: null }>();
    rpc
      .mockImplementationOnce(() => rpcQuery(firstPending.promise))
      .mockImplementationOnce(() => rpcQuery(secondPending.promise));
    const oldController = new AbortController();
    const params = { locale: "de", limit: 1000, category_slugs: PAKETE } as const;
    const oldRequest = getSharedProductListing({ ...params, signal: oldController.signal });
    oldController.abort();
    const newRequest = getSharedProductListing(params);
    const sharedNewRequest = getSharedProductListing(params);
    firstPending.reject({ data: null, error: Object.assign(new Error("aborted"), { name: "AbortError" }) });
    secondPending.resolve({ data: paketRows(2), error: null });

    await expect(oldRequest).rejects.toSatisfy(isAbortError);
    await expect(newRequest).resolves.toHaveLength(2);
    await expect(sharedNewRequest).resolves.toHaveLength(2);
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it("trennt Sprachen und Kategorien im Cache-Schlüssel", async () => {
    rpc.mockImplementation(() => rpcQuery(Promise.resolve({ data: paketRows(1), error: null })));
    await Promise.all([
      getSharedProductListing({ locale: "de", category_slugs: ["pakete-audio"] }),
      getSharedProductListing({ locale: "pl", category_slugs: ["pakete-audio"] }),
      getSharedProductListing({ locale: "de", category_slugs: ["pakete-video"] }),
    ]);
    expect(rpc).toHaveBeenCalledTimes(3);
  });

  it("bündelt unterschiedliche Schreibweisen derselben normalisierten Sprache", async () => {
    rpc.mockImplementation(() => rpcQuery(Promise.resolve({ data: paketRows(1), error: null })));
    await Promise.all([
      getSharedProductListing({ locale: "de", category_slugs: PAKETE }),
      getSharedProductListing({ locale: "de-DE", category_slugs: PAKETE }),
    ]);
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("verwirft einen abgelaufenen Eintrag mit der bestehenden TTL", async () => {
    rpc.mockImplementation(() => rpcQuery(Promise.resolve({ data: paketRows(1), error: null })));
    const params = { locale: "de", category_slugs: PAKETE } as const;
    await getSharedProductListing(params);
    vi.advanceTimersByTime(30_001);
    await getSharedProductListing(params);
    expect(rpc).toHaveBeenCalledTimes(2);
  });
});

describe("Fehlerbeschreibung und Abbruch", () => {
  it("zeigt code/message/details statt [object Object]", () => {
    const text = describeDbError({
      code: "57014",
      message: "canceling statement due to statement timeout",
      details: null,
      hint: "erhöhe statement_timeout",
    });
    expect(text).toContain("code: 57014");
    expect(text).toContain("statement timeout");
    expect(text).toContain("hint: erhöhe statement_timeout");
    expect(text).not.toContain("[object Object]");
    expect(String({}) === "[object Object]").toBe(true);
  });

  it("serialisiert unbekannte Objekte nicht", () => {
    const text = describeDbError({
      headers: { Authorization: "Bearer secret-value" },
      request: { password: "secret-password" },
    });
    expect(text).toBe("unbekannter Datenbankfehler");
    expect(text).not.toContain("secret-value");
    expect(text).not.toContain("secret-password");
  });

  it("redigiert sensible Werte in erlaubten Fehlerfeldern", () => {
    const text = describeDbError({
      code: "08006",
      message: "Authorization: Bearer abc.def and password=hunter2",
      details: "https://user:pass@example.test/path?token=topsecret",
    });
    expect(text).toContain("Authorization=[REDACTED]");
    expect(text).toContain("password=[REDACTED]");
    expect(text).toContain("https://[REDACTED]@example.test/path?token=[REDACTED]");
    expect(text).not.toContain("abc.def");
    expect(text).not.toContain("hunter2");
    expect(text).not.toContain("topsecret");
  });

  it("wiederholt abgebrochene Anfragen nicht", async () => {
    const controller = new AbortController();
    controller.abort();
    const run = vi.fn(async () => {
      const err = new Error("aborted");
      err.name = "AbortError";
      throw err;
    });
    await expect(withLimitedRetry(run, controller.signal)).rejects.toSatisfy(
      isAbortError,
    );
    expect(run).not.toHaveBeenCalled();
  });
});
