import "reflect-metadata";
import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "path";

// Mock fs/promises ANTES de importar o service
vi.mock("fs/promises", () => ({
  default: {
    access: vi.fn(),
    mkdir: vi.fn().mockResolvedValue(undefined),
  },
}));

import fsPromises from "fs/promises";

// Importar o service DEPOIS dos mocks
// (arquivo ainda não existe — o import vai falhar, o que é esperado no RED)
import { PdfService } from "./pdf.service.js";
import { FilesystemService } from "../filesystem/filesystem.service.js";

const DOCS_ROOT = path.resolve(process.cwd(), "docs");

function makeFilesystemService() {
  return {
    createFile: vi.fn().mockResolvedValue(undefined),
    moveFile: vi.fn().mockResolvedValue({ newPath: "moved/path.pdf" }),
  } as unknown as FilesystemService;
}

describe("PdfService", () => {
  let service: PdfService;
  let fsMock: FilesystemService;

  beforeEach(() => {
    vi.clearAllMocks();
    fsMock = makeFilesystemService();
    service = new PdfService(fsMock);
  });

  // ── getNoteInfo ────────────────────────────────────────────────────

  describe("getNoteInfo", () => {
    it("returns exists:true and notesPath when note file exists", async () => {
      vi.mocked(fsPromises.access).mockResolvedValue(undefined);

      const result = await service.getNoteInfo("my-doc.pdf");

      expect(result.exists).toBe(true);
      expect(result.notesPath).toBe("notes-my-doc.md");
    });

    it("returns exists:false when note file does not exist", async () => {
      vi.mocked(fsPromises.access).mockRejectedValue(
        Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
      );

      const result = await service.getNoteInfo("my-doc.pdf");

      expect(result.exists).toBe(false);
    });

    it("derives notesPath inside subdirectory correctly", async () => {
      vi.mocked(fsPromises.access).mockRejectedValue(new Error("ENOENT"));

      const result = await service.getNoteInfo("subdir/my-doc.pdf");

      expect(result.notesPath).toBe("subdir/notes-my-doc.md");
    });
  });

  // ── createNote — sem módulo de estudo ─────────────────────────────

  describe("createNote (createStudyModule: false)", () => {
    it("creates note file with frontmatter in same directory as pdf", async () => {
      await service.createNote("subdir/my-doc.pdf", false);

      expect(fsMock.createFile).toHaveBeenCalledWith(
        path.join(DOCS_ROOT, "subdir/notes-my-doc.md"),
        '---\npdf: "[[subdir/my-doc]]"\n---\n\n',
      );
    });

    it("returns notesPath and unchanged newPdfPath", async () => {
      const result = await service.createNote("my-doc.pdf", false);

      expect(result.notesPath).toBe("notes-my-doc.md");
      expect(result.newPdfPath).toBe("my-doc.pdf");
    });
  });

  // ── createNote — com módulo de estudo ─────────────────────────────

  describe("createNote (createStudyModule: true)", () => {
    beforeEach(() => {
      vi.mocked(fsMock.moveFile).mockResolvedValue({
        newPath: "my-doc/my-doc.pdf",
      });
      // Simula que highlights não existem (access rejeita)
      vi.mocked(fsPromises.access).mockRejectedValue(new Error("ENOENT"));
    });

    it("creates target directory with lowercased pdf name", async () => {
      await service.createNote("My Doc.pdf", true);

      expect(fsPromises.mkdir).toHaveBeenCalledWith(
        path.join(DOCS_ROOT, "my doc"),
        { recursive: true },
      );
    });

    it("moves pdf to target directory", async () => {
      await service.createNote("my-doc.pdf", true);

      expect(fsMock.moveFile).toHaveBeenCalledWith(
        path.join(DOCS_ROOT, "my-doc.pdf"),
        "my-doc",
      );
    });

    it("creates target directory respecting parent directory", async () => {
      await service.createNote("subdir/My Doc.pdf", true);

      expect(fsPromises.mkdir).toHaveBeenCalledWith(
        path.join(DOCS_ROOT, "subdir/my doc"),
        { recursive: true },
      );
    });

    it("creates notes file inside new directory with correct frontmatter", async () => {
      vi.mocked(fsMock.moveFile).mockResolvedValue({
        newPath: "my-doc/my-doc.pdf",
      });

      await service.createNote("my-doc.pdf", true);

      expect(fsMock.createFile).toHaveBeenCalledWith(
        path.join(DOCS_ROOT, "my-doc/notes-my-doc.md"),
        '---\npdf: "[[my-doc/my-doc]]"\n---\n\n',
      );
    });

    it("returns notesPath and newPdfPath from moveFile response", async () => {
      vi.mocked(fsMock.moveFile).mockResolvedValue({
        newPath: "my-doc/my-doc.pdf",
      });

      const result = await service.createNote("my-doc.pdf", true);

      expect(result.notesPath).toBe("my-doc/notes-my-doc.md");
      expect(result.newPdfPath).toBe("my-doc/my-doc.pdf");
    });

    it("skips highlights move when highlights file does not exist", async () => {
      vi.mocked(fsPromises.access).mockRejectedValue(new Error("ENOENT"));

      await expect(service.createNote("my-doc.pdf", true)).resolves.not.toThrow();
      // moveFile deve ter sido chamado apenas para o PDF, não para highlights
      expect(fsMock.moveFile).toHaveBeenCalledTimes(1);
    });

    it("moves highlights file when it exists", async () => {
      vi.mocked(fsPromises.access).mockResolvedValue(undefined); // highlights existe

      await service.createNote("my-doc.pdf", true);

      // moveFile chamado para o PDF E para os highlights
      expect(fsMock.moveFile).toHaveBeenCalledTimes(2);
      expect(fsMock.moveFile).toHaveBeenCalledWith(
        path.join(DOCS_ROOT, "highlights-my-doc.json"),
        "my-doc",
      );
    });
  });
});
