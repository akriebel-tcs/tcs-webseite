/**
 * Etappe 5 — Redaktionelle Entwürfe und Speicherantworten.
 *
 * Verhaltenstests an der ECHTEN `EditableField`-Komponente. Gemockt sind nur
 * der Schreibpfad (`saveSectionField`), der Icon-Picker und der Icon-Resolver.
 * Es werden keine Live-Übersetzungen aufgerufen und keine produktiven Werte
 * geschrieben — `saveSectionField` ist ein Mock.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act, waitFor } from "@testing-library/react";
import React, { StrictMode } from "react";

const saveMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/admin/api/cmsAdminWrite", () => ({
  saveSectionField: saveMock,
}));
vi.mock("@/features/admin/components/IconPickerDialog", () => ({
  default: () => null,
}));
vi.mock("@/features/cms/components/iconResolver", () => ({
  resolveIcon: () => null,
}));

// Kein echter Übersetzungsaufruf: die Edge-Function wird gemockt (kostenfrei).
const invokeMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/cmsSupabase/client", () => ({
  getCmsSupabaseClient: () => ({ functions: { invoke: invokeMock } }),
  isCmsSupabaseConfigured: () => true,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import { toast } from "sonner";

import EditableField from "@/features/admin/components/EditableField";

type Deferred = {
  promise: Promise<{ success: boolean; updated: boolean; error: string | null }>;
  resolve: (v: { success: boolean; updated: boolean; error: string | null }) => void;
};

function deferred(): Deferred {
  let resolve!: Deferred["resolve"];
  const promise = new Promise<{ success: boolean; updated: boolean; error: string | null }>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const OK = { success: true, updated: true, error: null };

function field(props: Partial<React.ComponentProps<typeof EditableField>> = {}) {
  return (
    <EditableField
      label="hero.headline"
      pageKey="test.a"
      sectionKey={"hero" as never}
      fieldKey={"headline" as never}
      de="Original"
      en={null}
      visibleTargets={[]}
      {...props}
    />
  );
}

/** Das einzige (DE-)Textfeld der Ansicht. */
function textarea(): HTMLTextAreaElement {
  const list = screen.getAllByRole("textbox") as HTMLTextAreaElement[];
  return list[0];
}

function type(value: string) {
  fireEvent.change(textarea(), { target: { value } });
}

function saveButton(): HTMLButtonElement {
  return screen.getAllByRole("button", { name: "Speichern" })[0] as HTMLButtonElement;
}

let errorSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  invokeMock.mockReset();
  saveMock.mockReset();
  saveMock.mockResolvedValue(OK);
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  const errors = errorSpy.mock.calls.map((c) => String(c[0]));
  const warns = warnSpy.mock.calls.map((c) => String(c[0]));
  cleanup();
  try {
    expect(errors).toEqual([]);
    expect(warns.filter((w) => !w.includes("i18next"))).toEqual([]);
  } finally {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  }
});

