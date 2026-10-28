/**
 * AssetUploader — Bild-Upload-Karte für ein einzelnes Bild-Feld einer Seite.
 *
 * Etappe I.5. Schreibt ausschließlich über die Whitelist-RPCs in
 * `cmsAdminAssets.ts`. Der Upload geht in den public Bucket `cms-assets`.
 *
 * Funktion (für Redakteure):
 *   - Datei auswählen oder per Drag&Drop ablegen
 *   - Vorschau des aktuellen Bildes
 *   - Alt-Texte (Bildbeschreibung) DE/EN pflegen — wichtig für Barrierefreiheit
 *     und Suchmaschinen
 *   - Bild austauschen oder entfernen (weiches Löschen, Datei bleibt)
 */
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  deleteAsset,
  readAssets,
  updateAssetAlt,
  uploadAsset,
  type AssetViewport,
  type CmsAssetRow,
} from "@/features/admin/api/cmsAdminAssets";
import ShortIdBadge from "@/features/admin/components/ShortIdBadge";

interface Props {
  pageKey: string;
  sectionKey: string;
  fieldKey: string;
  /** Aktive Assets dieser Seite — wird vom Parent geladen. */
  assets: CmsAssetRow[];
  onChanged: () => void | Promise<void>;
}

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const VIEWPORTS: { key: AssetViewport; label: string; hint: string }[] = [
  { key: "mobile",  label: "Mobil",   hint: "Bildschirm bis 639 px (Smartphone)" },
  { key: "tablet",  label: "Tablet",  hint: "Bildschirm 640–1023 px (Tablet)" },
  { key: "desktop", label: "Desktop", hint: "Bildschirm ab 1024 px (Laptop/Monitor)" },
];

const AltEditor: React.FC<{
  assetId: string;
  locale: "de" | "en";
  initial: string | null;
  onSaved: () => void;
}> = ({ assetId, locale, initial, onSaved }) => {
  const [value, setValue] = useState(initial ?? "");
  const [saving, setSaving] = useState(false);
  useEffect(() => setValue(initial ?? ""), [initial]);
  const dirty = (value ?? "") !== (initial ?? "");

  const handleSave = async () => {
    setSaving(true);
    const r = await updateAssetAlt(assetId, locale, value);
    setSaving(false);
    if (r.success) {
      toast.success(`Alt-Text (${locale.toUpperCase()}) gespeichert.`);
      onSaved();
    } else {
      toast.error(`Alt-Text speichern fehlgeschlagen: ${r.error ?? "?"}`);
    }
  };

  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Bildbeschreibung {locale.toUpperCase()}{" "}
        <span className="font-normal lowercase text-muted-foreground/70">
          (Alt-Text — für Screenreader & SEO)
        </span>
      </label>
      <div className="flex flex-wrap gap-2">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={2}
          placeholder={
            locale === "de"
              ? "z. B. „Pflegekraft im Gespräch mit Bewohner"
              : "e.g. „Caregiver talking with resident"
          }
          className="min-w-0 flex-1 resize-y rounded border border-input bg-background px-2 py-1 text-xs leading-snug break-words focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="shrink-0 self-start rounded border px-2 py-1 text-xs hover:bg-muted disabled:opacity-40"
        >
          {saving ? "…" : "Speichern"}
        </button>
      </div>
    </div>
  );
};

/** Eine einzelne Viewport-Variante (Mobil/Tablet/Desktop). */
const VariantRow: React.FC<{
  pageKey: string;
  sectionKey: string;
  fieldKey: string;
  viewport: AssetViewport;
  viewportLabel: string;
  viewportHint: string;
  active: CmsAssetRow | undefined;
  onChanged: () => void | Promise<void>;
}> = ({ pageKey, sectionKey, fieldKey, viewport, viewportLabel, viewportHint, active, onChanged }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Nur Bilddateien erlaubt (PNG, JPG, WEBP, SVG, AVIF).");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(`Datei zu groß (max. 10 MB). Aktuell: ${(file.size / 1024 / 1024).toFixed(1)} MB`);
      return;
    }
    setBusy(true);
    const r = await uploadAsset({ pageKey, sectionKey, fieldKey, file, viewport });
    setBusy(false);
    if (r.success) {
      toast.success(`Bild ${viewportLabel} hochgeladen.`);
      await onChanged();
    } else {
      toast.error(r.error ?? "Upload fehlgeschlagen.");
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRemove = async () => {
    if (!active) return;
    if (!window.confirm(`Bild ${viewportLabel} entfernen? (Datei im Speicher bleibt erhalten.)`)) return;
    setBusy(true);
    const r = await deleteAsset(active.id);
    setBusy(false);
    if (r.success) {
      toast.success("Bild entfernt.");
      await onChanged();
    } else {
      toast.error(r.error ?? "Entfernen fehlgeschlagen.");
    }
  };

  return (
    <div className="rounded border bg-background/60 p-2">
      <div className="mb-2 flex items-baseline justify-between gap-2 text-[11px]">
        <span className="font-semibold">
          {viewportLabel} <span className="font-normal text-muted-foreground/80">({viewportHint})</span>
        </span>
        {active && (
          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-700">aktiv</span>
        )}
      </div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void handleFile(f);
        }}
        className={"flex gap-2 rounded border-2 border-dashed p-2 " + (dragOver ? "border-primary bg-primary/5" : "border-muted")}
      >
        <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded bg-muted/30">
          {active?.public_url ? (
            <img
              src={active.public_url}
              alt=""
              className="block h-full w-full object-contain"
              loading="lazy"
              onError={(e) => {
                const img = e.currentTarget;
                img.style.display = "none";
                const fb = img.nextElementSibling as HTMLElement | null;
                if (fb) fb.style.display = "flex";
              }}
            />
          ) : null}
          {active?.public_url && (
            <span style={{ display: "none" }} className="h-full w-full items-center justify-center text-[10px] text-muted-foreground">
              Bild nicht ladbar
            </span>
          )}
          {!active?.public_url && (
            <span className="text-[10px] text-muted-foreground">Noch kein Bild</span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <input ref={inputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }} />
          <div className="flex flex-wrap gap-1">
            <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
              className="rounded border bg-background px-2 py-1 text-[11px] hover:bg-muted disabled:opacity-40">
              {busy ? "Lade…" : active ? "Austauschen" : "Hochladen"}
            </button>
            {active && (
              <button type="button" onClick={handleRemove} disabled={busy}
                className="rounded border border-destructive/40 bg-destructive/5 px-2 py-1 text-[11px] text-destructive hover:bg-destructive/10 disabled:opacity-40">
                Entfernen
              </button>
            )}
          </div>
          {active?.file_name && (
            <p className="break-all text-[10px] leading-snug text-muted-foreground">
              <span className="font-mono">{active.file_name}</span>
            </p>
          )}
        </div>
      </div>
      {active && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <AltEditor assetId={active.id} locale="de" initial={active.alt_de} onSaved={() => void onChanged()} />
          <AltEditor assetId={active.id} locale="en" initial={active.alt_en} onSaved={() => void onChanged()} />
        </div>
      )}
    </div>
  );
};

