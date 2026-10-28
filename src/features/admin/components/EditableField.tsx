/**
 * Editable CMS-Feld für eine beliebige whitelist-freigeschaltete CMS-Seite.
 *
 * - Schreibt ausschließlich über die generische, whitelist-geschützte RPC
 *   `rpc_admin_update_section_field` (siehe `cmsAdminWrite.saveSectionField`).
 *   Die Whitelist liegt DB-seitig in `cms_admin_editable_fields` und wird
 *   beim Schreiben zusätzlich geprüft.
 * - Kein direkter Tabellenzugriff aus dem Frontend.
 * - WICHTIG (Stand 2026-09-15, am Livestand geprüft): `rpc_admin_update_section_field`
 *   führt serverseitig ein `INSERT ... ON CONFLICT ... UPDATE` aus und setzt dabei
 *   `review_status = 'geprueft'`. Es ist also **kein** reines UPDATE ohne
 *   Statuswechsel — frühere Kommentare hier waren falsch. Eine serverseitige
 *   Konfliktprüfung (CAS/Versionsvergleich) und ein Readback des geschriebenen
 *   Werts fehlen weiterhin; dieser Editor prüft Konflikte nur clientseitig
 *   gegen den zuletzt gelesenen Serverwert.
 * - Pro-Locale-Sperre: Ist ein Feld in der Whitelist `is_enabled=false`, zeigt
 *   die UI den Wert nur als Leseansicht (`ReadOnlyBox`) und bietet kein
 *   Speichern an. Default beider Flags ist `true` (rückwärtskompatibel).
 * - `image_position` und die Sammel-Aktionen (Bulk) bleiben ein eigener,
 *   bewusst unveränderter Schreibpfad ohne Entwurfs-/Konfliktschutz — offen
 *   dokumentiert, nicht Teil von Etappe 5.

 *
 * Etappe I.8 — Auto-Übersetzung DE→EN:
 *   - Button neben dem DE-Feld („DE → EN") ruft die Edge Function
 *     `cms-translate-field` (Lovable AI) und befüllt das EN-Feld als Vorschlag.
 *   - Speichern bleibt manuell (bestehender „Speichern"-Button im EN-Editor).
 *   - Button erscheint nur, wenn beide Sprachen freigegeben sind.
 */
import { useEffect, useRef, useState } from "react";

/**
 * Sucht den nächstgelegenen scrollbaren Vorfahren eines Elements
 * und stellt dessen `scrollTop` über mehrere Frames hinweg wieder her.
 * Hintergrund: Nach dem Speichern eines Wechselteaser-Toggles lädt der
 * Admin den Page-Bundle neu, was Layout-Verschiebungen auslösen kann,
 * die den Editor-Bereich zurück zum Block-Kopf scrollen. Diese Helfer
 * halten den Nutzer dort, wo er gerade arbeitet (Bereich „Bildposition").
 */
function findAllScrollParents(el: HTMLElement | null): HTMLElement[] {
  const out: HTMLElement[] = [];
  let node: HTMLElement | null = el?.parentElement ?? null;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    if (
      (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
      node.scrollHeight > node.clientHeight
    ) {
      out.push(node);
    }
    node = node.parentElement;
  }
  return out;
}

async function preserveScroll<T>(anchor: HTMLElement | null, fn: () => Promise<T>): Promise<T> {
  // ALLE scrollbaren Vorfahren merken (Editor-Spalte, Workbench-Container,
  // Body) – nicht nur den nächsten. Nach dem Save-Reload setzt
  // `MasterDetailWorkbench` den Editor-Scroller per useEffect manchmal
  // auf 0 zurück; wir machen das hier zuverlässig rückgängig.
  const scrollers = findAllScrollParents(anchor).map((node) => ({
    node,
    top: node.scrollTop,
  }));
  const winY = window.scrollY;
  const anchorRectTop = anchor?.getBoundingClientRect().top ?? null;
  const result = await fn();
  const restore = () => {
    for (const s of scrollers) {
      if (s.node.scrollTop !== s.top) s.node.scrollTop = s.top;
    }
    if (Math.abs(window.scrollY - winY) > 1) {
      window.scrollTo({ top: winY, behavior: "auto" });
    }
    // Falls die Bildposition trotzdem stark abweicht (z. B. wegen Layout-
    // Shift nach dem Reload), Anker zurück in den Viewport holen.
    if (anchor && anchorRectTop !== null) {
      const nowTop = anchor.getBoundingClientRect().top;
      if (Math.abs(nowTop - anchorRectTop) > 80) {
        anchor.scrollIntoView({ block: "center", behavior: "auto" });
      }
    }
  };
  requestAnimationFrame(() => {
    restore();
    requestAnimationFrame(() => {
      restore();
      window.setTimeout(restore, 80);
      window.setTimeout(restore, 240);
      window.setTimeout(restore, 600);
    });
  });
  return result;
}
import { toast } from "sonner";
import {
  saveSectionField,
  type PilotFieldKey,
  type PilotSectionKey,
} from "@/features/admin/api/cmsAdminWrite";
import { resolveIcon } from "@/features/cms/components/iconResolver";
import IconPickerDialog from "@/features/admin/components/IconPickerDialog";

/** True, wenn das Feld einen Lucide-Icon-Namen aufnimmt (z. B. `icon`, `items.2.icon`). */
function isIconField(fieldKey: string): boolean {
  return fieldKey === "icon" || /\.icon$/.test(fieldKey);
}


