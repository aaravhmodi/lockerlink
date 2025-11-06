"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import FeedCard from "@/components/FeedCard";
import { uploadToCloudinary } from "@/utils/uploadToCloudinary";
import { motion } from "framer-motion";
import { HiPhotograph } from "react-icons/hi";

interface Post {
  id: string;
  userId: string;
  text: string;
  imageURL?: string;
  createdAt: number;
}

export default function HomePage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [postText, setPostText] = useState("");
  const [postImage, setPostImage] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    const postsQuery = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const postsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Post[];
      setPosts(postsData);
    });

    return () => unsubscribe();
  }, [user]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !postText.trim()) return;

    setPosting(true);
    try {
      let imageURL = "";

      if (postImage) {
        imageURL = await uploadToCloudinary(postImage);
      }

      await addDoc(collection(db, "posts"), {
        userId: user.uid,
        text: postText.trim(),
        imageURL: imageURL || null,
        createdAt: serverTimestamp(),
      });

      setPostText("");
      setPostImage(null);
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Error creating post");
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB]">
        <div className="text-[#6B7280]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20 md:pb-0">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-4 sm:py-8">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-8 text-2xl sm:text-3xl font-semibold text-[#111827] px-2 sm:px-0"
        >
          Home
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 sm:mb-8 rounded-xl sm:rounded-2xl bg-white p-4 sm:p-6 shadow-sm border border-[#E5E7EB]"
        >
          <form onSubmit={handleCreatePost} className="space-y-4">
            <textarea
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder="What's on your mind?"
              rows={4}
              className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-base text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 resize-none touch-manipulation"
            />
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[#E5E7EB] bg-white text-[#6B7280] cursor-pointer hover:bg-[#F9FAFB] transition-all duration-200 touch-manipulation min-h-[44px]">
                <HiPhotograph className="w-5 h-5" />
                <span className="text-sm font-medium">Add Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPostImage(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
              {postImage && (
                <span className="text-sm text-[#6B7280] truncate px-2">{postImage.name}</span>
              )}
            </div>
            <motion.button
              type="submit"
              disabled={posting || !postText.trim()}
              whileHover={{ scale: posting || !postText.trim() ? 1 : 1.02 }}
              whileTap={{ scale: posting || !postText.trim() ? 1 : 0.98 }}
              className="w-full rounded-xl bg-[#007AFF] px-6 py-3.5 text-white font-medium transition-all duration-200 hover:bg-[#0056CC] disabled:bg-[#9CA3AF] disabled:cursor-not-allowed shadow-sm hover:shadow-md touch-manipulation min-h-[44px]"
            >
              {posting ? "Posting..." : "Post"}
            </motion.button>
          </form>
        </motion.div>

        <div className="space-y-4 px-2 sm:px-0">
          {posts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl sm:rounded-2xl border border-[#E5E7EB] bg-white p-8 sm:p-12 text-center"
            >
              <p className="text-[#6B7280] mb-2">No posts yet.</p>
              <p className="text-sm text-[#9CA3AF]">Be the first to share something!</p>
            </motion.div>
          ) : (
            posts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <FeedCard post={post} />
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
