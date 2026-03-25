import { useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Square, SquareCheck } from "lucide-react";
import { resolveWikiLink, resolveFileFromPath } from "@shared/file.store";
import { usePaneController } from "@features/panes/pane-controller.store";
import { remarkWikiLink } from "./remark-wiki-link";
import "./preview.css";

interface Props {
  content: string;
  filePath: string;
  onCheckboxToggle: (index: number, checked: boolean) => void;
}

function stripFrontmatter(content: string): string {
  if (!content.startsWith("---\n")) return content;
  const end = content.indexOf("\n---\n", 4);
  if (end === -1) return content;
  return content.slice(end + 5);
}

// Exported for testing
export function CheckboxRenderer({
  checked,
  index,
  onToggle,
}: {
  checked?: boolean;
  index: number;
  onToggle: (i: number, c: boolean) => void;
}) {
  return (
    <span
      className={`preview-checkbox${checked ? " checked" : ""}`}
      onClick={() => onToggle(index, !checked)}
    >
      {checked ? <SquareCheck size={15} /> : <Square size={15} />}
    </span>
  );
}

// Exported for testing
export function ImgRenderer({ src, alt }: { src?: string; alt?: string }) {
  const resolvedSrc = src?.startsWith("http") ? src : `/api/files/raw/${src}`;
  return <img src={resolvedSrc} alt={alt} className="md-preview-img" />;
}

export function MarkdownPreview({ content, onCheckboxToggle }: Props) {
  const checkboxIndexRef = useRef(0);
  checkboxIndexRef.current = 0;

  const { activePaneId, actions } = usePaneController();
  const { openFileInPane, splitPane } = actions;

  const handleWikiLinkClick = (value: string, ctrlKey: boolean) => {
    const path = resolveWikiLink(value);
    if (!path) return;
    if (ctrlKey) {
      const newPaneId = splitPane(activePaneId, "right");
      openFileInPane(path, newPaneId);
    } else {
      openFileInPane(path);
    }
  };

  const handleLinkClick = (href: string | undefined, ctrlKey: boolean) => {
    if (!href) return;

    if (href.startsWith("pdf-highlight://")) {
      const id = href.slice("pdf-highlight://".length);
      import("@features/pdf-viewer/pdf.store").then(({ usePdfStore }) => {
        usePdfStore.getState().actions.setTarget(id);
      });
      return;
    }

    if (href.endsWith(".md") || (!href.startsWith("http") && !href.startsWith("#"))) {
      const path = resolveFileFromPath(href.replace(/\.md$/, ""));
      if (!path) return;
      if (ctrlKey) {
        const newPaneId = splitPane(activePaneId, "right");
        openFileInPane(path, newPaneId);
      } else {
        openFileInPane(path);
      }
      return;
    }

    window.open(href, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="md-preview">
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkWikiLink]}
      components={{
        input({ checked, node: _node }) {
          const idx = checkboxIndexRef.current++;
          return <CheckboxRenderer checked={checked} index={idx} onToggle={onCheckboxToggle} />;
        },

        span({ node, children, ...props }) {
          const wikiLinkValue = node?.properties?.["dataWikilink"] as string | undefined;
          if (wikiLinkValue) {
            return (
              <span
                {...props}
                className="preview-wikilink"
                onClick={(e) => handleWikiLinkClick(wikiLinkValue, e.ctrlKey || e.metaKey)}
              >
                {children}
              </span>
            );
          }
          return <span {...props}>{children}</span>;
        },

        a({ href, children, node: _node, ...props }) {
          return (
            <a
              {...props}
              href={href}
              onClick={(e) => {
                e.preventDefault();
                handleLinkClick(href, e.ctrlKey || e.metaKey);
              }}
            >
              {children}
            </a>
          );
        },

        img({ src, alt, node: _node }) {
          return <ImgRenderer src={src} alt={alt} />;
        },
      }}
    >
      {stripFrontmatter(content)}
    </ReactMarkdown>
    </div>
  );
}
