import fs from "fs";
import path from "path";
import crypto from "crypto";
import { IStorageProvider, UploadResult } from "../storage";

export class LocalFileProvider implements IStorageProvider {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), "public", "uploads");
    // Ensure uploads directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    _mimeType: string,
  ): Promise<UploadResult> {
    const uuid = crypto.randomUUID();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFileName = `${uuid}-${sanitizedName}`;
    const targetPath = path.join(this.uploadDir, uniqueFileName);

    await fs.promises.writeFile(targetPath, fileBuffer);

    const relativeUrl = `/uploads/${uniqueFileName}`;

    return {
      storagePath: targetPath,
      downloadUrl: relativeUrl,
      previewUrl: relativeUrl,
      fileSize: fileBuffer.length,
    };
  }

  async deleteFile(storagePath: string): Promise<void> {
    try {
      if (fs.existsSync(storagePath)) {
        await fs.promises.unlink(storagePath);
      }
    } catch (err) {
      console.error(`Failed to delete local file: ${storagePath}`, err);
    }
  }
}
