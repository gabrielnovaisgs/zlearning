import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Req,
  Res,
  Body,
  Inject,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { FilesystemService } from './filesystem.service.js';

function extractPath(req: Request): string {
  return (req.params as Record<string, string>).path ?? '';
}

@Controller('files')
export class FilesystemController {
  constructor(@Inject(FilesystemService) private readonly fs: FilesystemService) {}

  @Get()
  async list() {
    return this.fs.listFiles();
  }

  // Must be declared before @Get('*') so it takes precedence
  @Get('raw/*path')
  async serveRaw(@Req() req: Request, @Res() res: Response) {
    try {
      const rawPath = (req.params as Record<string, string>).path ?? '';
      const filePath = this.fs.safePath(rawPath);
      res.sendFile(filePath);
    } catch {
      res.status(500).json({ error: 'Failed to serve file' });
    }
  }

  @Get('*path')
  async read(@Req() req: Request) {
    const filePath = this.fs.safePath(extractPath(req));
    return this.fs.readFile(filePath);
  }

  @Put('*path')
  async write(@Req() req: Request, @Body() body: { content: string }) {
    const filePath = this.fs.safePath(extractPath(req));
    await this.fs.writeFile(filePath, body.content);
    return { success: true };
  }

  @Post('*path')
  async create(@Req() req: Request, @Body() body: { type?: string; content?: string }) {
    const filePath = this.fs.safePath(extractPath(req));
    if (body.type === 'directory') {
      await this.fs.createDirectory(filePath);
    } else {
      await this.fs.createFile(filePath, body.content ?? '');
    }
    return { success: true };
  }

  @Patch('*path')
  async rename(@Req() req: Request, @Body() body: { newPath?: string }) {
    if (!body.newPath) throw new BadRequestException('newPath is required');
    const oldPath = this.fs.safePath(extractPath(req));
    const newPath = this.fs.safePath(body.newPath);
    await this.fs.rename(oldPath, newPath);
    return { success: true };
  }

  @Delete('*path')
  async delete(@Req() req: Request) {
    const filePath = this.fs.safePath(extractPath(req));
    await this.fs.delete(filePath);
    return { success: true };
  }
}