const AssetUploader: React.FC<Props> = ({ pageKey, sectionKey, fieldKey, assets, onChanged }) => {
  // Pro Viewport eine aktive Zeile heraussuchen.
  const findActive = (vp: AssetViewport) => assets.find(
    (a) => a.page_key === pageKey && a.section_key === sectionKey && a.field_key === fieldKey
      && a.viewport === vp && a.is_active,
  );
  const anyActive = VIEWPORTS.map((v) => findActive(v.key)).find(Boolean);

  return (
    <div className="rounded border bg-background p-3">
      <div className="mb-3 flex items-baseline justify-between gap-2 text-xs">
        <span className="inline-flex items-baseline gap-1.5 font-mono text-muted-foreground">
          <ShortIdBadge kind="A" value={anyActive?.asset_no ?? null} hint={`Bild ${sectionKey}.${fieldKey}`} />
          <span>{sectionKey}.{fieldKey}</span>{" "}
          <span className="text-muted-foreground/70">(Bild — drei Varianten je Bildschirmgröße)</span>
        </span>
      </div>
      {anyActive?.public_url && (
        <div className="mb-3 flex items-start gap-3 rounded border bg-muted/20 p-2">
          <div className="flex h-24 w-32 shrink-0 items-center justify-center overflow-hidden rounded border bg-background">
            <img
              src={anyActive.public_url}
              alt=""
              className="block h-full w-full object-contain"
              loading="lazy"
              onError={(e) => {
                const img = e.currentTarget;
                img.style.display = "none";
                const fb = img.nextElementSibling as HTMLElement | null;
                if (fb) fb.style.display = "flex";
              }}
            />
            <span style={{ display: "none" }} className="h-full w-full items-center justify-center text-[10px] text-muted-foreground">
              Bild nicht ladbar
            </span>
          </div>
          <div className="min-w-0 flex-1 text-[11px] text-muted-foreground">
            <div className="font-semibold text-foreground">Aktuell hinterlegtes Bild</div>
            <div className="mt-0.5 break-words">Wird auf der Website angezeigt. Geräte-Varianten (Mobil/Tablet/Desktop) kannst du unten austauschen — fehlt eine Variante, nimmt die Website automatisch die Desktop-Variante.</div>
          </div>
        </div>
      )}
      <p className="mb-3 text-[11px] text-muted-foreground">
        Pro Bildschirmgröße kann ein eigenes Bild hinterlegt werden. Fehlt eine Variante,
        zeigt die Website automatisch die Desktop-Variante (oder das fest verdrahtete Code-Bild).
      </p>
      <div className="grid gap-2 lg:grid-cols-3">
        {VIEWPORTS.map((v) => (
          <VariantRow
            key={v.key}
            pageKey={pageKey}
            sectionKey={sectionKey}
            fieldKey={fieldKey}
            viewport={v.key}
            viewportLabel={v.label}
            viewportHint={v.hint}
            active={findActive(v.key)}
            onChanged={onChanged}
          />
        ))}
      </div>
    </div>
  );
};

export default AssetUploader;

/** Hilfshook: lädt Assets einer Seite und stellt einen Reloader bereit. */
export function useAssetsForPage(pageKey: string | null) {
  const [assets, setAssets] = useState<CmsAssetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!pageKey) {
      setAssets([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    readAssets(pageKey)
      .then((rows) => {
        if (!cancelled) setAssets(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pageKey, tick]);

  return { assets, loading, reload: () => setTick((t) => t + 1) };
}