describe("EditableField — Entwürfe und Serverauffrischung", () => {
  it("überschreibt einen ungespeicherten Entwurf nicht still, sondern zeigt einen Konflikt", async () => {
    const { rerender } = render(field({ de: "Original" }));
    type("Unsaved draft");
    expect(textarea().value).toBe("Unsaved draft");

    // Serverauffrischung derselben Identität mit abweichendem Wert
    rerender(field({ de: "Concurrent server edit" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());

    expect(textarea().value).toBe("Unsaved draft");
    expect(screen.getByRole("alert").textContent).toContain("Concurrent server edit");

    // Explizite Entscheidung: Serverwert übernehmen
    fireEvent.click(screen.getByRole("button", { name: "Neueren Text übernehmen" }));
    expect(textarea().value).toBe("Concurrent server edit");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("behält den Entwurf, wenn der Nutzer sich dafür entscheidet", async () => {
    const { rerender } = render(field({ de: "Original" }));
    type("Mein Entwurf");
    rerender(field({ de: "Fremder Text" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Meinen Entwurf behalten" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(textarea().value).toBe("Mein Entwurf");
  });

  it("übernimmt einen neuen Serverwert ohne Entwurf sauber", async () => {
    const { rerender } = render(field({ de: "Original" }));
    rerender(field({ de: "Neu vom Server" }));
    await waitFor(() => expect(textarea().value).toBe("Neu vom Server"));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(saveButton().disabled).toBe(true);
  });

  it("nimmt bei Seitenwechsel mit identischem Ausgangswert den alten Entwurf nicht mit", async () => {
    const { rerender } = render(field({ pageKey: "test.a", de: "Original" }));
    type("Entwurf Seite A");
    rerender(field({ pageKey: "test.b", de: "Original" }));
    expect(textarea().value).toBe("Original");
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });

  it("setzt auch bei Wechsel von Baustein, Feld oder Sprache zurück", async () => {
    const { rerender } = render(field({ de: "Original" }));
    type("Entwurf 1");
    rerender(field({ sectionKey: "intro" as never, de: "Original" }));
    expect(textarea().value).toBe("Original");

    type("Entwurf 2");
    rerender(field({ sectionKey: "intro" as never, fieldKey: "text" as never, de: "Original" }));
    expect(textarea().value).toBe("Original");

    // Sprachwechsel: DE gesperrt, EN sichtbar und editierbar
    rerender(
      field({
        sectionKey: "intro" as never,
        fieldKey: "text" as never,
        de: "Original",
        en: "English",
        deEditable: false,
        enEditable: true,
        visibleTargets: ["en"],
      }),
    );
    await waitFor(() => expect(textarea().value).toBe("English"));
  });
});

describe("EditableField — Speicherantworten", () => {
  it("bleibt während des Speicherns gesperrt und löst keinen zweiten Save aus", async () => {
    const d = deferred();
    saveMock.mockReturnValueOnce(d.promise);

    render(field({ de: "Original" }));
    type("Erste Fassung");
    fireEvent.click(saveButton());
    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Speichere…")).toBeTruthy();

    // Weiter tippen während des Speicherns
    type("Erste Fassung plus");
    expect(screen.getByText("Speichere…")).toBeTruthy();
    expect(saveButton().disabled).toBe(true);
    fireEvent.click(saveButton());
    expect(saveMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      d.resolve(OK);
      await d.promise;
    });

    // Erfolg gilt nur für den abgeschickten Wert.
    expect(screen.getByText(/Ihr neuerer Text ist noch nicht gespeichert/)).toBeTruthy();
    expect(textarea().value).toBe("Erste Fassung plus");
    expect(saveButton().disabled).toBe(false);
  });

  it("meldet für den unveränderten Wert klar „Gespeichert.“", async () => {
    const onSaved = vi.fn();
    render(field({ de: "Original", onSaved }));
    type("Neuer Text");
    await act(async () => {
      fireEvent.click(saveButton());
    });
    expect(screen.getByText("Gespeichert.")).toBeTruthy();
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(saveMock).toHaveBeenCalledWith(
      expect.objectContaining({ pageKey: "test.a", locale: "de", value: "Neuer Text" }),
    );
  });

  it("übernimmt eine alte Save-Antwort nach Seitenwechsel nicht", async () => {
    const d = deferred();
    saveMock.mockReturnValueOnce(d.promise);
    const onSaved = vi.fn();

    const { rerender } = render(field({ pageKey: "test.a", de: "Original", onSaved }));
    type("Entwurf A");
    fireEvent.click(saveButton());

    rerender(field({ pageKey: "test.b", de: "Original", onSaved }));
    await act(async () => {
      d.resolve(OK);
      await d.promise;
    });

    expect(screen.queryByText("Gespeichert.")).toBeNull();
    expect(onSaved).not.toHaveBeenCalled();
    expect(textarea().value).toBe("Original");
  });

  it("ruft nach dem Ausbau kein onSaved mehr auf", async () => {
    const d = deferred();
    saveMock.mockReturnValueOnce(d.promise);
    const onSaved = vi.fn();

    const { unmount } = render(field({ de: "Original", onSaved }));
    type("Entwurf");
    fireEvent.click(saveButton());
    unmount();

    await act(async () => {
      d.resolve(OK);
      await d.promise;
    });
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("zeigt Fehler verständlich und lässt den Entwurf stehen", async () => {
    saveMock.mockResolvedValueOnce({ success: false, updated: false, error: "field_not_editable" });
    render(field({ de: "Original" }));
    type("Entwurf");
    await act(async () => {
      fireEvent.click(saveButton());
    });
    expect(screen.getByText(/noch nicht freigegeben/)).toBeTruthy();
    expect(textarea().value).toBe("Entwurf");
    expect(saveButton().disabled).toBe(false);
  });

  it("behandelt eine Ausnahme im Schreibpfad als Fehler", async () => {
    saveMock.mockRejectedValueOnce(new Error("network down"));
    render(field({ de: "Original" }));
    type("Entwurf");
    await act(async () => {
      fireEvent.click(saveButton());
    });
    expect(screen.getByText(/network down/)).toBeTruthy();
    expect(textarea().value).toBe("Entwurf");
  });

  it("funktioniert unter StrictMode ohne Doppelspeicherung", async () => {
    render(<StrictMode>{field({ de: "Original" })}</StrictMode>);
    type("Strict Entwurf");
    await act(async () => {
      fireEvent.click(saveButton());
    });
    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Gespeichert.")).toBeTruthy();
  });
});

describe("EditableField — Whitelist und Sprachansichten", () => {
  it("bietet für gesperrte Sprachen kein Speichern an", () => {
    render(
      field({
        de: "Nur lesen",
        en: "Read only",
        deEditable: false,
        enEditable: false,
        visibleTargets: ["en"],
      }),
    );
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button", { name: "Speichern" })).toBeNull();
    expect(screen.getByText("Nur lesen")).toBeTruthy();
    expect(screen.getByText("Read only")).toBeTruthy();
  });

  it("zeigt DE/EN/PL-Editoren, wenn die Sprachen sichtbar und freigegeben sind", () => {
    render(
      field({
        de: "DE",
        en: "EN",
        pl: "PL",
        plEditable: true,
        visibleTargets: ["en", "pl"],
      }),
    );
    const boxes = screen.getAllByRole("textbox") as HTMLTextAreaElement[];
    expect(boxes.map((b) => b.value)).toEqual(["DE", "EN", "PL"]);
  });
});

describe("EditableField — verspätete Übersetzungsvorschläge", () => {
  it("verwirft einen Vorschlag, der erst nach einem Feldwechsel eintrifft", async () => {
    let resolveInvoke!: (v: unknown) => void;
    invokeMock.mockReturnValueOnce(
      new Promise((r) => {
        resolveInvoke = r;
      }),
    );

    const { rerender } = render(
      field({ de: "Hallo Welt", en: "", visibleTargets: ["en"] }),
    );
    fireEvent.click(screen.getByRole("button", { name: "DE → EN" }));
    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));

    // Feldwechsel, bevor die Antwort kommt
    rerender(field({ fieldKey: "text" as never, de: "Anderer Text", en: "", visibleTargets: ["en"] }));

    await act(async () => {
      resolveInvoke({ data: { translated_text: "Hello world" }, error: null });
      await Promise.resolve();
    });

    const boxes = screen.getAllByRole("textbox") as HTMLTextAreaElement[];
    expect(boxes.map((b) => b.value)).toEqual(["Anderer Text", ""]);
  });

  it("fügt einen Vorschlag für dasselbe Feld als ungespeicherten Entwurf ein", async () => {
    invokeMock.mockResolvedValueOnce({ data: { translated_text: "Hello world" }, error: null });
    render(field({ de: "Hallo Welt", en: "", visibleTargets: ["en"] }));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "DE → EN" }));
    });

    const boxes = screen.getAllByRole("textbox") as HTMLTextAreaElement[];
    expect(boxes[1].value).toBe("Hello world");
    expect(screen.getByText(/Vorschlag eingefügt/)).toBeTruthy();
    expect(saveMock).not.toHaveBeenCalled();
  });
});

/**
 * Etappe 5 — Gegenprüfung A/B/C/D.
 * A) Rückkehr A → B → A darf keine alte Antwort/keinen alten Vorschlag annehmen.
 * B) Laufende Speicheranfrage wird nicht durch einen Vorschlag entsperrt.
 * C) Späte Vorschläge zerstören keinen neueren Text; Quelltextwechsel = kein Erfolg.
 * D) Unbeklärter Konflikt speichert nicht still; Konfliktknopf entsperrt nicht.
 */
function invokeDeferred() {
  let resolve!: (v: unknown) => void;
  const promise = new Promise((r) => {
    resolve = r;
  });
  invokeMock.mockReturnValueOnce(promise);
  return { promise, resolve };
}

const trField = (props: Partial<React.ComponentProps<typeof EditableField>> = {}) =>
  field({ de: "Hallo Welt", en: "", visibleTargets: ["en"], ...props });

function boxes(): HTMLTextAreaElement[] {
  return screen.getAllByRole("textbox") as HTMLTextAreaElement[];
}

function saveButtons(): HTMLButtonElement[] {
  return screen.getAllByRole("button", { name: "Speichern" }) as HTMLButtonElement[];
}

describe("EditableField — Rückkehr zum selben Feld (A → B → A)", () => {
  it("verwirft eine alte Save-Antwort auch nach Rückkehr auf dieselbe Seite", async () => {
    const d = deferred();
    saveMock.mockReturnValueOnce(d.promise);
    const onSaved = vi.fn();

    const { rerender } = render(field({ pageKey: "test.a", de: "Original", onSaved }));
    type("Entwurf A");
    fireEvent.click(saveButton());
    expect(saveMock).toHaveBeenCalledTimes(1);

    rerender(field({ pageKey: "test.b", de: "Original", onSaved }));
    rerender(field({ pageKey: "test.a", de: "Original", onSaved }));

    await act(async () => {
      d.resolve(OK);
      await d.promise;
    });

    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.queryByText("Gespeichert.")).toBeNull();
    expect(textarea().value).toBe("Original");
    expect(saveButton().disabled).toBe(true);
  });

  it("verwirft eine alte Save-Antwort auch nach Rückkehr auf denselben Baustein", async () => {
    const d = deferred();
    saveMock.mockReturnValueOnce(d.promise);
    const onSaved = vi.fn();

    const { rerender } = render(field({ sectionKey: "hero" as never, de: "Original", onSaved }));
    type("Entwurf Hero");
    fireEvent.click(saveButton());

    rerender(field({ sectionKey: "intro" as never, de: "Original", onSaved }));
    rerender(field({ sectionKey: "hero" as never, de: "Original", onSaved }));

    await act(async () => {
      d.resolve(OK);
      await d.promise;
    });
    expect(onSaved).not.toHaveBeenCalled();
    expect(textarea().value).toBe("Original");
  });

  it("verwirft eine alte Save-Antwort auch nach Rückkehr auf dasselbe Feld", async () => {
    const d = deferred();
    saveMock.mockReturnValueOnce(d.promise);
    const onSaved = vi.fn();

    const { rerender } = render(field({ fieldKey: "headline" as never, de: "Original", onSaved }));
    type("Entwurf Headline");
    fireEvent.click(saveButton());

    rerender(field({ fieldKey: "text" as never, de: "Original", onSaved }));
    rerender(field({ fieldKey: "headline" as never, de: "Original", onSaved }));

    await act(async () => {
      d.resolve(OK);
      await d.promise;
    });
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.queryByText("Gespeichert.")).toBeNull();
  });

  it("verwirft einen späten Übersetzungsvorschlag nach Rückkehr auf dasselbe Feld", async () => {
    const inv = invokeDeferred();
    const { rerender } = render(trField({ pageKey: "test.a" }));
    fireEvent.click(screen.getByRole("button", { name: "DE → EN" }));
    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));

    rerender(trField({ pageKey: "test.b" }));
    rerender(trField({ pageKey: "test.a" }));

    await act(async () => {
      inv.resolve({ data: { translated_text: "Hello world" }, error: null });
      await Promise.resolve();
    });

    expect(boxes().map((b) => b.value)).toEqual(["Hallo Welt", ""]);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it("meldet nach echtem Ausbau keinen eingefügten Vorschlag", async () => {
    const inv = invokeDeferred();
    const { unmount } = render(trField());
    fireEvent.click(screen.getByRole("button", { name: "DE → EN" }));
    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));
    unmount();

    await act(async () => {
      inv.resolve({ data: { translated_text: "Hello world" }, error: null });
      await Promise.resolve();
    });
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });
});

