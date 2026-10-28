import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Freigabe-Token wird für einzelne Tests gezielt gesetzt. */
let fakeToken: string | null = null;
const invokeCalls: Array<{ name: string; options: Record<string, unknown> }> = [];
let invokeResult: { data: unknown; error: unknown } = { data: {}, error: null };
/** Optionale Antwort je Aktion (fuer mehrstufige Laeufe). */
let invokeHandler: ((body: Record<string, unknown>) => unknown) | null = null;

vi.mock("../adminAuth", () => ({
  readAdminToken: () => fakeToken,
}));

vi.mock("@/lib/cmsSupabase/client", () => ({
  getCmsSupabaseClient: () => ({
    functions: {
      invoke: (name: string, options: Record<string, unknown>) => {
        invokeCalls.push({ name, options });
        if (invokeHandler) {
          return Promise.resolve({ data: invokeHandler(options.body as Record<string, unknown>), error: null });
        }
        return Promise.resolve(invokeResult);
      },
    },
  }),
}));

import {
  ExportAbortError,
  ExportAuthError,
  FK_RELATIONS,
  buildFullExportZip,
  buildMediaManifest,
  buildPowerShellDownloader,
  checkParentIntegrity,
  checkTable,
  collectExternalMedia,
  computeStatus,
  fetchCounts,
  fetchStorageInventory,
  buildMediaOnlyZip,
  fetchTableRows,
  findDuplicateKeys,
  findUncoveredTables,
  sanitizeRelativePath,
  isAllowedMediaUrl,
  toCsv,
  validateCountsPayload,
  validateInventoryPayload,
  validateSchemaPayload,
  MAX_BATCH,
  MEDIA_URL_PREFIX,
} from "../cmsFullExport";

const FN_SRC = readFileSync(
  resolve(process.cwd(), "supabase/functions/cms-snapshot-export/index.ts"),
  "utf8",
);

const count = (over: Partial<Parameters<typeof checkTable>[0]> = {}) => ({
  table: "cms_pages",
  key: "id",
  single_row: false,
  classification: "content" as const,
  restore_note: "",
  row_count: 3,
  marker_column: "updated_at",
  marker_value: "2026-09-14T10:00:00Z",
  error: null,
  ...over,
});

const okCheck = () => checkTable(count(), count(), [{ id: "a" }, { id: "b" }, { id: "c" }], "id");

const statusInput = (over: Partial<Parameters<typeof computeStatus>[0]> = {}) => ({
  errors: {},
  checks: [okCheck()],
  integrity: [],
  inventory: {
    bucket: "cms-assets",
    object_count: 1,
    total_bytes: 10,
    objects: [],
    errors: [],
    truncated: false,
    taken_at: "2026-09-14T10:00:00Z",
  },
  unsafeCount: 0,
  duplicateTargets: [],
  uncoveredTables: [],
  mediaRecountMatches: true,
  mediaRecountErrors: [],
  mediaRecountTruncated: false,
  missingTables: [],
  ...over,
});

beforeEach(() => {
  fakeToken = null;
  invokeCalls.length = 0;
  invokeResult = { data: {}, error: null };
});

describe("Gesamt-Export: Freigabe", () => {
  it("liest ohne Freigabe nichts (kein Token im Arbeitsspeicher)", async () => {
    await expect(fetchCounts()).rejects.toBeInstanceOf(ExportAuthError);
  });

  it("bricht bei abgelaufener Freigabe mitten im Paging ab", async () => {
    let calls = 0;
    await expect(
      fetchTableRows("cms_pages", {
        retries: 3,
        call: async () => {
          calls += 1;
          throw new ExportAuthError("admin_session_expired");
        },
      }),
    ).rejects.toBeInstanceOf(ExportAuthError);
    // Freigabefehler werden NICHT wiederholt.
    expect(calls).toBe(1);
  });

  it("Serverdienst prüft die Freigabe vor jedem Lesen und schließt bei Fehler", () => {
    const guardAt = FN_SRC.indexOf("const guard = await requireAdmin(req, body)");
    expect(guardAt).toBeGreaterThan(0);
    expect(guardAt).toBeLessThan(FN_SRC.indexOf('if (action === "counts")'));
    expect(FN_SRC).toContain("admin_check_unavailable");
    expect(FN_SRC).toContain('action: "admin_session"');
    // keine eigene Signatur-/Passwortwahrheit im Exportdienst
    expect(FN_SRC).not.toContain("CMS_ADMIN_PASSWORD");
    expect(FN_SRC).not.toContain("signAdminSession");
  });
});

