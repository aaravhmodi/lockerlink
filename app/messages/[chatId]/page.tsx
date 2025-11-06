"use client";

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import Navbar from "@/components/Navbar";
import ChatWindow from "@/components/ChatWindow";
import Link from "next/link";
import { motion } from "framer-motion";
import { HiArrowLeft } from "react-icons/hi";

export default function ChatPage({ params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = use(params);
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB]">
        <div className="text-[#6B7280]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20 md:pb-0">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-4 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link
            href="/messages"
            className="mb-4 sm:mb-6 inline-flex items-center gap-2 text-[#007AFF] hover:text-[#0056CC] transition-colors font-medium touch-manipulation"
          >
            <HiArrowLeft className="w-5 h-5" />
            <span className="text-sm sm:text-base">Back to Messages</span>
          </Link>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="h-[calc(100vh-12rem)] sm:h-[600px] rounded-xl sm:rounded-2xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden"
        >
          <ChatWindow chatId={chatId} />
        </motion.div>
      </div>
    </div>
  );
}