describe("EditableField — laufende Anfrage bleibt gesperrt", () => {
  it("wird durch einen eintreffenden Übersetzungsvorschlag nicht entsperrt", async () => {
    const inv = invokeDeferred();
    const save = deferred();
    saveMock.mockReturnValueOnce(save.promise);

    render(trField());
    fireEvent.click(screen.getByRole("button", { name: "DE → EN" }));
    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));

    // EN manuell ändern und speichern (Antwort steht noch aus)
    fireEvent.change(boxes()[1], { target: { value: "Manuell EN" } });
    fireEvent.click(saveButtons()[1]);
    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(saveButtons()[1].disabled).toBe(true);

    await act(async () => {
      inv.resolve({ data: { translated_text: "Hello world" }, error: null });
      await Promise.resolve();
    });

    // Vorschlag darf den Speicherlauf nicht entsperren und den Text nicht ersetzen.
    expect(saveButtons()[1].disabled).toBe(true);
    expect(boxes()[1].value).toBe("Manuell EN");
    fireEvent.click(saveButtons()[1]);
    expect(saveMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      save.resolve(OK);
      await save.promise;
    });
    expect(saveMock).toHaveBeenCalledTimes(1);
  });

  it("fängt zwei Klicks im selben Ereigniszyklus ab", async () => {
    const d = deferred();
    saveMock.mockReturnValueOnce(d.promise);
    render(field({ de: "Original" }));
    type("Entwurf");
    const btn = saveButton();
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(saveMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      d.resolve(OK);
      await d.promise;
    });
  });
});

