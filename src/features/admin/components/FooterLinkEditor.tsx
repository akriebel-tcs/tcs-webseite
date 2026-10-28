/**
 * FooterLinkEditor — schlanker Arbeitsbereich-Editor fuer Footer-Eintraege.
 *
 * Footer-Knoten (nav_area = "footer" oder "footer_bottom") sind im Footer
 * der oeffentlichen Website nur einzelne verlinkte Worte — keine Eyebrow,
 * keine Headline, keine Sections. Dieser Editor spiegelt genau das wider
 * und bietet nur:
 *
 *   - Label (DE / EN)  — bearbeitbar ueber `rpc_admin_update_navigation_label`
 *   - Ziel             — schreibgeschuetzt angezeigt (Route oder externe URL)
 *   - Sichtbarkeit     — `is_active` + `show_in_public_nav` als Schalter
 *   - Sprung zur Zielseite (oeffnet die verlinkte Seite im Arbeitsbereich)
 *
 * Keine Section-Bearbeitung. Keine Inhaltsfelder. Keine Bilder.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

import type { NavigationNodeRow } from "@/features/admin/api/cmsAdminNavigation";
import {
  updateNavigationLabel,
  setNavigationNodeActive,
  setNavigationNodePublic,
} from "@/features/admin/api/cmsAdminNavigationWrite";
import { resolveCardLink } from "@/features/admin/lib/resolveCardLink";
import ShortIdBadge from "@/features/admin/components/ShortIdBadge";

import type { PageLookup } from "@/features/admin/api/cmsAdminCardLinks";

interface Props {
  node: NavigationNodeRow;
  pagesByRoute: Map<string, PageLookup>;
  onReload: () => void | Promise<void>;
  onJumpToTarget: (pageKey: string) => void;
}

export default function FooterLinkEditor({ node, pagesByRoute, onReload, onJumpToTarget }: Props) {
  const [labelDe, setLabelDe] = useState(node.label_de ?? "");
  const [labelEn, setLabelEn] = useState(node.label_en ?? "");
  const [isActive, setIsActive] = useState(node.is_active);
  const [showPublic, setShowPublic] = useState(node.show_in_public_nav);
  const [savingDe, setSavingDe] = useState(false);
  const [savingEn, setSavingEn] = useState(false);

  useEffect(() => {
    setLabelDe(node.label_de ?? "");
    setLabelEn(node.label_en ?? "");
    setIsActive(node.is_active);
    setShowPublic(node.show_in_public_nav);
  }, [node.id, node.label_de, node.label_en, node.is_active, node.show_in_public_nav]);

  const saveLabel = async (locale: "de" | "en", value: string) => {
    const setBusy = locale === "de" ? setSavingDe : setSavingEn;
    setBusy(true);
    const res = await updateNavigationLabel(node.id, locale, value);
    setBusy(false);
    if (!res.success) {
      toast.error(`Label ${locale.toUpperCase()} konnte nicht gespeichert werden: ${res.error ?? "unbekannter Fehler"}`);
      return;
    }
    toast.success(`Label ${locale.toUpperCase()} gespeichert.`);
    await onReload();
  };

  const toggleActive = async (next: boolean) => {
    setIsActive(next);
    const res = await setNavigationNodeActive(node.id, next);
    if (!res.success) {
      setIsActive(!next);
      toast.error(res.error ?? "Sichtbarkeit konnte nicht geaendert werden.");
      return;
    }
    toast.success(next ? "Eintrag aktiviert." : "Eintrag deaktiviert.");
    await onReload();
  };

  const togglePublic = async (next: boolean) => {
    setShowPublic(next);
    const res = await setNavigationNodePublic(node.id, next);
    if (!res.success) {
      setShowPublic(!next);
      toast.error(res.error ?? "Sichtbarkeit (oeffentlich) konnte nicht geaendert werden.");
      return;
    }
    toast.success(next ? "Im Footer sichtbar." : "Aus Footer ausgeblendet.");
    await onReload();
  };

  // Ziel aufloesen (Route -> page oder externe URL)
  const target = (() => {
    const url = node.external_url?.trim();
    if (url) return { kind: "external" as const, href: url };
    const route = node.route_path?.trim();
    if (!route) return { kind: "none" as const };
    const resolved = resolveCardLink({
      href: route,
      fieldKey: "href",
      pagesByRoute,
      onJump: onJumpToTarget,
    });
    return { kind: "route" as const, route, resolved };
  })();

  return (
    <div className="space-y-6 rounded-md border bg-card p-4">
      {/* Kopf */}
      <div className="flex flex-wrap items-center gap-2">
        <ShortIdBadge kind="N" value={node.node_no ?? null} />
        <span className="text-sm font-medium">{node.label_de ?? node.node_key}</span>
        <Badge variant="destructive" className="text-[10px] uppercase">
          Reiner Footer-Link
        </Badge>
        <Badge variant="secondary" className="text-[10px]">
          {node.nav_area === "footer_bottom" ? "Bottom-Bar" : "Footer-Spalte"}
        </Badge>
      </div>


      <p className="text-xs leading-relaxed text-muted-foreground">
        Footer-Eintraege sind reine Verlinkungen — nur das angezeigte Wort und das Ziel.
        Inhalte der Zielseite werden dort gepflegt, nicht hier.
      </p>

      {/* Labels */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="footer-label-de" className="text-xs">
            Angezeigter Text (DE)
          </Label>
          <div className="flex gap-2">
            <Input
              id="footer-label-de"
              value={labelDe}
              onChange={(e) => setLabelDe(e.target.value)}
              placeholder="z. B. Tuerkommunikation"
            />
            <Button
              size="sm"
              variant="secondary"
              disabled={savingDe || labelDe === (node.label_de ?? "")}
              onClick={() => saveLabel("de", labelDe)}
            >
              {savingDe ? "Speichert…" : "Speichern"}
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="footer-label-en" className="text-xs">
            Angezeigter Text (EN)
          </Label>
          <div className="flex gap-2">
            <Input
              id="footer-label-en"
              value={labelEn}
              onChange={(e) => setLabelEn(e.target.value)}
              placeholder="z. B. Door communication"
            />
            <Button
              size="sm"
              variant="secondary"
              disabled={savingEn || labelEn === (node.label_en ?? "")}
              onClick={() => saveLabel("en", labelEn)}
            >
              {savingEn ? "Speichert…" : "Speichern"}
            </Button>
          </div>
        </div>
      </div>

      {/* Ziel */}
      <div className="space-y-1.5">
        <Label className="text-xs">Verlinkt auf</Label>
        {target.kind === "none" && (
          <div className="rounded border border-dashed bg-muted/40 p-2 text-xs text-muted-foreground">
            Kein Ziel hinterlegt.
          </div>
        )}
        {target.kind === "external" && (
          <div className="flex items-center gap-2 rounded border bg-muted/30 p-2 text-xs">
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="truncate font-mono">{target.href}</span>
            <Badge variant="outline" className="ml-auto text-[10px]">
              Extern
            </Badge>
          </div>
        )}
        {target.kind === "route" && (
          <div className="flex items-center gap-2 rounded border bg-muted/30 p-2 text-xs">
            <span className="truncate font-mono">{target.route}</span>
            {target.resolved.kind === "internal-found" && (
              <>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <ShortIdBadge kind="P" value={target.resolved.pageNo} />
                <span className="truncate text-muted-foreground">{target.resolved.label}</span>
                {target.resolved.onJump && (
                  <Button
                    size="sm"
                    variant="default"
                    className="ml-auto h-7"
                    onClick={() => target.resolved.onJump?.()}
                    title="Öffnet die eigentliche Inhaltsseite im Editor (nicht den Footer-Link)."
                  >
                    Zielseite bearbeiten
                  </Button>
                )}
              </>
            )}
            {target.resolved.kind === "internal-missing" && (
              <Badge variant="destructive" className="ml-auto text-[10px]">
                404 — Ziel fehlt
              </Badge>
            )}
            {target.resolved.kind === "external" && (
              <Badge variant="outline" className="ml-auto text-[10px]">
                Extern
              </Badge>
            )}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          Das Ziel selbst wird hier (noch) nicht bearbeitet — Aenderung der Ziel-Route folgt in einem
          spaeteren Schritt. Wenn das Ziel falsch ist, bitte ueber das aktuelle Migrations-/Prompt-Verfahren melden.
        </p>
      </div>

      {/* Sichtbarkeit */}
      <div className="space-y-3 rounded border bg-muted/20 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <Label htmlFor="footer-active" className="text-xs">
              Aktiv
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Inaktive Eintraege erscheinen weder im Footer noch in der oeffentlichen Navigation.
            </p>
          </div>
          <Switch id="footer-active" checked={isActive} onCheckedChange={toggleActive} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <Label htmlFor="footer-public" className="text-xs">
              Im Footer sichtbar
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Wenn aus, bleibt der Eintrag in der DB, wird aber im oeffentlichen Footer ausgeblendet.
            </p>
          </div>
          <Switch
            id="footer-public"
            checked={showPublic}
            onCheckedChange={togglePublic}
            disabled={!isActive}
          />
        </div>
      </div>
    </div>
  );
}
