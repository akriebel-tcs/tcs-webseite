/**
 * CardFieldsWorkspace — allgemeiner Akkordeon-Arbeitsbereich für
 * `card_v1`-Sections im Admin.
 *
 * Etappe `cms-light-standardkarte-admin-arbeitsbereich-vollausbau-1`.
 *
 * Was diese Komponente ist:
 *  - Reine Anzeigeschicht. Schreibt NICHTS. Verändert keine DB-Strukturen.
 *  - Gruppiert die bereits ermittelten `AdminFieldPlanEntry`-Einträge
 *    (aus `buildAdminFieldPlanForSection`) in 6 redaktionelle Gruppen
 *    (Grunddaten / Medien / Sichtbarkeit / Features / Links / Technisch).
 *  - Rendert pro Eintrag exakt das, was der Aufrufer per `renderEntry`
 *    übergibt — d. h. die bestehende `EditableField`-Logik aus
 *    `PageEditor.tsx` bleibt 1:1 erhalten (DE/EN, Whitelist-Switches,
 *    nicht-speicherbar-Markierung).
 *  - Versteckt vorhandene DB-Felder NIE — was nicht in eine Gruppe passt,
 *    landet in „Technik / Altbestand" und bleibt dort sichtbar.
 *  - Asset-Slots sind nicht Teil dieses Arbeitsbereichs (laufen weiter
 *    über `SectionAssetsBlock`).
 *
 * Was diese Komponente bewusst NICHT ist:
 *  - Sie übernimmt nicht die Bildkarten-Pilot-Sonderlogik aus
 *    `BildkartenCardWorkspace`/`cardFieldGroups.ts` (harte Annahmen über
 *    `aussenstationen`/`innenstationen` und globale Slot-Ausblendung).
 */
