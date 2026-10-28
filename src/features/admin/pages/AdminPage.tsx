import { useEffect, useMemo, useState } from "react";
import { readPilotPflege, type PilotBundle } from "@/features/admin/api/cmsAdminRead";

import MasterDetailWorkbench from "@/features/admin/components/MasterDetailWorkbench";
import AssetWorkbench from "@/features/admin/components/AssetWorkbench";
import SlotValidationView from "@/features/admin/components/SlotValidationView";
import type { EditableFieldRow } from "@/features/admin/api/cmsAdminEditableFields";
import { GlossaryScope } from "@/features/admin/components/Term";
import GoToShortIdBar, { type JumpTarget } from "@/features/admin/components/GoToShortIdBar";
import VorlagenKatalog from "@/features/admin/components/VorlagenKatalog";
import SnapshotExportView from "@/features/admin/components/SnapshotExportView";
import TranslationWorkbench from "@/features/admin/components/TranslationWorkbench";
import {
  isCmsSupabaseConfigured,
  isUsingCmsFallback,
  getCmsSupabaseUrl,
} from "@/lib/cmsSupabase/client";

/**
 * CMS-Light Admin Shell — schlanker Direktstart.
 *
 * Nach Etappe 4 (UI-Aufräumung) gibt es hier keine Tabs mehr: /admin landet
 * direkt im Arbeitsbereich „Struktur & Inhalte" (MasterDetailWorkbench).
 * Übersicht, Labels-Diagnose, Modus-Legende und Untertitel wurden entfernt;
 * die Glossar-Erklärungen leben weiter als Tooltips an den Feldern.
 *
 * - Wird ohne öffentliches Website-Layout gerendert (siehe src/App.tsx).
 * - Kein Login, temporärer Workspace-Prototyp.
 * - Schreibwege ausschließlich über bestehende `rpc_admin_*` (Whitelist).
 */

const PILOT_PAGE_KEY = "anwendungen.pflege";

const Notice = ({ tone, children }: { tone: "info" | "warn"; children: React.ReactNode }) => (
  <div
    className={
      tone === "warn"
        ? "rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        : "rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
    }
  >
    {children}
  </div>
);

