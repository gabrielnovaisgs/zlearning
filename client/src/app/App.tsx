import { useEffect, useState } from "react";
import { usePaneController } from "@features/panes/pane-controller.store";
import { registry } from "@features/command-palette/CommandRegistry";
import { FileExplorer } from "@features/file-explorer/FileExplorer";
import { SplitView } from "@features/panes/SplitView";
import { CommandPalette } from "@features/command-palette/OpenFilePalette";
import { resolveFileFromPath, useFileStore } from "@shared/file.store";

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


export function App() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const loadFileTree = useFileStore(state => state.actions.loadFileTree);

  useEffect(() => {

    loadFileTree().then(() => openFileFromURL());

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
    <div className="flex h-screen bg-bg-primary text-text-primary">
      <FileExplorer />
      <SplitView />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
