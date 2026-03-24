import { WidgetType } from "@codemirror/view";

type Alignment = "left" | "center" | "right" | "default";

interface ParsedTable {
  headers: string[];
  alignments: Alignment[];
  rows: string[][];
}

const parseCells = (line: string): string[] => {
  const inner = line.trim().replace(/^\||\|$/g, "");
  return inner.split("|").map((c) => c.trim());
};

const parseAlignment = (cell: string): Alignment => {
  const s = cell.trim();
  if (s.startsWith(":") && s.endsWith(":")) return "center";
  if (s.endsWith(":")) return "right";
  if (s.startsWith(":")) return "left";
  return "default";
};

const parseTable = (text: string): ParsedTable | null => {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return null;
  return {
    headers: parseCells(lines[0]),
    alignments: parseCells(lines[1]).map(parseAlignment),
    rows: lines.slice(2).map(parseCells),
  };
};

export class TableWidget extends WidgetType {
  constructor(private text: string) {
    super();
  }

  eq(other: TableWidget): boolean {
    return this.text === other.text;
  }

  toDOM(): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "cm-md-table-wrapper";

    const data = parseTable(this.text);
    if (!data) {
      wrapper.textContent = this.text;
      return wrapper;
    }

    const table = document.createElement("table");
    table.className = "cm-md-table";

    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    data.headers.forEach((header, i) => {
      const th = document.createElement("th");
      th.textContent = header;
      const align = data.alignments[i] ?? "default";
      if (align !== "default") th.style.textAlign = align;
      headerRow.appendChild(th);
    });

    if (data.rows.length > 0) {
      const tbody = table.createTBody();
      data.rows.forEach((row) => {
        const tr = tbody.insertRow();
        data.headers.forEach((_, i) => {
          const td = tr.insertCell();
          td.textContent = row[i] ?? "";
          const align = data.alignments[i] ?? "default";
          if (align !== "default") td.style.textAlign = align;
        });
      });
    }

    wrapper.appendChild(table);
    return wrapper;
  }

  ignoreEvent(): boolean {
    return false;
  }
}
