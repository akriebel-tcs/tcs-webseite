/**
 * StandardBausteinWorkspace — gemeinsamer Admin-Arbeitsbereich für die
 * drei Standardbausteine `hero_v1`, `teaser_2col_v1` und `content_v1`
 * (Sprint `cms-light-baustein-workspaces-wechselteaser-hero-content-1`).
 *
 * Ziel: Mitarbeiter sehen pro Block nur die wirklich gelesenen Felder,
 * klar benannt, mit DE/EN-Speichern, Freigabe-Schalter und einem
 * Wirksamkeits-Hinweis pro Feld („wirkt öffentlich" · „Fallback/Legacy"
 * · „nicht gerendert" · „optional leer").
 *
 *  - Schreibt ausschließlich über die bestehenden Bausteine
 *    (`EditableField` → `rpc_admin_update_section_field`,
 *    `FreigabeSwitch` → `rpc_admin_set_editable_field_enabled`).
 *  - Kein neuer Schreibweg, keine neue RPC, kein direkter Tabellenzugriff.
 *  - Asset-Slots laufen weiterhin über `SectionAssetsBlock`
 *    (per `assetsSlot`-Prop eingebunden).
 *  - Legacy-Felder (vom Workspace nicht abgedeckt, aber in der DB
 *    vorhanden) werden NICHT versteckt, sondern in einer eigenen
 *    Diagnose-Gruppe sichtbar gelassen.
 */
import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import EditableField from "@/features/admin/components/EditableField";
import type { EditableFieldRow } from "@/features/admin/api/cmsAdminEditableFields";
import {
  getWorkspaceConfigForSectionType,
  workspaceFieldKeysFor,
  type SectionWorkspaceConfig,
  type WorkspaceExpectation,
  type WorkspaceFieldDef,
  type WorkspaceGroupDef,
} from "@/features/admin/lib/sectionWorkspaceGroups";
import { getBespokePageSectionInfo } from "@/features/admin/lib/bespokePageSections";

import type {
  PilotSectionKey,
  PilotFieldKey,
} from "@/features/admin/api/cmsAdminWrite";

interface Props {
  pageKey: string;
  sectionKey: string;
  sectionType: string | null;
  /** In der DB tatsächlich vorhandene field_keys dieser Section (DE+EN dedupliziert). */
  dbFieldKeys: ReadonlyArray<string>;
  valueFor: (sectionKey: string, fieldKey: string, locale: "de" | "en") => string | null;
  efGet: (sectionKey: string, fieldKey: string, locale: "de" | "en") => EditableFieldRow | null;
  renderFreigabeSwitch: (row: EditableFieldRow | null) => ReactNode;
  /** Eingebetteter Asset-Block (gleiche Komponente wie in der flachen Liste). */
  assetsSlot?: ReactNode;
  onSaved: () => void | Promise<void>;
  /** Wenn true, werden zusätzliche Diagnose-Badges sichtbar. */
  debugMode?: boolean;
}

// ───────── Hilfen ──────────────────────────────────────────────────────

function expectationBadge(expectation: WorkspaceExpectation, inDb: boolean) {
  // Reine Anzeige — die Klassifikation kommt aus `sectionWorkspaceGroups`.
  // Spezialfall: Feld ist im Workspace „public", aber in der DB nicht
  // vorhanden → wir zeigen „optional leer" statt grün, weil aktuell
  // schlicht kein Wert da ist.
  if (!inDb && expectation === "public") {
    return {
      label: "leer · wirkt öffentlich, sobald gefüllt",
      title: "Renderer liest dieses Feld. Solange in der DB nichts steht, bleibt es leer.",
      cls: "border-amber-500/30 bg-amber-500/10 text-amber-700",
    };
  }
  switch (expectation) {
    case "public":
      return {
        label: "wirkt öffentlich",
        title: "Renderer liest dieses Feld und gibt es auf der Webseite aus.",
        cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
      };
    case "optional":
      return {
        label: "optional",
        title: "Renderer liest dieses Feld, darf aber leer sein.",
        cls: "border-sky-500/30 bg-sky-500/10 text-sky-700",
      };
    case "not-rendered":
      return {
        label: "nicht gerendert",
        title:
          "Im Vertrag vorgesehen, der aktuelle Renderer liest dieses Feld jedoch nicht. Pflegen erlaubt — wirkt erst nach Renderer-Etappe.",
        cls: "border-destructive/30 bg-destructive/10 text-destructive",
      };
    case "legacy":
      return {
        label: "Fallback/Legacy",
        title: "Altbestand: in der DB vorhanden, im aktuellen Vertrag nicht erfasst.",
        cls: "border-muted-foreground/30 bg-muted text-muted-foreground",
      };
  }
}

