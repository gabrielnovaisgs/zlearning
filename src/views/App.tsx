import { useEffect } from "react";
import { store } from "@core/store";
import { Sidebar } from "./Sidebar/Sidebar";
import { EditorContainer } from "./Editor/EditorContainer";

export function App() {
  useEffect(() => {
    store.loadFileTree();
  }, []);

  return (
    <div className="flex h-screen bg-bg-primary text-text-primary">
      <Sidebar />
      <EditorContainer />
    </div>
  );
}