describe("EditableField — späte Vorschläge zerstören keinen neueren Text", () => {
  it("bietet den Vorschlag separat an, wenn das Zielfeld zwischenzeitlich bearbeitet wurde", async () => {
    const inv = invokeDeferred();
    render(trField());
    fireEvent.click(screen.getByRole("button", { name: "DE → EN" }));
    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));

    fireEvent.change(boxes()[1], { target: { value: "Mein EN-Text" } });

    await act(async () => {
      inv.resolve({ data: { translated_text: "Hello world" }, error: null });
      await Promise.resolve();
    });

    expect(boxes()[1].value).toBe("Mein EN-Text");
    const offer = screen.getByRole("status");
    expect(offer.textContent).toContain("Hello world");

    fireEvent.click(screen.getByRole("button", { name: "Vorschlag einfügen" }));
    expect(boxes()[1].value).toBe("Hello world");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("lässt einen Vorschlag sichtbar verwerfen", async () => {
    const inv = invokeDeferred();
    render(trField());
    fireEvent.click(screen.getByRole("button", { name: "DE → EN" }));
    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));
    fireEvent.change(boxes()[1], { target: { value: "Mein EN-Text" } });
    await act(async () => {
      inv.resolve({ data: { translated_text: "Hello world" }, error: null });
      await Promise.resolve();
    });
    fireEvent.click(screen.getByRole("button", { name: "Vorschlag verwerfen" }));
    expect(screen.queryByRole("status")).toBeNull();
    expect(boxes()[1].value).toBe("Mein EN-Text");
  });

  it("erkennt einen Quelltextwechsel während der Übersetzung statt falschen Erfolg zu melden", async () => {
    const inv = invokeDeferred();
    render(trField());
    fireEvent.click(screen.getByRole("button", { name: "DE → EN" }));
    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));

    // DE-Quelltext ändern, solange die Übersetzung läuft
    fireEvent.change(boxes()[0], { target: { value: "Ganz anderer Quelltext" } });

    await act(async () => {
      inv.resolve({ data: { translated_text: "Hello world" }, error: null });
      await Promise.resolve();
    });

    expect(boxes()[1].value).toBe("");
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });
});

