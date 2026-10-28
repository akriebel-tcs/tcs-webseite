/**
 * ColumnsLayout — Drei-Spalten-Container für den Master-Detail-Workbench
 * mit ziehbaren Trennlinien zwischen je zwei offenen Spalten.
 *
 * Das Verhalten der Toggles (welche Spalten offen sind) liegt im Parent —
 * diese Komponente kümmert sich nur um Layout, Strips und Drag-Resize.
 *
 * Drag-Logik: Beim Ziehen wird der Pixel-Delta in einen Anteil der
 * Container-Breite umgerechnet und proportional auf die `weights` der beiden
 * angrenzenden Spalten verteilt — die Summe der beiden Gewichte bleibt
 * konstant, andere Spalten bleiben unangetastet.
 */
import { useCallback, useRef } from "react";

import CollapsedColumnStrip from "@/features/admin/components/CollapsedColumnStrip";

type ColKey = "tree" | "work" | "preview";
type Weights = { tree: number; work: number; preview: number };

interface Props {
  treeOpen: boolean;
  workOpen: boolean;
  previewOpen: boolean;
  /**
   * "column" (Standard): Vorschau ist Teil des Drei-Spalten-Layouts.
   * "overlay": Vorschau wird hier NICHT gerendert (weder Spalte noch Streifen) —
   * sie lebt als rechte Schublade außerhalb dieser Komponente.
   */
  previewMode?: "column" | "overlay";
  weights: Weights;
  setWeights: (w: Weights) => void;
  onCollapseTree: () => void;
  onCollapseWork: () => void;
  onCollapsePreview: () => void;
  onExpandTree: () => void;
  onExpandWork: () => void;
  onExpandPreview: () => void;
  lastOpenColumn: boolean;
  treeContent: React.ReactNode;
  workContent: React.ReactNode;
  previewContent: React.ReactNode;
}

