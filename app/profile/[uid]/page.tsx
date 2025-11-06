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
        <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex items-start gap-6">
            <div className="h-24 w-24 overflow-hidden rounded-full bg-gray-200">
              {profile.photoURL ? (
                <Image
                  src={profile.photoURL}
                  alt={profile.name}
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl text-gray-400">
                  {profile.name?.[0] || "?"}
                </div>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
              {profile.team && <p className="text-lg text-gray-600">{profile.team}</p>}
              {profile.position && (
                <p className="text-sm text-gray-500">Position: {profile.position}</p>
              )}
              {profile.city && <p className="text-sm text-gray-500">City: {profile.city}</p>}
              {profile.age && <p className="text-sm text-gray-500">Age: {profile.age}</p>}
              {profile.bio && <p className="mt-4 text-gray-700">{profile.bio}</p>}
              {!isOwnProfile && (
                <button
                  onClick={handleStartChat}
                  className="mt-4 rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                >
                  Message
                </button>
              )}
              {isOwnProfile && (
                <Link
                  href="/profile"
                  className="mt-4 inline-block rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                >
                  Edit Profile
                </Link>
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

