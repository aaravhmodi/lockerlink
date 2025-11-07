export interface CloudinaryUploadResult {
  secureUrl: string;
  publicId: string;
  resourceType: "image" | "video";
}

async function uploadFileToCloudinary(file: File, resourceType: "image" | "video" = "image"): Promise<CloudinaryUploadResult> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary configuration missing. Check your .env.local file.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error?.message || "Upload failed");
    }

    const data = await res.json();
    return {
      secureUrl: data.secure_url as string,
      publicId: data.public_id as string,
      resourceType,
    };
  } catch (error: any) {
    console.error("Cloudinary upload error:", error);
    throw new Error(error.message || "Failed to upload file");
  }
}

export async function uploadToCloudinary(file: File): Promise<string> {
  const result = await uploadFileToCloudinary(file, "image");
  return result.secureUrl;
}

export async function uploadImageToCloudinary(file: File): Promise<CloudinaryUploadResult> {
  return uploadFileToCloudinary(file, "image");
}

export async function uploadVideoToCloudinary(file: File): Promise<CloudinaryUploadResult> {
  return uploadFileToCloudinary(file, "video");
}

