"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import Image from "next/image";
import { collection as colPosts, query as qPosts, orderBy as ordPosts, limit as limPosts, onSnapshot } from "firebase/firestore";
import FeedCard from "@/components/FeedCard";

interface User {
  id: string;
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
    // Load recent posts
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
      // Simple search - in production, use Algolia or similar
      const usersQuery = query(collection(db, "users"));
      const snapshot = await getDocs(usersQuery);
      const allUsers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];

      const filtered = allUsers.filter(
        (u) =>
          u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.team?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.position?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.city?.toLowerCase().includes(searchQuery.toLowerCase())
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Explore</h1>

        <div className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search players by name, team, position, or city..."
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              className="rounded-md bg-blue-500 px-6 py-2 text-white hover:bg-blue-600 disabled:bg-gray-400"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </div>
        </div>

        {users.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Players</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {users.map((u) => (
                <Link
                  key={u.id}
                  href={`/profile/${u.id}`}
                  className="rounded-lg border bg-white p-4 shadow-sm hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 overflow-hidden rounded-full bg-gray-200">
                      {u.photoURL ? (
                        <Image
                          src={u.photoURL}
                          alt={u.name}
                          width={48}
                          height={48}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400">
                          {u.name[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{u.name}</div>
                      {u.team && <div className="text-sm text-gray-500">{u.team}</div>}
                      {u.position && <div className="text-sm text-gray-500">{u.position}</div>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Recent Posts</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/post/${post.id}`}
                className="group rounded-lg border bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {post.imageURL ? (
                  <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
                    <Image
                      src={post.imageURL}
                      alt="Post"
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                ) : (
                  <div className="p-4">
                    <p className="line-clamp-3 text-gray-700">{post.text}</p>
                  </div>
                )}
              </Link>
            ))}
          </div>
          {posts.length === 0 && (
            <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
              No posts yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

