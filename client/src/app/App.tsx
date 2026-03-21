import { useEffect, useRef, useState } from "react";
import '@features/theme/theme.store'
import { usePaneController } from "@features/panes/pane-controller.store";
import { registry } from "@features/command-palette/CommandRegistry";
import { FileExplorer } from "@features/file-explorer/FileExplorer";
import { SplitView } from "@features/panes/SplitView";
import { CommandPalette } from "@features/command-palette/OpenFilePalette";
import { resolveFileFromPath, useFileStore } from "@shared/file.store";
import { useFiles } from "@shared/hooks/use-files";
import { SidebarInset, SidebarProvider } from "@shared/ui/sidebar";
import { ActivityBar } from "@features/activity-bar/ActivityBar";
import { GLOBAL_CONFIG } from "./config";

function openFileFromURL() {
  const path = location.pathname.slice(1); // remove leading "/"
  if (!path) return;
  const openFileInPane = usePaneController.getState().actions.openFileInPane;
  if (path.endsWith(".md") || path.endsWith(".pdf")) {
    openFileInPane(path);
  } else {
    openFileInPane(resolveFileFromPath(path));
  }
}

document.title = GLOBAL_CONFIG.appName;

export function App() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { isLoading } = useFiles();
  const hasOpened = useRef(false);

  useEffect(() => {
    if (!isLoading && !hasOpened.current) {
      hasOpened.current = true;
      openFileFromURL();
    }
  }, [isLoading]);

  useEffect(() => {
    const onPopState = () => openFileFromURL();
    window.addEventListener("popstate", onPopState);

    registry.register({
      id: "open-file",
      name: "Open file",
      shortcut: { ctrl: true, key: "o" },
      execute: () => setPaletteOpen(true),
    });
    registry.register({
      id: "new-file",
      name: "New file",
      shortcut: { ctrl: true, key: "n" },
      execute: () => {
        const active = usePaneController.getState().activeFile;
        const dir = active?.includes("/") ? active.substring(0, active.lastIndexOf("/")) : "";
        useFileStore.getState().actions.createUntitledFile(dir);
      },
    });
    registry.init();

    return () => {
      registry.destroy();
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return (
    <SidebarProvider
      className="h-screen overflow-hidden bg-bg text-fg"
      style={{ "--sidebar-start": "3rem" } as React.CSSProperties}
    >
      <ActivityBar />
      <FileExplorer />
      <SidebarInset className="min-h-0 overflow-hidden">
        <SplitView />
      </SidebarInset>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </SidebarProvider>
  );
}
