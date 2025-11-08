"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { addDoc, collection, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";
import { uploadImageToCloudinary, uploadVideoToCloudinary } from "@/utils/uploadToCloudinary";
import { FileVideo, Image as ImageIcon, Loader2, X, AlertCircle } from "lucide-react";

interface PostComposerProps {
  onPostCreated?: () => void;
}

type MediaType = "image" | "video" | null;

interface UserProfilePreview {
  name?: string;
  photoURL?: string;
  team?: string;
}

const MAX_TEXT_LENGTH = 500;

export default function PostComposer({ onPostCreated }: PostComposerProps) {
  const { user } = useUser();
  const [profile, setProfile] = useState<UserProfilePreview | null>(null);
  const [text, setText] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfilePreview = async () => {
      if (!user) {
        setProfile(null);
        return;
      }

      try {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfilePreview;
          setProfile({
            name: data.name || user.displayName || "Player",
            photoURL: data.photoURL || user.photoURL || undefined,
            team: data.team,
          });
        } else {
          setProfile({
            name: user.displayName || "Player",
            photoURL: user.photoURL || undefined,
          });
        }
      } catch (profileError) {
        console.error("Error loading profile preview:", profileError);
      }
    };

    fetchProfilePreview();
  }, [user]);

  const textCharsRemaining = useMemo(
    () => MAX_TEXT_LENGTH - text.length,
    [text.length]
  );

  const resetForm = () => {
    setText("");
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/", "video/"].some((prefix) => file.type.startsWith(prefix))) {
      setError("Unsupported file type. Please upload an image or video.");
      return;
    }

    setError(null);
    setMediaFile(file);
    setMediaType(file.type.startsWith("video") ? "video" : "image");

    if (file.type.startsWith("image")) {
      const reader = new FileReader();
      reader.onloadend = () => setMediaPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setMediaPreview(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || submitting) return;

    if (!text.trim() && !mediaFile) {
      setError("Share a quick update or add a highlight video before posting.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let imageURL: string | null = null;
      let videoURL: string | null = null;
      let thumbnailURL: string | null = null;
      let resolvedMediaType: MediaType = null;

      if (mediaFile) {
        if (mediaType === "video") {
          const uploadResult = await uploadVideoToCloudinary(mediaFile);
          videoURL = uploadResult.secureUrl;
          resolvedMediaType = "video";

          const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
          if (cloudName && uploadResult.publicId) {
            thumbnailURL = `https://res.cloudinary.com/${cloudName}/video/upload/so_0/c_fill,w_640,h_360/${uploadResult.publicId}.jpg`;
          }
        } else {
          const uploadResult = await uploadImageToCloudinary(mediaFile);
          imageURL = uploadResult.secureUrl;
          resolvedMediaType = "image";
        }
      }

      await addDoc(collection(db, "posts"), {
        userId: user.uid,
        text: text.trim(),
        mediaType: resolvedMediaType,
        imageURL,
        videoURL,
        thumbnailURL,
        createdAt: serverTimestamp(),
      });

      resetForm();
      onPostCreated?.();
    } catch (submitError: any) {
      console.error("Error creating post:", submitError);
      setError(submitError.message || "Failed to create post. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm"
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="h-12 w-12 overflow-hidden rounded-full bg-[#F3F4F6] border border-[#E5E7EB] flex-shrink-0">
          {profile?.photoURL ? (
            <Image
              src={profile.photoURL}
              alt={profile.name || "You"}
              width={48}
              height={48}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-[#9CA3AF]">
              {profile?.name?.[0]?.toUpperCase() || "?"}
            </div>
          )}
        </div>

        <div className="flex-1">
          <textarea
            value={text}
            onChange={(event) => {
              if (event.target.value.length <= MAX_TEXT_LENGTH) {
                setText(event.target.value);
              }
            }}
            placeholder="Share what you're working on today..."
            className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm sm:text-base text-[#0F172A] transition-colors focus:border-[#3B82F6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
            rows={3}
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-[#3B82F6] transition-colors hover:border-[#3B82F6] hover:bg-[#3B82F6]/10">
                <ImageIcon className="h-4 w-4" />
                <span>Photo</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-[#9333EA] bg-purple-50">
                <FileVideo className="h-4 w-4" />
                <span className="hidden sm:inline">Video ready</span>
              </div>
            </div>
            <span className={`text-xs ${textCharsRemaining < 50 ? "text-[#F97316]" : "text-[#6B7280]"}`}>
              {textCharsRemaining} chars left
            </span>
          </div>

          {mediaFile && (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-4">
              <div className="mb-3 flex items-center justify-between text-sm text-[#0F172A]">
                <div className="flex items-center gap-2">
                  {mediaType === "video" ? (
                    <FileVideo className="h-4 w-4 text-[#3B82F6]" />
                  ) : (
                    <ImageIcon className="h-4 w-4 text-[#3B82F6]" />
                  )}
                  <span className="font-medium break-all">{mediaFile.name}</span>
                  <span className="text-xs text-[#6B7280]">
                    {(mediaFile.size / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMediaFile(null);
                    setMediaPreview(null);
                    setMediaType(null);
                  }}
                  className="rounded-full p-1 text-[#6B7280] transition-colors hover:bg-slate-200/70 hover:text-[#111827]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {mediaType === "image" && mediaPreview && (
                <div className="relative aspect-video overflow-hidden rounded-xl border border-slate-200 bg-white/40">
                  <Image
                    src={mediaPreview}
                    alt="Selected media preview"
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              {mediaType === "video" && (
                <div className="rounded-xl border border-slate-200 bg-white/60 p-4 text-sm text-[#6B7280]">
                  Video will be processed after you post. A thumbnail is generated automatically.
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <motion.button
              type="submit"
              disabled={submitting}
              whileHover={{ scale: submitting ? 1 : 1.02 }}
              whileTap={{ scale: submitting ? 1 : 0.98 }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#007AFF] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0056CC] disabled:cursor-not-allowed disabled:bg-[#9CA3AF]"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                "Post"
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.form>
  );
}

