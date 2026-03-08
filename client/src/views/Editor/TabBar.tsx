import { store, useAppStore } from "@core/store";
import type { Pane } from "@core/types";

function fileTitle(path: string | null): string {
  if (!path) return "New Tab";
  const name = path.includes("/") ? path.substring(path.lastIndexOf("/") + 1) : path;
  return name.replace(/\.(md|pdf)$/, "");
}

function fileIcon(path: string | null): string {
  if (!path) return "✦";
  return path.endsWith(".pdf") ? "📕" : "📄";
}

interface TabBarProps {
  pane: Pane;
}

export function TabBar({ pane }: TabBarProps) {
  const panes  = useAppStore((state) => state.panes);

  const handleTabBarDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      store.moveTabToPane(data.tabId, data.paneId, pane.id);
    } catch { /* ignore */ }
  };

  return (
    <div
      className="flex items-center bg-bg-secondary border-b border-border overflow-x-auto shrink-0 min-h-[32px]"
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={handleTabBarDrop}
    >
      {pane.tabs.map((tab) => (
        <div
          key={tab.id}
          draggable={tab.path !== null}
          onDragStart={(e) => {
            if (!tab.path) return;
            e.dataTransfer.setData(
              "text/plain",
              JSON.stringify({ tabId: tab.id, paneId: pane.id })
            );
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            store.activateTab(tab.id, pane.id);
          }}
          className={`flex items-center gap-1 px-3 py-1 text-sm cursor-pointer shrink-0 border-r border-border select-none
            ${
              tab.id === pane.activeTabId
                ? "bg-bg-primary text-text-primary"
                : "text-text-muted hover:text-text-primary hover:bg-bg-primary/50"
            }`}
        >
          <span className={`text-xs ${!tab.path ? "text-accent" : ""}`}>{fileIcon(tab.path)}</span>
          <span className="max-w-32 truncate">{fileTitle(tab.path)}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              store.closeTab(tab.id, pane.id);
            }}
            className="ml-1 w-4 h-4 flex items-center justify-center rounded opacity-50 hover:opacity-100 hover:bg-text-muted/20 text-xs leading-none shrink-0"
            title="Close tab"
          >
            ×
          </button>
        </div>
      ))}

      {/* New tab button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          store.openNewTab(pane.id);
        }}
        className="px-2 py-1 text-text-muted hover:text-text-primary shrink-0 text-base leading-none"
        title="New tab"
      >
        +
      </button>

      {/* Spacer */}
      <div className="flex-1 min-w-2" />

      {/* Split right button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          store.splitPane(pane.id, "right");
        }}
        className="px-2 py-1 text-text-muted hover:text-text-primary shrink-0 text-sm"
        title="Split pane right"
      >
        ⧉
      </button>

      {/* Close pane button — only when N > 1 panes */}
      {panes.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            store.closePane(pane.id);
          }}
          className="px-2 py-1 text-text-muted hover:text-text-primary shrink-0 text-sm"
          title="Close pane"
        >
          ✕
        </button>
      )}
    </div>
  );
}
