import { useState } from "react";
import { store } from "@core/store";
import type { Pane } from "@core/types";
import { TabBar } from "./TabBar";
import { EditorContainer } from "./EditorContainer";

interface PaneViewProps {
  pane: Pane;
  isFocused: boolean;
}

function getDropSide(e: React.DragEvent): "left" | "right" {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  return e.clientX - rect.left < rect.width / 2 ? "left" : "right";
}

export function PaneView({ pane, isFocused }: PaneViewProps) {
  const [dropSide, setDropSide] = useState<"left" | "right" | null>(null);
  const activeTab = pane.tabs.find((t) => t.id === pane.activeTabId);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const side = dropSide;
    setDropSide(null);

    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      const { tabId, paneId: fromPaneId } = data as { tabId: string; paneId: string };

      if (side !== null) {
        // Split without copying the active tab — moveTabToPane will place the dragged tab
        const newPaneId = store.splitPane(pane.id, side, false);
        if (newPaneId) {
          store.moveTabToPane(tabId, fromPaneId, newPaneId);
        }
      } else {
        store.moveTabToPane(tabId, fromPaneId, pane.id);
      }
    } catch { /* ignore */ }
  };

  return (
    <div
      className="relative flex flex-col min-w-0 min-h-0"
      style={{ flex: pane.flexRatio }}
      onClick={() => store.setActivePaneId(pane.id)}
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
