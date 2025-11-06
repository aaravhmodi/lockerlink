"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import FeedCard from "@/components/FeedCard";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

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
        const imageRef = ref(storage, `posts/${user.uid}/${Date.now()}`);
        await uploadBytes(imageRef, postImage);
        imageURL = await getDownloadURL(imageRef);
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Home</h1>

        <div className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
          <form onSubmit={handleCreatePost} className="space-y-4">
            <textarea
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder="What's on your mind?"
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPostImage(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700"
            />
            <button
              type="submit"
              disabled={posting || !postText.trim()}
              className="w-full rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:bg-gray-400"
            >
              {posting ? "Posting..." : "Post"}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
              No posts yet. Be the first to post!
            </div>
          ) : (
            posts.map((post) => <FeedCard key={post.id} post={post} />)
          )}
        </div>
      </div>
    </div>
  );
}

