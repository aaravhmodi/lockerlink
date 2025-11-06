"use client";

import { useEffect, useState } from "react";
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

interface Post {
  id: string;
  userId: string;
  text: string;
  imageURL?: string;
  createdAt: number;
}

export default function UserProfilePage({ params }: { params: { uid: string } }) {
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
        const userDoc = await getDoc(doc(db, "users", params.uid));
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
      where("userId", "==", params.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const postsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Post[];
      setPosts(postsData);
    });

    return () => unsubscribe();
  }, [params.uid]);

  const handleStartChat = async () => {
    if (!currentUser || !profile) return;

    try {
      const chatsQuery = query(
        collection(db, "chats"),
        where("participants", "array-contains", currentUser.uid)
      );
      const snapshot = await getDocs(chatsQuery);
      
      let existingChat = null;
      snapshot.forEach((doc) => {
        const chat = doc.data();
        if (chat.participants.includes(params.uid)) {
          existingChat = doc.id;
        }
      });

      if (existingChat) {
        router.push(`/messages/${existingChat}`);
      } else {
        const chatRef = await addDoc(collection(db, "chats"), {
          participants: [currentUser.uid, params.uid],
          lastMessage: "",
          updatedAt: serverTimestamp(),
        });
        router.push(`/messages/${chatRef.id}`);
      }
    } catch (error) {
      console.error("Error starting chat:", error);
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

  const isOwnProfile = currentUser?.uid === params.uid;

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20 md:pb-0">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-4 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8 rounded-xl sm:rounded-2xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden"
        >
          <div className="bg-gradient-to-br from-[#007AFF] to-[#0056CC] h-32 sm:h-40"></div>
          <div className="px-4 sm:px-8 pb-6 sm:pb-8 -mt-16 sm:-mt-20">
            <div className="flex items-end justify-between mb-6">
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
              {!isOwnProfile && (
                <motion.button
                  onClick={handleStartChat}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 rounded-xl bg-[#007AFF] px-4 sm:px-6 py-2.5 sm:py-3 text-white font-medium transition-all duration-200 hover:bg-[#0056CC] shadow-md hover:shadow-lg touch-manipulation min-h-[44px] text-sm sm:text-base"
                >
                  <HiChat className="w-5 h-5" />
                  <span className="hidden sm:inline">Message</span>
                  <span className="sm:hidden">Msg</span>
                </motion.button>
              )}
              {isOwnProfile && (
                <Link
                  href="/profile"
                  className="rounded-xl bg-[#007AFF] px-4 sm:px-6 py-2.5 sm:py-3 text-white font-medium transition-all duration-200 hover:bg-[#0056CC] shadow-md hover:shadow-lg touch-manipulation min-h-[44px] text-sm sm:text-base"
                >
                  Edit Profile
                </Link>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-[#111827]">{profile.name}</h1>
                {profile.team && (
                  <p className="text-lg sm:text-xl text-[#6B7280] mt-2">{profile.team}</p>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 pt-4 sm:pt-6 border-t border-[#E5E7EB]">
                {profile.age && (
                  <div>
                    <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">Age</p>
                    <p className="text-xl font-semibold text-[#111827]">{profile.age}</p>
                  </div>
                )}
                {profile.position && (
                  <div>
                    <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">Position</p>
                    <p className="text-xl font-semibold text-[#111827]">{profile.position}</p>
                  </div>
                )}
                {profile.sport && (
                  <div>
                    <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">Sport</p>
                    <p className="text-xl font-semibold text-[#111827]">{profile.sport}</p>
                  </div>
                )}
                {profile.city && (
                  <div>
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