const ColumnsLayout: React.FC<Props> = ({
  treeOpen,
  workOpen,
  previewOpen,
  previewMode = "column",
  weights,
  setWeights,
  onExpandTree,
  onExpandWork,
  onExpandPreview,
  treeContent,
  workContent,
  previewContent,
}) => {
  // Im Overlay-Modus liegt die Vorschau außerhalb der Spalten — also so
  // tun, als wäre sie für das Layout dauerhaft „nicht da".
  const previewInColumns = previewMode === "column" && previewOpen;
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Während eines Drags arbeiten wir mit Live-Refs, damit der globale
  // mousemove-Handler keine Re-Render-Schleife erzeugt.
  const dragState = useRef<{
    leftKey: ColKey;
    rightKey: ColKey;
    sumWeight: number;
    startX: number;
    containerWidth: number;
    startLeft: number;
  } | null>(null);

  const startDrag = useCallback(
    (leftKey: ColKey, rightKey: ColKey) => (e: React.MouseEvent<HTMLDivElement>) => {
      const container = containerRef.current;
      if (!container) return;
      e.preventDefault();
      const sum = weights[leftKey] + weights[rightKey];
      dragState.current = {
        leftKey,
        rightKey,
        sumWeight: sum,
        startX: e.clientX,
        containerWidth: container.getBoundingClientRect().width,
        startLeft: weights[leftKey],
      };
      const onMove = (ev: MouseEvent) => {
        const st = dragState.current;
        if (!st) return;
        // Wir rechnen den Pixel-Delta auf einen Gewicht-Delta um. Annahme:
        // Container-Breite verteilt sich grob gleichmäßig auf alle offenen
        // Spalten; bei drei Spalten summieren sich alle Gewichte zu
        // (treeOpen?weights.tree:0)+(workOpen?…)+… — wir nehmen die Summe der
        // beiden Drag-Nachbarn als „verfügbare Breite" für diesen Drag.
        // Das ist eine Näherung, fühlt sich aber bei den hier üblichen
        // 2/3/2-Verhältnissen korrekt an.
        const totalOpenWeight =
          (treeOpen ? weights.tree : 0) +
          (workOpen ? weights.work : 0) +
          (previewInColumns ? weights.preview : 0);
        if (totalOpenWeight <= 0) return;
        const pxPerWeight = st.containerWidth / totalOpenWeight;
        const deltaPx = ev.clientX - st.startX;
        const deltaWeight = deltaPx / pxPerWeight;
        const minWeight = 0.4;
        let newLeft = st.startLeft + deltaWeight;
        newLeft = Math.max(minWeight, Math.min(st.sumWeight - minWeight, newLeft));
        const newRight = st.sumWeight - newLeft;
        setWeights({
          ...weights,
          [st.leftKey]: newLeft,
          [st.rightKey]: newRight,
        } as Weights);
      };
      const onUp = () => {
        dragState.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [previewInColumns, setWeights, treeOpen, weights, workOpen],
  );

  // Reihenfolge der „Slots": jeweils Spalte (offen oder Strip),
  // gefolgt von einem Drag-Handle wenn diese UND eine spätere Spalte offen sind.
  const slots: React.ReactNode[] = [];
  const openOrder: ColKey[] = [];
  if (treeOpen) openOrder.push("tree");
  if (workOpen) openOrder.push("work");
  if (previewInColumns) openOrder.push("preview");

  const renderHandle = (leftKey: ColKey, rightKey: ColKey) => (
    <div
      key={`handle-${leftKey}-${rightKey}`}
      role="separator"
      aria-orientation="vertical"
      onMouseDown={startDrag(leftKey, rightKey)}
      title="Ziehen, um die Spaltenbreite anzupassen"
      className="group relative w-1 shrink-0 cursor-col-resize bg-border hover:bg-primary/40 active:bg-primary/60"
    >
      <div className="absolute inset-y-0 -left-1 -right-1" />
    </div>
  );

  // Spalte 1: Baum
  if (treeOpen) {
    slots.push(
      <aside
        key="tree"
        className="flex min-w-0 flex-col border-r p-2"
        style={{ flex: "1 1 0", flexGrow: weights.tree }}
      >
        {treeContent}
      </aside>,
    );
    if (openOrder[openOrder.indexOf("tree") + 1]) {
      slots.push(renderHandle("tree", openOrder[openOrder.indexOf("tree") + 1]!));
    }
  } else {
    slots.push(
      <CollapsedColumnStrip key="tree-strip" label="Baum" arrow="left" onExpand={onExpandTree} />,
    );
  }

  // Spalte 2: Arbeitsbereich
  if (workOpen) {
    slots.push(
      <div
        key="work"
        className="flex min-w-0 flex-col border-r"
        style={{ flex: "1 1 0", flexGrow: weights.work }}
      >
        {workContent}
      </div>,
    );
    if (openOrder[openOrder.indexOf("work") + 1]) {
      slots.push(renderHandle("work", openOrder[openOrder.indexOf("work") + 1]!));
    }
  } else {
    slots.push(
      <CollapsedColumnStrip
        key="work-strip"
        label="Arbeitsbereich"
        arrow="left"
        onExpand={onExpandWork}
      />,
    );
  }

  // Spalte 3: Vorschau — im "overlay"-Modus weder Spalte noch Streifen rendern.
  if (previewMode === "column") {
    if (previewOpen) {
      slots.push(
        <div
          key="preview"
          className="flex min-w-0 flex-col p-2"
          style={{ flex: "1 1 0", flexGrow: weights.preview }}
        >
          {previewContent}
        </div>,
      );
    } else {
      slots.push(
        <CollapsedColumnStrip
          key="preview-strip"
          label="Vorschau"
          arrow="right"
          onExpand={onExpandPreview}
        />,
      );
    }
  }

  return (
    <div
      ref={containerRef}
      className="flex min-h-0 flex-1 overflow-hidden rounded-lg border bg-card/20"
    >
      {slots}
    </div>
  );
};

export default ColumnsLayout;
