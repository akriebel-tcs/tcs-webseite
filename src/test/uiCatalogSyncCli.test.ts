// @vitest-environment node
/**
 * TATSÄCHLICH AUSGEFÜHRTE Prüfung des Aufrufskripts für den
 * Katalogabgleich. Das Skript wird als echter Kindprozess gegen einen
 * lokalen Testserver gestartet, der alte/neue Serverdienste, alte
 * Datenbanken und widersprüchliche Antworten nachbildet.
 *
 * Keine Verbindung zur laufenden Datenbank, kein echter Serverdienst.
 */
import { spawn } from "node:child_process";
import { createServer, type Server } from "node:http";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const SCRIPT = resolve(process.cwd(), "scripts/i18n/ui-catalog-sync.mjs");

type Handler = (action: string) => { status: number; body: unknown };

let server: Server | undefined;
const seen: string[] = [];

async function start(handler: Handler): Promise<string> {
  seen.length = 0;
  server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const action = String(JSON.parse(raw || "{}").action ?? "");
      seen.push(action);
      const { status, body } = handler(action);
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(body));
    });
  });
  await new Promise<void>((ok) => server!.listen(0, "127.0.0.1", ok));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return `http://127.0.0.1:${port}`;
}

afterEach(async () => {
  if (server) await new Promise<void>((ok) => server!.close(() => ok()));
  server = undefined;
});

