import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  BadRequestException,
} from "@nestjs/common";
import { PdfService } from "./pdf.service.js";

@Controller("pdf")
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Get("notes")
  async getNoteInfo(@Query("pdfPath") pdfPath: string) {
    if (!pdfPath) throw new BadRequestException("pdfPath is required");
    return this.pdfService.getNoteInfo(pdfPath);
  }

  @Post("notes")
  async createNote(
    @Body() body: { pdfPath?: string; createStudyModule?: boolean },
  ) {
    if (!body.pdfPath) throw new BadRequestException("pdfPath is required");
    return this.pdfService.createNote(body.pdfPath, body.createStudyModule ?? false);
  }
}
