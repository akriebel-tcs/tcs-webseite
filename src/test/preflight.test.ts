/**
 * Tests der lokalen Abschlussprüfung (`npm run cms:preflight`).
 *
 * Die Ausführung der Prüfschritte wird injiziert — es läuft in diesen Tests
 * bewusst kein echter Build und kein echtes Vitest. Die CLI-Schicht wird
 * zusätzlich über Testtreiber in echten Child-Prozessen geprüft.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

import {
  PREFLIGHT_STEPS,
  isDirectInvocation,
  runPreflight,
} from "../../scripts/ci/preflight.mjs";

interface Step {
  name: string;
  command: string;
  args: string[];
}

type FakeResult = { status?: number | null; signal?: string | null; error?: Error };

function makeRunner(results: Record<string, FakeResult>) {
  const calls: string[] = [];
  const run = (step: Step): FakeResult => {
    calls.push(step.name);
    return results[step.name] ?? { status: 0 };
  };
  return { run, calls };
}

const steps: Step[] = [
  { name: "A", command: "npx", args: ["a"] },
  { name: "B", command: "npx", args: ["b"] },
  { name: "C", command: "npm", args: ["run", "c"] },
];

describe("cms:preflight Orchestrierung", () => {
  it("führt bei Erfolg alle Schritte in Reihenfolge aus und gibt Exitcode 0", () => {
    const { run, calls } = makeRunner({});
    const result = runPreflight(steps, { run, log: () => {} });
    expect(result.ok).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(calls).toEqual(["A", "B", "C"]);
  });

  it("bricht beim ersten Schritt ab und startet keine weiteren Prüfungen", () => {
    const { run, calls } = makeRunner({ A: { status: 2 } });
    const result = runPreflight(steps, { run, log: () => {} });
    expect(result.ok).toBe(false);
    expect(result.failedStep).toBe("A");
    expect(result.exitCode).toBe(2);
    expect(calls).toEqual(["A"]);
  });

  it("bricht bei einem Fehler in der Mitte ab und reicht den Exitcode durch", () => {
    const { run, calls } = makeRunner({ B: { status: 7 } });
    const result = runPreflight(steps, { run, log: () => {} });
    expect(result.ok).toBe(false);
    expect(result.failedStep).toBe("B");
    expect(result.exitCode).toBe(7);
    expect(calls).toEqual(["A", "B"]);
  });

  it("behandelt einen Startfehler als Fehlschlag (kein stilles Grün)", () => {
    const { run, calls } = makeRunner({ A: { error: new Error("ENOENT") } });
    const result = runPreflight(steps, { run, log: () => {} });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("start_error");
    expect(result.exitCode).toBe(1);
    expect(calls).toEqual(["A"]);
  });

  it("behandelt eine Ausnahme beim Starten als Fehlschlag", () => {
    const calls: string[] = [];
    const result = runPreflight(steps, {
      log: () => {},
      run: (step: Step) => {
        calls.push(step.name);
        throw new Error("spawn nicht möglich");
      },
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("start_error");
    expect(calls).toEqual(["A"]);
  });

  it("wertet Abbruch per Signal als Fehlschlag", () => {
    const { run } = makeRunner({ B: { status: null, signal: "SIGTERM" } });
    const result = runPreflight(steps, { run, log: () => {} });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("signal");
    expect(result.exitCode).toBe(1);
  });

  it("nutzt nur lokale, nicht mutierende und nicht DB-abhängige Prüfungen", () => {
    const flat = (PREFLIGHT_STEPS as Step[]).map((s) => `${s.command} ${s.args.join(" ")}`);
    expect(flat).toEqual([
      "npx tsc -p tsconfig.app.json --noEmit",
      "npx tsc -p tsconfig.node.json --noEmit",
      "npx vitest run",
      "npm run i18n:contract",
      "npm run build",
    ]);
    const verboten = ["sync", "export", "wahrheit", "audit", "supabase", "publish", "translation"];
    for (const entry of flat) {
      for (const wort of verboten) {
        expect(entry.toLowerCase()).not.toContain(wort);
      }
    }
  });

  it("prüft beide echten TS-Konfigurationen ausdrücklich mit -p und ohne Emit", () => {
    const tscSteps = (PREFLIGHT_STEPS as Step[]).filter((s) => s.args[0] === "tsc");
    expect(tscSteps).toHaveLength(2);
    const projects = tscSteps.map((s) => s.args[s.args.indexOf("-p") + 1]).sort();
    expect(projects).toEqual(["tsconfig.app.json", "tsconfig.node.json"]);
    for (const step of tscSteps) {
      // tsconfig.json ist eine reine Verweis-Datei (files: [] + references);
      // ein `tsc --noEmit` ohne -p wäre grün, ohne etwas zu prüfen.
      expect(step.args).toContain("--noEmit");
      expect(step.args).toContain("-p");
    }
  });

  it("verwendet kein `tsc --noEmit` ohne Projektangabe (Scheingrün am Root)", () => {
    for (const step of PREFLIGHT_STEPS as Step[]) {
      if (step.args[0] !== "tsc") continue;
      expect(step.args.includes("-p") || step.args.includes("--project")).toBe(true);
    }
  });

  it("verkettet npm-Skripte plattformneutral mit && (kein Semikolon)", async () => {
    const pkg = JSON.parse(
      await (await import("node:fs/promises")).readFile("package.json", "utf8"),
    ) as { scripts: Record<string, string> };

    // Ein `;` maskiert unter POSIX den Exitcode des ersten Befehls und wird
    // unter Windows (cmd.exe) sogar als Teil des Dateinamens interpretiert.
    for (const [name, value] of Object.entries(pkg.scripts)) {
      expect(`${name}: ${value}`).not.toContain(";");
    }
    expect(pkg.scripts["i18n:contract"]).toContain("&&");
    expect(pkg.scripts["cms:preflight"]).toBe("node scripts/ci/preflight.mjs");
  });
});


describe("cms:preflight CLI-Erkennung", () => {
  const scriptPath = resolvePath("scripts/ci/preflight.mjs");

  function runInChild(steps: Step[], modulePath = scriptPath) {
    const dir = mkdtempSync(join(tmpdir(), "preflight-driver-"));
    const driver = join(dir, "driver.mjs");
    writeFileSync(driver,
      `import { runPreflight } from ${JSON.stringify(pathToFileURL(modulePath).href)};\n` +
      `process.exit(runPreflight(${JSON.stringify(steps)}).exitCode);\n`,
    );
    return spawnSync(process.execPath, [driver], { encoding: "utf8", timeout: 15000 });
  }

  it("erlaubt keinen Umgebungs-Schalter zum Ersetzen der CLI-Pflichtpruefungen", () => {
    const source = readFileSync(scriptPath, "utf8");
    expect(source).not.toContain("PREFLIGHT_STEPS_JSON");
    expect(source).toContain("const result = runPreflight();");
  });

  it("erkennt den direkten Aufruf über pathToFileURL", () => {
    const url = pathToFileURL(scriptPath).href;
    expect(isDirectInvocation(scriptPath, url)).toBe(true);
  });

  it("erkennt Pfade mit # und % korrekt (kein stilles Exit 0)", () => {
    for (const dir of ["/tmp/pre#flight", "/tmp/pre%20flight", "/tmp/a%2Fb#c"]) {
      const pfad = `${dir}/preflight.mjs`;
      const url = pathToFileURL(pfad).href;
      // Die alte, falsche Variante:
      const naiv = new URL(`file://${pfad}`).href;
      expect(isDirectInvocation(pfad, url)).toBe(true);
      // Beweis, dass die naive Variante hier abweicht (also still grün wäre):
      expect(naiv).not.toBe(url);
      expect(isDirectInvocation(pfad, naiv)).toBe(false);
    }
  });

  it("erkennt einen fremden Modulpfad nicht als direkten Aufruf", () => {
    expect(isDirectInvocation("/tmp/anderes.mjs", pathToFileURL(scriptPath).href)).toBe(false);
    expect(isDirectInvocation(undefined, pathToFileURL(scriptPath).href)).toBe(false);
  });

  it("reicht im echten Child-Prozess den Exitcode eines fehlgeschlagenen Schritts durch", () => {
    const basis = mkdtempSync(join(tmpdir(), "preflight-"));
    const ordner = join(basis, "pfad #mit %zeichen");
    mkdirSync(ordner, { recursive: true });
    const ziel = join(ordner, "preflight.mjs");
    copyFileSync(scriptPath, ziel);

    const steps = [
      { name: "OK", command: process.execPath, args: ["-e", "process.exit(0)"] },
      { name: "ROT", command: process.execPath, args: ["-e", "process.exit(3)"] },
      { name: "NIE", command: process.execPath, args: ["-e", "process.exit(0)"] },
    ];

    const result = runInChild(steps, ziel);

    expect(result.status).toBe(3);
    expect(result.stdout).toContain("ROT");
    expect(result.stdout).not.toContain("✔ NIE");
  });

  it("liefert im echten Child-Prozess Exitcode 0, wenn alle Schritte grün sind", () => {
    const steps = [{ name: "OK", command: process.execPath, args: ["-e", "process.exit(0)"] }];
    const result = runInChild(steps);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("✔ OK");
  });

  it("behandelt einen nicht startbaren Befehl im echten Child-Prozess als Fehler", () => {
    const steps = [
      { name: "FEHLT", command: "dieses-kommando-existiert-nicht-xyz", args: [] },
    ];
    const result = runInChild(steps);
    expect(result.status).not.toBe(0);
  });
});
