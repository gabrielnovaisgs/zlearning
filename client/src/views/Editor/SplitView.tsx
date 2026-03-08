import { Fragment, useCallback } from "react";
import { usePaneController } from "@core/use-pane-controller-store";
import { PaneView } from "./PaneView";

interface ResizeHandleProps {
  leftPaneId: string;
  rightPaneId: string;
}

function ResizeHandle({ leftPaneId, rightPaneId }: ResizeHandleProps) {
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();

      const panes = usePaneController.getState().panes;

      const leftPane = panes.find((p) => p.id === leftPaneId);
      const rightPane = panes.find((p) => p.id === rightPaneId);
      if (!leftPane || !rightPane) return;

      const totalRatio = leftPane.flexRatio + rightPane.flexRatio;
      const startLeftRatio = leftPane.flexRatio;
      const startX = e.clientX;
      const containerWidth =
        (e.currentTarget as HTMLElement).parentElement?.getBoundingClientRect().width ?? 1;

      const onMouseMove = (e: MouseEvent) => {
        const delta = e.clientX - startX;
        const ratioDelta = (delta / containerWidth) * totalRatio;
        const minRatio = 0.1;
        const newLeft = Math.max(minRatio, startLeftRatio + ratioDelta);
        const newRight = Math.max(minRatio, totalRatio - newLeft);
        usePaneController.getState().actions.resizePane(leftPaneId, rightPaneId, newLeft, newRight);
      };

      const onMouseUp = () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [leftPaneId, rightPaneId]
  );

  return (
    <div
      className="w-1 shrink-0 bg-border hover:bg-accent cursor-col-resize z-10 transition-colors"
      onMouseDown={onMouseDown}
    />
  );
}

export function SplitView() {
  const { panes, activePaneId } = usePaneController()

  return (
    <div className="flex flex-1 min-w-0 min-h-0 overflow-hidden">
      {panes.map((pane, i) => (
        <Fragment key={pane.id}>
          {i > 0 && (
            <ResizeHandle leftPaneId={panes[i - 1].id} rightPaneId={pane.id} />
          )}
          <PaneView pane={pane} isFocused={activePaneId === pane.id} />
        </Fragment>
      ))}
    </div>
  );
}
