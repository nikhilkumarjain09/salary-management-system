import { LocalFileProvider } from "./providers/local";
import { CloudinaryProvider } from "./providers/cloudinary";

export interface UploadResult {
  storagePath: string;
  downloadUrl: string;
  previewUrl?: string;
  fileSize: number;
}

export interface IStorageProvider {
  uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<UploadResult>;
  deleteFile(storagePath: string): Promise<void>;
}

// Instantiate matching provider based on configuration
function createStorageProvider(): IStorageProvider {
  const provider = process.env.STORAGE_PROVIDER || "";

  if (
    provider === "cloudinary" ||
    (process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET)
  ) {
    console.log("[Storage] Using Cloudinary Storage Provider.");
    return new CloudinaryProvider();
  }

  console.log("[Storage] Using Local Filesystem Storage Provider.");
  return new LocalFileProvider();
}

export const storageService = createStorageProvider();
