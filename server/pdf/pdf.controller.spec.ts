import "reflect-metadata";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { PdfController } from "./pdf.controller.js";
import { PdfService } from "./pdf.service.js";

function makePdfService() {
  return {
    getNoteInfo: vi.fn().mockResolvedValue({ exists: false, notesPath: "notes-test.md" }),
    createNote: vi.fn().mockResolvedValue({ notesPath: "notes-test.md", newPdfPath: "test.pdf" }),
  } as unknown as PdfService;
}

describe("PdfController", () => {
  let controller: PdfController;
  let service: PdfService;

  beforeEach(() => {
    service = makePdfService();
    controller = new PdfController(service);
  });

  describe("GET /pdf/notes (getNoteInfo)", () => {
    it("delegates to PdfService.getNoteInfo with pdfPath", async () => {
      vi.mocked(service.getNoteInfo).mockResolvedValue({ exists: true, notesPath: "notes-my.md" });

      const result = await controller.getNoteInfo("my.pdf");

      expect(service.getNoteInfo).toHaveBeenCalledWith("my.pdf");
      expect(result).toEqual({ exists: true, notesPath: "notes-my.md" });
    });

    it("throws BadRequestException when pdfPath is missing", async () => {
      await expect(controller.getNoteInfo(undefined as unknown as string)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("POST /pdf/notes (createNote)", () => {
    it("delegates to PdfService.createNote with pdfPath and createStudyModule", async () => {
      const expected = { notesPath: "module/notes-doc.md", newPdfPath: "module/doc.pdf" };
      vi.mocked(service.createNote).mockResolvedValue(expected);

      const result = await controller.createNote({ pdfPath: "doc.pdf", createStudyModule: true });

      expect(service.createNote).toHaveBeenCalledWith("doc.pdf", true);
      expect(result).toEqual(expected);
    });

    it("defaults createStudyModule to false when not provided", async () => {
      await controller.createNote({ pdfPath: "doc.pdf" });

      expect(service.createNote).toHaveBeenCalledWith("doc.pdf", false);
    });

    it("throws BadRequestException when pdfPath is missing", async () => {
      await expect(controller.createNote({})).rejects.toThrow(BadRequestException);
    });
  });
});
