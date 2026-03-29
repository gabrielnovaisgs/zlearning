import type { ReactNode } from "react";
import { PdfViewer } from "@features/pdf-viewer/PdfViewer";
import { NewTabScreen } from "./NewTabScreen";
import { MarkdownEditor } from "@features/markdown-editor/MarkdownEditor";
import { ChatEditor } from "@features/chat/ChatEditor";

export enum EditorType {
  NewTab = "newTab",
  Markdown = "markdown",
  Pdf = "pdf",
  Chat = "chat",
}

interface Props {
  type: EditorType;
  filePath: string | null;
  paneId: string;
  isFocused: boolean;
}

const editorRegistry: Record<EditorType, (filePath: string | null) => ReactNode> = {
  [EditorType.NewTab]: () => <NewTabScreen />,
  [EditorType.Markdown]: (filePath) => <MarkdownEditor filePath={filePath!} />,
  [EditorType.Pdf]: (filePath) => <PdfViewer pdfPath={filePath!} />,
  [EditorType.Chat]: (filePath) => {
    const sessionId = filePath!.replace(/^chat:\/\//, "");
    return <ChatEditor sessionId={sessionId} />;
  },
};

export function EditorContainer({ type, filePath, isFocused: _isFocused }: Props) {
  return (
    <div className="relative flex h-full flex-1 flex-col bg-bg-primary">
      {editorRegistry[type](filePath)}
    </div>
  );
}
