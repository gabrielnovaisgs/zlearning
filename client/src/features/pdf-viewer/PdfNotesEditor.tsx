import { useEffect, useRef, useCallback, useState } from "react";
import { createEditor, type EditorInstance } from "@features/markdown-editor/setup";
import { fs } from "@shared/services/filesystem";
import { useFileStore } from "@shared/file.store";
import { usePaneController } from "@features/panes/pane-controller.store";
import { Button } from "@shared/ui/button";
import { Checkbox } from "@shared/ui/checkbox";
import { Label } from "@shared/ui/label";
import { fetchPdfNoteInfo, createPdfNote } from "./pdf-notes.service";

export type { EditorInstance } from "@features/markdown-editor/setup";

export function buildCitation(text: string, page: number, id: string): string {
  return `\n> ${text.replace(/\n/g, " ")}\n>\n> — [p. ${page}](pdf-highlight://${id})\n\n`;
}

export interface PdfNotesEditorProps {
  pdfPath: string;
  onEditorReady?: (editor: EditorInstance) => void;
}

export function PdfNotesEditor({ pdfPath, onEditorReady }: PdfNotesEditorProps) {
  const notesRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorInstance | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesPath = useRef("");

  const [noteExists, setNoteExists] = useState<boolean | null>(null);
  const [createStudyModule, setCreateStudyModule] = useState(true);
  const [loading, setLoading] = useState(false);

  const scheduleSave = useCallback((content: string) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      if (notesPath.current) fs.writeFile(notesPath.current, content);
    }, 1000);
  }, []);

  // Checar se a nota existe quando o PDF muda
  useEffect(() => {
    if (!pdfPath) return;
    setNoteExists(null);

    fetchPdfNoteInfo(pdfPath)
      .then(({ exists, notesPath: np }) => {
        notesPath.current = np;
        setNoteExists(exists);
      })
      .catch(() => setNoteExists(false));
  }, [pdfPath]);

  // Criar o editor quando a nota existe e o div está montado
  useEffect(() => {
    if (!noteExists || !notesRef.current) return;
    const editor = createEditor(notesRef.current, scheduleSave);
    editorRef.current = editor;
    onEditorReady?.(editor);
    return () => {
      editor.destroy();
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [noteExists, scheduleSave, onEditorReady]);

  // Carregar conteúdo quando o editor e a nota estiverem prontos
  useEffect(() => {
    if (!noteExists || !editorRef.current) return;
    const np = notesPath.current;
    fs.readFile(np).then(({ content }) => {
      editorRef.current?.setContent(content);
    });
  }, [noteExists, pdfPath]);

  const handleCreateNote = useCallback(async () => {
    setLoading(true);
    try {
      const { newPdfPath } = await createPdfNote(pdfPath, createStudyModule);
      await useFileStore.getState().actions.loadFileTree();
      if (newPdfPath !== pdfPath) {
        // PDF foi movido: atualiza a tab com o novo caminho.
        // O useEffect([pdfPath]) vai reagir ao novo prop e setar noteExists=true.
        usePaneController.getState().actions.updateTabPaths(pdfPath, newPdfPath);
      } else {
        // Nota simples: pdfPath não muda, então o useEffect não dispara novamente.
        setNoteExists(true);
      }
    } catch (err) {
      console.error("Failed to create note:", err);
    } finally {
      setLoading(false);
    }
  }, [pdfPath, createStudyModule]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center px-4 py-2 border-b border-border shrink-0">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
          Notes
        </span>
      </div>

      {noteExists === false && (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 px-6">
          <Button size="sm" onClick={handleCreateNote} disabled={loading}>
            {loading ? "Criando..." : "Nova nota"}
          </Button>
          <div className="flex items-center gap-2">
            <Checkbox
              id="study-module"
              checked={createStudyModule}
              onCheckedChange={(v) => setCreateStudyModule(Boolean(v))}
            />
            <Label
              htmlFor="study-module"
              className="text-xs text-muted-foreground cursor-pointer"
            >
              Criar módulo de estudo
            </Label>
          </div>
        </div>
      )}

      <div
        ref={notesRef}
        className="flex-1 overflow-y-auto"
        style={{ display: noteExists === true ? undefined : "none" }}
      />
    </div>
  );
}

// Export ref for accessing editor
export function usePdfNotesEditor() {
  const editorRef = useRef<EditorInstance | null>(null);
  const handleEditorReady = useCallback((editor: EditorInstance) => {
    editorRef.current = editor;
  }, []);

  return { editorRef, handleEditorReady };
}
