"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { collection, query, where, getDocs, orderBy, limit, onSnapshot, updateDoc, doc, getDoc, increment, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import ProfileGuard from "@/components/ProfileGuard";
import Link from "next/link";
import Image from "next/image";
import { collection as colPosts, query as qPosts, orderBy as ordPosts, limit as limPosts } from "firebase/firestore";
import FeedCard from "@/components/FeedCard";
import { motion } from "framer-motion";
import { HiSearch } from "react-icons/hi";
import { Heart, MessageCircle, Play } from "lucide-react";
import BackButton from "@/components/BackButton";
import { formatTimeAgo } from "@/utils/formatTime";

interface User {
  id: string;
  username?: string;
  name: string;
  team?: string;
  position?: string;
  photoURL?: string;
  city?: string;
}

interface Highlight {
  id: string;
  userId: string;
  userName?: string;
  userUsername?: string;
  userPhotoURL?: string;
  userType?: "athlete" | "coach" | "admin" | "mentor";
  adminRole?: "parent" | "clubAdmin" | "";
  title: string;
  thumbnailURL?: string;
  videoURL?: string;
  upvotes: number;
  likedBy?: string[];
  commentsCount?: number;
  createdAt?: number;
}

interface Post {
  id: string;
  userId: string;
  text: string;
  imageURL?: string;
  videoURL?: string;
  thumbnailURL?: string;
  mediaType?: "image" | "video" | null;
  createdAt: number;
}

export default function ExplorePage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [searching, setSearching] = useState(false);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loadingHighlights, setLoadingHighlights] = useState(true);

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

    const unsubscribePosts = onSnapshot(
      postsQuery,
      (snapshot) => {
        const postsData = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as any;
          return {
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
          } as Post;
        });
        setPosts(postsData);
      },
      (error) => {
        console.error("Error loading posts:", error);
      }
    );

    const highlightsQuery = query(
      collection(db, "highlights"),
      orderBy("createdAt", "desc"),
      limit(12)
    );

    const unsubscribeHighlights = onSnapshot(highlightsQuery, async (snapshot) => {
      const highlightDataPromises = snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data() as any;
        // Fetch user type from user document
        let userType: "athlete" | "coach" | "admin" | "mentor" | undefined;
        let adminRole: "parent" | "clubAdmin" | "" | undefined;
        if (data.userId) {
          try {
            const userDoc = await getDoc(doc(db, "users", data.userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              userType = userData.userType;
              adminRole = userData.adminRole;
            }
          } catch (error) {
            console.error("Error fetching user type:", error);
          }
        }
        return {
          id: docSnap.id,
          ...data,
          userType,
          adminRole,
          upvotes: data.upvotes || 0,
          likedBy: data.likedBy || [],
          commentsCount: data.commentsCount || 0,
          createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
        } as Highlight;
      });
      const highlightData = await Promise.all(highlightDataPromises);
      setHighlights(highlightData);
      setLoadingHighlights(false);
    }, (error) => {
      console.error("Error loading highlights:", error);
      setLoadingHighlights(false);
    });

    return () => {
      unsubscribePosts();
      unsubscribeHighlights();
    };
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

  const handleHighlightLike = async (highlight: Highlight) => {
    if (!user) {
      router.push("/");
      return;
    }

    const highlightRef = doc(db, "highlights", highlight.id);
    const alreadyLiked = highlight.likedBy?.includes(user.uid);

    try {
      await updateDoc(highlightRef, {
        upvotes: increment(alreadyLiked ? -1 : 1),
        likedBy: alreadyLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
      });

      setHighlights((prev) =>
        prev.map((h) =>
          h.id === highlight.id
            ? {
                ...h,
                upvotes: (h.upvotes || 0) + (alreadyLiked ? -1 : 1),
                likedBy: alreadyLiked
                  ? (h.likedBy || []).filter((id) => id !== user.uid)
                  : [...(h.likedBy || []), user.uid],
              }
            : h
        )
      );
    } catch (error) {
      console.error("Error updating highlight like:", error);
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
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-0 pb-4 md:py-4 sm:py-8">
        <BackButton fallback="/home" className="mb-4" />
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

        {/* Highlights Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <h2 className="mb-6 text-xl font-semibold text-[#111827]">Latest Highlights</h2>
          {loadingHighlights ? (
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-12 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[#007AFF] border-t-transparent"></div>
              <p className="text-[#6B7280]">Loading highlights...</p>
            </div>
          ) : highlights.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {highlights.map((highlight, index) => {
                const isLiked = highlight.likedBy?.includes(user?.uid || "");
                return (
                  <motion.div
                    key={highlight.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
                  >
                    <Link href={`/highlights/${highlight.id}`} className="relative block aspect-video bg-slate-100">
                      {highlight.thumbnailURL ? (
                        <Image
                          src={highlight.thumbnailURL}
                          alt={highlight.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Play className="w-10 h-10 text-slate-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                      <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 text-white">
                        <div className="flex-1 truncate font-semibold">{highlight.title}</div>
                      </div>
                    </Link>
                    <div className="flex flex-1 flex-col p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Link href={`/profile/${highlight.userId}`} className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="h-10 w-10 overflow-hidden rounded-full bg-[#F3F4F6]">
                            {highlight.userPhotoURL ? (
                              <Image
                                src={highlight.userPhotoURL}
                                alt={highlight.userName || "Player"}
                                width={40}
                                height={40}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-[#9CA3AF]">
                                {(highlight.userName || "P").charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="truncate font-semibold text-[#111827]">{highlight.userName || "Player"}</p>
                              {highlight.userType && (
                                <span
                                  className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0 ${
                                    highlight.userType === "athlete"
                                      ? "bg-blue-50 text-[#3B82F6]"
                                      : highlight.userType === "mentor"
                                      ? "bg-purple-50 text-purple-700"
                                      : highlight.userType === "coach"
                                      ? "bg-green-50 text-green-700"
                                      : highlight.userType === "admin"
                                      ? "bg-orange-50 text-orange-700"
                                      : "bg-slate-50 text-slate-700"
                                  }`}
                                >
                                  {highlight.userType === "admin"
                                    ? highlight.adminRole === "clubAdmin"
                                      ? "Club Admin"
                                      : "Parent/Guardian"
                                    : highlight.userType.charAt(0).toUpperCase() + highlight.userType.slice(1)}
                                </span>
                              )}
                            </div>
                            {highlight.userUsername && (
                              <p className="truncate text-xs text-[#9CA3AF]">@{highlight.userUsername}</p>
                            )}
                          </div>
                        </Link>
                      </div>
                      {highlight.createdAt && (
                        <p className="text-xs text-[#9CA3AF] mb-3">{formatTimeAgo(highlight.createdAt)}</p>
                      )}
                      <div className="mt-auto flex items-center justify-between">
                        <button
                          onClick={() => handleHighlightLike(highlight)}
                          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                            isLiked
                              ? "bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white"
                              : "bg-slate-100 text-[#111827] hover:bg-slate-200"
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${isLiked ? "fill-white" : "text-[#3B82F6]"}`} />
                          {highlight.upvotes}
                        </button>
                        <Link
                          href={`/highlights/${highlight.id}`}
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#6B7280] hover:text-[#007AFF]"
                        >
                          <MessageCircle className="w-4 h-4" />
                          {highlight.commentsCount || 0}
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-12 text-center">
              <p className="mb-2 text-[#6B7280]">No highlights yet</p>
              <p className="text-sm text-[#9CA3AF]">Upload your first highlight to inspire others!</p>
            </div>
          )}
        </motion.div>

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
