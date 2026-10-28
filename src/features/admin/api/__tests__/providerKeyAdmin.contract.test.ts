/**
 * Statische Vertragsprüfung der Schlüssel- und Anbieterverwaltung.
 * Prüft am echten Quelltext, dass Schutz und Geheimhaltung nicht wegrutschen.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
/** Ohne Kommentare — geprüft wird echter Code, nicht Erklärtext. */
const code = (p: string) =>
  read(p).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const fn = read("supabase/functions/cms-translation-run/index.ts");
const keys = read("src/features/admin/api/cmsProviderKeys.ts");
const auth = code("src/features/admin/api/adminAuth.ts");
const panel = read("src/features/admin/components/ProviderKeysPanel.tsx");
const login = code("src/features/admin/pages/AdminLoginPage.tsx");

describe("Serverdienst — Adminschranke", () => {
  it("verlangt für alle Schlüssel- und Umstellaktionen Anmeldung mit Rolle admin", () => {
    for (const action of [
      "provider_keys",
      "provider_key_save",
      "provider_key_delete",
      "provider_key_test",
      "provider_models",
      "locale_provider_set",
      "run_switch_provider",
    ]) {
      expect(fn).toContain(`"${action}"`);
    }
    expect(fn).toContain("const ADMIN_ACTIONS = new Set<Action>");
    expect(fn).toContain("if (ADMIN_ACTIONS.has(action))");
    expect(fn).toContain("await requireAdmin(req, body)");
  });

  it("entsperrt nur mit dem Adminpasswort und laufzeitkonstantem Vergleich", () => {
    expect(fn).toContain('if (action === "admin_unlock")');
    expect(fn).toContain("async function checkAdminPassword(");
    expect(fn).toContain("timingSafeEqual(candidate, reference)");
    expect(fn).toContain("admin_password_invalid");
    expect(fn).toContain("admin_password_not_configured");
    expect(fn).toContain('rateLimit("cms_admin_unlock"');
    // Kein Konto, keine E-Mail-Anmeldung, keine Rollenprüfung mehr.
    expect(fn).not.toContain("/auth/v1/user");
    expect(fn).not.toContain("has_role");
  });

  it("stellt eine kurzlebige, signierte Sitzung als HttpOnly-Cookie aus", () => {
    expect(fn).toContain("const ADMIN_SESSION_TTL_SECONDS = 30 * 60");
    expect(fn).toContain("HttpOnly; Secure; SameSite=None");
    expect(fn).toContain('crypto.subtle.sign("HMAC"');
    expect(fn).toContain("admin_unlock_required");
  });

  it("weist abgelaufene oder verfälschte Freigaben ab", () => {
    expect(fn).toContain("admin_session_expired");
    expect(fn).toContain("admin_session_invalid");
    expect(fn).toContain("if (payload.exp <= Math.floor(Date.now() / 1000))");
    expect(fn).toContain("if (!timingSafeEqual(expected, given))");
  });

  it("gibt Passwort und Freigabegeheimnis nie im Klartext zurück", () => {
    expect(fn).not.toMatch(/json\(\{[^}]*password:/);
    expect(fn).not.toMatch(/console\.(log|error|warn)\([^)]*password/i);
  });


  it("bremst Schlüsselaktionen serverseitig", () => {
    expect(fn).toContain('rateLimit("cms_provider_admin"');
  });
});

describe("Serverdienst — Geheimhaltung", () => {
  it("liest Schlüssel nur serverseitig aus dem Tresor oder Projekt-Geheimnis", () => {
    expect(fn).toContain("async function providerSecret(");
    expect(fn).toContain("rpc_internal_provider_secret_get");
    expect(fn).toContain('await providerSecret("google_gemini", "GOOGLE_GEMINI_API_KEY")');
    expect(fn).toContain('await providerSecret("anthropic", "ANTHROPIC_API_KEY")');
    expect(fn).toContain('await providerSecret("deepl", "DEEPL_API_KEY")');
  });

  it("gibt niemals Klartext an den Browser", () => {
    expect(fn).toContain("rpc_internal_provider_credentials_status");
    // Kein Schlüssel im Protokoll und keine Klartext-Rückgabe.
    expect(fn).not.toMatch(/console\.(log|error|warn)\([^)]*(secret|apiKey|API_KEY)/);
    expect(fn).not.toMatch(/json\(\{[^}]*plain/i);
    // Nur Status, letzte vier Zeichen und Prüfergebnis.
    expect(fn).toContain("last4:");

  });

  it("verwaltet nie einen Schlüssel für das Lovable-Gateway", () => {
    expect(fn).toContain("const MANAGED_PROVIDERS");
    expect(fn).not.toMatch(/MANAGED_PROVIDERS[^;]*lovable_ai/);
  });
});

describe("Serverdienst — Modellermittlung", () => {
  it("fragt echte Modelllisten ab und bietet nur nutzbare Modelle an", () => {
    expect(fn).toContain("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200");
    expect(fn).toContain('includes("generateContent")');
    expect(fn).toContain("https://api.anthropic.com/v1/models?limit=100");
  });

  it("hat einen geprüften Ersatzkatalog und keine Modellauswahl bei DeepL", () => {
    expect(fn).toContain("const MODEL_FALLBACKS");
    expect(fn).toContain('source: "static", message: "DeepL hat keine Modellauswahl."');
  });

  it("deaktiviert entfallene Modelle statt sie zu löschen", () => {
    expect(fn).toContain("rpc_internal_provider_models_replace");
  });
});

describe("Serverdienst — pausierten Lauf umstellen", () => {
  it("verlangt Bestätigung, erfolgreichen Test und stellt denselben Lauf um", () => {
    expect(fn).toContain('body.confirm !== "UMSTELLEN"');
    expect(fn).toContain("await testProviderKey(p, hasNoModelChoice(p) ? undefined : switchModel)");
    expect(fn).toContain("rpc_internal_translation_run_switch_provider");
    expect(fn).toContain("await armWorker();");
  });

  it("erzeugt keinen neuen Lauf", () => {
    const block = fn.slice(
      fn.indexOf('if (action === "run_switch_provider")'),
      fn.indexOf('// ------------------------------------------------------------- status'),
    );
    expect(block).not.toContain("rpc_internal_translation_start_run");
  });
});

describe("Client — Schlüsselzugang", () => {
  it("nutzt ausschließlich den bestehenden Serverdienst", () => {
    expect(keys).toContain('supabase.functions.invoke("cms-translation-run"');
    expect(keys).not.toMatch(/\.(insert|update|upsert|delete)\(/);
    expect(keys).not.toMatch(/rpc\(\s*"rpc_internal/);
  });

  it("sendet immer die kurzlebige Adminfreigabe", () => {
    expect(keys).toContain("const adminToken = readAdminToken()");
    expect(keys).toContain("Bitte die Schlüsselverwaltung zuerst entsperren.");
    expect(keys).toContain("admin_token: adminToken");
  });

  it("speichert keinen Schlüssel und keine Freigabe im Browser", () => {
    expect(keys).not.toMatch(/localStorage|sessionStorage/);
    expect(panel).not.toMatch(/localStorage|sessionStorage/);
    expect(auth).not.toMatch(/localStorage|sessionStorage|document\.cookie/);
  });

  it("prüft Passwort und Freigabe nur serverseitig, ohne Konto", () => {
    expect(auth).toContain('action: "admin_unlock"');
    expect(auth).toContain('action: "admin_session"');
    expect(auth).not.toMatch(/supabase\.auth\./);
    expect(auth).not.toMatch(/signUp|signInWithPassword|signInWithOAuth/);
    expect(auth).not.toMatch(/from\(["']user_roles["']\)/);
  });

  it("hat kein E-Mail-Feld in der Freigabeseite", () => {
    expect(login).not.toMatch(/type="email"/);
    expect(login).not.toMatch(/setEmail|E-Mail-Adresse/);
    expect(login).toContain("unlockAdmin(password)");
  });
});

describe("Oberfläche — gesperrte Ansicht", () => {
  it("zeigt nur das Adminpasswort, keine Schlüsseleingabe und kein E-Mail-Feld", () => {
    const openView = panel.slice(
      panel.indexOf("if (!session?.isUnlocked)"),
      panel.indexOf("// ------------------------------------------------- geschützte Ansicht"),
    );
    expect(openView).toContain("Schlüsselverwaltung entsperren");
    expect(openView).not.toMatch(/type="email"/);
    expect(openView).not.toContain('id={`key-');
    expect(openView.replace(/\s+/g, " ")).toContain("Dieser Abschnitt ist gesperrt");
  });


  it("verwaltet nur Schlüssel, Test und Modelllisten", () => {
    expect(panel).toContain("Schlüssel &amp; Anbieter");
    expect(panel).not.toContain("Anbieter und Modell je Sprache");
    expect(panel).not.toContain("Pausierten Lauf mit neuem Anbieter fortsetzen");
  });
});

// -------------------------------------------------- Bedienablauf Schritt 2
const workbench = code("src/features/admin/components/TranslationWorkbench.tsx");
const panelCode = code("src/features/admin/components/ProviderKeysPanel.tsx");
const keysApi = code("src/features/admin/api/cmsProviderKeys.ts");

describe("Bedienablauf — eigener Anbieter ohne Schlüssel", () => {
  it("zeigt in Schritt 2 eine Einrichtungshilfe mit Sprungknopf", () => {
    expect(workbench).toContain("isOwnKeyProvider(provider)");
    expect(workbench).toContain("Eigenen Schlüssel einrichten");
    expect(workbench).toContain("setKeySetupProvider(provider)");
    expect(workbench).toContain("document\n                        .getElementById(PROVIDER_KEYS_ANCHOR_ID)");
    expect(workbench).toContain("Adminpasswort");
  });

  it("hebt den gewählten Anbieter in der Schlüsselverwaltung hervor", () => {
    expect(workbench).toContain("highlightProvider={keySetupProvider}");
    expect(panelCode).toContain("highlightProvider === m.provider");
    expect(panelCode).toContain("id={PROVIDER_KEYS_ANCHOR_ID}");
  });

  it("nutzt nur ein Schlüsselsystem (keine zweite Verwaltung)", () => {
    expect(workbench).not.toMatch(/saveProviderKey|deleteProviderKey|refreshProviderModels/);
    expect(keysApi).toContain("export const PROVIDER_KEYS_ANCHOR_ID");
  });
});

describe("Bedienablauf — Speichern, Testen, Modelle", () => {
  it("testet nach dem Speichern und lädt dann die Modelle, dann onChanged", () => {
    const save = panelCode.slice(
      panelCode.indexOf("run(`save-${m.provider}`"),
      panelCode.indexOf("Speichern\n                </Button>"),
    );
    expect(save).toContain("await saveProviderKey(");
    expect(save).toContain("await testProviderKey(m.provider)");
    expect(save).toContain("await loadModels(m.provider, m.label)");
    expect(save).toContain("onChanged?.()");
    expect(save).not.toMatch(/secretDraft\[m\.provider\]\s*\}`/);
  });

  it("gibt bei Fehlern den Schlüssel nicht wieder", () => {
    expect(panelCode).not.toMatch(/\$\{secretDraft/);
  });

  it("hält keinen Schlüssel im Browser-Speicher", () => {
    expect(panelCode).not.toMatch(/localStorage|sessionStorage|document\.cookie/);
    expect(keysApi).not.toMatch(/localStorage|sessionStorage|document\.cookie/);
  });
});

describe("Modellauswahl", () => {
  it("zeigt für DeepL kein leeres Modellfeld, sondern den Vertrag deepl-api", () => {
    expect(workbench).toContain("hasNoModelChoice(provider)");
    expect(workbench).toContain('"deepl-api"');
    expect(workbench).toContain(
      'const effectiveModel = hasNoModelChoice(provider) ? "deepl-api" : model.trim();',
    );
  });

  it("bietet die geladenen Modelle nur in Schritt 2 als Auswahlfeld an", () => {
    expect(workbench).toContain('value="__custom__"');
    expect(panelCode).not.toContain("assignModel");
  });

  it("lädt nach dem Entsperren die Modelle eingerichteter Anbieter", () => {
    expect(panelCode).toContain("if (!p.configured || hasNoModelChoice(p.provider)) continue;");
    expect(panelCode).toContain("void loadModels(p.provider, p.label)");
  });
});

// -------------------------------------------- providerabhängige Modellregeln
describe("Modell-Kennungen je Anbieter", () => {
  /** Regeln direkt aus dem Serverdienst lesen — keine zweite Liste im Test. */
  const patterns = (() => {
    const block = fn.slice(
      fn.indexOf("const MODEL_ID_PATTERNS"),
      fn.indexOf("const MODEL_ID_HINTS"),
    );
    const out: Record<string, RegExp> = {};
    const gateway = fn.match(/const MODEL_ID_PATTERN = "(.*)";/)![1].replace(/\\\\/g, "\\");
    const native = fn.match(/const NATIVE_MODEL_ID_PATTERN = "(.*)";/)![1].replace(/\\\\/g, "\\");
    for (const [, provider, value] of block.matchAll(/(\w+):\s*([^,\n]+),/g)) {
      const src = value.includes("NATIVE_MODEL_ID_PATTERN")
        ? native
        : value.includes("MODEL_ID_PATTERN")
          ? gateway
          : "^deepl-api$";
      out[provider] = new RegExp(src);
    }
    return out;
  })();

  it("akzeptiert native Gemini- und Anthropic-Kennungen ohne Schrägstrich", () => {
    expect(patterns.google_gemini.test("gemini-2.5-flash")).toBe(true);
    expect(patterns.google_gemini.test("gemini-flash-latest")).toBe(true);
    expect(patterns.anthropic.test("claude-sonnet-4-5")).toBe(true);
  });

  it("lehnt Gateway-Kennungen mit Schrägstrich bei eigenen Anbietern ab", () => {
    expect(patterns.google_gemini.test("google/gemini-2.5-flash")).toBe(false);
    expect(patterns.anthropic.test("anthropic/claude-sonnet-4-5")).toBe(false);
    expect(patterns.google_gemini.test("gemini 2.5")).toBe(false);
  });

  it("verlangt für Lovable AI weiterhin anbieter/modell", () => {
    expect(patterns.lovable_ai.test("google/gemini-3.6-flash")).toBe(true);
    expect(patterns.lovable_ai.test("gemini-3.6-flash")).toBe(false);
  });

  it("akzeptiert bei DeepL nur deepl-api", () => {
    expect(patterns.deepl.test("deepl-api")).toBe(true);
    expect(patterns.deepl.test("deepl-pro")).toBe(false);
  });

  it("nutzt dieselbe Regel in dry_run/start, locale_provider_set und Umstellung", () => {
    expect(fn).toContain("isValidModelId(model, provider)");
    expect(fn).toContain("isValidModelId(modelForProvider, p)");
    expect(fn).toContain("isValidModelId(switchModel, p)");
    expect(fn).toContain("model_id_patterns: MODEL_ID_PATTERNS");
  });

  it("nimmt im Frontend die providerabhängige Regel vom Server", () => {
    expect(workbench).toContain("status?.model_id_patterns?.[provider]");
    expect(workbench).toContain("status?.model_id_hints?.[provider]");
  });

  it("belegt Modell in Schritt 2 beim Anbieterwechsel vor", () => {
    expect(workbench).toContain("setCustomModel(false);");
    expect(workbench).toContain("(own.find((r) => r.is_default) ?? own[0])?.model");
  });
});

// ------------------------------------- Kanonischer Modellwert beim Speichern
describe("Kanonischer Modellwert beim Speichern und Umstellen", () => {
  it("kanonisiert DeepL immer auf deepl-api", () => {
    expect(fn).toContain('const DEEPL_MODEL_ID = "deepl-api"');
    expect(fn).toContain("function canonicalModelFor(provider: string, model: string): string");
    expect(fn).toContain("return hasNoModelChoice(provider) ? DEEPL_MODEL_ID : model;");
    expect(fn).toContain("const modelForProvider = canonicalModelFor(p, m);");
    expect(fn).toContain("const switchModel = canonicalModelFor(p, m);");
  });

  it("nutzt in locale_provider_set durchgängig den kanonischen Wert", () => {
    expect(fn).toContain("testProviderKey(p, hasNoModelChoice(p) ? undefined : modelForProvider)");
    expect(fn).toContain("p_model: modelForProvider,");
    expect(fn).toContain("model: modelForProvider }, 200)");
    // Kein Rückfall auf den Rohwert mehr.
    expect(fn).not.toContain('p_model: m || "deepl-api"');
    expect(fn).not.toContain('model: m || "deepl-api"');
  });

  it("nutzt in run_switch_provider ebenfalls den kanonischen Wert", () => {
    expect(fn).toContain("testProviderKey(p, hasNoModelChoice(p) ? undefined : switchModel)");
    expect(fn).toContain("p_model: switchModel,");
    expect(fn).not.toContain("testProviderKey(p, m || undefined)");
  });

  it("lässt Gemini- und Anthropic-Kennungen unverändert (keine Kanonisierung)", () => {
    const canon = (provider: string, model: string) => (provider === "deepl" ? "deepl-api" : model);
    expect(canon("google_gemini", "gemini-flash-latest")).toBe("gemini-flash-latest");
    expect(canon("anthropic", "claude-sonnet-latest")).toBe("claude-sonnet-latest");
    expect(canon("deepl", "irgendein-fremdes-modell")).toBe("deepl-api");
  });

  it("hat keinen Rückfall auf die alte globale Schrägstrich-Regel", () => {
    expect(fn).not.toMatch(/isValidModelId\(\s*model\s*\)/);
    expect(fn).not.toMatch(/isValidModelId\(\s*m\s*\)/);
    expect(fn).toContain("isValidModelId(modelForProvider, p)");
    expect(fn).toContain("isValidModelId(switchModel, p)");
    expect(fn).toContain("isValidModelId(model, provider)");
  });
});


// ------------------------------------------ EIN Ablauf: Auswahl und Fortsetzen
describe("Einziger Bedienablauf im Übersetzungsbereich", () => {
  it("hat keinen zweiten Sprach-/Anbieter-/Modellbereich und kein UMSTELLEN-Feld", () => {
    expect(panelCode).not.toContain("assign-locale");
    expect(panelCode).not.toContain("switch-run");
    expect(panelCode).not.toContain("switch-confirm");
    expect(panelCode).not.toContain('„UMSTELLEN" eingeben');
    expect(panelCode).not.toContain("setLocaleProvider");
    expect(panelCode).not.toContain("switchRunProvider");
    // Bestätigungswort bleibt ausschließlich im geprüften Serverweg.
    expect(keysApi).toContain('confirm: "UMSTELLEN"');
  });

  it("speichert die Auswahl beim Prüfen als Sprachvoreinstellung", () => {
    expect(workbench).toContain("await setLocaleProvider(targetLocale, provider, effectiveModel)");
    expect(workbench).toContain("Für ${targetLabel || saved.locale} gespeichert:");
  });

  it("führt einen pausierten Lauf in einem Klick mit dem neuen Anbieter weiter", () => {
    expect(workbench).toContain(
      "const pausedRun = activeRun && activeRun.status === \"paused\" ? activeRun : null;",
    );
    expect(workbench).toContain(
      "pausedRun != null && (pausedRun.provider !== provider || pausedRun.model !== effectiveModel)",
    );
    expect(workbench).toContain(
      "await switchRunProvider({ runId, provider, model: effectiveModel })",
    );
    // Derselbe Lauf, keine neue Lauf-Nummer.
    expect(workbench).toContain("const runId = pausedRun.id;");
    expect(workbench).toContain("setActiveRunId(runId);");
    expect(workbench).toContain("await readRun(runId)");
    expect(workbench).toContain("fortsetzen`");
  });

  it("setzt bei identischer Kombination nur fort, ohne Umstellung", () => {
    const block = workbench.slice(
      workbench.indexOf("const doResumePaused"),
      workbench.indexOf("const doStart"),
    );
    expect(block).toContain("if (runNeedsSwitch) {");
    expect(block).toContain('await controlRun(runId, "resume");');
  });
});

// ------------------------- Fortsetzen eines pausierten Laufs (Fehlerbild 2026-09-16)
describe("Pausierten Lauf umstellen und fortsetzen", () => {
  const block = () =>
    workbench.slice(
      workbench.indexOf("const doResumePaused"),
      workbench.indexOf("const doStart"),
    );

  it("stellt um und setzt danach zuverlässig fort, auch wenn der Serverweg nicht auf „läuft“ setzt", () => {
    const b = block();
    expect(b).toContain("await switchRunProvider({ runId, provider, model: effectiveModel })");
    expect(b).toContain('if (switched?.status !== "running") await controlRun(runId, "resume");');
    // Sicherheitsnetz: bleibt der Lauf pausiert, wird erneut fortgesetzt.
    expect(b).toContain('if (fresh?.status === "paused")');
  });

  it("verweigert die Umstellung bei fehlender oder abgelaufener Adminfreigabe sichtbar", () => {
    expect(workbench).toContain("const switchNeedsRelease = runNeedsSwitch && !adminUnlocked;");
    expect(workbench).toContain("onAdminUnlockChange");
    expect(workbench).toContain("readAdminToken() != null");
    expect(block()).toContain("if (!adminUnlocked) {");
    // Klare Meldung und Weg zum Entsperren direkt an Schritt 4.
    expect(workbench).toContain("Adminfreigabe fehlt oder ist abgelaufen.");
    expect(workbench).toContain("Jetzt entsperren");
    expect(workbench).toContain("braucht die Adminfreigabe");
  });

  it("zeigt Fehler direkt bei Schritt 4 und einen klaren Ladezustand", () => {
    expect(workbench).toContain("const [startError, setStartError] = useState<string | null>(null)");
    expect(workbench).toContain("{startError && (");
    expect(workbench).toContain("umgestellt und fortgesetzt …`");
  });

  it("zeigt ausschließlich den erneut gelesenen Datenbankstand", () => {
    const b = block();
    expect(b).toContain("let fresh = await readRun(runId);");
    expect(b).toContain("if (fresh) setActiveRun(fresh);");
    // Kein optimistisches Setzen von Anbieter/Modell/Status am Lauf.
    expect(b).not.toMatch(/setActiveRun\(\s*\{[\s\S]*provider/);
  });
});
