"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import FeedCard from "@/components/FeedCard";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { HiChat } from "react-icons/hi";
import { formatHeight, formatVertical, formatWeight } from "@/utils/formatMetrics";

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

export default function UserProfilePage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = use(params);
  const { user: currentUser, loading } = useUser();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push("/");
    }
  }, [currentUser, loading, router]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data());
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    fetchProfile();

    const postsQuery = query(
      collection(db, "posts"),
      where("userId", "==", uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      postsQuery,
      (snapshot) => {
        const postsData = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as any;
          return {
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
            commentsCount: data.commentsCount || 0,
          } as Post;
        });
        setPosts(postsData);
      },
      (error) => {
        console.error("Error loading profile posts:", error);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  const handleStartChat = async () => {
    if (!currentUser || !profile) return;

    try {
      // Check if chat already exists
      const chatsQuery = query(
        collection(db, "chats"),
        where("participants", "array-contains", currentUser.uid)
      );
      const snapshot = await getDocs(chatsQuery);
      
      let existingChat = null;
      snapshot.forEach((doc) => {
        const chat = doc.data();
        if (chat.participants && chat.participants.includes(uid)) {
          existingChat = doc.id;
        }
      });

      if (existingChat) {
        // Chat exists, navigate to it
        router.push(`/messages/${existingChat}`);
      } else {
        // Create new chat automatically
        const chatRef = await addDoc(collection(db, "chats"), {
          participants: [currentUser.uid, uid],
          lastMessage: "",
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
        
        console.log("Chat created successfully:", chatRef.id);
        router.push(`/messages/${chatRef.id}`);
      }
    } catch (error: any) {
      console.error("Error starting chat:", error);
      alert(`Error starting chat: ${error.message || "Please try again."}`);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB]">
        <div className="text-[#6B7280]">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#F9FAFB]">
        <Navbar />
        <div className="mx-auto max-w-2xl px-6 py-12">
          <div className="text-center text-[#6B7280]">User not found</div>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.uid === uid;

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20 md:pb-0">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 sm:px-6 pt-0 pb-4 md:py-4 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8 rounded-xl sm:rounded-2xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden relative"
        >
          <div className="bg-gradient-to-br from-[#007AFF] to-[#0056CC] h-32 sm:h-40"></div>
          <div className="px-4 sm:px-8 pb-6 sm:pb-8 -mt-16 sm:-mt-20">
            <div className="flex items-end gap-4 mb-6 md:pr-60">
              <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-full border-4 border-white bg-[#F3F4F6] shadow-lg overflow-hidden">
                {profile.photoURL ? (
                  <Image
                    src={profile.photoURL}
                    alt={profile.name}
                    width={128}
                    height={128}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-5xl font-semibold text-[#9CA3AF]">
                    {profile.name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
              </div>
            </div>

            {!isOwnProfile && (
              <motion.button
                onClick={handleStartChat}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-[#007AFF] px-4 sm:px-6 py-2.5 sm:py-3 text-white font-medium transition-all duration-200 hover:bg-[#0056CC] shadow-md hover:shadow-lg touch-manipulation min-h-[44px] text-sm sm:text-base md:absolute md:right-8 md:top-8 md:mt-0 md:w-52"
              >
                <HiChat className="w-5 h-5" />
                <span className="hidden sm:inline">Message</span>
                <span className="sm:hidden">Msg</span>
              </motion.button>
            )}
            {isOwnProfile && (
              <Link
                href="/profile"
                className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-[#007AFF] px-4 sm:px-6 py-2.5 sm:py-3 text-white font-medium transition-all duration-200 hover:bg-[#0056CC] shadow-md hover:shadow-lg touch-manipulation min-h-[44px] text-sm sm:text-base md:absolute md:right-8 md:top-8 md:mt-0 md:w-52"
              >
                Edit Profile
              </Link>
            )}

            <div className="space-y-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-[#111827]">{profile.name}</h1>
                {profile.team && (
                  <p className="text-lg sm:text-xl text-[#6B7280] mt-2">{profile.team}</p>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 pt-4 sm:pt-6 border-t border-[#E5E7EB]">
                {profile.age && (
                  <div className="rounded-2xl bg-slate-50 p-4 text-center shadow-sm">
                    <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">Age</p>
                    <p className="text-xl font-semibold text-[#111827]">{profile.age}</p>
                  </div>
                )}
                {profile.height && (
                  <div className="rounded-2xl bg-slate-50 p-4 text-center shadow-sm">
                    <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">Height</p>
                    <p className="text-xl font-semibold text-[#111827]">{formatHeight(profile.height)}</p>
                  </div>
                )}
                {profile.vertical && (
                  <div className="rounded-2xl bg-slate-50 p-4 text-center shadow-sm">
                    <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">Vertical</p>
                    <p className="text-xl font-semibold text-[#111827]">{formatVertical(profile.vertical)}</p>
                  </div>
                )}
                {profile.weight && (
                  <div className="rounded-2xl bg-slate-50 p-4 text-center shadow-sm">
                    <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">Weight</p>
                    <p className="text-xl font-semibold text-[#111827]">{formatWeight(profile.weight)}</p>
                  </div>
                )}
                {profile.position && (
                  <div className="rounded-2xl bg-slate-50 p-4 text-center shadow-sm">
                    <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">Position</p>
                    <p className="text-xl font-semibold text-[#111827]">{profile.position}</p>
                  </div>
                )}
                {profile.city && (
                  <div className="rounded-2xl bg-slate-50 p-4 text-center shadow-sm">
                    <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">City</p>
                    <p className="text-xl font-semibold text-[#111827]">{profile.city}</p>
                  </div>
                )}
              </div>

              {profile.bio && (
                <div className="pt-6 border-t border-[#E5E7EB]">
                  <p className="text-sm font-semibold text-[#6B7280] uppercase tracking-wide mb-3">About</p>
                  <p className="text-[#111827] leading-relaxed">{profile.bio}</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        <div>
          <h2 className="mb-4 sm:mb-6 text-xl sm:text-2xl font-semibold text-[#111827]">Posts</h2>
          <div className="space-y-4">
            {posts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl sm:rounded-2xl border border-[#E5E7EB] bg-white p-8 sm:p-12 text-center"
              >
                <p className="text-[#6B7280]">No posts yet</p>
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
    </div>
  );
}
