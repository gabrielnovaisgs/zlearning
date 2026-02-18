import { useEffect, useState } from "react";
import { store } from "@core/store";
import { registry } from "@core/commands";
import { Sidebar } from "./Sidebar/Sidebar";
import { SplitView } from "./Editor/SplitView";
import { CommandPalette } from "./CommandPalette/CommandPalette";

function openFileFromURL() {
  const path = location.pathname.slice(1); // remove leading "/"
  if (!path) return;
  if (path.endsWith(".md") || path.endsWith(".pdf")) {
    store.openFile(path);
  } else {
    // Try .md first, fall back to .pdf by checking the file tree
    const { fileTree } = store.getState();
    const findFile = (entries: typeof fileTree): string | null => {
      for (const e of entries) {
        if (e.type === "file" && (e.path === path + ".md" || e.path === path + ".pdf")) return e.path;
        if (e.children) { const f = findFile(e.children); if (f) return f; }
      }
      return null;
    };
    const resolved = findFile(fileTree) || path + ".md";
    store.openFile(resolved);
  }
}

export function App() {
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    store.loadFileTree().then(() => openFileFromURL());

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
        const active = store.getState().activeFile;
        const dir = active?.includes("/") ? active.substring(0, active.lastIndexOf("/")) : "";
        store.createUntitledFile(dir);
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
      <Sidebar />
      <SplitView />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