describe("Gesamt-Export: Tabellenliste", () => {
  it("Zugangsdaten-, Auth- und Rollentabellen sind ausgeschlossen", () => {
    const exportList = FN_SRC.slice(
      FN_SRC.indexOf("const EXPORT_TABLES"),
      FN_SRC.indexOf("const EXCLUDED_TABLES"),
    );
    for (const forbidden of ["cms_provider_credentials", "cms_provider_credential_audit", "user_roles"]) {
      expect(exportList).not.toContain(forbidden);
    }
    expect(FN_SRC).toContain("user_roles");
  });

  it("Tabellenname kommt nur aus der festen Liste", () => {
    expect(FN_SRC).toContain("const spec = TABLE_MAP.get(name)");
    expect(FN_SRC).toContain("table_not_allowed");
  });

  it("Batchgröße ist serverseitig auf 1000 begrenzt", () => {
    expect(FN_SRC).toContain("const MAX_BATCH = 1000");
    expect(FN_SRC).toContain("Math.min(Math.max(Number(body.limit ?? MAX_BATCH) || MAX_BATCH, 1), MAX_BATCH)");
    expect(MAX_BATCH).toBe(1000);
  });

  it("Betriebs-/Cache-Tabellen sind eigen klassifiziert", () => {
    expect(FN_SRC).toMatch(/cms_translation_jobs[\s\S]{0,120}"operations"/);
    expect(FN_SRC).toMatch(/cms_translation_coverage_cache[\s\S]{0,120}"cache"/);
  });

  it("supabase-js ist exakt gepinnt (kein @2)", () => {
    expect(FN_SRC).toContain("supabase-js@2.105.4");
    expect(FN_SRC).not.toMatch(/supabase-js@2["']/);
  });
});

describe("Gesamt-Export: Paging", () => {
  const makeRows = (from: number, n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: String(from + i).padStart(6, "0") }));

  it("liest mehr als 1000 Zeilen ohne stille Abschneidung", async () => {
    const pages = [makeRows(1, 1000), makeRows(1001, 1000), makeRows(2001, 7)];
    let call = 0;
    const { rows } = await fetchTableRows("cms_section_fields", {
      call: async () => {
        const p = pages[call++];
        return {
          table: "cms_section_fields",
          key: "id",
          rows: p,
          returned: p.length,
          next_after: p[p.length - 1].id,
          has_more: p.length === 1000,
        };
      },
    });
    expect(rows).toHaveLength(2007);
    expect(call).toBe(3);
  });

  it("erkennt hängenden Cursor als Fehler statt als Erfolg", async () => {
    await expect(
      fetchTableRows("cms_pages", {
        call: async () => ({
          table: "cms_pages",
          key: "id",
          rows: makeRows(1, 1000),
          returned: 1000,
          next_after: "000001",
          has_more: true,
        }),
      }),
    ).rejects.toThrow(/hängt/);
  });

  it("meldet erschöpftes Schleifenlimit als unvollständig", async () => {
    let i = 0;
    await expect(
      fetchTableRows("cms_pages", {
        maxPages: 2,
        call: async () => {
          i += 1;
          return {
            table: "cms_pages",
            key: "id",
            rows: makeRows(i * 1000, 1000),
            returned: 1000,
            next_after: `cursor-${i}`,
            has_more: true,
          };
        },
      }),
    ).rejects.toThrow(/unvollständig/);
  });

  it("wiederholt begrenzt und bricht dann ab", async () => {
    let calls = 0;
    await expect(
      fetchTableRows("cms_pages", {
        retries: 2,
        call: async () => {
          calls += 1;
          throw new Error("netzfehler");
        },
      }),
    ).rejects.toThrow("netzfehler");
    expect(calls).toBe(3);
  });

  it("bricht bei Abbruchsignal ab", async () => {
    const c = new AbortController();
    c.abort();
    await expect(
      fetchTableRows("cms_pages", { signal: c.signal, call: async () => ({}) as never }),
    ).rejects.toBeInstanceOf(ExportAbortError);
  });
});

describe("Gesamt-Export: Abbruch wirkt überall", () => {
  it("gibt das Abbruchsignal an jeden Netzaufruf weiter", async () => {
    const c = new AbortController();
    let received: AbortSignal | undefined;
    await fetchTableRows("cms_pages", {
      signal: c.signal,
      call: async (_body, signal) => {
        received = signal;
        return { table: "cms_pages", key: "id", rows: [], returned: 0, next_after: null, has_more: false };
      },
    });
    expect(received).toBe(c.signal);
  });

  it("reicht das Signal bis zum Serveraufruf durch", async () => {
    fakeToken = "freigabe";
    const c = new AbortController();
    invokeResult = { data: { bucket: "cms-assets", object_count: 0, total_bytes: 0, objects: [], errors: [], truncated: false, taken_at: "x" }, error: null };
    await fetchStorageInventory(c.signal);
    expect(invokeCalls).toHaveLength(1);
    expect(invokeCalls[0].options.signal).toBe(c.signal);
  });

  it("Abbruch während der Wiederholpause ist sofort endgültig", async () => {
    const c = new AbortController();
    let calls = 0;
    const promise = fetchTableRows("cms_pages", {
      signal: c.signal,
      retries: 5,
      call: async () => {
        calls += 1;
        c.abort();
        throw new Error("netzfehler");
      },
    });
    await expect(promise).rejects.toBeInstanceOf(ExportAbortError);
    expect(calls).toBe(1);
  });

  it("Abbruch in der letzten Tabelle liefert KEIN Paket", async () => {
    fakeToken = "freigabe";
    const c = new AbortController();
    c.abort();
    await expect(buildFullExportZip({ signal: c.signal })).rejects.toBeInstanceOf(ExportAbortError);
    expect(invokeCalls).toHaveLength(0);
  });

  it("UI bricht beim Verlassen/Sperren ab", () => {
    const ui = readFileSync(
      resolve(process.cwd(), "src/features/admin/components/FullExportPanel.tsx"),
      "utf8",
    );
    expect(ui).toContain("useEffect");
    expect(ui).toMatch(/abortRef[\s\S]*abort\(\)/);
    expect(ui).toContain("ExportAbortError");
  });
});

describe("Gesamt-Export: Prüfungen", () => {
  it("abweichender Zählerstand ohne Änderungsmarker ist ein Fehler", () => {
    const check = checkTable(count(), count(), [{ id: "a" }, { id: "b" }], "id");
    expect(check.severity).toBe("error");
    expect(check.note).toContain("Erwartet 3");
  });

  it("abweichender Zählerstand bei geänderter DB ist eine Warnung", () => {
    const check = checkTable(
      count(),
      count({ marker_value: "2026-09-14T11:00:00Z", row_count: 4 }),
      [{ id: "a" }, { id: "b" }],
      "id",
    );
    expect(check.severity).toBe("warning");
    expect(check.note).toContain("kein atomarer Snapshot");
  });

  it("Dubletten sind ein Fehler", () => {
    expect(findDuplicateKeys([{ id: "x" }, { id: "x" }], "id")).toEqual(["x"]);
    const check = checkTable(count({ row_count: 2 }), count({ row_count: 2 }), [{ id: "x" }, { id: "x" }], "id");
    expect(check.severity).toBe("error");
  });

  it("stimmige Zahlen sind ok", () => {
    expect(okCheck().severity).toBe("ok");
  });

  it("fehlende Nachzählung ist nie ok", () => {
    const check = checkTable(count(), undefined, [{ id: "a" }, { id: "b" }, { id: "c" }], "id");
    expect(check.severity).toBe("warning");
    expect(check.recount_known).toBe(false);
    expect(check.note).toContain("Nachzählung fehlt");
  });

  it("fehlerhafte oder unlesbare Nachzählung ist nie ok", () => {
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(checkTable(count(), count({ error: "timeout" }), rows, "id").severity).toBe("warning");
    expect(checkTable(count(), count({ row_count: null }), rows, "id").severity).toBe("warning");
  });

  it("abweichende Nachzählung trotz stimmiger Vorzählung ist nie ok", () => {
    const check = checkTable(count(), count({ row_count: 4 }), [{ id: "a" }, { id: "b" }, { id: "c" }], "id");
    expect(check.severity).toBe("warning");
    expect(check.note).toContain("Nachzählung weicht ab");
  });
});