type Props = {
  label: string;
  /** Optional. Wenn nicht gesetzt, fällt die Schreib-RPC auf die Default-Pilotseite zurück. */
  pageKey?: string;
  sectionKey: PilotSectionKey;
  fieldKey: PilotFieldKey;
  de: string | null;
  en: string | null;
  /** Polnischer Wert (dritte Spalte). */
  pl?: string | null;
  /** Prüfstatus des jeweiligen Zielwertes ('geprueft' | 'maschinell' | 'maschinell_veraltet'). */
  enStatus?: string | null;
  plStatus?: string | null;
  onSaved?: () => void;
  /**
   * Whitelist-Status pro Sprache (Tabelle `cms_admin_editable_fields`,
   * Spalte `is_enabled`). Default `true` — bei `false` wird die jeweilige
   * Spalte nur als Leseansicht (ReadOnly) gerendert. Die DB-RPC blockiert
   * disabled-Schreibversuche zusätzlich; die UI darf sie hier gar nicht
   * erst anbieten.
   */
  deEditable?: boolean;
  enEditable?: boolean;
  plEditable?: boolean;
  /**
   * Sichtbare Zielsprachen — kommt aus der Sprachliste der Datenbank
   * (`cms_locales`, aktiv und nicht Quellsprache) über den Sprachumschalter
   * im Inhalte-Bereich. `null` = bisheriges Verhalten (EN immer, PL wenn
   * freigeschaltet oder vorhanden). Es entsteht keine zweite Ablage: die
   * Werte sind in jedem Fall dieselben Datenbankzeilen.
   */
  visibleTargets?: string[] | null;
};

/**
 * Sprechende Anzeige eines technischen field_key/labels.
 * Beispiel: "items.aufputz.title" -> "Liste · Aufputz · Titel"
 * Reine UI-Verschönerung — der technische Key bleibt darunter sichtbar.
 */
const SEGMENT_LABELS: Record<string, string> = {
  items: "Liste",
  title: "Titel",
  text: "Text",
  label: "Label",
  headline: "Überschrift",
  desc: "Beschreibung",
  description: "Beschreibung",
  cta: "Button",
  hero: "Hero-Bild",
  intro: "Intro",
  subtitle: "Untertitel",
  category: "Kategorie",
};

function prettifyKey(raw: string): string {
  if (!raw) return "";
  return raw
    .split(".")
    .map((seg) => {
      if (SEGMENT_LABELS[seg]) return SEGMENT_LABELS[seg];
      // numerische Indizes als „#1, #2, …"
      if (/^\d+$/.test(seg)) return `#${Number(seg) + 1}`;
      return seg
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    })
    .join(" · ");
}

const ReadOnlyBox = ({ value }: { value: string | null }) => (
  <div
    role="presentation"
    aria-readonly="true"
    className="min-h-[5rem] whitespace-pre-wrap break-words rounded border border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
    title="Diese Sprache ist in der Freigabeliste (Whitelist) gesperrt — Bearbeiten nicht möglich."
  >
    {value !== null && value !== "" ? (
      value
    ) : (
      <span className="text-xs italic">— kein Wert —</span>
    )}
  </div>
);

type SaveState = "idle" | "saving" | "ok" | "error";

/**
 * Übersetzt technische Fehlerkennungen der Speicher-RPCs in verständliche
 * Hinweise mit einem konkreten Weg (T9).
 */
function saveErrorHint(code: string | null | undefined): string {
  const raw = (code ?? "").trim();
  if (raw === "section_no_longer_renderable") {
    return (
      "Nicht gespeichert: Dieser Block hätte danach weder Überschrift noch " +
      "Fließtext und wäre auf der Website unsichtbar. Weg zum Leeren eines " +
      "alten Werts: zuerst den ersetzenden Text (z. B. Überschrift oder " +
      "Fließtext) eintragen und speichern, danach das alte Feld leeren. " +
      "Ist der Wert nur noch Altbestand und soll der Block ganz weg, den " +
      "Block ausblenden statt das letzte Feld zu leeren. Geht beides nicht, " +
      "bitte bei der technischen Betreuung melden."
    );
  }
  if (raw === "field_not_editable") {
    return "Nicht gespeichert: Dieses Feld ist für die Redaktion noch nicht freigegeben.";
  }
  if (raw === "locale_not_allowed") {
    return "Nicht gespeichert: Diese Sprache ist für dieses Feld nicht freigegeben.";
  }
  if (!raw) return "Speichern fehlgeschlagen.";
  return `Speichern fehlgeschlagen (${raw}).`;
}



type ExternalSuggestion = {
  value: string;
  nonce: number;
  /** Identität (Seite/Baustein/Feld) zum Zeitpunkt der Anfrage — späte Vorschläge werden verworfen. */
  identity: string;
  /**
   * Sichtbarer Zielwert im Moment des Übersetzungsstarts. Weicht der Zielwert
   * bei Rückkehr davon ab (z. B. zwischenzeitlich bearbeitet UND gespeichert
   * oder per Serverauffrischung geändert), wird der Vorschlag nur angeboten,
   * nie still eingesetzt. „Zwischenzeitlich geändert" ist ausdrücklich nicht
   * dasselbe wie „bei Antwort gerade noch ungespeichert".
   */
  baseline: string;
};

/** Eindeutige Feldidentität: Seite + Baustein + Feld (+ Sprache im Editor). */
function fieldIdentity(pageKey: string | undefined, sectionKey: string, fieldKey: string): string {
  return `${pageKey ?? ""}::${sectionKey}::${fieldKey}`;
}


type TranslateRequestBody = {
  source_text: string;
  source_locale: "de" | "en" | "pl";
  target_locale: "de" | "en" | "pl";
  context: string;
};

function extractTranslatedText(payload: unknown): string {
  if (typeof payload === "string") return payload.trim();
  if (!payload || typeof payload !== "object") return "";

  const candidate = payload as {
    translated_text?: unknown;
    data?: { translated_text?: unknown };
    error?: unknown;
    message?: unknown;
  };

  if (typeof candidate.translated_text === "string") return candidate.translated_text.trim();
  if (typeof candidate.data?.translated_text === "string") {
    return candidate.data.translated_text.trim();
  }

  return "";
}

/**
 * Bewusste Absage des Dienstes: Der Wert ist sprachneutral/technisch
 * (Link, Kennung, Zahl). Kein Fehlerfall — nur ein Hinweis für die Redaktion.
 */
export class NotTranslatableError extends Error {}

