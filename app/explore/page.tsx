"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import ProfileGuard from "@/components/ProfileGuard";
import Link from "next/link";
import Image from "next/image";
import { collection as colPosts, query as qPosts, orderBy as ordPosts, limit as limPosts, onSnapshot } from "firebase/firestore";
import FeedCard from "@/components/FeedCard";
import { motion } from "framer-motion";
import { HiSearch } from "react-icons/hi";

interface User {
  id: string;
  username?: string;
  name: string;
  team?: string;
  position?: string;
  photoURL?: string;
  city?: string;
}

interface Post {
  id: string;
  userId: string;
  text: string;
  imageURL?: string;
  createdAt: number;
}

export default function ExplorePage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const postsQuery = qPosts(
      colPosts(db, "posts"),
      ordPosts("createdAt", "desc"),
      limPosts(12)
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const postsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Post[];
      setPosts(postsData);
    });

    return () => unsubscribe();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setUsers([]);
      return;
    }

    setSearching(true);
    try {
      const usersQuery = query(collection(db, "users"));
      const snapshot = await getDocs(usersQuery);
      const allUsers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];

      const queryLower = searchQuery.toLowerCase().trim();
      const filtered = allUsers.filter(
        (u) =>
          u.username?.toLowerCase().includes(queryLower) ||
          u.name?.toLowerCase().includes(queryLower) ||
          u.team?.toLowerCase().includes(queryLower) ||
          u.position?.toLowerCase().includes(queryLower) ||
          u.city?.toLowerCase().includes(queryLower)
      );

      setUsers(filtered);
    } catch (error) {
      console.error("Error searching:", error);
    } finally {
      setSearching(false);
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
    <ProfileGuard>
      <div className="min-h-screen bg-[#F9FAFB] pb-20 md:pb-0">
        <Navbar />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 sm:py-8">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8 text-2xl sm:text-3xl font-semibold text-[#111827]"
        >
          Explore
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex gap-3">
            <div className="relative flex-1">
              <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9CA3AF]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search by username, name, team, position, or city..."
                className="w-full rounded-xl border border-[#E5E7EB] bg-white pl-12 pr-4 py-3 text-base text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
              />
            </div>
            <motion.button
              onClick={handleSearch}
              disabled={searching}
              whileHover={{ scale: searching ? 1 : 1.02 }}
              whileTap={{ scale: searching ? 1 : 0.98 }}
              className="rounded-xl bg-[#007AFF] px-4 sm:px-6 py-3 text-white font-medium transition-all duration-200 hover:bg-[#0056CC] disabled:bg-[#9CA3AF] disabled:cursor-not-allowed shadow-sm hover:shadow-md touch-manipulation min-h-[44px]"
            >
              {searching ? "Searching..." : "Search"}
            </motion.button>
          </div>
        </motion.div>

        {users.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-12"
          >
            <h2 className="mb-6 text-xl font-semibold text-[#111827]">Players</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {users.map((u, index) => (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={`/profile/${u.id}`}
                    className="block rounded-2xl border border-[#E5E7EB] bg-white p-5 transition-all duration-200 hover:shadow-md hover:border-[#007AFF]/20"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 overflow-hidden rounded-full bg-[#F3F4F6] border-2 border-[#E5E7EB]">
                        {u.photoURL ? (
                          <Image
                            src={u.photoURL}
                            alt={u.name}
                            width={56}
                            height={56}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-[#9CA3AF]">
                            {u.name[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[#111827] truncate">{u.name}</div>
                        {u.username && (
                          <div className="text-xs text-[#9CA3AF] truncate">@{u.username}</div>
                        )}
                        {u.team && <div className="text-sm text-[#6B7280] truncate">{u.team}</div>}
                        {u.position && <div className="text-sm text-[#6B7280]">{u.position}</div>}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Feed Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="mb-6 text-xl font-semibold text-[#111827]">Feed</h2>
          
          {posts.length > 0 ? (
            <div className="space-y-4">
              {posts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                >
                  <FeedCard post={post} />
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border border-[#E5E7EB] bg-white p-12 text-center"
            >
              <p className="text-[#6B7280] mb-2">No posts yet</p>
              <p className="text-sm text-[#9CA3AF]">Be the first to share something!</p>
            </motion.div>
          )}
        </motion.div>
      </div>
      </div>
    </ProfileGuard>
  );
}