describe("Gesamt-Export: Status", () => {
  it("nur ohne jeden Befund vollständig", () => {
    expect(computeStatus(statusInput()).status).toBe("complete");
  });

  it("Medieninventar-Fehler, Abschneidung und unsichere Pfade sind unvollständig", () => {
    const inv = statusInput().inventory!;
    expect(computeStatus(statusInput({ inventory: { ...inv, errors: ["x"] } })).status).toBe("incomplete");
    expect(computeStatus(statusInput({ inventory: { ...inv, truncated: true } })).status).toBe("incomplete");
    expect(computeStatus(statusInput({ unsafeCount: 1 })).status).toBe("incomplete");
    expect(computeStatus(statusInput({ duplicateTargets: ["a"] })).status).toBe("incomplete");
    expect(computeStatus(statusInput({ inventory: null })).status).toBe("incomplete");
    expect(computeStatus(statusInput({ missingTables: ["cms_pages"] })).status).toBe("incomplete");
    expect(computeStatus(statusInput({ errors: { schema: "kaputt" } })).status).toBe("incomplete");
  });

  it("gleiche Medienzahlen mit Fehler oder Abschneidung der Nachzählung sind unvollständig", () => {
    expect(computeStatus(statusInput({ mediaRecountMatches: true, mediaRecountErrors: ["Lesefehler"] })).status).toBe(
      "incomplete",
    );
    expect(computeStatus(statusInput({ mediaRecountMatches: true, mediaRecountTruncated: true })).status).toBe(
      "incomplete",
    );
  });

  it("Warnungen und unklare Nachzählung sind nicht vollständig", () => {
    const warn = checkTable(count(), undefined, [{ id: "a" }, { id: "b" }, { id: "c" }], "id");
    expect(computeStatus(statusInput({ checks: [warn] })).status).toBe("changed");
    expect(computeStatus(statusInput({ mediaRecountMatches: null })).status).toBe("changed");
    expect(computeStatus(statusInput({ mediaRecountMatches: false })).status).toBe("changed");
    expect(computeStatus(statusInput({ uncoveredTables: ["cms_neu"] })).status).toBe("changed");
    expect(computeStatus(statusInput({ uncoveredTables: ["cms_neu"] })).reasons.join(" ")).toContain("cms_neu");
  });

  it("nicht geprüfte Beziehung ist nicht vollständig, fehlende Eltern sind unvollständig", () => {
    expect(
      computeStatus(statusInput({ integrity: [{ relation: "r", missing: 0, examples: [], unchecked: true, reason: "fehlt" }] }))
        .status,
    ).toBe("changed");
    expect(computeStatus(statusInput({ integrity: [{ relation: "r", missing: 3, examples: [] }] })).status).toBe(
      "incomplete",
    );
  });

  it("unplausible Serverantworten werden abgewiesen", () => {
    expect(() => validateCountsPayload(null)).toThrow();
    expect(() => validateCountsPayload({ tables: [], excluded: [] })).toThrow();
    expect(() => validateCountsPayload({ tables: [{ table: "", key: "id" }], excluded: [] })).toThrow();
    expect(() => validateSchemaPayload({ objects: [] })).toThrow();
    expect(() =>
      validateInventoryPayload({ bucket: "b", object_count: 5, total_bytes: 0, objects: [], errors: [], truncated: false }),
    ).toThrow(/Objektzahl/);
  });

  it("meldet nicht abgedeckte cms-Tabellen aus der Live-Struktur", () => {
    const schema = {
      objects: [
        { name: "cms_pages", kind: "table" },
        { name: "cms_provider_credentials", kind: "table" },
        { name: "cms_ganz_neu", kind: "table" },
        { name: "cms_irgendeine_view", kind: "view" },
      ],
    };
    expect(findUncoveredTables(schema, ["cms_pages"], ["cms_provider_credentials", "auth.*"])).toEqual([
      "cms_ganz_neu",
    ]);
  });
});

