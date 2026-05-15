import { v2 as cloudinary } from "cloudinary";

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.warn("Cloudinary environment variables are missing.");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export type CloudinaryUploadResponse = {
  secure_url: string;
  public_id: string;
  format: string;
  bytes: number;
};

export async function uploadToCloudinary(
  buffer: Buffer,
  folder: string = "coopfleet/attachments"
): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          resource_type: "auto", // Automatically detects images, pdfs, etc.
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            return reject(new Error("Falha ao enviar arquivo para o Cloudinary."));
          }
          if (!result) {
            return reject(new Error("Nenhum resultado retornado pelo Cloudinary."));
          }
          resolve(result.secure_url);
        }
      )
      .end(buffer);
  });
}

export default cloudinary;
