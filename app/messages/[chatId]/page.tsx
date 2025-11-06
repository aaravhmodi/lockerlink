"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import Navbar from "@/components/Navbar";
import ChatWindow from "@/components/ChatWindow";
import Link from "next/link";

export default function ChatPage({ params }: { params: { chatId: string } }) {
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
        <Link
          href="/messages"
          className="mb-4 inline-block text-blue-500 hover:text-blue-600"
        >
          ← Back to Messages
        </Link>
        <div className="h-[600px] rounded-lg border bg-white shadow-sm">
          <ChatWindow chatId={params.chatId} />
        </div>
      </div>
    </div>
  );
}