describe("Gesamt-Export: Eltern-Verweise", () => {
  it("prüft die echten Fremdschlüssel des Exportumfangs", () => {
    const relations = FK_RELATIONS.map((r) => r.relation);
    expect(relations).toContain("cms_sections.parent_section_id → cms_sections.id");
    expect(relations).toContain("cms_navigation_nodes.parent_id → cms_navigation_nodes.id");
    expect(relations).toContain(
      "cms_section_fields.(page_key,section_key) → cms_sections.(page_key,section_key)",
    );
    expect(relations.filter((r) => r.includes("→ cms_locales.locale"))).toHaveLength(5);
    // keine erfundene Beziehung
    expect(relations).not.toContain("cms_section_fields.page_key → cms_pages.page_key");
    expect(FK_RELATIONS).toHaveLength(13);
  });

  it("findet fehlende Eltern-Verweise", () => {
    const out = checkParentIntegrity(
      {
        cms_pages: [{ id: "p1", page_key: "home" }],
        cms_sections: [{ id: "s1", page_key: "home" }, { id: "s2", page_key: "geist" }],
      },
      FK_RELATIONS.filter((r) => r.relation === "cms_sections.page_key → cms_pages.page_key"),
    );
    expect(out).toHaveLength(1);
    expect(out[0].missing).toBe(1);
    expect(out[0].examples).toEqual(["geist"]);
  });

  it("findet gefilterte Eltern bei Selbstbezug", () => {
    const out = checkParentIntegrity(
      {
        cms_sections: [
          { id: "s1", parent_section_id: null },
          { id: "s2", parent_section_id: "verschwunden" },
        ],
      },
      FK_RELATIONS.filter((r) => r.relation === "cms_sections.parent_section_id → cms_sections.id"),
    );
    expect(out[0].missing).toBe(1);
    expect(out[0].examples).toEqual(["verschwunden"]);
  });

  it("prüft zusammengesetzte Schlüssel gemeinsam", () => {
    const rel = FK_RELATIONS.filter((r) => r.child === "cms_section_fields" && r.parent === "cms_sections");
    const ok = checkParentIntegrity(
      {
        cms_sections: [{ page_key: "home", section_key: "hero" }],
        cms_section_fields: [{ page_key: "home", section_key: "hero" }],
      },
      rel,
    );
    expect(ok).toHaveLength(0);
    const bad = checkParentIntegrity(
      {
        cms_sections: [{ page_key: "home", section_key: "hero" }],
        cms_section_fields: [{ page_key: "geist", section_key: "hero" }],
      },
      rel,
    );
    expect(bad[0].missing).toBe(1);
    expect(bad[0].examples[0]).toContain("geist");
  });

  it("überspringt fehlende Tabellen nicht still", () => {
    const out = checkParentIntegrity({ cms_pages: [] });
    expect(out.every((o) => o.unchecked)).toBe(true);
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].reason).toContain("fehlt im Paket");
  });
});

