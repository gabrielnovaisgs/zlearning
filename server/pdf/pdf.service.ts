import { Injectable, BadRequestException } from "@nestjs/common";
import { FilesystemService } from "../filesystem/filesystem.service.js";
import fsPromises from "fs/promises";
import path from "path";

const DOCS_ROOT = path.resolve(process.cwd(), "docs");

function resolveSafe(relPath: string): string {
  const abs = path.resolve(DOCS_ROOT, relPath);
  if (abs !== DOCS_ROOT && !abs.startsWith(DOCS_ROOT + path.sep)) {
    throw new BadRequestException("Path traversal detected");
  }
  return abs;
}

function notePathFor(pdfPath: string): string {
  const dir = path.dirname(pdfPath);
  const base = path.basename(pdfPath, ".pdf");
  return dir === "." ? `notes-${base}.md` : `${dir}/notes-${base}.md`;
}

function highlightsPathFor(pdfPath: string): string {
  const dir = path.dirname(pdfPath);
  const base = path.basename(pdfPath, ".pdf");
  return dir === "." ? `highlights-${base}.json` : `${dir}/highlights-${base}.json`;
}

function frontmatterFor(pdfRelPath: string): string {
  return `---\npdf: "[[${pdfRelPath.replace(/\.pdf$/, "")}]]"\n---\n\n`;
}

@Injectable()
export class PdfService {
  constructor(private readonly filesystemService: FilesystemService) {}

  async getNoteInfo(
    pdfPath: string,
  ): Promise<{ exists: boolean; notesPath: string }> {
    const notesPath = notePathFor(pdfPath);
    const absPath = resolveSafe(notesPath);
    try {
      await fsPromises.access(absPath);
      return { exists: true, notesPath };
    } catch {
      return { exists: false, notesPath };
    }
  }

  async createNote(
    pdfPath: string,
    createStudyModule: boolean,
  ): Promise<{ notesPath: string; newPdfPath: string }> {
    if (createStudyModule) {
      return this.createStudyModule(pdfPath);
    }
    return this.createSimpleNote(pdfPath);
  }

  private async createSimpleNote(
    pdfPath: string,
  ): Promise<{ notesPath: string; newPdfPath: string }> {
    const notesPath = notePathFor(pdfPath);
    const absPath = resolveSafe(notesPath);
    const content = frontmatterFor(pdfPath);
    await this.filesystemService.createFile(absPath, content);
    return { notesPath, newPdfPath: pdfPath };
  }

  private async createStudyModule(
    pdfPath: string,
  ): Promise<{ notesPath: string; newPdfPath: string }> {
    const fileName = path.basename(pdfPath);
    const parentDir = path.dirname(pdfPath);
    const base = path.basename(pdfPath, ".pdf");
    const folderName = base.toLowerCase();
    const targetDir =
      parentDir === "." ? folderName : `${parentDir}/${folderName}`;

    const absTargetDir = resolveSafe(targetDir);
    await fsPromises.mkdir(absTargetDir, { recursive: true });

    const absPdfPath = resolveSafe(pdfPath);
    const { newPath: newPdfPath } = await this.filesystemService.moveFile(
      absPdfPath,
      targetDir,
    );

    const hlRelPath = highlightsPathFor(pdfPath);
    try {
      const absHlPath = resolveSafe(hlRelPath);
      await fsPromises.access(absHlPath);
      await this.filesystemService.moveFile(absHlPath, targetDir);
    } catch {
      // sem highlights, ignorar
    }

    const notesPath = `${targetDir}/notes-${base}.md`;
    const absNotesPath = resolveSafe(notesPath);
    const content = frontmatterFor(`${targetDir}/${fileName}`);
    await this.filesystemService.createFile(absNotesPath, content);

    return { notesPath, newPdfPath };
  }
}
