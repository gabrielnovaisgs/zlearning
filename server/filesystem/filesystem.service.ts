import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import fs from 'fs/promises';
import path from 'path';

export interface FileTreeEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeEntry[];
}

const DOCS_ROOT = path.resolve(process.cwd(), 'docs');

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

  async rename(oldPath: string, newPath: string) {
    await fs.mkdir(path.dirname(newPath), { recursive: true });
    await fs.rename(oldPath, newPath);
  }

  async delete(filePath: string) {
    await fs.rm(filePath, { recursive: true });
  }
}
