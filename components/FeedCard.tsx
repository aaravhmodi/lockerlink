"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

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

export default function FeedCard({ post }: FeedCardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="h-4 w-32 animate-pulse rounded bg-gray-200"></div>
      </div>
    );
  }

  const date = new Date(post.createdAt * 1000).toLocaleDateString();

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-200">
          {user?.photoURL ? (
            <Image
              src={user.photoURL}
              alt={user.name}
              width={40}
              height={40}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-400">
              {user?.name?.[0] || "?"}
            </div>
          )}
        </div>
        <div>
          <div className="font-semibold text-gray-900">{user?.name || "Unknown"}</div>
          {user?.team && (
            <div className="text-sm text-gray-500">{user.team}</div>
          )}
        </div>
        <div className="ml-auto text-xs text-gray-400">{date}</div>
      </div>
      
      {post.text && <p className="mb-3 text-gray-700">{post.text}</p>}
      
      {post.imageURL && (
        <div className="relative mb-3 aspect-video w-full overflow-hidden rounded-lg">
          <Image
            src={post.imageURL}
            alt="Post image"
            fill
            className="object-cover"
          />
        </div>
      )}
    </div>
  );
}