/** Übersetzt die Serverantwort in eine verständliche Meldung für die Redaktion. */
async function readFunctionError(error: unknown): Promise<string | NotTranslatableError> {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx === "object" && typeof ctx.status === "number") {
    let body: Record<string, unknown> = {};
    try {
      body = (await ctx.clone().json()) as Record<string, unknown>;
    } catch {
      // keine JSON-Antwort → Standardmeldung unten
    }
    const message = typeof body.message === "string" ? body.message : "";
    const code = typeof body.error === "string" ? body.error : "";

    if (ctx.status === 429) {
      const retryHeader = Number(ctx.headers.get("Retry-After") ?? "");
      const retry =
        Number.isFinite(retryHeader) && retryHeader > 0
          ? retryHeader
          : Number(body.retry_after ?? 0);
      return retry > 0
        ? `Zu viele Übersetzungsanfragen. Bitte ${retry} Sekunden warten und erneut klicken.`
        : "Zu viele Übersetzungsanfragen. Bitte kurz warten und erneut klicken.";
    }
    if (ctx.status === 503) {
      return "Übersetzungsdienst gerade nicht verfügbar. Bitte später erneut versuchen.";
    }
    if (code === "source_text_not_translatable") {
      return new NotTranslatableError(
        message ||
          "Dieser Wert ist sprachneutral oder technisch (z. B. Link, Kennung, Zahl) und wird nicht übersetzt.",
      );
    }
    if (code === "credits_exhausted" || code === "ai_blocked") {
      return message || "Übersetzung derzeit nicht möglich.";
    }
    if (message) return message;
  }
  return (error as { message?: string })?.message || "Übersetzungsdienst nicht erreichbar.";
}

export async function requestTranslation(body: TranslateRequestBody): Promise<string> {
  const { getCmsSupabaseClient } = await import("@/lib/cmsSupabase/client");
  const supabase = getCmsSupabaseClient();
  const { data, error } = await supabase.functions.invoke("cms-translate-field", {
    body,
  });

  if (error) {
    const result = await readFunctionError(error);
    throw result instanceof NotTranslatableError ? result : new Error(result);
  }

  const translated = extractTranslatedText(data);
  if (translated) return translated;

  throw new Error("Keine Übersetzung erhalten.");
}


type EditorState = {
  /** Identität, zu der dieser Zustand gehört (Besuchstoken + Sprache). */
  identity: string;
  /** Letzter bekannter Serverwert. */
  server: string;
  /** Sichtbarer Text (Entwurf, solange ungleich `server`). */
  value: string;
  save: SaveState;
  /**
   * Laufende Speicheranfrage. Bewusst getrennt von `save`/`msg`: Nur die
   * passende abgeschlossene Anfrage oder ein Identitätswechsel setzt das
   * zurück — nicht ein Prop-Refresh, ein Vorschlag oder ein Konfliktknopf.
   */
  pending: boolean;
  msg: string | null;
  /** Abweichender Serverwert, der einen ungespeicherten Entwurf nicht still überschreibt. */
  conflict: string | null;
  /** Übersetzungsvorschlag, der einen neueren Text nicht still überschreibt. */
  suggestion: string | null;
};

function makeEditorState(identity: string, initial: string): EditorState {
  return {
    identity,
    server: initial,
    value: initial,
    save: "idle",
    pending: false,
    msg: null,
    conflict: null,
    suggestion: null,
  };
}

