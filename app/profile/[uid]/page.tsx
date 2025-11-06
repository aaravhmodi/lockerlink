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

    // Load user's posts
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
      // Check if chat already exists
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
        // Create new chat
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="mx-auto max-w-2xl px-4 py-8">
          <div className="text-center text-gray-500">User not found</div>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.uid === params.uid;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 rounded-xl border bg-white shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-32"></div>
          <div className="px-6 pb-6 -mt-16">
            <div className="flex items-end justify-between mb-4">
              <div className="h-32 w-32 rounded-full border-4 border-white bg-gray-200 shadow-lg overflow-hidden">
                    {profile.photoURL ? (
                      <Image
                        src={profile.photoURL}
                        alt={profile.name}
                        width={128}
                        height={128}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-5xl text-gray-400 font-semibold">
                        {profile.name?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
              </div>
              {!isOwnProfile && (
                <button
                  onClick={handleStartChat}
                  className="rounded-lg bg-blue-500 px-6 py-2 text-white font-medium hover:bg-blue-600 transition-colors shadow-md"
                >
                  Message
                </button>
              )}
              {isOwnProfile && (
                <Link
                  href="/profile"
                  className="rounded-lg bg-blue-500 px-6 py-2 text-white font-medium hover:bg-blue-600 transition-colors shadow-md"
                >
                  Edit Profile
                </Link>
              )}
            </div>

            {/* Profile Info */}
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{profile.name}</h1>
                {profile.team && (
                  <p className="text-xl text-gray-600 mt-1">{profile.team}</p>
                )}
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                {profile.age && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Age</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">{profile.age}</p>
                  </div>
                )}
                {profile.position && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Position</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">{profile.position}</p>
                  </div>
                )}
                {profile.sport && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sport</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">{profile.sport}</p>
                  </div>
                )}
                {profile.city && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">City</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">{profile.city}</p>
                  </div>
                )}
              </div>

              {/* Bio */}
              {profile.bio && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">About</p>
                  <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Posts</h2>
          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
                No posts yet
              </div>
            ) : (
              posts.map((post) => <FeedCard key={post.id} post={post} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

