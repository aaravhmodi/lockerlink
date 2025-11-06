export async function uploadToCloudinary(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary configuration missing. Check your .env.local file.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error?.message || "Upload failed");
    }

    const data = await res.json();
    return data.secure_url; // Returns the public HTTPS URL
  } catch (error: any) {
    console.error("Cloudinary upload error:", error);
    throw new Error(error.message || "Failed to upload image");
  }
}