const Editor = ({
  locale,
  initial,
  identityToken,
  pageKey,
  sectionKey,
  fieldKey,
  onSaved,
  onValueChange,
  externalValue,
}: {
  locale: "de" | "en" | "pl";
  initial: string;
  /**
   * Besuchstoken des Feldes (Seite+Baustein+Feld + laufende Besuchsnummer).
   * Der Besuchszähler steigt bei jedem Identitätswechsel, damit eine späte
   * Antwort nach A → B → A nicht dem neuen Besuch von A zugerechnet wird.
   */
  identityToken: string;
  pageKey?: string;
  sectionKey: PilotSectionKey;
  fieldKey: PilotFieldKey;
  onSaved?: () => void;
  /** Bei jeder Änderung des sichtbaren Textes → Parent (für Translate-Button). */
  onValueChange?: (next: string) => void;
  /** Externer Vorschlag (z. B. aus Auto-Übersetzung). */
  externalValue?: ExternalSuggestion | null;
}) => {
  const identity = `${identityToken}::${locale}`;

  const [st, setSt] = useState<EditorState>(() => makeEditorState(identity, initial));
  // Identitätswechsel wird noch im laufenden Render zurückgesetzt, damit im
  // neuen Feld nie der Entwurf des alten Feldes sichtbar ist.
  let cur = st;
  if (st.identity !== identity) {
    cur = makeEditorState(identity, initial);
    setSt(cur);
  }

  const identityRef = useRef(identity);
  const requestRef = useRef(0);
  /** Synchroner Inflight-Latch: fängt Doppelklick im selben Ereigniszyklus. */
  const inflightRef = useRef(false);
  const mountedRef = useRef(true);
  const appliedNonceRef = useRef<number | null>(null);
  const onValueChangeRef = useRef(onValueChange);
  onValueChangeRef.current = onValueChange;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Serverauffrischung derselben Identität: ungespeicherten Entwurf erhalten,
  // abweichenden Serverwert sichtbar als Konflikt anzeigen.
  useEffect(() => {
    if (identityRef.current !== identity) {
      // Neuer Besuch: laufende Anfrage entwerten, Latch freigeben.
      requestRef.current += 1;
      inflightRef.current = false;
      identityRef.current = identity;
    }
    setSt((prev) => {
      if (prev.identity !== identity) return makeEditorState(identity, initial);
      if (prev.server === initial) return prev;
      const dirty = prev.value !== prev.server;
      if (!dirty) {
        return { ...prev, server: initial, value: initial, conflict: null, suggestion: null };
      }
      return { ...prev, server: initial, conflict: initial };
    });
  }, [identity, initial]);

  // Externer Vorschlag — nur für denselben Besuch und nur einmal je Nonce.
  useEffect(() => {
    if (!externalValue) return;
    if (externalValue.identity !== identityToken) return;
    if (appliedNonceRef.current === externalValue.nonce) return;
    appliedNonceRef.current = externalValue.nonce;
    setSt((prev) => {
      if (prev.identity !== identity) return prev;
      const busy = prev.pending;
      const dirtyNow = prev.value !== prev.server;
      // Zielzustand beim Übersetzungsstart vs. jetzt. Erfasst auch Fälle ohne
      // aktuellen Entwurf: erfolgreich gespeicherte eigene Änderung oder
      // Serverauffrischung des Zielwerts während der Übersetzung.
      const changedSinceRequest = prev.value !== externalValue.baseline;
      if (busy || dirtyNow || changedSinceRequest) {
        // Zielfeld wurde zwischenzeitlich geändert oder speichert gerade:
        // Vorschlag separat anbieten statt den neueren Text zu zerstören.
        return {
          ...prev,
          suggestion: externalValue.value,
          msg: busy
            ? prev.msg
            : "Übersetzungsvorschlag liegt vor — Ihr Text wurde nicht überschrieben.",
        };
      }
      return {
        ...prev,
        value: externalValue.value,
        suggestion: null,
        save: "idle",
        msg: "Vorschlag eingefügt — bitte prüfen und speichern.",
      };
    });
  }, [externalValue, identity, identityToken]);

  // Sichtbarer Entwurf immer an den Parent melden (Translate-Buttons).
  useEffect(() => {
    onValueChangeRef.current?.(cur.value);
  }, [cur.value, identity]);

  const dirty = cur.value !== cur.server;
  const unresolvedConflict = cur.conflict !== null && dirty;
  const saving = cur.pending;

  const setValue = (next: string) => {
    setSt((prev) => ({
      ...prev,
      value: next,
      // Läuft ein Speichervorgang, bleibt `pending` unberührt — der Erfolg
      // gilt später nur für den abgeschickten Wert.
      save: prev.pending ? prev.save : "idle",
      msg: prev.pending ? prev.msg : null,
    }));
  };

  const handleSave = async () => {
    // Synchroner Latch zuerst: doppelte Aufrufe im selben Ereigniszyklus.
    if (inflightRef.current || cur.pending) return;
    if (!dirty) return;
    // Unbeklärter Serverkonflikt: erst bewusste Entscheidung, kein stiller Save.
    if (unresolvedConflict) return;
    inflightRef.current = true;
    const submitted = cur.value;
    const savedIdentity = identity;
    const seq = requestRef.current + 1;
    requestRef.current = seq;
    setSt((prev) =>
      prev.identity === savedIdentity ? { ...prev, pending: true, save: "idle", msg: null } : prev,
    );

    let res: { success: boolean; updated: boolean; error: string | null };
    try {
      res = await saveSectionField({ pageKey, sectionKey, fieldKey, locale, value: submitted });
    } catch (e) {
      res = { success: false, updated: false, error: e instanceof Error ? e.message : "unknown" };
    }

    const stale =
      !mountedRef.current || requestRef.current !== seq || identityRef.current !== savedIdentity;
    // Latch nur für die eigene, aktuelle Anfrage freigeben.
    if (requestRef.current === seq) inflightRef.current = false;
    if (stale) return;

    const ok = res.success && res.updated;
    setSt((prev) => {
      if (prev.identity !== savedIdentity) return prev;
      if (!ok) return { ...prev, pending: false, save: "error", msg: saveErrorHint(res.error) };
      const unchanged = prev.value === submitted;
      return {
        ...prev,
        pending: false,
        server: submitted,
        conflict: unchanged ? null : prev.conflict,
        save: unchanged ? "ok" : "idle",
        msg: unchanged
          ? "Gespeichert."
          : "Gespeichert — Ihr neuerer Text ist noch nicht gespeichert.",
      };
    });
    if (ok) onSaved?.();
  };

  const iconMode = isIconField(fieldKey as string);
  const [pickerOpen, setPickerOpen] = useState(false);
  const IconPreview = iconMode ? resolveIcon(cur.value.trim() || null) : null;

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {locale.toUpperCase()}
        </span>
        {cur.pending || cur.save !== "idle" || cur.msg ? (
          <span
            className={
              "text-xs " +
              (cur.save === "ok" && !cur.pending
                ? "text-emerald-600"
                : cur.save === "error" && !cur.pending
                  ? "text-destructive"
                  : "text-muted-foreground")
            }
          >
            {cur.pending ? "Speichere…" : cur.msg}
          </span>
        ) : null}
      </div>
      {unresolvedConflict && (
        <div
          role="alert"
          className="mb-2 rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800"
        >
          <div className="font-medium">
            Achtung: Dieser Text wurde zwischenzeitlich an anderer Stelle geändert.
          </div>
          <div className="mt-1 whitespace-pre-wrap break-words font-mono text-[11px]">
            {cur.conflict === "" ? "— kein Wert —" : cur.conflict}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded border bg-background px-2 py-1 text-[11px] font-medium hover:bg-muted"
              onClick={() =>
                setSt((prev) => ({
                  ...prev,
                  value: prev.conflict ?? prev.server,
                  conflict: null,
                  // `pending` bleibt unberührt: ein laufender Save wird hier
                  // nicht entsperrt.
                  save: prev.pending ? prev.save : "idle",
                  msg: prev.pending ? prev.msg : null,
                }))
              }
            >
              Neueren Text übernehmen
            </button>
            <button
              type="button"
              className="rounded border bg-background px-2 py-1 text-[11px] font-medium hover:bg-muted"
              onClick={() => setSt((prev) => ({ ...prev, conflict: null }))}
            >
              Meinen Entwurf behalten
            </button>
          </div>
        </div>
      )}
      {cur.suggestion !== null && (
        <div
          role="status"
          className="mb-2 rounded border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs text-sky-900"
        >
          <div className="font-medium">
            Übersetzungsvorschlag liegt vor — Ihr Text wurde nicht überschrieben.
          </div>
          <div className="mt-1 whitespace-pre-wrap break-words font-mono text-[11px]">
            {cur.suggestion === "" ? "— kein Wert —" : cur.suggestion}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded border bg-background px-2 py-1 text-[11px] font-medium hover:bg-muted"
              onClick={() =>
                setSt((prev) => ({
                  ...prev,
                  value: prev.suggestion ?? prev.value,
                  suggestion: null,
                  save: prev.pending ? prev.save : "idle",
                  msg: prev.pending
                    ? prev.msg
                    : "Vorschlag eingefügt — bitte prüfen und speichern.",
                }))
              }
            >
              Vorschlag einfügen
            </button>
            <button
              type="button"
              className="rounded border bg-background px-2 py-1 text-[11px] font-medium hover:bg-muted"
              onClick={() => setSt((prev) => ({ ...prev, suggestion: null }))}
            >
              Vorschlag verwerfen
            </button>
          </div>
        </div>
      )}
      {iconMode && IconPreview && (
        <div className="mb-2 flex items-center gap-3 rounded border bg-muted/30 px-3 py-2">
          <IconPreview className="h-6 w-6 text-foreground" strokeWidth={1.75} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] text-muted-foreground">
              Icon-Bibliothek: <code className="font-mono">lucide-react</code>
            </div>
            <div className="truncate font-mono text-xs text-foreground">
              {cur.value.trim() || "— kein Icon —"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="shrink-0 rounded border bg-background px-2 py-1 text-[11px] font-medium hover:bg-muted"
            title="Icon aus der Lucide-Bibliothek auswählen"
          >
            Icon wählen…
          </button>
        </div>
      )}
      <textarea
        className="min-h-[5rem] w-full rounded border border-input bg-background px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={cur.value}
        onChange={(e) => setValue(e.target.value)}
        spellCheck={false}
      />
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving || unresolvedConflict}
          title={
            unresolvedConflict
              ? "Bitte zuerst entscheiden: neueren Text übernehmen oder eigenen Entwurf behalten."
              : undefined
          }
          className="rounded border px-3 py-1 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          Speichern
        </button>
      </div>
      {iconMode && (
        <IconPickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          currentValue={cur.value.trim() || null}
          onSelect={(kebab) => setValue(kebab)}
        />
      )}
    </div>
  );
};




