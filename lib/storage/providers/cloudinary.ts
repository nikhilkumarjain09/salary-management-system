import { v2 as cloudinary } from "cloudinary";
import { IStorageProvider, UploadResult } from "../storage";

export class CloudinaryProvider implements IStorageProvider {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    _mimeType: string,
  ): Promise<UploadResult> {
    return new Promise<UploadResult>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "auto",
          folder: "employee_documents",
          public_id: fileName.replace(/\.[^/.]+$/, ""), // Strip extension for clean ID
        },
        (error, result) => {
          if (error || !result) {
            reject(error || new Error("Failed to upload file to Cloudinary"));
          } else {
            // Encode resource_type in storagePath so delete knows what type it was
            resolve({
              storagePath: `${result.resource_type}:${result.public_id}`,
              downloadUrl: result.secure_url,
              previewUrl: result.secure_url,
              fileSize: result.bytes,
            });
          }
        },
      );

      uploadStream.end(fileBuffer);
    });
  }

  async deleteFile(storagePath: string): Promise<void> {
    try {
      const parts = storagePath.split(":");
      if (parts.length < 2) {
        // Fallback if type is not encoded
        await cloudinary.uploader.destroy(storagePath);
        return;
      }
      const [resourceType, publicId] = parts;
      await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
    } catch (err) {
      console.error(`Failed to delete Cloudinary file: ${storagePath}`, err);
    }
  }
}