describe("EditableField — Konflikt blockiert stilles Speichern", () => {
  it("speichert bei unbeklärtem Konflikt nicht", async () => {
    const { rerender } = render(field({ de: "Original" }));
    type("Mein Entwurf");
    rerender(field({ de: "Fremder Text" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());

    expect(saveButton().disabled).toBe(true);
    fireEvent.click(saveButton());
    expect(saveMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Meinen Entwurf behalten" }));
    await act(async () => {
      fireEvent.click(saveButton());
    });
    expect(saveMock).toHaveBeenCalledTimes(1);
  });

  it("entsperrt mit „Neueren Text übernehmen“ keine laufende Anfrage", async () => {
    const d = deferred();
    saveMock.mockReturnValueOnce(d.promise);

    const { rerender } = render(field({ de: "Original" }));
    type("Entwurf 1");
    fireEvent.click(saveButton());
    expect(saveMock).toHaveBeenCalledTimes(1);

    // Weiter tippen (bleibt ungespeichert) und Serverauffrischung mit Konflikt
    type("Entwurf 2");
    rerender(field({ de: "Fremder Text" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Neueren Text übernehmen" }));
    expect(screen.getByText("Speichere…")).toBeTruthy();
    expect(saveButton().disabled).toBe(true);
    fireEvent.click(saveButton());
    expect(saveMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      d.resolve(OK);
      await d.promise;
    });
    expect(saveMock).toHaveBeenCalledTimes(1);
  });
});

/**
 * Etappe 5 — Nachbesserung 5.2: Zielzustand BEIM Übersetzungsstart.
 *
 * „Zwischenzeitlich geändert" ist nicht dasselbe wie „bei Antwort gerade noch
 * ungespeichert". Ein alter Vorschlag darf einen inzwischen gespeicherten oder
 * per Serverauffrischung geänderten Zielwert nicht still ersetzen.
 */
describe("EditableField — Zielzustand beim Übersetzungsstart", () => {
  it("ersetzt einen zwischenzeitlich gespeicherten Zielwert nicht still", async () => {
    const inv = invokeDeferred();
    saveMock.mockResolvedValueOnce(OK);

    render(trField());
    fireEvent.click(screen.getByRole("button", { name: "DE → EN" }));
    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));

    // EN von Hand ändern und erfolgreich speichern → kein Entwurf mehr offen.
    fireEvent.change(boxes()[1], { target: { value: "Saved manual translation" } });
    await act(async () => {
      fireEvent.click(saveButtons()[1]);
    });
    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(saveMock.mock.calls[0][0]).toMatchObject({
      locale: "en",
      value: "Saved manual translation",
    });

    // Späte Übersetzung trifft ein.
    await act(async () => {
      inv.resolve({ data: { translated_text: "Late AI suggestion" }, error: null });
      await Promise.resolve();
    });

    expect(boxes()[1].value).toBe("Saved manual translation");
    expect(screen.getByRole("button", { name: "Vorschlag einfügen" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Vorschlag verwerfen" })).toBeTruthy();

    // Explizites Einfügen bleibt möglich.
    fireEvent.click(screen.getByRole("button", { name: "Vorschlag einfügen" }));
    expect(boxes()[1].value).toBe("Late AI suggestion");
    expect(saveMock).toHaveBeenCalledTimes(1);
  });

  it("ersetzt einen per Serverauffrischung geänderten Zielwert nicht still", async () => {
    const inv = invokeDeferred();
    const { rerender } = render(trField({ en: "" }));
    fireEvent.click(screen.getByRole("button", { name: "DE → EN" }));
    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));

    // Serverauffrischung derselben Identität ohne eigenen Entwurf.
    rerender(trField({ en: "Server translation" }));
    expect(boxes()[1].value).toBe("Server translation");

    await act(async () => {
      inv.resolve({ data: { translated_text: "Late AI suggestion" }, error: null });
      await Promise.resolve();
    });

    expect(boxes()[1].value).toBe("Server translation");
    expect(screen.getByRole("button", { name: "Vorschlag einfügen" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Vorschlag verwerfen" }));
    expect(boxes()[1].value).toBe("Server translation");
    expect(saveMock).not.toHaveBeenCalled();
  });

  it("setzt den Vorschlag in ein unverändertes, sauberes Zielfeld weiterhin automatisch ein", async () => {
    invokeMock.mockResolvedValueOnce({
      data: { translated_text: "Hello world" },
      error: null,
    });
    render(trField({ en: "" }));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "DE → EN" }));
    });

    expect(boxes()[1].value).toBe("Hello world");
    expect(screen.queryByRole("button", { name: "Vorschlag einfügen" })).toBeNull();
    expect(screen.getByText(/Vorschlag eingefügt/)).toBeTruthy();
    expect(toast.success).toHaveBeenCalledWith(
      "EN-Vorschlag liegt vor — bitte prüfen und speichern.",
    );
    expect(saveMock).not.toHaveBeenCalled();
  });
});
