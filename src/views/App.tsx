import { useEffect, useState } from "react";
import { store } from "@core/store";
import { registry } from "@core/commands";
import { Sidebar } from "./Sidebar/Sidebar";
import { EditorContainer } from "./Editor/EditorContainer";
import { CommandPalette } from "./CommandPalette/CommandPalette";

export function App() {
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    store.loadFileTree();

    registry.register({
      id: "open-file",
      name: "Open file",
      shortcut: { ctrl: true, key: "o" },
      execute: () => setPaletteOpen(true),
    });
    registry.init();

    return () => registry.destroy();
  }, []);

  return (
    <div className="flex h-screen bg-bg-primary text-text-primary">
      <Sidebar />
      <EditorContainer />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
