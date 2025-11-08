"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";
import { AlertTriangle, MessageCircle, Play, Trash2 } from "lucide-react";
import { useUser } from "@/hooks/useUser";

interface Post {
  id: string;
  userId: string;
  text: string;
  imageURL?: string;
  videoURL?: string;
  thumbnailURL?: string;
  mediaType?: "image" | "video" | null;
  createdAt: number;
  commentsCount?: number;
}

interface User {
  name: string;
  photoURL?: string;
  team?: string;
}

interface FeedCardProps {
  post: Post;
}

// Helper function to format date consistently
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  // Format as MM/DD/YYYY for consistency
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

export default function FeedCard({ post }: FeedCardProps) {
  const { user: currentUser } = useUser();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateString, setDateString] = useState("");
  const [videoError, setVideoError] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [addingComment, setAddingComment] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentsCount ?? 0);
  const [comments, setComments] = useState<
    Array<{
      id: string;
      userName?: string;
      userPhotoURL?: string;
      text: string;
      createdAt: number;
    }>
  >([]);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", post.userId));
        if (userDoc.exists()) {
          setUser(userDoc.data() as User);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [post.userId]);

  useEffect(() => {
    if (post.createdAt) {
      setDateString(formatDate(post.createdAt));
    }
  }, [post.createdAt]);

  const canShowVideo = useMemo(
    () => !!post.videoURL && !videoError,
    [post.videoURL, videoError]
  );

  useEffect(() => {
    if (!showComments) return;

    const commentsQuery = query(
      collection(db, "posts", post.id, "comments"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => {
        const commentData = docSnap.data() as any;
        return {
          id: docSnap.id,
          userName: commentData.userName,
          userPhotoURL: commentData.userPhotoURL,
          text: commentData.text,
          createdAt:
            commentData.createdAt?.toMillis?.() ||
            (typeof commentData.createdAt === "number" ? commentData.createdAt : Date.now()),
        };
      });
      setComments(data);
      setCommentCount(data.length);
    });

    return () => unsubscribe();
  }, [post.id, showComments]);

  const handleAddComment = async () => {
    if (!currentUser || !commentText.trim()) return;
    setAddingComment(true);
    try {
      const profileDoc = await getDoc(doc(db, "users", currentUser.uid));
      const profile = profileDoc.exists() ? profileDoc.data() : null;

      await addDoc(collection(db, "posts", post.id, "comments"), {
        userId: currentUser.uid,
        userName: profile?.name || currentUser.displayName || "Player",
        userPhotoURL: profile?.photoURL || currentUser.photoURL || "",
        text: commentText.trim(),
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "posts", post.id), {
        commentsCount: increment(1),
      });
      setCommentText("");
      setShowComments(true);
      setCommentCount((prev) => prev + 1);
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setAddingComment(false);
    }
  };

  const handleDeletePost = async () => {
    if (!currentUser || currentUser.uid !== post.userId) return;
    if (!confirm("Delete this post?")) return;

    try {
      await deleteDoc(doc(db, "posts", post.id));
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl sm:rounded-2xl border border-[#E5E7EB] bg-white p-4 sm:p-6 shadow-sm">
        <div className="h-4 w-32 animate-pulse rounded bg-[#F3F4F6]"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="rounded-xl sm:rounded-2xl border border-[#E5E7EB] bg-white p-4 sm:p-6 shadow-sm transition-all duration-200 hover:shadow-md"
    >
      <Link href={`/profile/${post.userId}`} className="mb-4 flex items-center gap-3">
        <div className="h-12 w-12 overflow-hidden rounded-full bg-[#F3F4F6] border-2 border-[#E5E7EB]">
          {user?.photoURL ? (
            <Image
              src={user.photoURL}
              alt={user.name}
              width={48}
              height={48}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-[#9CA3AF]">
              {user?.name?.[0] || "?"}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[#111827] truncate">{user?.name || "Unknown"}</div>
          {user?.team && (
            <div className="text-sm text-[#6B7280] truncate">{user.team}</div>
          )}
        </div>
        <div className="text-xs text-[#9CA3AF]">{dateString || "..."}</div>
      </Link>
      
      {post.text && (
        <p className="mb-4 text-[#111827] leading-relaxed whitespace-pre-line">{post.text}</p>
      )}
      
      {post.imageURL && (
        <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-xl bg-[#F3F4F6]">
          <Image
            src={post.imageURL}
            alt="Post image"
            fill
            className="object-cover"
          />
        </div>
      )}

      {canShowVideo && (
        <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-xl bg-[#0f172a]">
          <video
            controls
            preload="metadata"
            poster={post.thumbnailURL || undefined}
            className="h-full w-full object-cover"
            onError={() => setVideoError(true)}
          >
            <source src={post.videoURL} type="video/mp4" />
            Your browser does not support embedded videos.
          </video>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3 text-sm text-slate-500">
        <button
          onClick={() => setShowComments((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 font-medium text-slate-600 hover:bg-slate-200 transition"
        >
          <MessageCircle className="h-4 w-4" />
          {commentCount} Comment{commentCount === 1 ? "" : "s"}
        </button>
        {currentUser?.uid === post.userId && (
          <button
            onClick={handleDeletePost}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        )}
      </div>

      {showComments && (
        <div className="mt-4 space-y-3 border-t border-slate-200 pt-3">
          {currentUser ? (
            <div className="flex items-start gap-2">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={2}
                placeholder="Add a comment..."
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
              />
              <button
                onClick={handleAddComment}
                disabled={addingComment}
                className="rounded-xl bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2563EB] disabled:opacity-60"
              >
                {addingComment ? "Posting..." : "Post"}
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              <Link href="/" className="text-[#3B82F6] underline">
                Log in
              </Link>{" "}
              to join the conversation.
            </p>
          )}

          {comments.length === 0 ? (
            <p className="text-xs text-slate-500">No comments yet.</p>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700"
                >
                  <p className="font-medium text-slate-800">{comment.userName || "Player"}</p>
                  <p>{comment.text}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(comment.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!canShowVideo && post.videoURL && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">We couldn’t load this video automatically.</p>
            <p className="text-xs text-amber-600/80 break-all">
              Open directly:&nbsp;
              <a href={post.videoURL} target="_blank" rel="noopener noreferrer" className="underline">
                {post.videoURL}
              </a>
            </p>
          </div>
        </div>
      )}

      {!post.imageURL && !post.videoURL && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-[#6B7280]">
          <div className="flex items-center gap-2">
            <Play className="h-4 w-4 text-[#3B82F6]" />
            Training update shared.
          </div>
        </div>
      )}
    </motion.div>
  );
}
