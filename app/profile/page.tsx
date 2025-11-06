"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { doc, getDoc, collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import ProfileForm from "@/components/ProfileForm";
import FeedCard from "@/components/FeedCard";
import Link from "next/link";
import Image from "next/image";

interface Post {
  id: string;
  userId: string;
  text: string;
  imageURL?: string;
  createdAt: number;
}

export default function ProfilePage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
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
      where("userId", "==", user.uid),
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
  }, [user]);

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
          <div className="text-center text-gray-500">Loading profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 py-8">
        {isEditing ? (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
              <button
                onClick={() => setIsEditing(false)}
                className="text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
            </div>
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <ProfileForm />
            </div>
          </div>
        ) : (
          <>
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
                  {profile.bio && (
                    <p className="mt-4 text-gray-700">{profile.bio}</p>
                  )}
                  <button
                    onClick={() => setIsEditing(true)}
                    className="mt-4 rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                  >
                    Edit Profile
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-xl font-semibold text-gray-900">My Posts</h2>
              <div className="space-y-4">
                {posts.length === 0 ? (
                  <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
                    No posts yet. <Link href="/home" className="text-blue-500 hover:text-blue-600">Create your first post!</Link>
                  </div>
                ) : (
                  posts.map((post) => <FeedCard key={post.id} post={post} />)
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

