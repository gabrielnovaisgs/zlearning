import { Module } from "@nestjs/common";
import { FilesystemModule } from "../filesystem/filesystem.module.js";
import { PdfController } from "./pdf.controller.js";
import { PdfService } from "./pdf.service.js";

@Module({
  imports: [FilesystemModule],
  controllers: [PdfController],
  providers: [PdfService],
})
export class PdfModule {}
