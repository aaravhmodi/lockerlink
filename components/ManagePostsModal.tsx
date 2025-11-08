"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";
import { Trash2, X, Loader2, AlertTriangle, Play } from "lucide-react";

interface ManagePostsModalProps {
  open: boolean;
  onClose: () => void;
}

interface ManagedPost {
  id: string;
  text: string;
  imageURL?: string;
  videoURL?: string;
  thumbnailURL?: string;
  mediaType?: "image" | "video" | null;
  createdAt: number;
}

function formatTimestamp(timestamp: number) {
  const date = new Date(timestamp);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ManagePostsModal({ open, onClose }: ManagePostsModalProps) {
  const { user } = useUser();
  const [posts, setPosts] = useState<ManagedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) {
      return;
    }

    setLoading(true);
    const postsQuery = query(
      collection(db, "posts"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(25)
    );

    const unsubscribe = onSnapshot(
      postsQuery,
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as any;
          return {
            id: docSnap.id,
            ...data,
            createdAt:
              data.createdAt?.toMillis?.() ||
              (typeof data.createdAt === "number" ? data.createdAt : Date.now()),
          };
        }) as ManagedPost[];
        setPosts(data);
        setLoading(false);
      },
      (snapshotError) => {
        console.error("Error loading posts:", snapshotError);
        setError("Failed to load posts.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [open, user]);

  const handleDelete = async (postId: string) => {
    if (!user || deletingId) return;

    setDeletingId(postId);
    setError(null);

    try {
      const postRef = doc(db, "posts", postId);
      const postDoc = await getDoc(postRef);

      if (!postDoc.exists()) {
        setError("Post not found.");
        setDeletingId(null);
        return;
      }

      if (postDoc.data().userId !== user.uid) {
        setError("You can only delete your own posts.");
        setDeletingId(null);
        return;
      }

      await deleteDoc(postRef);
    } catch (deleteError: any) {
      console.error("Error deleting post:", deleteError);
      setError(deleteError.message || "Failed to delete post.");
    } finally {
      setDeletingId(null);
    }
  };

  const body = useMemo(() => {
    if (loading) {
      return (
        <div className="flex flex-1 items-center justify-center py-12 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      );
    }

    if (!posts.length) {
      return (
        <div className="flex flex-1 items-center justify-center py-12 text-slate-500">
          You haven’t shared any posts yet.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {posts.map((post) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-xs text-slate-400 mb-1">
                  {formatTimestamp(post.createdAt)}
                </p>
                {post.text && (
                  <p className="text-sm text-[#0F172A] mb-3 whitespace-pre-line">
                    {post.text}
                  </p>
                )}
                {post.imageURL && (
                  <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-100 mb-3">
                    <Image
                      src={post.imageURL}
                      alt="Post media"
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                {post.videoURL && (
                  <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-900/80 mb-3">
                    <video
                      src={post.videoURL}
                      controls
                      poster={post.thumbnailURL}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </div>
              <button
                onClick={() => handleDelete(post.id)}
                disabled={deletingId === post.id}
                className="rounded-full border border-red-200 bg-red-50 p-2 text-red-500 transition hover:bg-red-100 disabled:opacity-60"
                title="Delete post"
              >
                {deletingId === post.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    );
  }, [loading, posts, deletingId]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#0F172A]">Manage Your Posts</h2>
              <button
                onClick={onClose}
                className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="max-h-[60vh] overflow-y-auto pr-1">{body}</div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

