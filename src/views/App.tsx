import { useEffect, useState } from "react";
import { store } from "@core/store";
import { registry } from "@core/commands";
import { Sidebar } from "./Sidebar/Sidebar";
import { EditorContainer } from "./Editor/EditorContainer";
import { CommandPalette } from "./CommandPalette/CommandPalette";

function openFileFromURL() {
  const path = location.pathname.slice(1); // remove leading "/"
  if (path) {
    store.openFile(path.endsWith(".md") ? path : path + ".md");
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
    registry.init();

    return () => {
      registry.destroy();
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return (
    <div className="flex h-screen bg-bg-primary text-text-primary">
      <Sidebar />
      <EditorContainer />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
