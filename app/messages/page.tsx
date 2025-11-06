"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import Navbar from "@/components/Navbar";
import ChatList from "@/components/ChatList";

export default function MessagesPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

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
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Messages</h1>
        <ChatList />
      </div>
    </div>
  );
}