/** Kontext-Klassifikation des Feldes für die KI (kürzere Übersetzung für CTAs etc.). */
export function inferContext(fieldKey: string): string {
  const k = fieldKey.toLowerCase();
  if (k.includes("headline") || k.includes("title")) return "headline";
  if (k.includes("subline") || k.includes("subtitle")) return "subline";
  if (k.includes("cta") || k.includes("button") || k.includes("link_label")) return "cta";
  if (k.includes("alt")) return "alt";
  if (k.includes("label")) return "label";
  return "body";
}

export type SuggestionOutcome = "applied" | "discarded";

export const TranslateButton: React.FC<{
  sourceText: string;
  fieldKey: string;
  /**
   * Übergabe des Vorschlags. Ein Rückgabewert `"discarded"` bedeutet: der
   * Vorschlag gehört nicht mehr zum aktuellen Feld/Besuch und wurde verworfen
   * — dann darf keine Erfolgsmeldung erscheinen. `void` gilt als übernommen
   * (bestehende Aufrufer bleiben unverändert).
   */
  onTranslated: (next: string, baseline: string) => SuggestionOutcome | void;
  disabled?: boolean;
  /** Zielsprache des Vorschlags. Standard: Englisch. */
  target?: "en" | "pl";
  /**
   * Liest den sichtbaren Zielwert im Moment des Klicks (Zielzustand beim
   * Übersetzungsstart). Wird beim Eintreffen des Vorschlags gegen den dann
   * aktuellen Zielwert verglichen.
   */
  readTargetBaseline?: () => string;
}> = ({ sourceText, fieldKey, onTranslated, disabled, target = "en", readTargetBaseline }) => {
  const [busy, setBusy] = useState(false);
  const targetLabel = target.toUpperCase();
  const sourceRef = useRef(sourceText);
  sourceRef.current = sourceText;
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleClick = async () => {
    const txt = sourceText.trim();
    if (!txt) {
      toast.error("DE-Feld ist leer — nichts zu übersetzen.");
      return;
    }

    // Zielzustand beim Start festhalten (nicht erst bei Rückkehr lesen).
    const baseline = readTargetBaseline?.() ?? "";

    setBusy(true);
    try {
      const translated = await requestTranslation({
        source_text: txt,
        source_locale: "de",
        target_locale: target,
        context: inferContext(fieldKey),
      });

      // Nach echtem Ausbau: keine Meldung, keine Übernahme.
      if (!mountedRef.current) return;
      // Quelltext hat sich während der Übersetzung geändert → sichtbar
      // verwerfen statt falschen Erfolg melden.
      if (sourceRef.current.trim() !== txt) {
        toast.error(
          "Der deutsche Text hat sich während der Übersetzung geändert — Vorschlag verworfen. Bitte erneut übersetzen.",
        );
        return;
      }

      const outcome = onTranslated(translated, baseline);
      if (outcome === "discarded") {
        toast.error("Vorschlag verworfen — das Feld wurde zwischenzeitlich gewechselt.");
        return;
      }
      // Neutral zutreffend: ob der Vorschlag automatisch eingesetzt oder nur
      // angeboten wird, entscheidet das Zielfeld anhand seines Zustands.
      toast.success(`${targetLabel}-Vorschlag liegt vor — bitte prüfen und speichern.`);
    } catch (error) {
      if (!mountedRef.current) return;
      // Bewusste Absage (sprachneutraler/technischer Wert) ist kein Fehler.
      if (error instanceof NotTranslatableError) {
        toast.info(error.message);
        return;
      }
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error(`Übersetzung fehlgeschlagen: ${message}`);
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy || disabled}
      title={`Aktuellen deutschen Text per KI (Lovable AI) übersetzen. Der Vorschlag landet im ${targetLabel}-Feld — Speichern bleibt manuell.`}
      className="inline-flex items-center justify-start rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/20 disabled:opacity-40"
    >
      {busy ? "Übersetze…" : `DE → ${targetLabel}`}
    </button>
  );
};