async function run(url: string, args: string[] = []) {
  // Bewusst asynchron: ein blockierender Kindprozess würde den Testserver
  // im selben Prozess ausbremsen.
  const child = spawn(process.execPath, [SCRIPT, ...args], {
    env: {
      ...process.env,
      VITE_SUPABASE_URL: url,
      VITE_SUPABASE_PUBLISHABLE_KEY: "test-anon",
      CMS_TRANSLATION_GLOBAL_TOKEN: "test-token",
    },
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (c) => (stdout += String(c)));
  child.stderr.on("data", (c) => (stderr += String(c)));
  const status = await new Promise<number>((ok) => child.on("close", (code) => ok(code ?? -1)));
  return { status, stdout, stderr };
}

const goodCaps = {
  capabilities: {
    protocol_version: 2,
    contract: "ui_catalog_sync_additive",
    writes: "insert_only",
    trigger_suppression_supported: true,
  },
  edge_protocol_version: 2,
};

const goodDryRun = {
  dry_run: true,
  run_started: false,
  sync: { success: true, applied: false, dry_run: true, protocol_version: 2, report: {} },
};

describe("Aufrufskript Katalogabgleich (ausgeführt)", () => {
  it("bricht bei unbekannten Schaltern ab, auch mit --apply", async () => {
    const url = await start(() => ({ status: 200, body: goodCaps }));
    const out = await run(url, ["--apply", "--force"]);
    expect(out.status).toBe(2);
    expect(out.stderr).toContain("Unbekannte Angabe");
    expect(seen).toEqual([]);
  });

  it("schreibt nicht, wenn der Serverdienst die Protokollaktion nicht kennt (alter Dienst)", async () => {
    const url = await start((action) =>
      action === "ui_catalog_sync_capabilities"
        ? { status: 400, body: { error: "unknown_action" } }
        : { status: 200, body: { sync: { success: true, applied: true } } },
    );
    const out = await run(url, ["--apply"]);
    expect(out.status).toBe(1);
    expect(out.stderr).toContain("NICHTS geschrieben");
    expect(seen).toEqual(["ui_catalog_sync_capabilities"]);
  });

  it("schreibt nicht, wenn die Datenbank den Protokollstand nicht kennt (alte Datenbank)", async () => {
    const url = await start(() => ({ status: 409, body: { error: "db_protocol_unknown" } }));
    const out = await run(url, ["--apply"]);
    expect(out.status).toBe(1);
    expect(seen).toEqual(["ui_catalog_sync_capabilities"]);
  });

  it("schreibt nicht bei fehlender oder unbrauchbarer Antwort", async () => {
    const url = await start(() => ({ status: 200, body: { irgendwas: true } }));
    const out = await run(url);
    expect(out.status).toBe(1);
    expect(seen).toEqual(["ui_catalog_sync_capabilities"]);
  });

  it("schreibt nicht bei abweichender Protokollversion", async () => {
    const url = await start(() => ({
      status: 200,
      body: { capabilities: { protocol_version: 1, writes: "insert_only" }, edge_protocol_version: 2 },
    }));
    const out = await run(url, ["--apply"]);
    expect(out.status).toBe(1);
    expect(out.stderr).toContain("Protokollstand passt nicht");
    expect(seen).toEqual(["ui_catalog_sync_capabilities"]);
  });

  it("schreibt nicht, wenn der Trigger-Vertrag fehlt", async () => {
    const url = await start(() => ({
      status: 200,
      body: {
        capabilities: { protocol_version: 2, writes: "insert_only", trigger_suppression_supported: false },
        edge_protocol_version: 2,
      },
    }));
    const out = await run(url, ["--apply"]);
    expect(out.status).toBe(1);
    expect(out.stderr).toContain("Trigger-Vertrag");
    expect(seen).toEqual(["ui_catalog_sync_capabilities"]);
  });

  it("behauptet bei widersprüchlicher Antwort keinen Erfolg", async () => {
    const url = await start((action) =>
      action === "ui_catalog_sync_capabilities"
        ? { status: 200, body: goodCaps }
        : {
            status: 200,
            // Vorschau angefordert, Server meldet Anwendung
            body: { dry_run: false, sync: { success: true, applied: true, dry_run: false, protocol_version: 2 } },
          },
    );
    const out = await run(url);
    expect(out.status).toBe(1);
    expect(out.stderr).toContain("widerspricht dem angeforderten Modus");
    expect(out.stdout).not.toContain("Nur Vorschau");
  });

  it("akzeptiert kein fehlendes applied", async () => {
    const url = await start((action) =>
      action === "ui_catalog_sync_capabilities"
        ? { status: 200, body: goodCaps }
        : {
            status: 200,
            body: { dry_run: true, sync: { success: true, dry_run: true, protocol_version: 2 } },
          },
    );
    const out = await run(url);
    expect(out.status).toBe(1);
    expect(out.stderr).toContain("widerspricht dem angeforderten Modus");
    expect(out.stdout).not.toContain("Nur Vorschau");
  });

  it("akzeptiert kein applied=null", async () => {
    const url = await start((action) =>
      action === "ui_catalog_sync_capabilities"
        ? { status: 200, body: goodCaps }
        : {
            status: 200,
            body: {
              dry_run: false,
              run_started: false,
              sync: { success: true, applied: null, dry_run: false, protocol_version: 2 },
            },
          },
    );
    const out = await run(url, ["--apply"]);
    expect(out.status).toBe(1);
    expect(out.stderr).toContain("widerspricht dem angeforderten Modus");
    expect(out.stdout).not.toContain("abgeglichen");
  });

  it("führt die Vorschau durch, wenn Protokoll und Antwort stimmen", async () => {
    const url = await start((action) =>
      action === "ui_catalog_sync_capabilities"
        ? { status: 200, body: goodCaps }
        : { status: 200, body: goodDryRun },
    );
    const out = await run(url);
    expect(out.status).toBe(0);
    expect(out.stdout).toContain("Nur Vorschau");
    expect(seen).toEqual(["ui_catalog_sync_capabilities", "sync_ui_catalog"]);
  });

  it("meldet beim Anwenden, wenn die Unterdrückung nicht bestätigt ist", async () => {
    const url = await start((action) =>
      action === "ui_catalog_sync_capabilities"
        ? { status: 200, body: goodCaps }
        : {
            status: 200,
            body: {
              dry_run: false,
              run_started: true,
              sync: { success: true, applied: true, dry_run: false, protocol_version: 2 },
            },
          },
    );
    const out = await run(url, ["--apply"]);
    expect(out.status).toBe(1);
    expect(out.stderr).toContain("nicht als unterdrückt bestätigt");
  });
});