describe("Gesamt-Export: Medienpaket", () => {
  const obj = (path: string, over: Record<string, unknown> = {}) => ({
    path,
    size: 10,
    mime_type: null,
    etag: null,
    updated_at: null,
    public_url: `${MEDIA_URL_PREFIX}${path}`,
    ...over,
  });

  it("weist Pfad-Ausbrüche ab", () => {
    for (const bad of [
      "../etc/passwd",
      "a/../../b.png",
      "/absolut.png",
      "C:\\windows\\x.png",
      "ordner\\datei.png",
      "~/x.png",
      "a//b.png",
      "a/b\u0000.png",
      "NUL",
      "com1.png",
      "ordner./x.png",
      "x.png ",
    ]) {
      expect(sanitizeRelativePath(bad)).toBeNull();
    }
    expect(sanitizeRelativePath("pilot/hero-01.webp")).toBe("pilot/hero-01.webp");
  });

  it("sortiert unsichere Objekte aus und markiert DB-Bezug", () => {
    const { entries, unsafe } = buildMediaManifest(
      [obj("ok/a.webp"), obj("../b.webp"), obj("frei/c.webp", { size: 5 })],
      [{ storage_path: "ok/a.webp" }],
    );
    expect(unsafe.map((u) => u.path)).toEqual(["../b.webp"]);
    expect(entries).toHaveLength(2);
    expect(entries[0].referenced_in_db).toBe(true);
    expect(entries[1].referenced_in_db).toBe(false);
  });

  it("weist fremde Adressen und doppelte Zielpfade ab", () => {
    const { entries, unsafe, duplicateTargets } = buildMediaManifest(
      [
        obj("ok/a.webp"),
        obj("ok/A.webp"),
        obj("ok/d.webp", { public_url: "https://boese.example/ok/d.webp" }),
      ],
      [],
    );
    expect(entries).toHaveLength(1);
    expect(duplicateTargets).toEqual(["ok/A.webp"]);
    expect(unsafe.map((u) => u.reason)).toEqual([
      expect.stringContaining("doppelt"),
      "Adresse nicht im eigenen Medienspeicher",
    ]);
  });

  it("listet externe Medienquellen getrennt", () => {
    const external = collectExternalMedia([
      { public_url: "https://ref.supabase.co/storage/v1/object/public/cms-assets/a.webp" },
      { public_url: "https://image.jimcdn.com/x.jpg", page_key: "p", section_key: "s", field_key: "f" },
    ]);
    expect(external).toHaveLength(1);
    expect(external[0].host).toBe("image.jimcdn.com");
  });

  it("Downloader enthält keine Schlüssel und löscht nur die eigene Zwischendatei", () => {
    const ps = buildPowerShellDownloader();
    expect(ps).not.toMatch(/apikey|service_role|Bearer|SUPABASE_|eyJ/i);
    expect(ps).not.toMatch(/\bdel \b|rmdir|Remove-Item -Recurse/);
    // Genau ein Löschbefehl, und der betrifft nur die selbst angelegte Datei.
    const removals = ps.match(/Remove-Item[^\n]*/g) ?? [];
    expect(removals).toHaveLength(1);
    expect(removals[0]).toContain("$teilweise");
    expect(ps).toContain("Get-FileHash");
    expect(ps).toContain("UNVOLLSTAENDIG");
  });

  it("Downloader schreibt den Wiederaufnahme-Stand nach jeder Datei atomar", () => {
    const ps = buildPowerShellDownloader();
    // Checkpoint-Funktion, die bei jedem Ergebnis (ok UND Fehler) schreibt.
    expect(ps).toMatch(/function Merke\([\s\S]{0,300}Schreibe-Protokoll/);
    expect(ps).toMatch(/Merke \$pfad "ok"/);
    expect(ps).toMatch(/Merke \$pfad "fehler"/);
    // Atomar: .new schreiben, .bak sichern, dann umbenennen.
    expect(ps).toContain("$protokollNeu");
    expect(ps).toContain("$protokollBak");
    expect(ps).toContain("Move-Item -LiteralPath $protokollNeu -Destination $protokollJson -Force");
    // Wiederherstellung aus Sicherung beim Lesen.
    expect(ps).toMatch(/foreach \(\$kandidat in @\(\$protokollJson, \$protokollBak, \$protokollNeu\)\)/);
    // Kontrollierter Abbruch: finally schreibt Protokoll und CSV.
    expect(ps).toMatch(/\} finally \{[\s\S]{0,200}Schreibe-Protokoll[\s\S]{0,200}Schreibe-ProtokollCsv/);
    expect(ps).toContain("$abgebrochen");
  });

  it("Downloader prüft die gesamte Vorfahrenkette und legt eine garantiert neue Zwischendatei an", () => {
    const ps = buildPowerShellDownloader();
    expect(ps).toContain("function Ist-KetteSauber");
    expect(ps).toContain("Sind-ExistierendeVorfahrenSauber $zielWurzelPfad");
    expect(ps).toContain("Ist-KetteSauber $ordner $zielWurzel");
    expect(ps).toContain("Ist-KetteSauber $vollstaendig $zielWurzel");
    // Zwischendatei ausschliesslich per CreateNew mit Zufallsnamen.
    expect(ps).toContain("[System.IO.FileMode]::CreateNew");
    expect(ps).toContain("[System.Guid]::NewGuid()");
    expect(ps).not.toContain('"$vollstaendig.partial"');
    // Zieldatei wird nie mit -Force ersetzt.
    expect(ps).toContain("Move-Item -LiteralPath $teilweise -Destination $vollstaendig\n");
    expect(ps).not.toContain("Destination $vollstaendig -Force");
    // Protokolldateinamen sind reserviert.
    expect(ps).toContain("$reservierte -contains $rel.ToLowerInvariant()");
    // Fehlende oder negative Groesse ist ein Fehler.
    expect(ps).toContain("Groesse fehlt oder ist ungueltig");
    // Wiederaufnahme gilt nur bei identischer Adresse.
    expect(ps).toContain("$frueherUrl -eq $url");
  });

  it("Zielpfade mit Kontrollzeichen und reservierten Protokollnamen werden abgelehnt", () => {
    expect(sanitizeRelativePath("a\u0001b.webp")).toBeNull();
    expect(sanitizeRelativePath("bild\u007f.webp")).toBeNull();
    expect(sanitizeRelativePath("download-protokoll.json")).toBeNull();
    expect(sanitizeRelativePath("Download-Protokoll.CSV")).toBeNull();
    expect(sanitizeRelativePath("media-manifest.json")).toBeNull();
    expect(sanitizeRelativePath("ordner/download-protokoll.json")).toBe(
      "ordner/download-protokoll.json",
    );
  });

  it("Medienadressen müssen exakt auf Schema, Host und Bucket passen", () => {
    expect(isAllowedMediaUrl(`${MEDIA_URL_PREFIX}pilot/hero.webp`)).toBe(true);
    expect(isAllowedMediaUrl(`${MEDIA_URL_PREFIX}../andere/x.webp`)).toBe(false);
    expect(isAllowedMediaUrl(`${MEDIA_URL_PREFIX}%2e%2e/x.webp`)).toBe(false);
    expect(isAllowedMediaUrl(`${MEDIA_URL_PREFIX}a%2fb.webp`)).toBe(false);
    expect(isAllowedMediaUrl(`${MEDIA_URL_PREFIX}a.webp?x=1`)).toBe(false);
    expect(isAllowedMediaUrl(`${MEDIA_URL_PREFIX}a.webp#f`)).toBe(false);
    expect(isAllowedMediaUrl(`${MEDIA_URL_PREFIX}`)).toBe(false);
    expect(isAllowedMediaUrl(MEDIA_URL_PREFIX.replace("https://", "http://") + "a.webp")).toBe(false);
    expect(isAllowedMediaUrl("https://evil.example/storage/v1/object/public/cms-assets/a.webp")).toBe(false);
    expect(isAllowedMediaUrl(`${MEDIA_URL_PREFIX}a b.webp`)).toBe(false);
  });

  it("Manifest verwirft Objekte ohne gültige Größe", () => {
    const res = buildMediaManifest(
      [
        { path: "ok.webp", size: 10, public_url: `${MEDIA_URL_PREFIX}ok.webp` } as never,
        { path: "neg.webp", size: -1, public_url: `${MEDIA_URL_PREFIX}neg.webp` } as never,
        { path: "fehlt.webp", public_url: `${MEDIA_URL_PREFIX}fehlt.webp` } as never,
        { path: "krumm.webp", size: 1.5, public_url: `${MEDIA_URL_PREFIX}krumm.webp` } as never,
        { path: "null.webp", size: null, public_url: `${MEDIA_URL_PREFIX}null.webp` } as never,
        { path: "leer.webp", size: "", public_url: `${MEDIA_URL_PREFIX}leer.webp` } as never,
        { path: "bool.webp", size: false, public_url: `${MEDIA_URL_PREFIX}bool.webp` } as never,
        { path: "nan.webp", size: Number.NaN, public_url: `${MEDIA_URL_PREFIX}nan.webp` } as never,
        { path: "nullbyte.webp", size: 0, public_url: `${MEDIA_URL_PREFIX}nullbyte.webp` } as never,
      ],
      [],
    );
    expect(res.entries.map((e) => e.path)).toEqual(["ok.webp", "nullbyte.webp"]);
    expect(res.unsafe.map((u) => u.path).sort()).toEqual([
      "bool.webp",
      "fehlt.webp",
      "krumm.webp",
      "leer.webp",
      "nan.webp",
      "neg.webp",
      "null.webp",
    ]);
    expect(res.unsafe.every((u) => u.reason.includes("Groesse"))).toBe(true);
  });

  it("Downloader hält den Zielordner mit Trennzeichen dicht", () => {
    const ps = buildPowerShellDownloader();
    expect(ps).toContain("DirectorySeparatorChar");
    expect(ps).toContain("StartsWith($zielWurzelMitTrenner");
    expect(ps).not.toContain("StartsWith($zielWurzel,");
    expect(ps).toContain("$PSScriptRoot");
    expect(ps).toContain("IsPathRooted($Ziel)");
  });

  it("Downloader prüft Vorfahren vor Ordnern und beendet Protokollfehler hart", () => {
    const ps = buildPowerShellDownloader();
    expect(ps).toContain("function Sind-ExistierendeVorfahrenSauber");
    expect(ps.indexOf("Sind-ExistierendeVorfahrenSauber $zielWurzelPfad")).toBeLessThan(
      ps.indexOf("New-Item -ItemType Directory -Path $zielWurzelPfad"),
    );
    expect(ps.indexOf("Sind-ExistierendeVorfahrenSauber $ordner")).toBeLessThan(
      ps.indexOf("New-Item -ItemType Directory -Path $ordner"),
    );
    expect(ps).toContain("Sind-ExistierendeVorfahrenSauber $protokollNeu");
    expect(ps).toContain('throw "Protokoll konnte nicht geschrieben werden:');
    expect(ps).toContain('throw "CSV-Protokoll konnte nicht geschrieben werden:');
    expect(ps).not.toContain('Write-Warning "Protokoll konnte nicht geschrieben werden:');
  });

  it("Downloader prüft die Windows-Pfadlänge VOR dem ersten Download", () => {
    const ps = buildPowerShellDownloader();
    // Erkennung: nur PowerShell 7+ kann lange Pfade; keine Systemänderung.
    expect(ps).toContain("$langePfadeMoeglich = ($PSVersionTable.PSVersion.Major -ge 6)");
    expect(ps).toContain("$maxDateipfad = 259");
    expect(ps).not.toMatch(/Set-ItemProperty|LongPathsEnabled|HKLM/);
    // Die Prüfung liegt vor der Download-Schleife und vor Invoke-WebRequest.
    const pruefung = ps.indexOf("$langePfadeMoeglich = (");
    expect(pruefung).toBeGreaterThan(-1);
    expect(pruefung).toBeLessThan(ps.indexOf("foreach ($e in $eintraege) {"));
    expect(pruefung).toBeLessThan(ps.indexOf("Invoke-WebRequest"));
    // Hilfreiche Meldung mit beiden Auswegen.
    expect(ps).toContain("Abbruch VOR dem ersten Download");
    expect(ps).toContain("PowerShell 7 benutzen");
    expect(ps).toContain("Kuerzeren Zielpfad benutzen");
    expect(ps).toContain("Es wurde nichts geladen, nichts geaendert und nichts geloescht.");
  });

  it("Downloader lehnt Null, Text, Boolean und Bruchgrößen vor int64-Konvertierung ab", () => {
    const ps = buildPowerShellDownloader();
    expect(ps).toContain('$e.size -ne $null');
    expect(ps).toContain('$rohGroesse -is [bool]');
    expect(ps).toContain('$rohGroesse -is [string]');
    expect(ps).toContain('[decimal]::Truncate($dezimalGroesse)');
    expect(ps).toContain('if (-not $groesseGueltig)');
  });

  it("Downloader prüft das Manifest selbst und erlaubt nur den eigenen Host", () => {
    const ps = buildPowerShellDownloader();
    expect(ps).toContain(`$erlaubterPrefix = "${MEDIA_URL_PREFIX}"`);
    expect(ps).toContain("StartsWith($erlaubterPrefix");
    expect(ps).toContain("-MaximumRedirection 0");
    expect(ps).toContain("-TimeoutSec $TimeoutSek");
    expect(ps).toContain("Ist-SichererZielpfad");
    expect(ps).toContain("con|prn|aux|nul|com[1-9]|lpt[1-9]");
    expect(ps).toContain("ReparsePoint");
    expect(ps).toContain("ToLowerInvariant");
    // Leeres/ungültiges Manifest ist niemals ein Erfolg.
    expect(ps).toContain('Write-Error "Manifest enthaelt keine Eintraege');
    expect(ps).toMatch(/inventory_errors[\s\S]{0,400}inventarProblem = \$true/);
    // Größe erst prüfen, dann Erfolg protokollieren.
    expect(ps.indexOf("Groesse weicht vom Manifest ab")).toBeLessThan(
      ps.indexOf('Merke $pfad "ok"'),
    );
    // Wiederaufnahme nur mit früherem Hash.
    expect(ps).toContain('$frueher.status -eq "ok"');
    expect(ps).toContain("$frueher.sha256");
    expect(ps).toContain("nicht ueberschrieben");
    // .partial erst nach Prüfung endgültig setzen.
    expect(ps.indexOf("$teilweise = ")).toBeLessThan(ps.indexOf("Move-Item -LiteralPath $teilweise"));
    // Strukturiertes Protokoll statt Semikolon-Bastelei.
    expect(ps).toContain("ConvertTo-Json");
    expect(ps).toContain("Export-Csv");
    expect(ps).not.toContain("pfad;status;bytes;sha256;meldung");
  });

  it("CSV-Serialisierung entschärft Trennzeichen und Umbrüche", () => {
    const csv = toCsv(["a", "b"], [['x;y', 'sagt "hallo"\nzweite']]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"x;y"');
    expect(csv).toContain('sagt ""hallo""');
    expect(csv.split("\n")).toHaveLength(3);
  });
});

describe("Gesamt-Export: Medieninventar am Server", () => {
  it("liest ueber die service-only RPCs statt rekursivem Ordner-Walk", () => {
    expect(FN_SRC).not.toContain("body.prefix");
    expect(FN_SRC).not.toContain(".list(");
    expect(FN_SRC).toContain("rpc_internal_storage_inventory_page");
    expect(FN_SRC).toContain("rpc_internal_storage_inventory_summary");
    expect(FN_SRC).toContain("summary_only");
    // Bucket bleibt serverseitig fest.
    expect(FN_SRC).toContain('const MEDIA_BUCKET = "cms-assets"');
  });

  it("summary_only nutzt das SQL-Aggregat und liefert keine Objektliste", () => {
    const block = FN_SRC.slice(FN_SRC.indexOf("if (body.summary_only === true)"));
    expect(block).toContain("rpc_internal_storage_inventory_summary");
    expect(block.slice(0, block.indexOf("const limit"))).not.toContain("objects:");
  });
});

describe("Medieninventar: Paging im Client", () => {
  it("sammelt mehr als 1000 Objekte ueber Keyset-Seiten", async () => {
    const seiten = [
      {
        bucket: "cms-assets",
        objects: Array.from({ length: MAX_BATCH }, (_, i) => ({
          path: `a/${String(i).padStart(5, "0")}.webp`,
          size: 10,
          mime_type: "image/webp",
          etag: null,
          updated_at: null,
          public_url: `${MEDIA_URL_PREFIX}a/${String(i).padStart(5, "0")}.webp`,
        })),
        returned: MAX_BATCH,
        next_after: "a/00999.webp",
        has_more: true,
        errors: [],
        truncated: false,
        taken_at: "t1",
      },
      {
        bucket: "cms-assets",
        objects: [
          {
            path: "b/letzte.webp",
            size: 5,
            mime_type: "image/webp",
            etag: null,
            updated_at: null,
            public_url: `${MEDIA_URL_PREFIX}b/letzte.webp`,
          },
        ],
        returned: 1,
        next_after: null,
        has_more: false,
        errors: [],
        truncated: false,
        taken_at: "t2",
      },
    ];
    let aufrufe = 0;
    const inv = await fetchStorageInventory(undefined, {
      call: async () => seiten[aufrufe++] as never,
    });
    expect(aufrufe).toBe(2);
    expect(inv.object_count).toBe(MAX_BATCH + 1);
    expect(inv.objects).toHaveLength(MAX_BATCH + 1);
    expect(inv.total_bytes).toBe(MAX_BATCH * 10 + 5);
    expect(inv.truncated).toBe(false);
  });

  it("uebernimmt Serverfehler und Abschneidung ins Inventar", async () => {
    const inv = await fetchStorageInventory(undefined, {
      call: async () => ({
        bucket: "cms-assets",
        objects: [],
        returned: 0,
        next_after: null,
        has_more: false,
        errors: ["Medieninventar: kaputt"],
        truncated: true,
        taken_at: "t",
      }) as never,
    });
    expect(inv.errors).toEqual(["Medieninventar: kaputt"]);
    expect(inv.truncated).toBe(true);
  });

  it("doppelter Cursor ist ein Fehler, keine stille Teilmenge", async () => {
    const seite = (next: string) => ({
      bucket: "cms-assets",
      objects: [],
      returned: 0,
      next_after: next,
      has_more: true,
      errors: [],
      truncated: false,
      taken_at: "t",
    });
    const folge = [seite("a"), seite("b"), seite("a")];
    let i = 0;
    await expect(
      fetchStorageInventory(undefined, { call: async () => folge[i++] as never }),
    ).rejects.toThrow(/h(ä|ae)ngt/i);
  });

  it("haengender Cursor ist ein Fehler", async () => {
    await expect(
      fetchStorageInventory(undefined, {
        call: async () =>
          ({
            bucket: "cms-assets",
            objects: [],
            returned: 0,
            next_after: null,
            has_more: true,
            errors: [],
            truncated: false,
            taken_at: "t",
          }) as never,
      }),
    ).rejects.toThrow(/unvollst/i);
  });

  it("Abbruch waehrend des Pagings ist sofort endgueltig", async () => {
    const c = new AbortController();
    let aufrufe = 0;
    const promise = fetchStorageInventory(c.signal, {
      call: async () => {
        aufrufe += 1;
        c.abort();
        return {
          bucket: "cms-assets",
          objects: [],
          returned: 0,
          next_after: "x",
          has_more: true,
          errors: [],
          truncated: false,
          taken_at: "t",
        } as never;
      },
    });
    await expect(promise).rejects.toBeInstanceOf(ExportAbortError);
    expect(aufrufe).toBe(1);
  });

  it("Paging-Limit erschoepft meldet Unvollstaendigkeit", async () => {
    let n = 0;
    await expect(
      fetchStorageInventory(undefined, {
        maxPages: 2,
        call: async () => {
          n += 1;
          return {
            bucket: "cms-assets",
            objects: [],
            returned: 0,
            next_after: `c${n}`,
            has_more: true,
            errors: [],
            truncated: false,
            taken_at: "t",
          } as never;
        },
      }),
    ).rejects.toThrow(/Paging-Limit/);
  });
});

describe("Nur-Medienpaket", () => {
  it("liest ausschliesslich Inventar, Summen und cms_assets", async () => {
    fakeToken = "freigabe";
    const objekt = {
      path: "seite/held/desktop/bild.webp",
      size: 12,
      mime_type: "image/webp",
      etag: null,
      updated_at: "2026-09-14T13:00:00Z",
      public_url: `${MEDIA_URL_PREFIX}seite/held/desktop/bild.webp`,
    };
    invokeResult = { data: {}, error: null };
    const original = invokeCalls.length;
    // Antworten je Aktion nachbilden.
    const antwort = (body: Record<string, unknown>) => {
      if (body.action === "storage_inventory" && body.summary_only === true) {
        return { bucket: "cms-assets", object_count: 1, total_bytes: 12, errors: [], truncated: false, taken_at: "t" };
      }
      if (body.action === "storage_inventory") {
        return {
          bucket: "cms-assets",
          objects: [objekt],
          returned: 1,
          next_after: null,
          has_more: false,
          errors: [],
          truncated: false,
          taken_at: "t",
        };
      }
      if (body.action === "rows") {
        return {
          table: "cms_assets",
          key: "id",
          rows: [{ id: "1", storage_path: objekt.path, public_url: objekt.public_url, page_key: "p", section_key: "s", field_key: "f" }],
          returned: 1,
          next_after: null,
          has_more: false,
        };
      }
      throw new Error(`unerwartete Aktion: ${String(body.action)}`);
    };
    invokeHandler = antwort;
    try {
      const out = await buildMediaOnlyZip();
      expect(out.fileName).toContain("cms-light-media-only-");
      expect(out.status).toBe("complete");
      const m = out.manifest as Record<string, any>;
      expect(m.tables_read).toEqual(["cms_assets"]);
      expect(m.media.object_count).toBe(1);
      expect(m.media.manifest_entries).toBe(1);
      const pfade = (m.files as Array<{ path: string }>).map((f) => f.path);
      expect(pfade).toContain("media/Download-Medien.ps1");
      expect(pfade).toContain("media/media-manifest.json");
      expect(pfade).not.toContain("tables/cms_pages.json");
      const gelesen = invokeCalls.slice(original).map((c) => (c.options.body as Record<string, unknown>).table);
      expect(new Set(gelesen.filter(Boolean))).toEqual(new Set(["cms_assets"]));
    } finally {
      invokeHandler = null;
      invokeCalls.length = original;
    }
  });

  const objekt = {
    path: "seite/held/desktop/bild.webp",
    size: 12,
    mime_type: "image/webp",
    etag: null,
    updated_at: "2026-09-14T13:00:00Z",
    public_url: `${MEDIA_URL_PREFIX}seite/held/desktop/bild.webp`,
  };
  /** Baut einen Antwortgeber; die Summen kommen als Folge (vorher, nachher). */
  const summenFolge = (summen: Array<Record<string, unknown>>) => {
    let i = 0;
    return (body: Record<string, unknown>) => {
      if (body.action === "storage_inventory" && body.summary_only === true) {
        const s = summen[Math.min(i, summen.length - 1)];
        i += 1;
        return s;
      }
      if (body.action === "storage_inventory") {
        return {
          bucket: "cms-assets",
          objects: [objekt],
          returned: 1,
          next_after: null,
          has_more: false,
          errors: [],
          truncated: false,
          taken_at: "t",
        };
      }
      if (body.action === "rows") {
        return { table: "cms_assets", key: "id", rows: [], returned: 0, next_after: null, has_more: false };
      }
      throw new Error(`unerwartete Aktion: ${String(body.action)}`);
    };
  };
  const summe = (extra: Record<string, unknown> = {}) => ({
    bucket: "cms-assets",
    object_count: 1,
    total_bytes: 12,
    max_updated_at: "2026-09-14T13:00:00Z",
    invalid_size_count: 0,
    errors: [],
    truncated: false,
    taken_at: "t",
    ...extra,
  });

  it("Vorzählung mit Fehler oder Abschneidung ist niemals vollständig", async () => {
    fakeToken = "freigabe";
    invokeHandler = summenFolge([summe({ errors: ["kaputt"] }), summe()]);
    try {
      const a = await buildMediaOnlyZip();
      expect(a.status).toBe("incomplete");
      expect((a.manifest as any).status_reasons.join(" ")).toContain("Vorzählung");
    } finally {
      invokeHandler = null;
    }
    invokeHandler = summenFolge([summe({ truncated: true }), summe()]);
    try {
      const b = await buildMediaOnlyZip();
      expect(b.status).toBe("incomplete");
    } finally {
      invokeHandler = null;
    }
  });

  it("Unterschied zwischen Vor- und Nachzählung ergibt 'changed'", async () => {
    fakeToken = "freigabe";
    // Anzahl weicht ab.
    invokeHandler = summenFolge([summe(), summe({ object_count: 2 })]);
    try {
      const a = await buildMediaOnlyZip();
      expect(a.status).toBe("changed");
      expect((a.manifest as any).media.summary_matches).toBe(false);
      expect((a.manifest as any).status_reasons.join(" ")).toContain("Vor- und Nachzählung");
    } finally {
      invokeHandler = null;
    }
    // Bytes weichen ab.
    invokeHandler = summenFolge([summe(), summe({ total_bytes: 13 })]);
    try {
      expect((await buildMediaOnlyZip()).status).toBe("changed");
    } finally {
      invokeHandler = null;
    }
    // Letzte Änderung weicht ab.
    invokeHandler = summenFolge([summe(), summe({ max_updated_at: "2026-09-14T14:00:00Z" })]);
    try {
      const c = await buildMediaOnlyZip();
      expect(c.status).toBe("changed");
      expect((c.manifest as any).media.recount.max_updated_at).toBe("2026-09-14T14:00:00Z");
    } finally {
      invokeHandler = null;
    }
  });

  it("gleiche Vor- und Nachzählung inklusive letzter Änderung bleibt vollständig", async () => {
    fakeToken = "freigabe";
    invokeHandler = summenFolge([summe(), summe()]);
    try {
      const out = await buildMediaOnlyZip();
      expect(out.status).toBe("complete");
      expect((out.manifest as any).media.summary_matches).toBe(true);
    } finally {
      invokeHandler = null;
    }
  });

  it("Objekt ohne gültige Größe gilt als unsicher und nie als vollständig", async () => {
    const { entries, unsafe } = buildMediaManifest(
      [{ ...objekt, size: null } as any],
      [],
    );
    expect(entries).toHaveLength(0);
    expect(unsafe[0].reason).toContain("Groesse");
    fakeToken = "freigabe";
    invokeHandler = (body: Record<string, unknown>) => {
      if (body.action === "storage_inventory" && body.summary_only === true) return summe({ invalid_size_count: 1, errors: ["1 Objekt ohne gültige Größenangabe"] });
      if (body.action === "storage_inventory") {
        return {
          bucket: "cms-assets",
          objects: [{ ...objekt, size: null }],
          returned: 1,
          next_after: null,
          has_more: false,
          errors: ["Objekt ohne gültige Größenangabe: seite/held/desktop/bild.webp"],
          truncated: false,
          taken_at: "t",
        };
      }
      return { table: "cms_assets", key: "id", rows: [], returned: 0, next_after: null, has_more: false };
    };
    try {
      const out = await buildMediaOnlyZip();
      expect(out.status).toBe("incomplete");
    } finally {
      invokeHandler = null;
    }
  });

  it("Serverabfragen zählen ALLE Objekte des Buckets und machen fehlende Größen nicht zu 0", () => {
    // Edge: keine stille 0, sondern null plus Fehlermeldung.
    expect(FN_SRC).not.toContain("Number(r.object_size ?? 0)");
    expect(FN_SRC).toContain("let size: number | null = null;");
    expect(FN_SRC).toContain("Objekt ohne gültige Größenangabe:");
    expect(FN_SRC).toContain("invalid_size_count");
  });

});