function GroupShell({
  group,
  defaultOpen,
  children,
}: {
  group: WorkspaceGroupDef;
  defaultOpen: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded border bg-muted/10">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span>
          <span className="block text-sm font-medium text-foreground">{group.label}</span>
          <span className="block text-xs text-muted-foreground">{group.hint}</span>
        </span>
        <ChevronDown
          className={"h-4 w-4 shrink-0 text-muted-foreground transition-transform " + (open ? "rotate-180" : "")}
        />
      </button>
      {open && <div className="space-y-4 border-t bg-background px-3 py-3">{children}</div>}
    </div>
  );
}

// ───────── Hauptkomponente ─────────────────────────────────────────────

export default function StandardBausteinWorkspace(props: Props) {
  const {
    pageKey,
    sectionKey,
    sectionType,
    dbFieldKeys,
    valueFor,
    efGet,
    renderFreigabeSwitch,
    assetsSlot,
    onSaved,
    debugMode = false,
  } = props;

  const config = getWorkspaceConfigForSectionType(sectionType);
  if (!config) {
    // Sicherheitsnetz: PageEditor sollte den Workspace nur für die drei
    // Standard-Typen aufrufen. Falls doch nicht: nichts rendern, damit
    // der flache Plan-Renderer ohne Drift greifen kann.
    return null;
  }

  const dbSet = new Set(dbFieldKeys);
  const workspaceKeys = workspaceFieldKeysFor(sectionType);
  const legacyKeys = Array.from(dbSet)
    .filter((k) => !workspaceKeys.has(k))
    .sort();

  const handleSaved = () => {
    void onSaved();
  };

  const renderField = (field: WorkspaceFieldDef) => {
    const fk = field.fieldKey;
    const inDb = dbSet.has(fk);
    const deRow = efGet(sectionKey, fk, "de");
    const enRow = efGet(sectionKey, fk, "en");
    const inWhitelist = !!deRow || !!enRow;
    const canSave = inDb && inWhitelist;
    const badge = expectationBadge(field.expectation, inDb);
    return (
      <div key={fk} className="space-y-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
          <span className="inline-flex max-w-full flex-wrap items-baseline gap-2">
            <span className="text-sm font-medium text-foreground">{field.label}</span>
            <span
              className={"rounded border px-1.5 py-0.5 text-[10px] font-medium " + badge.cls}
              title={badge.title}
            >
              {badge.label}
            </span>
            {debugMode && (
              <span className="rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                {fk}
              </span>
            )}
            {debugMode && !canSave && (
              <span
                className="rounded border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive"
                title={
                  !inDb && !inWhitelist
                    ? "Weder DB-Zeile noch Whitelist-Eintrag — Speichern hier nicht möglich."
                    : !inDb
                      ? "Keine DB-Zeile — ohne Migration nicht speicherbar."
                      : "Kein Whitelist-Eintrag — Speichern hier nicht möglich."
                }
              >
                nicht speicherbar
              </span>
            )}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground">DE:</span>
            {renderFreigabeSwitch(deRow)}
            <span className="ml-2 text-[10px] text-muted-foreground">EN:</span>
            {renderFreigabeSwitch(enRow)}
          </div>
        </div>
        {field.hint && (
          <p className="text-[11px] leading-relaxed text-muted-foreground">{field.hint}</p>
        )}
        {debugMode && (
          <p className="text-[10px] italic text-muted-foreground">{field.rendererNote}</p>
        )}
        {field.role === "enum" && field.enumOptions && (
          <p className="text-[11px] text-muted-foreground">
            Erlaubte Werte:{" "}
            {field.enumOptions.map((o, i) => (
              <span key={o.value}>
                {i > 0 && ", "}
                <code className="rounded bg-muted px-1 font-mono">{o.value}</code>
                {" — "}
                {o.label}
              </span>
            ))}
          </p>
        )}
        <EditableField
          pageKey={pageKey}
          label={field.label}
          sectionKey={sectionKey as PilotSectionKey}
          fieldKey={fk as PilotFieldKey}
          de={valueFor(sectionKey, fk, "de")}
          en={valueFor(sectionKey, fk, "en")}
          deEditable={canSave && !!deRow?.is_enabled}
          enEditable={canSave && !!enRow?.is_enabled}
          onSaved={handleSaved}
        />
      </div>
    );
  };

  const bespoke = getBespokePageSectionInfo(pageKey, sectionKey);

  return (
    <div className="space-y-4">
      <div className="rounded border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        <span className="mr-2 inline-block rounded bg-background px-1.5 py-0.5 font-mono text-[10px]">
          {config.sectionType}
        </span>
        <span className="font-medium text-foreground">
          {bespoke?.label ?? config.adminLabel}
        </span>
        <span className="ml-1">— {bespoke?.description ?? config.description}</span>
      </div>

      {config.groups.map((g) => (
        <GroupShell key={g.key} group={g} defaultOpen={g.defaultOpen}>
          {g.fields.map((f) => renderField(f))}
        </GroupShell>
      ))}

      {config.assetSlot && assetsSlot && (
        <div className="rounded border bg-muted/10">
          <div className="border-b px-3 py-2 text-xs">
            <span className="block text-sm font-medium text-foreground">
              {config.assetSlot.label}
            </span>
            <span className="block text-muted-foreground">{config.assetSlot.hint}</span>
          </div>
          <div className="px-3 py-3">{assetsSlot}</div>
        </div>
      )}

      {legacyKeys.length > 0 && (
        <div
          className={
            bespoke
              ? "rounded border border-sky-500/30 bg-sky-500/5"
              : "rounded border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs"
          }
        >
          <div
            className={
              bespoke
                ? "border-b border-sky-500/30 px-3 py-2 text-xs"
                : "mb-1 font-medium text-amber-800"
            }
          >
            <div
              className={
                bespoke ? "text-sm font-medium text-sky-900" : "font-medium text-amber-800"
              }
            >
              {bespoke
                ? `${bespoke.legacyHeading} (${legacyKeys.length})`
                : `Nicht öffentlich verwendete Altfelder (${legacyKeys.length})`}
            </div>
            <p
              className={
                bespoke
                  ? "mt-1 text-[11px] leading-relaxed text-muted-foreground"
                  : "mb-2 text-muted-foreground"
              }
            >
              {bespoke ? (
                bespoke.legacyHint
              ) : (
                <>
                  Diese Feld-Keys liegen in der Datenbank, werden aber vom Standard-Renderer für{" "}
                  <code className="rounded bg-muted px-1 font-mono">{config.sectionType}</code>
                  {" "}nicht ausgelesen — typischerweise leere Migrationsreste oder Aliase, die schon
                  unter ihrem kanonischen Namen im Workspace stehen. Pflege bitte oben im Workspace.
                  Diese Liste ist Diagnose, keine Warnung: nicht löschen, als Cleanup-Kandidat
                  vormerken.
                </>
              )}
            </p>
          </div>
          {bespoke ? (
            <div className="space-y-4 bg-background px-3 py-3">
              {legacyKeys.map((fk) => {
                const inDb = dbSet.has(fk);
                const deRow = efGet(sectionKey, fk, "de");
                const enRow = efGet(sectionKey, fk, "en");
                const inWhitelist = !!deRow || !!enRow;
                const canSave = inDb && inWhitelist;
                return (
                  <div key={fk} className="space-y-1.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                      <span className="inline-flex max-w-full flex-wrap items-baseline gap-2">
                        <span className="font-mono text-[11px] font-medium text-foreground">
                          {fk}
                        </span>
                        <span
                          className="rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-700"
                          title="Sonderfeld dieser Page-Komponente — wird öffentlich gerendert."
                        >
                          Sonderfeld · wirkt öffentlich
                        </span>
                        {debugMode && !canSave && (
                          <span
                            className="rounded border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive"
                            title={
                              !inDb && !inWhitelist
                                ? "Weder DB-Zeile noch Whitelist-Eintrag — Speichern hier nicht möglich."
                                : !inDb
                                  ? "Keine DB-Zeile — ohne Migration nicht speicherbar."
                                  : "Kein Whitelist-Eintrag — Speichern hier nicht möglich."
                            }
                          >
                            nicht speicherbar
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-muted-foreground">DE:</span>
                        {renderFreigabeSwitch(deRow)}
                        <span className="ml-2 text-[10px] text-muted-foreground">EN:</span>
                        {renderFreigabeSwitch(enRow)}
                      </div>
                    </div>
                    <EditableField
                      pageKey={pageKey}
                      label={fk}
                      sectionKey={sectionKey as PilotSectionKey}
                      fieldKey={fk as PilotFieldKey}
                      de={valueFor(sectionKey, fk, "de")}
                      en={valueFor(sectionKey, fk, "en")}
                      deEditable={canSave && !!deRow?.is_enabled}
                      enEditable={canSave && !!enRow?.is_enabled}
                      onSaved={handleSaved}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <ul className="flex flex-wrap gap-1">
              {legacyKeys.map((k) => (
                <li
                  key={k}
                  className="rounded border border-amber-500/30 bg-background px-1.5 py-0.5 font-mono text-[10px] text-amber-800"
                >
                  {k}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
