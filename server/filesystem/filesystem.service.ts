import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import fs from 'fs/promises';
import path from 'path';
import { DOCS_ROOT } from './filesystem.module.js';

export interface FileTreeEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeEntry[];
}

@Injectable()
export class FilesystemService {
  safePath(requestedPath: string): string {
    const resolved = path.resolve(DOCS_ROOT, ...requestedPath);
    if (!resolved.startsWith(DOCS_ROOT)) {
      throw new BadRequestException('Path traversal detected');
    }
    return resolved;
  }

  async buildTree(dirPath: string): Promise<FileTreeEntry[]> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    const sorted = entries
      .filter((e) => !e.name.startsWith('.'))
      .sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });

    const result: FileTreeEntry[] = [];
    for (const entry of sorted) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(DOCS_ROOT, fullPath);

      if (entry.isDirectory()) {
        result.push({
          name: entry.name,
          path: relativePath,
          type: 'directory',
          children: await this.buildTree(fullPath),
        });
      } else if (entry.name.endsWith('.md') || entry.name.endsWith('.pdf')) {
        result.push({ name: entry.name, path: relativePath, type: 'file' });
      }
    }
    return result;
  }

  async listFiles() {
    return this.buildTree(DOCS_ROOT);
  }

  async readFile(filePath: string) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const rel = path.relative(DOCS_ROOT, filePath);
      return { content, path: rel };
    } catch (err: any) {
      if (err.code === 'ENOENT') throw new NotFoundException('File not found');
      throw err;
    }
  }

  async writeFile(filePath: string, content: string) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  }

  async createFile(filePath: string, content = '') {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  }

  async createDirectory(filePath: string) {
    await fs.mkdir(filePath, { recursive: true });
  }

  async rename(oldAbsPath: string, newName: string): Promise<{ newPath: string }> {
    const dir = path.dirname(oldAbsPath);
    const ext = oldAbsPath.match(/\.(md|pdf)$/)?.[0] ?? '';
    const finalName = ext && !newName.endsWith(ext) ? newName + ext : newName;
    const newAbsPath = path.join(dir, finalName);

    try {
      await fs.access(newAbsPath);
      throw new ConflictException(`"${finalName}" already exists in this folder`);
    } catch (err: any) {
      if (err.status === 409) throw err;
      // ENOENT means file does not exist — safe to proceed
    }

    await fs.rename(oldAbsPath, newAbsPath);
    return { newPath: path.relative(DOCS_ROOT, newAbsPath) };
  }

  async moveFile(sourceAbsPath: string, targetRelDir: string): Promise<{ newPath: string }> {
    const targetAbsDir = targetRelDir
      ? path.resolve(DOCS_ROOT, targetRelDir)
      : DOCS_ROOT;

    if (!targetAbsDir.startsWith(DOCS_ROOT)) {
      throw new BadRequestException('Path traversal detected');
    }

    const name = path.basename(sourceAbsPath);
    const newAbsPath = path.join(targetAbsDir, name);

    if (sourceAbsPath === newAbsPath) {
      return { newPath: path.relative(DOCS_ROOT, newAbsPath) };
    }

    if (targetAbsDir.startsWith(sourceAbsPath + path.sep)) {
      throw new BadRequestException('Cannot move a directory into itself');
    }

    try {
      await fs.access(newAbsPath);
      throw new ConflictException(`"${name}" already exists in the destination folder`);
    } catch (err: any) {
      if (err.status === 409) throw err;
      // ENOENT means file does not exist — safe to proceed
    }

    await fs.rename(sourceAbsPath, newAbsPath);
    return { newPath: path.relative(DOCS_ROOT, newAbsPath) };
  }

  async duplicateFile(sourceAbsPath: string): Promise<{ newPath: string }> {
    const content = await fs.readFile(sourceAbsPath, 'utf-8');
    const dir = path.dirname(sourceAbsPath);
    const ext = sourceAbsPath.match(/\.(md|pdf)$/)?.[0] ?? '.md';
    const baseName = path.basename(sourceAbsPath, ext);

    const existingNames = new Set(await fs.readdir(dir));

    let n = 1;
    let candidateName: string;
    do {
      candidateName = `${baseName} (${n})${ext}`;
      n++;
    } while (existingNames.has(candidateName));

    const newAbsPath = path.join(dir, candidateName);
    await fs.writeFile(newAbsPath, content, 'utf-8');
    return { newPath: path.relative(DOCS_ROOT, newAbsPath) };
  }

  async createUntitled(targetRelDir: string): Promise<{ path: string }> {
    const absDir = targetRelDir ? path.resolve(DOCS_ROOT, targetRelDir) : DOCS_ROOT;

    if (!absDir.startsWith(DOCS_ROOT)) {
      throw new BadRequestException('Path traversal detected');
    }

    await fs.mkdir(absDir, { recursive: true });
    const existingNames = new Set(await fs.readdir(absDir));

    let candidateName = 'Untitled.md';
    let n = 1;
    while (existingNames.has(candidateName)) {
      candidateName = `Untitled (${n}).md`;
      n++;
    }

    const newAbsPath = path.join(absDir, candidateName);
    await fs.writeFile(newAbsPath, '', 'utf-8');
    return { path: path.relative(DOCS_ROOT, newAbsPath) };
  }

  async delete(filePath: string) {
    await fs.rm(filePath, { recursive: true });
  }
}
