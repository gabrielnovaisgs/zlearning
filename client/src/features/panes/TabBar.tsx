import { usePaneController } from "./pane-controller.store";
import type { Pane } from "./types";
import { GLOBAL_CONFIG } from "@app/config";
import { FileText, BookOpen, MessageSquare, Plus, Columns2, X } from 'lucide-react';
import { Button } from "@shared/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@shared/ui/tooltip";

function fileTitle(path: string | null): string {
  if (!path) return 'New Tab';
  if (path.startsWith('chat://')) {
    const id = path.replace(/^chat:\/\/(new-[^/]+|)/, '');
    return id ? 'Chat' : 'Novo Chat';
  }
  const name = path.includes('/') ? path.substring(path.lastIndexOf('/') + 1) : path;
  return name.replace(/\.(md|pdf)$/, '');
}

function TabIcon({ path }: { path: string | null }) {
  if (!path) return <Plus size={12} strokeWidth={2} className="text-fg-muted" />;
  if (path.startsWith('chat://')) return <MessageSquare size={13} strokeWidth={1.75} className="text-fg-secondary" />;
  if (path.endsWith('.pdf')) return <BookOpen size={13} strokeWidth={1.75} className="text-[#E07B54]" />;
  return <FileText size={13} strokeWidth={1.75} className="text-fg-secondary" />;
}

interface TabBarProps {
  pane: Pane;
}

export function TabBar({ pane }: TabBarProps) {
  const panes   = usePaneController((state) => state.panes);
  const actions = usePaneController((state) => state.actions);

  const handleTabBarDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      actions.moveTabToPane(data.tabId, data.paneId, pane.id);
    } catch { /* ignore */ }
  };

  return (
    <div
      className="flex items-center bg-surface border-b border-border shrink-0"
      style={{ height: GLOBAL_CONFIG.headerHeight }}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={handleTabBarDrop}
    >
      {/* Scrollable tabs area */}
      <div className="tabs-scrollbar flex items-center h-full flex-1 overflow-x-auto min-w-0">
        {pane.tabs.map((tab) => {
          const isActive = tab.id === pane.activeTabId;
          return (
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
                actions.activateTab(tab.id, pane.id);
              }}
              className={`
                group/tab relative flex items-center gap-1.5 px-3 text-xs cursor-pointer select-none
                border-r border-border/60 shrink-0 transition-colors h-full
                ${isActive
                  ? 'bg-[var(--tab-active-bg)] text-fg after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-accent rounded-t-lg'
                  : 'text-fg-muted hover:text-fg-secondary hover:bg-surface-2'
                }
              `}
            >
              <TabIcon path={tab.path} />
              <span className="max-w-32 truncate">{fileTitle(tab.path)}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); actions.closeTab(tab.id, pane.id); }}
                    className="ml-0.5 size-5 rounded opacity-0 group-hover/tab:opacity-60 hover:!opacity-100 hover:bg-surface-2 hover:text-fg shrink-0 transition-opacity"
                  >
                    <X size={10} strokeWidth={2.5} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Fechar aba</TooltipContent>
              </Tooltip>
            </div>
          );
        })}

        {/* New tab button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); actions.openNewTab(pane.id); }}
              className="ml-1 size-7 shrink-0 text-fg-muted hover:bg-surface-2 hover:text-fg rounded-lg"
            >
              <Plus size={13} strokeWidth={2} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Nova aba</TooltipContent>
        </Tooltip>
      </div>

      {/* Fixed pane action buttons */}
      <div className="flex items-center gap-0.5 px-1 shrink-0 border-l border-border/60">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); actions.splitPane(pane.id, "right"); }}
              className="size-7 text-fg-muted hover:bg-surface-2 hover:text-fg rounded-lg"
            >
              <Columns2 size={13} strokeWidth={1.75} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Dividir painel</TooltipContent>
        </Tooltip>

        {panes.length > 1 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); actions.closePane(pane.id); }}
                className="size-7 text-fg-muted hover:bg-surface-2 hover:text-fg rounded-lg"
              >
                <X size={13} strokeWidth={1.75} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Fechar painel</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
