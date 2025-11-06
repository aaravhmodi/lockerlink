"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";

interface Post {
  id: string;
  userId: string;
  text: string;
  imageURL?: string;
  createdAt: number;
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateString, setDateString] = useState("");

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
    // Format date on client side only to avoid hydration mismatch
    if (post.createdAt) {
      setDateString(formatDate(post.createdAt * 1000));
    }
  }, [post.createdAt]);

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
      <div className="mb-4 flex items-center gap-3">
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
        <div className="flex-1">
          <div className="font-semibold text-[#111827]">{user?.name || "Unknown"}</div>
          {user?.team && (
            <div className="text-sm text-[#6B7280]">{user.team}</div>
          )}
        </div>
        <div className="text-xs text-[#9CA3AF]">{dateString || "..."}</div>
      </div>
      
      {post.text && (
        <p className="mb-4 text-[#111827] leading-relaxed">{post.text}</p>
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
    </motion.div>
  );
}
