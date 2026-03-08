import { useState, useEffect } from "react";
import { usePaneController } from "./pane-controller.store";
import type { Pane } from "./types";
import { TabBar } from "./TabBar";
import { EditorContainer, EditorType } from "./EditorContainer";

interface PaneViewProps {
  pane: Pane;
  isFocused: boolean;
}

function getEditorType(path: string | null | undefined): EditorType {
  if (!path) return EditorType.NewTab;
  if (path.endsWith(".pdf")) return EditorType.Pdf;
  return EditorType.Markdown;
}

function getDropSide(e: React.DragEvent): "left" | "right" {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  return e.clientX - rect.left < rect.width / 2 ? "left" : "right";
}

export function PaneView({ pane, isFocused }: PaneViewProps) {
  const [dropSide, setDropSide] = useState<"left" | "right" | null>(null);
  const activeTab = pane.tabs.find((t) => t.id === pane.activeTabId);

  useEffect(() => {
    const clear = () => setDropSide(null);
    document.addEventListener("dragend", clear);
    return () => document.removeEventListener("dragend", clear);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const side = dropSide;
    setDropSide(null);

    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      const { tabId, paneId: fromPaneId } = data as { tabId: string; paneId: string };
      const { actions } = usePaneController.getState();

      if (side !== null) {
        // Split without copying the active tab — moveTabToPane will place the dragged tab
        const newPaneId = actions.splitPane(pane.id, side, false);
        if (newPaneId) {
          actions.moveTabToPane(tabId, fromPaneId, newPaneId);
        }
      } else {
        actions.moveTabToPane(tabId, fromPaneId, pane.id);
      }
    } catch { /* ignore */ }
  };

  return (
    <div
      className="relative flex flex-col min-w-0 min-h-0"
      style={{ flex: pane.flexRatio }}
      onClick={() => usePaneController.getState().actions.setActivePaneId(pane.id)}
      onDragOver={(e) => {
        // Only show drop side if over editor area (not TabBar)
        const target = e.target as HTMLElement;
        if (target.closest(".tabbar-root")) return;
        e.preventDefault();
        setDropSide(getDropSide(e));
      }}
      onDrop={handleDrop}
      onDragLeave={(e) => {
        // Only clear if truly leaving this pane
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDropSide(null);
        }
      }}
    >
      <div className="tabbar-root">
        <TabBar pane={pane} />
      </div>
      <EditorContainer
        key={pane.id}
        type={getEditorType(activeTab?.path)}
        filePath={activeTab?.path ?? null}
        paneId={pane.id}
        isFocused={isFocused}
      />

      {/* Drop zone overlay */}
      {dropSide && (
        <div
          className={`absolute inset-y-0 w-1/2 ${
            dropSide === "left" ? "left-0" : "right-0"
          } bg-accent/15 border-2 border-accent z-40 pointer-events-none`}
        />
      )}
    </div>
  );
}