const AdminPage = () => {
  const [pendingJump, setPendingJump] = useState<{ target: JumpTarget; token: number } | null>(
    null,
  );

  const [bundle, setBundle] = useState<PilotBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [cmsManagedPageKeys, setCmsManagedPageKeys] = useState<ReadonlySet<string>>(
    () => new Set([PILOT_PAGE_KEY]),
  );
  const [editableFields, setEditableFields] = useState<EditableFieldRow[]>([]);
  const [activeView, setActiveView] = useState<
    "content" | "assets" | "validation" | "translations" | "blueprints" | "snapshot"
  >("content");


  const handleJump = (target: JumpTarget) => {
    // Sprünge zu Seiten/Sections/Feldern landen immer im Inhalte-Bereich.
    setActiveView("content");
    setPendingJump((prev) => ({ target, token: (prev?.token ?? 0) + 1 }));
  };

  /** Sprung aus dem Übersetzungs-Prüfbericht direkt an die Textstelle. */
  const handleJumpToField = (pageKey: string, sectionKey: string, fieldKey: string) => {
    handleJump({
      page_key: pageKey,
      section_key: sectionKey,
      node_id: null,
      field_key: fieldKey,
      label: `${pageKey} / ${sectionKey} / ${fieldKey}`,
      raw: {
        kind: "B",
        page_key: pageKey,
        section_key: sectionKey,
      } as unknown as JumpTarget["raw"],
    });
  };


  const loadEditableFields = () =>
    import("@/features/admin/api/cmsAdminEditableFields").then(
      ({ readEditableFields }) =>
        readEditableFields().then((res) => {
          const keys = new Set<string>([PILOT_PAGE_KEY]);
          for (const row of res.rows) {
            if (row.is_enabled) keys.add(row.page_key);
          }
          setCmsManagedPageKeys(keys);
          setEditableFields(res.rows);
        }),
    );

  useEffect(() => {
    let cancelled = false;
    loadEditableFields().then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const cmsConfigured = useMemo(() => isCmsSupabaseConfigured(), []);
  const cmsFallback = useMemo(() => isUsingCmsFallback(), []);
  const cmsUrl = useMemo(() => getCmsSupabaseUrl(), []);

  useEffect(() => {
    document.title = "CMS-Light – Redaktioneller Arbeitsbereich";
  }, []);

  const loadBundle = () => {
    setLoading(true);
    return readPilotPflege()
      .then((b) => setBundle(b))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    readPilotPflege()
      .then((b) => {
        if (!cancelled) setBundle(b);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <GlossaryScope resetKey="struktur-inhalte">
      {/*
        Voll responsives Shell (Etappe `cms-light-admin-responsive-1`):
        - Nutzt die komplette Browserbreite (kein max-w mehr) mit knappem
          Außenrand, damit auf 27"-Monitoren keine Bildschirmhälfte leer bleibt.
        - Nutzt die komplette Browserhöhe (`h-screen` + flex-Kette mit
          `min-h-0`), sodass NUR die Spalten intern scrollen und die ganze
          Admin-Seite nicht mehr vertikal wegscrollt.
        - Header bleibt kompakt; Hinweise rutschen in eine zweite Zeile, wenn
          der Platz knapp wird.
      */}
      <div className="flex h-screen w-full flex-col overflow-hidden px-3 py-2 sm:px-4 sm:py-3">
        <header className="mb-2 shrink-0 border-b pb-2 sm:mb-3 sm:pb-3">
          <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight sm:text-2xl">CMS-Light</h1>
              <div className="ml-1 inline-flex overflow-hidden rounded border text-xs">
                <button
                  type="button"
                  onClick={() => setActiveView("content")}
                  className={
                    "px-2 py-1 " +
                    (activeView === "content"
                      ? "bg-foreground text-background"
                      : "bg-background hover:bg-muted")
                  }
                  title="Seiten, Sections und Inhalte pflegen"
                >
                  Inhalte
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView("assets")}
                  className={
                    "border-l px-2 py-1 " +
                    (activeView === "assets"
                      ? "bg-foreground text-background"
                      : "bg-background hover:bg-muted")
                  }
                  title="Zentrale Bildredaktion für alle CMS-Bilder"
                >
                  Bilder
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView("blueprints")}
                  className={
                    "border-l px-2 py-1 " +
                    (activeView === "blueprints"
                      ? "bg-foreground text-background"
                      : "bg-background hover:bg-muted")
                  }
                  title="Vorlagen-Katalog: Seitentypen, Bausteine (Container) und Standardkarte mit Beispielseiten"
                >
                  Vorlagen
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView("validation")}
                  className={
                    "border-l px-2 py-1 " +
                    (activeView === "validation"
                      ? "bg-foreground text-background"
                      : "bg-background hover:bg-muted")
                  }
                  title="Wahrheits-Check: stimmen die Bilder im CMS mit der Website überein?"
                >
                  Wahrheits-Check
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView("translations")}
                  className={
                    "border-l px-2 py-1 " +
                    (activeView === "translations"
                      ? "bg-foreground text-background"
                      : "bg-background hover:bg-muted")
                  }
                  title="Übersetzungen: Sprachen, Umfang, Vorschau, fortsetzbare Läufe und Prüfbericht"
                >
                  Übersetzungen
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView("snapshot")}
                  className={
                    "border-l px-2 py-1 text-muted-foreground " +
                    (activeView === "snapshot"
                      ? "bg-foreground text-background"
                      : "bg-background hover:bg-muted")
                  }
                  title="Temporäres internes Werkzeug: Content-Snapshot als ZIP herunterladen (kein vollständiges DB-Backup)"
                >
                  Snapshot
                </button>
              </div>
            </div>
            <div className="w-full sm:w-auto sm:min-w-[20rem]">
              <GoToShortIdBar onJump={handleJump} />
              <p className="mt-1 hidden text-[10px] text-muted-foreground sm:block">
                Tipp: Taste <kbd className="rounded border bg-muted px-1 font-mono">/</kbd> fokussiert die Eingabe.
              </p>
            </div>
          </div>
          <div className="mt-2 hidden flex-wrap gap-2 text-xs md:flex">
            <span className="rounded bg-amber-500/10 px-2 py-1 text-amber-700">
              No-Login-Workspace · nur für Redaktion während Aufbau
            </span>
            <span className="rounded bg-muted px-2 py-1 text-muted-foreground">
              Isoliert vom öffentlichen Website-Layout
            </span>
          </div>
        </header>

        {!cmsConfigured && (
          <div className="mb-2 shrink-0">
            <Notice tone="warn">
              CMS-Light-Konfiguration fehlt in dieser Preview.
              {" "}<code className="rounded bg-muted px-1">VITE_SUPABASE_URL</code> /{" "}
              <code className="rounded bg-muted px-1">VITE_SUPABASE_PUBLISHABLE_KEY</code>{" "}
              sind nicht verfügbar und es konnte auch kein Fallback initialisiert werden.
            </Notice>
          </div>
        )}
        {cmsConfigured && cmsFallback && (
          <div className="mb-2 shrink-0">
            <Notice tone="info">
              CMS-Light-Konfiguration: Fallback auf Projekt{" "}
              <code className="rounded bg-muted px-1">uvkubrrljyzfvbvejepl</code> aktiv
              {cmsUrl ? <> · <span className="font-mono text-xs">{cmsUrl}</span></> : null}.
            </Notice>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col">
          {activeView === "content" && (
            <MasterDetailWorkbench
              pilotBundle={bundle}
              pilotLoading={loading}
              onPilotSaved={loadBundle}
              cmsManagedPageKeys={cmsManagedPageKeys}
              editableFields={editableFields}
              onEditableFieldsChanged={loadEditableFields}
              pendingJump={pendingJump}
            />
          )}
          {activeView === "assets" && <AssetWorkbench />}
          {activeView === "validation" && <SlotValidationView />}
          {activeView === "translations" && (
            <TranslationWorkbench onJumpToField={handleJumpToField} />
          )}
          {activeView === "blueprints" && <VorlagenKatalog onJump={handleJump} />}
          {activeView === "snapshot" && <SnapshotExportView />}
        </div>
      </div>
    </GlossaryScope>
  );
};

export default AdminPage;