import { useMemo, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { AdminFieldPlanEntry } from "@/features/admin/lib/buildAdminFieldPlan";
import {
  CARD_GROUPS,
  classifyCardFieldKey,
  presetHintForGroup,
  containerHintFor,
  emptyGroupHint,
  type CardGroupKey,
} from "@/features/admin/lib/cardFieldsWorkspaceGroups";
import type { CardVariantKey } from "@/features/cms/contract/sectionTypes";

interface Props {
  entries: ReadonlyArray<AdminFieldPlanEntry>;
  variantKey?: CardVariantKey;
  /** Technischer Typ des Eltern-Containers (z. B. `cards_v1`). UI-only. */
  parentSectionType?: string | null;
  /** Liefert true, wenn der Eintrag im jetzigen Zustand speicherbar wäre. */
  isSavable: (entry: AdminFieldPlanEntry) => boolean;
  /** Rendert genau einen Eintrag (volle EditableField-/Badge-Reihe). */
  renderEntry: (entry: AdminFieldPlanEntry) => React.ReactNode;
  /**
   * Optional: Status aller `*_enabled`-Felder einer Gruppe für die
   * Kopfzeilen-Anzeige „Gruppe an/aus". Liefert eine Liste der
   * relevanten Toggle-Felder mit aktuellem "1"/"0"-Wert. Wenn nicht
   * gesetzt, blendet das Workspace den Bulk-Schalter aus.
   */
  groupEnabledState?: (groupKey: string, entries: ReadonlyArray<AdminFieldPlanEntry>) => {
    relevant: number;
    on: number;
    off: number;
  } | null;
  /**
   * Optional: Callback für den Bulk-Schalter in der Akkordeon-Kopfzeile.
   * Wird beim Klick mit Zielwert ("1" oder "0") und den betroffenen
   * Einträgen aufgerufen. Wenn nicht gesetzt, ist der Bulk-Schalter
   * nur sichtbarer Indikator ohne Klickwirkung.
   */
  onToggleGroup?: (groupKey: string, target: "1" | "0", entries: ReadonlyArray<AdminFieldPlanEntry>) => void;
}

interface GroupBucket {
  group: (typeof CARD_GROUPS)[number];
  entries: AdminFieldPlanEntry[];
  /** Anzahl Einträge mit Warnung (fehlt in DB / nicht speicherbar). */
  warnCount: number;
}

const CardFieldsWorkspace: React.FC<Props> = ({
  entries,
  variantKey,
  parentSectionType,
  isSavable,
  renderEntry,
  groupEnabledState,
  onToggleGroup,
}) => {
  const containerHint = useMemo(() => containerHintFor(parentSectionType), [parentSectionType]);
  const buckets = useMemo<GroupBucket[]>(() => {
    const map = new Map<CardGroupKey, AdminFieldPlanEntry[]>();
    for (const g of CARD_GROUPS) map.set(g.key, []);

    for (const entry of entries) {
      // „missing"-Einträge ohne DB-Zeile sind in der Logik schon
      // varianten-gefiltert (siehe buildAdminFieldPlan). Sie werden in
      // ihre fachliche Gruppe einsortiert, bekommen aber die Warnung
      // „fehlt in DB" über die normale Entry-Render-Logik.
      const groupKey = classifyCardFieldKey(entry.fieldKey);
      // Legacy/Dynamic-Felder, die nicht klar Inhalt sind, landen in
      // „Technik / Altbestand" — auch wenn sie zufällig wie ein
      // Inhaltsfeld aussehen. Vorhandene DB-Felder bleiben SICHTBAR.
      const finalKey: CardGroupKey =
        entry.source === "legacy" || entry.source === "dynamic"
          ? groupKey === "grunddaten" || groupKey === "links" || groupKey === "features" || groupKey === "medien" || groupKey === "sichtbarkeit"
            ? groupKey
            : "technisch"
          : groupKey;
      map.get(finalKey)!.push(entry);
    }

    return CARD_GROUPS.map((g) => {
      const list = map.get(g.key) ?? [];
      const warnCount = list.filter(
        (e) => e.source === "missing" || !isSavable(e),
      ).length;
      return { group: g, entries: list, warnCount };
    });
  }, [entries, isSavable]);

  // Default-Open: Gruppen mit Inhalten und/oder Warnungen werden
  // automatisch aufgeklappt; „technisch" bleibt zu, außer es enthält
  // Warnungen.
  const defaultOpenIds = useMemo(() => {
    const out: string[] = [];
    for (const b of buckets) {
      if (b.entries.length === 0) continue;
      const open =
        b.group.defaultOpen ||
        b.warnCount > 0 ||
        // wenn die Gruppe nicht-leere Inhaltsfelder hat → öffnen
        (b.group.key !== "technisch" && b.entries.some((e) => e.source !== "missing"));
      if (open) out.push(b.group.key);
    }
    return out;
  }, [buckets]);

  const [openIds, setOpenIds] = useState<string[]>(defaultOpenIds);
  // wenn sich die Buckets ändern (Section gewechselt), neu initialisieren
  const initKey = useMemo(() => buckets.map((b) => `${b.group.key}:${b.entries.length}:${b.warnCount}`).join("|"), [buckets]);
  const [lastInitKey, setLastInitKey] = useState(initKey);
  if (initKey !== lastInitKey) {
    setLastInitKey(initKey);
    setOpenIds(defaultOpenIds);
  }

  // Bewusst alle Gruppen mit definierten Inhalten ODER mit fester
  // Bedeutung anzeigen: Grunddaten, Medien, Sichtbarkeit, Features,
  // Links bleiben sichtbar, auch wenn leer (Empty-State erklärt warum).
  // Nur „Technik / Altbestand" bleibt zu, solange leer.
  const visibleBuckets = buckets.filter(
    (b) => b.entries.length > 0 || b.group.key !== "technisch",
  );
  if (visibleBuckets.length === 0) {
    return (
      <div className="text-xs text-muted-foreground">
        Keine pflegbaren Felder in dieser Karte.
      </div>
    );
  }

  // Slot-Label für die Medien-Gruppe (containerabhängig).
  const slotLabel = (slot: "image" | "thumbnail" | "icon_image" | "none") => {
    switch (slot) {
      case "image": return "Bild (Slot `image`)";
      case "thumbnail": return "Thumbnail (Slot `thumbnail`)";
      case "icon_image": return "Icon (Slot `icon_image` oder Lucide-`icon`)";
      case "none": return "kein Medien-Slot";
    }
  };

  return (
    <div className="rounded-md border bg-background/40">
      <div className="border-b bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
        <div>
          Karten-Arbeitsbereich · Felder sind in 6 redaktionelle Gruppen
          sortiert. Bilder werden weiter unten als Asset-Slots gepflegt.
        </div>
        {containerHint && (
          <div className="mt-1 text-foreground/80">
            Container: <span className="font-medium">{containerHint.containerLabel}</span>
            {" · "}
            {containerHint.summary}
          </div>
        )}
      </div>
      <Accordion
        type="multiple"
        value={openIds}
        onValueChange={(v) => setOpenIds(v)}
        className="px-2"
      >
        {visibleBuckets.map((b) => {
          const presetHint = presetHintForGroup(b.group.key, variantKey);
          const isEmpty = b.entries.length === 0;
          // Medien-Akkordeon: containerabhängiger Slot-Hinweis.
          const mediaSlotLine =
            b.group.key === "medien" && containerHint ? (
              <span className="block text-foreground/70">
                Im aktuellen Container wirksam: {slotLabel(containerHint.expectedSlot)}
                {containerHint.expectedSlot !== "none" && (
                  <> · {containerHint.slotIsRequired
                    ? "fehlt der Slot, ist das eine Warnung"
                    : "fehlt der Slot, ist das kein Fehler"}.</>
                )}
              </span>
            ) : null;
          const toggleState = groupEnabledState ? groupEnabledState(b.group.key, b.entries) : null;
          const renderToggle = () => {
            if (!toggleState || toggleState.relevant === 0) return null;
            const allOff = toggleState.on === 0;
            const target: "1" | "0" = allOff ? "1" : "0";
            const label = allOff ? "Gruppe einblenden" : "Gruppe ausblenden";
            const status = allOff
              ? "Gruppe aus"
              : toggleState.off === 0
                ? "Gruppe an"
                : `${toggleState.on}/${toggleState.relevant} an`;
            const colorCls = allOff
              ? "border-muted-foreground/40 bg-muted/40 text-muted-foreground"
              : toggleState.off === 0
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
                : "border-amber-500/40 bg-amber-500/10 text-amber-700";
            const interactiveCls = onToggleGroup
              ? "cursor-pointer hover:brightness-105"
              : "cursor-default";
            return (
              <button
                type="button"
                disabled={!onToggleGroup}
                onClick={(e) => {
                  if (!onToggleGroup) return;
                  e.stopPropagation();
                  onToggleGroup(b.group.key, target, b.entries);
                }}
                aria-label={onToggleGroup ? label : status}
                title={onToggleGroup ? label : "Bulk-Schalter (Wiring folgt)"}
                className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium ${colorCls} ${interactiveCls}`}
              >
                {status}
              </button>
            );
          };
          return (
            <AccordionItem key={b.group.key} value={b.group.key} className="border-b last:border-b-0">
              <div className="flex items-center gap-2 pr-2">
                <AccordionTrigger className="flex-1 py-2 text-left hover:no-underline">
                  <span className="flex flex-1 flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {b.group.label}
                    </span>
                    <span className="rounded border border-muted-foreground/30 bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {b.entries.length}
                    </span>
                    {b.warnCount > 0 && (
                      <span
                        className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
                        title="Einträge mit Hinweis (fehlt in DB oder nicht speicherbar)"
                      >
                        {b.warnCount} Hinweis
                      </span>
                    )}
                    {isEmpty && (
                      <span className="rounded border border-muted-foreground/20 bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        leer
                      </span>
                    )}
                  </span>
                </AccordionTrigger>
                {/* Bulk-Schalter sitzt bewusst NEBEN dem AccordionTrigger,
                    nicht darin. Damit ist kein <button> in einem anderen
                    <button> verschachtelt, Akkordeon-Klick und Schalter-Klick
                    sind sauber getrennt, Tastatur-Tab-Reihenfolge bleibt
                    Trigger -> Schalter. */}
                {renderToggle()}
              </div>

              <AccordionContent>
                <p className="mb-2 px-1 text-[11px] leading-relaxed text-muted-foreground">
                  {b.group.hint}
                  {presetHint ? <> <span className="text-foreground/70">{presetHint}</span></> : null}
                  {mediaSlotLine}
                </p>
                {isEmpty ? (
                  <div className="rounded border border-dashed border-muted-foreground/30 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
                    {emptyGroupHint(b.group.key)}
                  </div>
                ) : (
                  <div className="divide-y rounded border bg-background px-2">
                    {b.entries.map((entry) => (
                      <div key={`${entry.source}|${entry.fieldKey}`} className="py-3 first:pt-2 last:pb-2">
                        {renderEntry(entry)}
                      </div>
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};


export default CardFieldsWorkspace;