/** Kleiner Herkunfts-Hinweis pro Zielsprache (geprüft / maschinell / veraltet). */
export const ReviewStatusBadge: React.FC<{ status?: string | null }> = ({ status }) => {
  if (!status) return null;
  const map: Record<string, { text: string; cls: string; title: string }> = {
    geprueft: {
      text: "geprüft",
      cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
      title: "Von Hand gepflegt oder redaktionell geprüft. Wird von automatischen Läufen nicht überschrieben.",
    },
    maschinell: {
      text: "maschinell",
      cls: "border-amber-500/40 bg-amber-500/10 text-amber-700",
      title: "Maschinell übersetzter Vorschlag. Sichtbar, aber noch nicht von einer Person geprüft.",
    },
    maschinell_veraltet: {
      text: "veraltet",
      cls: "border-destructive/30 bg-destructive/10 text-destructive",
      title: "Der deutsche Text wurde nach der maschinellen Übersetzung geändert. Bitte neu übersetzen.",
    },
  };
  const info = map[status];
  if (!info) return null;
  return (
    <span
      className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${info.cls}`}
      title={info.title}
    >
      {info.text}
    </span>
  );
};
/**
 * Toggle-Editor speziell für `image_position` (Wechselteaser).
 * - Werte: `"left"` (Bild links) | `"right"` (Bild rechts, Default).
 * - Sprachunabhängig: schreibt DE und EN identisch über die Standard-RPC.
 * - Whitelist-Eintrag muss pro Section für beide Locales existieren
 *   (Migration A-pos-1 hat das für alle 65 teaser_2col_v1-Sections erledigt).
 * - Layout wirkt im Renderer erst ab Desktop (lg); mobil/tablet steht das
 *   Bild aus DOM-Gründen ohnehin unter dem Text.
 *
 * Zusätzlich: drei manuelle Sammel-Aktionen für „echte Wechselteaser-Logik":
 *   1. „Wechsel-Muster ab hier": alle teaser_2col_v1 derselben Seite
 *      (inkl. inaktive, sortiert nach sort_order) werden ausgehend von der
 *      aktuellen Section alternierend gesetzt (links/rechts/links …).
 *   2. „Alle links" / „Alle rechts": alle teaser_2col_v1 derselben Seite
 *      bekommen denselben Wert (bewusster Sonderfall).
 * Alle Schreibwege gehen über `rpc_admin_update_section_field` (DE + EN
 * synchron). Keine direkten Tabellen-Schreibzugriffe.
 */
type BulkState = "idle" | "running" | "ok" | "error";

async function readTeaserSiblings(
  pageKey: string,
): Promise<Array<{ section_key: string; is_active: boolean; sort_order: number }>> {
  try {
    const mod = await import("@/lib/cmsSupabase/client");
    if (!mod.isCmsSupabaseConfigured()) return [];
    const sb = mod.getCmsSupabaseClient();
    const { data, error } = await sb
      .from("cms_sections")
      .select("section_key, is_active, sort_order, section_type")
      .eq("page_key", pageKey)
      .eq("section_type", "teaser_2col_v1")
      .order("sort_order", { ascending: true });
    if (error || !data) return [];
    return (data as Array<{
      section_key: string;
      is_active: boolean;
      sort_order: number;
    }>).map((r) => ({
      section_key: r.section_key,
      is_active: r.is_active,
      sort_order: r.sort_order,
    }));
  } catch {
    return [];
  }
}

const PositionToggleRow: React.FC<{
  label: string;
  pageKey?: string;
  sectionKey: PilotSectionKey;
  de: string | null;
  en: string | null;
  onSaved?: () => void;
  locked: boolean;
}> = ({ label, pageKey, sectionKey, de, en, onSaved, locked }) => {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const normalize = (v: string | null): "left" | "right" =>
    (v ?? "").trim().toLowerCase() === "left" ? "left" : "right";
  const initial = normalize(de ?? en);
  const [value, setValue] = useState<"left" | "right">(initial);
  const [state, setState] = useState<SaveState>("idle");
  const [msg, setMsg] = useState<string | null>(null);

  const [bulkState, setBulkState] = useState<BulkState>("idle");
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);

  useEffect(() => {
    setValue(normalize(de ?? en));
    setState("idle");
    setMsg(null);
  }, [de, en]);

  const save = async (next: "left" | "right") => {
    if (locked) return;
    setValue(next);
    setState("saving");
    setMsg(null);
    await preserveScroll(rowRef.current, async () => {
      const [resDe, resEn] = await Promise.all([
        saveSectionField({ pageKey, sectionKey, fieldKey: "image_position" as PilotFieldKey, locale: "de", value: next }),
        saveSectionField({ pageKey, sectionKey, fieldKey: "image_position" as PilotFieldKey, locale: "en", value: next }),
      ]);
      if (resDe.success && resEn.success) {
        setState("ok");
        setMsg("Gespeichert.");
        onSaved?.();
      } else {
        setState("error");
        setMsg(saveErrorHint(resDe.error ?? resEn.error));
      }
    });
  };

  /**
   * Sammel-Schreibaktion für alle teaser_2col_v1 derselben Seite.
   * mode:
   *   - "alternate-from-here": ab der aktuellen Section alternieren
   *     (aktueller Wert bleibt, alle weiteren wechseln im Muster).
   *   - "all-left" / "all-right": alle gleich.
   */
  const runBulk = async (mode: "alternate-from-here" | "all-left" | "all-right") => {
    if (locked || !pageKey) return;
    setBulkState("running");
    setBulkMsg(null);
    await preserveScroll(rowRef.current, async () => {
    const siblings = await readTeaserSiblings(pageKey);
    if (siblings.length === 0) {
      setBulkState("error");
      setBulkMsg("Keine Wechselteaser auf dieser Seite gefunden.");
      return;
    }

    const myIndex = siblings.findIndex((s) => s.section_key === sectionKey);
    const base: "left" | "right" =
      mode === "all-left" ? "left" : mode === "all-right" ? "right" : value;

    type WritePlan = { sectionKey: string; target: "left" | "right" };
    const plan: WritePlan[] = siblings.map((s, i) => {
      if (mode === "alternate-from-here") {
        const offset = myIndex >= 0 ? i - myIndex : i;
        // gerader Offset = base, ungerader = Gegenteil
        const target: "left" | "right" =
          offset % 2 === 0 ? base : base === "left" ? "right" : "left";
        return { sectionKey: s.section_key, target };
      }
      return { sectionKey: s.section_key, target: base };
    });

    let okCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // Sequentiell schreiben, damit wir bei vielen Sections nicht das
    // Gateway überrennen. Bei der typischen Seitenanzahl (1–6 Teaser)
    // ist das schnell genug.
    for (const w of plan) {
      const [r1, r2] = await Promise.all([
        saveSectionField({
          pageKey,
          sectionKey: w.sectionKey,
          fieldKey: "image_position" as PilotFieldKey,
          locale: "de",
          value: w.target,
        }),
        saveSectionField({
          pageKey,
          sectionKey: w.sectionKey,
          fieldKey: "image_position" as PilotFieldKey,
          locale: "en",
          value: w.target,
        }),
      ]);
      if (r1.success && r2.success) {
        okCount += 1;
      } else {
        failCount += 1;
        if (errors.length < 3) {
          errors.push(`${w.sectionKey}: ${r1.error ?? r2.error ?? "Fehler"}`);
        }
      }
    }

    if (failCount === 0) {
      setBulkState("ok");
      setBulkMsg(
        mode === "alternate-from-here"
          ? `Wechsel-Muster auf ${okCount} Teaser angewendet (ab dieser Section).`
          : `${okCount} Teaser auf „${base === "left" ? "Bild links" : "Bild rechts"}" gesetzt.`,
      );
      toast.success(bulkMsg ?? "Sammel-Änderung gespeichert.");
      // lokalen Wert für diese Section nachziehen
      const myTarget = plan.find((p) => p.sectionKey === sectionKey)?.target;
      if (myTarget) setValue(myTarget);
      onSaved?.();
    } else {
      setBulkState("error");
      setBulkMsg(
        `${okCount} ok, ${failCount} fehlgeschlagen.` +
          (errors.length ? ` Beispiele: ${errors.join("; ")}` : ""),
      );
    }
    });
  };

  const btn = (pos: "left" | "right", text: string) => {
    const active = value === pos;
    return (
      <button
        type="button"
        onClick={() => !active && save(pos)}
        disabled={locked || state === "saving"}
        aria-pressed={active}
        className={
          "flex-1 rounded border px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 " +
          (active
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input bg-background hover:bg-muted")
        }
      >
        {text}
      </button>
    );
  };

  const bulkBtnClass =
    "rounded border border-input bg-background px-2 py-1 text-[11px] font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50";
  const bulkDisabled = locked || !pageKey || bulkState === "running" || state === "saving";

  return (
    <div ref={rowRef} className="grid gap-3 border-t px-3 py-3 lg:grid-cols-[10rem_minmax(0,1fr)] lg:items-start">
      <div className="space-y-1 text-xs">
        <div className="text-foreground font-medium leading-tight">Bildposition</div>
        <div className="mt-0.5 font-mono text-[10px] text-muted-foreground/70 break-all" title={label}>
          {label}
        </div>
        <div className="mt-1 text-muted-foreground">
          {locked ? "Gesperrt (Whitelist aus)" : "Layout-Schalter · DE+EN gemeinsam"}
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex gap-2">
          {btn("left", "◧  Bild links")}
          {btn("right", "Bild rechts  ◨")}
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Wirkt ab Desktop. Auf Smartphone/Tablet steht das Bild immer unter dem Text.</span>
          {state !== "idle" && (
            <span
              className={
                state === "ok"
                  ? "text-emerald-600"
                  : state === "error"
                    ? "text-destructive"
                    : "text-muted-foreground"
              }
            >
              {state === "saving" ? "Speichere…" : msg}
            </span>
          )}
        </div>

        {/* Sammel-Aktionen für alle Wechselteaser derselben Seite */}
        <div className="mt-2 rounded border border-dashed border-input/70 bg-muted/30 px-2 py-2">
          <div className="mb-1 text-[11px] font-medium text-foreground">
            Für alle Wechselteaser dieser Seite
          </div>
          <div className="mb-1 text-[10px] text-muted-foreground">
            Wirkt auf alle <code className="rounded bg-background px-1">teaser_2col_v1</code>-Sections
            der Seite (inkl. deaktivierter), sortiert nach Reihenfolge. Schreibt DE und EN gemeinsam.
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={bulkBtnClass}
              onClick={() => runBulk("alternate-from-here")}
              disabled={bulkDisabled}
              title="Ab dieser Section abwechselnd links/rechts setzen — aktueller Wert bleibt der Startwert."
            >
              ◧◨ Wechsel-Muster ab hier
            </button>
            <button
              type="button"
              className={bulkBtnClass}
              onClick={() => runBulk("all-left")}
              disabled={bulkDisabled}
              title="Alle Wechselteaser dieser Seite auf Bild links setzen."
            >
              ◧ Alle links
            </button>
            <button
              type="button"
              className={bulkBtnClass}
              onClick={() => runBulk("all-right")}
              disabled={bulkDisabled}
              title="Alle Wechselteaser dieser Seite auf Bild rechts setzen."
            >
              Alle rechts ◨
            </button>
            {bulkState !== "idle" && (
              <span
                className={
                  "text-[11px] " +
                  (bulkState === "ok"
                    ? "text-emerald-600"
                    : bulkState === "error"
                      ? "text-destructive"
                      : "text-muted-foreground")
                }
              >
                {bulkState === "running" ? "Speichere…" : bulkMsg}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};




const EditableField = ({
  label,
  pageKey,
  sectionKey,
  fieldKey,
  de,
  en,
  pl = null,
  enStatus = null,
  plStatus = null,
  onSaved,
  deEditable = true,
  enEditable = true,
  plEditable = false,
  visibleTargets = null,
}: Props) => {
  // Identität dieses Feldes (Seite + Baustein + Feld). Bei Wechsel wird der
  // gesamte lokale Zustand verworfen — auch verspätete Übersetzungsvorschläge.
  const identity = fieldIdentity(pageKey, sectionKey as string, fieldKey as string);
  const identityRef = useRef(identity);
  // Besuchszähler: steigt bei JEDEM Identitätswechsel. So gehört eine späte
  // Antwort aus Besuch 1 von Feld A nicht zum späteren Besuch 3 von Feld A
  // (Fall A → B → A). Identität allein genügt dafür nicht.
  const [visit, setVisit] = useState(0);
  const visitRef = useRef(0);
  const nonceRef = useRef(0);

  // Sichtbarer DE-Entwurf (für Übersetzen) und Vorschläge für EN/PL.
  const [deLive, setDeLive] = useState<string>(de ?? "");
  const [enSuggestion, setEnSuggestion] = useState<ExternalSuggestion | null>(null);
  const [plSuggestion, setPlSuggestion] = useState<ExternalSuggestion | null>(null);
  // Sichtbare Zielwerte (nur als Ref — kein zusätzliches Rendern). Dient als
  // Zielzustand beim Übersetzungsstart.
  const enLiveRef = useRef<string>(en ?? "");
  const plLiveRef = useRef<string>(pl ?? "");

  useEffect(() => {
    if (identityRef.current !== identity) {
      identityRef.current = identity;
      visitRef.current += 1;
      setVisit(visitRef.current);
    }
    setEnSuggestion(null);
    setPlSuggestion(null);
    // Ist DE gesperrt, gibt es keinen Editor, der den sichtbaren Wert meldet.
    if (!deEditable) setDeLive(de ?? "");
    // Gesperrte Zielspalten melden nichts → Serverwert als Zielzustand.
    if (!enEditable) enLiveRef.current = en ?? "";
    if (!plEditable) plLiveRef.current = pl ?? "";
  }, [identity, deEditable, de, enEditable, en, plEditable, pl]);

  /** Besuchstoken: Feldidentität + Besuchsnummer. */
  const identityToken = `${identity}#${visit}`;
  const tokenRef = useRef(identityToken);
  tokenRef.current = identityToken;

  /**
   * Nimmt einen Übersetzungsvorschlag nur für denselben Besuch desselben
   * Feldes an. Sonst wird er verworfen und der Aufrufer meldet keinen Erfolg.
   */
  const acceptSuggestion = (
    target: "en" | "pl",
    requestedToken: string,
    next: string,
    baseline: string,
  ): SuggestionOutcome => {
    if (tokenRef.current !== requestedToken) return "discarded";
    nonceRef.current += 1;
    const suggestion = {
      value: next,
      nonce: nonceRef.current,
      identity: requestedToken,
      baseline,
    };
    if (target === "en") setEnSuggestion(suggestion);
    else setPlSuggestion(suggestion);
    return "applied";
  };



  const bothLocked = !deEditable && !enEditable;
  // Sichtbare Zielspalten: entweder nach Sprachumschalter (DB-Sprachliste)
  // oder – ohne Umschalter – wie bisher EN immer und PL bei Freigabe/Wert.
  const showEn = visibleTargets ? visibleTargets.includes("en") : true;
  const showPl = visibleTargets
    ? visibleTargets.includes("pl")
    : plEditable || (pl != null && pl !== "");
  const targetColumns = (showEn ? 1 : 0) + (showPl ? 1 : 0);

  // Spezialfall: image_position — Layout-Flag (Bild links/rechts), kein Text.
  // Wird sprachunabhängig gepflegt (DE+EN halten denselben Wert) und als
  // Zwei-Optionen-Toggle gerendert. Wirkt im Renderer erst ab Desktop —
  // mobil/tablet steht das Bild ohnehin unter dem Text.
  if ((fieldKey as string) === "image_position") {
    return (
      <PositionToggleRow
        label={label}
        pageKey={pageKey}
        sectionKey={sectionKey}
        de={de}
        en={en}
        onSaved={onSaved}
        locked={bothLocked}
      />
    );
  }

  return (
    <div
      className={
        "grid gap-3 border-t px-3 py-3 lg:items-start " +
        (targetColumns === 2
          ? "lg:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]"
          : targetColumns === 1
            ? "lg:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)]"
            : "lg:grid-cols-[10rem_minmax(0,1fr)]")
      }
    >
      <div className="space-y-2 text-xs">
        <div>
          <div className="text-foreground font-medium leading-tight">
            {prettifyKey(label)}
          </div>
          <div
            className="mt-0.5 font-mono text-[10px] text-muted-foreground/70 break-all"
            title={label}
          >
            {label}
          </div>
          <div className="mt-1 text-muted-foreground">
            {bothLocked
              ? "Gesperrt (Whitelist aus)"
              : !deEditable
                ? "Nur EN editierbar"
                : !enEditable
                  ? "Nur DE editierbar"
                  : "Editierbar"}
          </div>
        </div>
        {deEditable && enEditable && showEn && (
          <TranslateButton
            sourceText={deLive}
            fieldKey={fieldKey}
            target="en"
            readTargetBaseline={() => enLiveRef.current}
            onTranslated={(next, baseline) =>
              acceptSuggestion("en", identityToken, next, baseline)
            }
          />
        )}
        {deEditable && plEditable && showPl && (
          <TranslateButton
            sourceText={deLive}
            fieldKey={fieldKey}
            target="pl"
            readTargetBaseline={() => plLiveRef.current}
            onTranslated={(next, baseline) =>
              acceptSuggestion("pl", identityToken, next, baseline)
            }
          />
        )}
      </div>
      <div className="space-y-2">
        {deEditable ? (
          <Editor
            locale="de"
            identityToken={identityToken}
            initial={de ?? ""}
            pageKey={pageKey}
            sectionKey={sectionKey}
            fieldKey={fieldKey}
            onSaved={onSaved}
            onValueChange={setDeLive}
          />
        ) : (
          <>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              DE · gesperrt
            </div>
            <ReadOnlyBox value={de} />
          </>
        )}
      </div>
      {showEn && (
      <div className="space-y-2">
        {enStatus && (
          <div className="flex justify-end">
            <ReviewStatusBadge status={enStatus} />
          </div>
        )}
        {enEditable ? (
          <Editor
            locale="en"
            identityToken={identityToken}
            initial={en ?? ""}
            pageKey={pageKey}
            sectionKey={sectionKey}
            fieldKey={fieldKey}
            onSaved={onSaved}
            onValueChange={(next) => {
              enLiveRef.current = next;
            }}
            externalValue={enSuggestion}
          />
        ) : (
          <>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              EN · gesperrt
            </div>
            <ReadOnlyBox value={en} />
          </>
        )}
      </div>
      )}
      {showPl && (
        <div className="space-y-2">
          {plStatus && (
            <div className="flex justify-end">
              <ReviewStatusBadge status={plStatus} />
            </div>
          )}
          {plEditable ? (
            <Editor
              locale="pl"
              identityToken={identityToken}
              initial={pl ?? ""}
              pageKey={pageKey}
              sectionKey={sectionKey}
              fieldKey={fieldKey}
              onSaved={onSaved}
              onValueChange={(next) => {
                plLiveRef.current = next;
              }}
              externalValue={plSuggestion}
            />
          ) : (
            <>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                PL · gesperrt
              </div>
              <ReadOnlyBox value={pl} />
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default EditableField;
